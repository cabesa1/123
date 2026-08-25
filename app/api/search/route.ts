import { NextRequest, NextResponse } from 'next/server';

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    trends: {
      type: 'array', minItems: 1, maxItems: 5,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          platform: { type: 'string' }, title: { type: 'string' }, pattern: { type: 'string' },
          views: { type: 'string' }, likes: { type: 'string' }, score: { type: 'integer', minimum: 0, maximum: 100 },
          growth: { type: 'string' }, difficulty: { type: 'string', enum: ['Fácil', 'Médio', 'Difícil'] },
          hook: { type: 'string' }, fit: { type: 'string' }, steps: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
          source: { type: 'string' }, creator: { type: 'string' }, publishedAt: { type: 'string' }, evidence: { type: 'string' },
        },
        required: ['platform','title','pattern','views','likes','score','growth','difficulty','hook','fit','steps','source','creator','publishedAt','evidence'],
      },
    },
  },
  required: ['trends'],
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY_NOT_CONFIGURED' }, { status: 503 });
  let body:{ query?: string; platform?: string; period?: string; brand?: string; category?: string; exclude?: string[] };
  try{body=await request.json()}catch{return NextResponse.json({error:'A solicitação enviada ao servidor não contém JSON válido.'},{status:400})}
  if (!body.query?.trim()) return NextResponse.json({ error: 'Informe o tipo de vídeo.' }, { status: 400 });

  const brand = body.brand || 'Economize.vc';
  const category = body.category || 'Humorístico';
  const brandContext = brand === 'Economize.vc'
    ? 'outlet Open Box de Sorocaba com eletrônicos, eletrodomésticos e descontos'
    : 'SAFE-K é uma bolsa/case física com trava. O celular permanece com o próprio usuário, mas fica inacessível durante o período de foco. É voltada principalmente a escolas e estudantes, além de empresas e eventos. Não é aplicativo, capa protetora nem cofre coletivo. Não afirmar bloqueio de sinal sem prova técnica. A proposta é implementar ambientes com menos distrações, mais presença e uso consciente da tecnologia.';
  const categoryCriteria = category === 'Institucional'
    ? 'Priorize vídeos que comuniquem propósito, mecanismo, design, bastidores, prova ou transformação percebida. O conceito deve fortalecer confiança e identidade premium, sem depender de humor.'
    : category === 'Educacional'
      ? 'Priorize vídeos que ensinem uma prática aplicável sobre foco, ambiente de estudo, atenção ou bem-estar digital. Diferencie evidência de opinião e evite alegações clínicas ou promessas de produtividade garantida.'
      : 'Priorize situações reconhecíveis de distração, procrastinação, notificações e autoengano. O público deve rir de si mesmo; nunca humilhe estudantes, funcionários ou pessoas com dificuldade de foco.';
  const scoreCriteria=brand==='SAFE-K'
    ? 'Para SAFE-K, calcule o score com: autoridade e rastreabilidade da fonte 30%, aderência ao problema educacional 25%, desempenho público observável 25% e aplicabilidade concreta da Bag SAFE-K 20%.'
    : 'Para Economize.vc, calcule o score com: evidência pública 35%, aderência ao brief 25%, adequação à categoria 20% e facilidade de adaptação 20%.';
  const prompt = `Pesquise na web referências REAIS de vídeos curtos para esta busca: ${body.query}.
Plataformas permitidas: ${body.platform && body.platform !== 'Todas' ? body.platform : 'TikTok e Instagram Reels'}. Não retorne YouTube Shorts nem qualquer outra plataforma. Período preferido: ${body.period || 'mais recente disponível'}.
Marca de destino: ${brand}. Contexto: ${brandContext}. Categoria obrigatória: ${category}.
Critério específico da categoria: ${categoryCriteria}
O objetivo é encontrar vídeos de outros criadores e adaptar seus padrões, sem copiar, para a marca de destino.
Ignore URLs já entregues: ${(body.exclude || []).join(', ') || 'nenhuma'}.

Regras obrigatórias:
- Retorne no máximo 5 referências fortes; menos se não houver evidência suficiente.
- Cada source deve ser obrigatoriamente a URL direta e verificável do vídeo original no TikTok ou Instagram. Não retorne páginas de busca, matérias ou perfis. Nunca invente URL, autor, data ou métrica.
- Use somente números públicos observáveis. Quando indisponível, escreva "Indisponível", nunca zero.
- ${scoreCriteria} Se faltarem métricas ou credenciais, reduza o score e explique em evidence.
- Diferencie vídeo isolado de tendência repetida. Não declare crescimento sem dados; use "Não calculável".
- Respeite o tom da SAFE-K: claro, contemporâneo, humano e premium; nunca punitivo, moralista, alarmista ou hostil à tecnologia.
- Quando a marca for SAFE-K, priorize: advogados de direito educacional ou digital; médicos, psicólogos e pesquisadores falando dentro de sua área; professores, pedagogos, diretores e escolas; demonstrações reais de bolsas/cases com trava. Confirme a credencial na fonte original — jaleco ou legenda não comprovam autoridade.
- Para SAFE-K, busque primeiro dúvidas reais: Lei 15.100/2025 e suas exceções, responsabilidade e privacidade, emergências, uso pedagógico autorizado, atenção e notificações, comunicação com responsáveis, implementação na escola e resistência de alunos. Separe obrigação legal, orientação profissional, experiência institucional e alegação comercial.
- Para SAFE-K, prefira formatos de especialista respondendo pergunta, corte original de entrevista/podcast com origem, mito versus fato, demonstração de implementação e objeção respondida. Conteúdo educacional tem prioridade sobre humor.
- A sequência de produto correta é: chegada, celular colocado na Bag, travamento, aparelho permanece com a pessoa e desbloqueio ao encostar a Bag na base própria.
- Para SAFE-K, toda adaptação deve mostrar concretamente a case: colocar o celular, travar, permanecer com o usuário, liberar, responder objeção ou demonstrar material e rotina. Não entregue apenas conselho abstrato sobre foco.
- Classifique dificuldade assim: Fácil = uma pessoa, um local, celular e case, até cinco planos e sem revisão especializada; Médio = especialista convidado ou duas pessoas, demonstração completa, checagem de fontes ou múltiplos enquadramentos; Difícil = escola real e autorizações, múltiplos especialistas/locações, atores/alunos ou revisão médica/jurídica. A identidade azul da marca nunca altera essa classificação.
- Não faça alegações sobre TDAH, ansiedade, dependência ou tratamento médico. Não prometa produtividade garantida.
- Não reutilize percentuais, depoimentos ou ganhos acadêmicos sem fonte, amostra e contexto verificáveis.
- fit e steps devem ser uma adaptação original para ${brand}.
- Responda em português do Brasil.`;

  let response:Response;
  try{
    response=await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        tools: [{ type: 'web_search_preview', search_context_size: 'high', user_location: { type: 'approximate', country: 'BR', city: 'Sorocaba', region: 'São Paulo' } }],
        input: prompt,
        text: { format: { type: 'json_schema', name: 'trend_results', strict: true, schema } },
        store: false,
      }),
    });
  }catch(reason){
    const detail=reason instanceof Error?reason.message:'erro de rede desconhecido';
    return NextResponse.json({error:`Não foi possível conectar à OpenAI: ${detail}`},{status:502});
  }
  const rawResponse=await response.text();
  if(!rawResponse.trim())return NextResponse.json({error:`A OpenAI respondeu sem conteúdo (HTTP ${response.status}).`},{status:502});
  let data:{ output_text?: string; error?: { message?: string }; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  try{data=JSON.parse(rawResponse)}catch{return NextResponse.json({error:`A OpenAI retornou uma resposta que não é JSON válido (HTTP ${response.status}).`},{status:502})}
  if (!response.ok) return NextResponse.json({ error: data.error?.message || `Falha na pesquisa (HTTP ${response.status}).` }, { status: response.status });
  const outputText = data.output_text || data.output?.flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text;
  if (!outputText) return NextResponse.json({ error: 'A pesquisa não retornou resultados estruturados.' }, { status: 502 });
  let parsed:{trends:Array<Record<string,unknown>>};
  try{parsed=JSON.parse(outputText) as {trends:Array<Record<string,unknown>>}}catch{return NextResponse.json({error:'A resposta da pesquisa chegou incompleta e não pôde ser interpretada.'},{status:502})}
  if(!Array.isArray(parsed.trends))return NextResponse.json({error:'A resposta estruturada não contém a lista de vídeos esperada.'},{status:502});
  const valid = parsed.trends.filter(trend => typeof trend.source === 'string' && /^https:\/\/(www\.)?(tiktok\.com|instagram\.com)\//i.test(trend.source));
  if (!valid.length) return NextResponse.json({ error: 'Nenhum vídeo direto e verificável foi encontrado nesta busca.' }, { status: 502 });
  return NextResponse.json({ trends: valid.map((trend, index) => ({ ...trend, rank: index + 1 })) });
}
