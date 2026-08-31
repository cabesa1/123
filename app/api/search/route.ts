import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { loadSearchInstructions } from '@/lib/agent-skills';
import { runSearcherAgent } from '@/lib/agents/searcher-agent';
import { runVerifierAgent } from '@/lib/agents/verifier-agent';
import { runStrategistScorerAgent } from '@/lib/agents/strategist-scorer-agent';
import { createManagerAgent, type ManagerAgent } from '@/lib/agents/marketing-orchestrator';
import { inspectWithYtDlp, type YtDlpMetadata } from './ytdlp';

export const runtime = 'nodejs';

type Verification = { status: 'Conteúdo confirmado' | 'Inacessível'; observed: string; title?: string; creator?: string; metadata?: YtDlpMetadata };

function compactNumber(value: number | undefined) {
  return value === undefined ? undefined : new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function percentile(value: number, values: number[]) {
  if (values.length < 2) return 50;
  const below = values.filter(candidate => candidate < value).length;
  const equal = values.filter(candidate => candidate === value).length;
  return Math.round(((below + (equal - 1) / 2) / (values.length - 1)) * 100);
}

function isDirectVideoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'vt.tiktok.com' || host === 'vm.tiktok.com') return url.pathname.length > 1;
    if (host === 'tiktok.com') return /\/@[^/]+\/video\/\d+/.test(url.pathname) || /^\/t\//.test(url.pathname);
    if (host === 'instagram.com') {
      const match = url.pathname.match(/^\/(?:reel|reels|p)\/([A-Za-z0-9_-]{5,})\/?$/);
      return Boolean(match && !['indisponivel', 'indisponível', 'unknown', 'undefined', 'null', 'example'].includes(match[1].toLowerCase()));
    }
    return false;
  } catch { return false; }
}

async function verifyPublicVideo(source: string): Promise<Verification> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const metadata = await inspectWithYtDlp(source);
    if (metadata) {
      const facts = [
        metadata.creator && `autor ${metadata.creator}`,
        metadata.duration !== undefined && `duração ${Math.round(metadata.duration)}s`,
        metadata.viewCount !== undefined && `${compactNumber(metadata.viewCount)} visualizações`,
        metadata.likeCount !== undefined && `${compactNumber(metadata.likeCount)} curtidas`,
      ].filter(Boolean).join(', ');
      return { status: 'Conteúdo confirmado', creator: metadata.creator, metadata, observed: `Vídeo lido automaticamente pelo yt-dlp${facts ? `: ${facts}` : ''}.` };
    }
    const url = new URL(source);
    if (url.hostname.replace(/^www\./, '') === 'tiktok.com') {
      const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(source)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) return { status: 'Inacessível', observed: `O TikTok não confirmou o vídeo (HTTP ${response.status}).` };
      const data = await response.json() as { title?: string; author_name?: string };
      if (!data.title && !data.author_name) return { status: 'Inacessível', observed: 'O TikTok respondeu, mas não identificou o conteúdo.' };
      return { status: 'Conteúdo confirmado', creator: data.author_name, title: data.title, observed: `Vídeo confirmado pelo TikTok${data.author_name ? `, publicado por ${data.author_name}` : ''}.` };
    }
    return { status: 'Inacessível', observed: 'O Instagram não liberou o vídeo para leitura automática sem login.' };
  } catch { return { status: 'Inacessível', observed: 'A plataforma bloqueou ou não respondeu à verificação automática.' }; }
  finally { clearTimeout(timeout); }
}

const schema = {
  type: 'object', additionalProperties: false,
  properties: { trends: { type: 'array', minItems: 0, maxItems: 5, items: {
    type: 'object', additionalProperties: false,
    properties: {
      platform: { type: 'string', enum: ['TikTok', 'Instagram'] }, title: { type: 'string' }, pattern: { type: 'string' },
      views: { type: 'string' }, likes: { type: 'string' }, score: { type: 'integer', minimum: 0, maximum: 100 },
      growth: { type: 'string' }, difficulty: { type: 'string', enum: ['Fácil', 'Médio', 'Difícil'] },
      hook: { type: 'string' }, fit: { type: 'string' }, steps: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
      source: { type: 'string' }, creator: { type: 'string' }, publishedAt: { type: 'string' }, evidence: { type: 'string' },
    },
    required: ['platform','title','pattern','views','likes','score','growth','difficulty','hook','fit','steps','source','creator','publishedAt','evidence'],
  } } }, required: ['trends'],
} as const;

async function generateWithOllama(instructions: string, input: string, query: string, platform: string, agentRun: ManagerAgent) {
  const discovery = await agentRun.supervise('searcher', attempt => runSearcherAgent(attempt === 1 ? query : `${query} vídeo curto reels tiktok` , platform), result => result.urls.length > 0, 'O Searcher não encontrou URLs diretas após duas tentativas.');
  const urls = discovery.urls;
  if (!urls.length) throw new Error('A busca pública não encontrou links diretos. Tente palavras mais específicas.');
  const verification = await agentRun.supervise('verifier', () => runVerifierAgent(urls), result => result.confirmed.length > 0, 'O Verifier não confirmou visualizações reais após duas tentativas.');
  const confirmed = verification.confirmed;
  if (!confirmed.length) throw new Error('Foram encontrados links, mas nenhum liberou métricas reais para o yt-dlp.');
  const evidence = confirmed.map(item => ({ source: item.source, ...item.metadata }));
  const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'qwen3:4b', stream: false, format: schema,
      options: { temperature: 0 },
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: `${input}\n\nUse SOMENTE estes vídeos já confirmados pelo sistema:\n${JSON.stringify(evidence)}\nNão altere as URLs nem as métricas.` },
      ],
    }),
  });
  const data = await response.json() as { message?: { content?: string }; error?: string };
  if (!response.ok || !data.message?.content) throw new Error(data.error || 'O Ollama não retornou conteúdo.');
  return data.message.content;
}

export async function POST(request: NextRequest) {
  let body: { query?: string; platform?: string; period?: string; brand?: string; category?: string; exclude?: string[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'A solicitação enviada ao servidor não contém JSON válido.' }, { status: 400 }); }
  if (!body.query?.trim()) return NextResponse.json({ error: 'Informe o tipo de vídeo.' }, { status: 400 });

  const brand = body.brand === 'SAFE-K' ? 'SAFE-K' : 'Economize.vc';
  const allowedCategories = brand === 'SAFE-K' ? ['Institucional', 'Educacional'] : ['Institucional', 'Humorístico', 'Educacional'];
  const category = allowedCategories.includes(body.category || '') ? body.category! : allowedCategories[0];
  let runtime: Awaited<ReturnType<typeof loadSearchInstructions>>;
  try { runtime = await loadSearchInstructions(brand); }
  catch (reason) { console.error('Falha ao carregar skills', reason); return NextResponse.json({ error: 'As skills da pesquisa não puderam ser carregadas.' }, { status: 500 }); }

  const platform = body.platform && body.platform !== 'Todas' ? body.platform : 'Todas';
  const input = `Execute uma pesquisa real de referências de vídeos curtos.
Busca: ${body.query.trim()}
Marca ativa: ${brand}
Categoria: ${category}
Plataforma: ${platform === 'Todas' ? 'TikTok e Instagram Reels' : platform}
Período preferido: ${body.period || 'mais recente disponível'}
Não repetir: ${(body.exclude || []).join(', ') || 'nenhuma'}

Retorne até cinco referências, ou nenhuma sem evidência suficiente. Aceite somente URLs diretas do TikTok ou Instagram Reels. Nunca invente link, criador, data ou métrica; use "Indisponível" quando faltar. A aplicação validará URL e métricas antes de exibir. fit e steps devem adaptar somente o mecanismo abstrato para a marca. Responda em português do Brasil.`;

  let outputText: string;
  const provider = process.env.AI_PROVIDER === 'ollama' || !process.env.OPENAI_API_KEY ? 'ollama' : 'openai';
  const agentRun = createManagerAgent(brand);
  try {
    if (provider === 'ollama') outputText = await generateWithOllama(runtime.instructions, input, body.query.trim(), platform, agentRun);
    else {
      agentRun.add({ agent: 'searcher', status: 'completed', attempt: 1, brand, detail: 'Pesquisa web executada pelo provedor com URLs diretas exigidas pelo contrato.' });
      agentRun.add({ agent: 'manager', status: 'completed', attempt: 1, decision: 'approved', brand, detail: 'Searcher autorizado a usar a pesquisa web do provedor.' });
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-terra', instructions: runtime.instructions,
        tools: [{ type: 'web_search_preview', search_context_size: 'high', user_location: { type: 'approximate', country: 'BR', city: 'Sorocaba', region: 'São Paulo' } }],
        input, text: { format: { type: 'json_schema', name: 'trend_results', strict: true, schema } }, store: false,
      });
      outputText = response.output_text;
    }
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : 'erro desconhecido';
    return NextResponse.json({ error: `Não foi possível concluir a pesquisa via ${provider === 'ollama' ? 'Ollama local' : 'OpenAI'}: ${detail}` }, { status: 502 });
  }

  let parsed: { trends: Array<Record<string, unknown>> };
  try { parsed = JSON.parse(outputText) as { trends: Array<Record<string, unknown>> }; }
  catch { return NextResponse.json({ error: 'A resposta da pesquisa chegou incompleta e não pôde ser interpretada.' }, { status: 502 }); }
  if (!Array.isArray(parsed.trends)) return NextResponse.json({ error: 'A resposta estruturada não contém a lista de vídeos esperada.' }, { status: 502 });

  const candidates = parsed.trends.filter(trend => isDirectVideoUrl(trend.source) && (platform === 'Todas' || trend.platform === platform));
  let verification: Awaited<ReturnType<typeof runVerifierAgent>>;
  try { verification = await agentRun.supervise('verifier', () => runVerifierAgent(candidates.map(trend => String(trend.source))), result => result.confirmed.length > 0, 'O Verifier não confirmou nenhum resultado com visualizações reais.'); }
  catch { return NextResponse.json({ error: 'Nenhum vídeo possuía link direto e visualizações confirmadas após duas tentativas.', specialistsUsed: runtime.specialists, agentTrace: agentRun.trace, manager: agentRun.summary() }, { status: 502 }); }
  if (!verification.confirmed.length) return NextResponse.json({ error: 'Nenhum vídeo encontrado possuía link direto e número de visualizações confirmados pela plataforma. Tente outro insight ou período.', specialistsUsed: runtime.specialists, agentTrace: agentRun.trace }, { status: 502 });

  const ranked = await agentRun.supervise('strategist-scorer', async () => runStrategistScorerAgent(candidates, verification.confirmed), result => result.trends.length > 0 && result.trends.length <= 5 && result.trends.every(trend => typeof trend.score === 'number'), 'O Strategist/Scorer não produziu uma classificação válida.');
  return NextResponse.json({ trends: ranked.trends, specialistsUsed: runtime.specialists, agentsUsed: agentRun.specialists(), agentTrace: agentRun.trace, manager: agentRun.summary(), providerUsed: provider });
}
