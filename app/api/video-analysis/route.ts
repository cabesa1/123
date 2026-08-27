import { NextRequest, NextResponse } from 'next/server';
import { runVideoAnalystAgent } from '@/lib/agents/video-analyst-agent';
import { createManagerAgent } from '@/lib/agents/marketing-orchestrator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { url?: string; brand?: string; title?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  if (!body.url) return NextResponse.json({ error: 'Informe o link direto do vídeo.' }, { status: 400 });
  try {
    const brand = body.brand === 'SAFE-K' ? 'SAFE-K' : 'Economize.vc';
    const manager = createManagerAgent(brand);
    const result = await manager.supervise('video-analyst', () => runVideoAnalystAgent(body.url!, brand, body.title || ''), candidate => Boolean(candidate.jobId), 'O agente audiovisual não iniciou após duas tentativas.');
    return NextResponse.json({ jobId: result.jobId, agentTrace: manager.trace, manager: manager.summary() }, { status: 202 });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : 'Falha no agente audiovisual.' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o job da análise.' }, { status: 400 });
  try {
    const response = await fetch(`http://127.0.0.1:4317/analyze?id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10_000) });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'O processador audiovisual local não respondeu.' }, { status: 502 });
  }
}
