import { NextRequest, NextResponse } from 'next/server';
import { runReporterAgent } from '@/lib/agents/reporter-agent';
import { createManagerAgent } from '@/lib/agents/marketing-orchestrator';

export const runtime = 'nodejs';

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string' }, summary: { type: 'string' }, reportingWindow: { type: 'string' },
    specialists: { type: 'array', items: { type: 'string' } },
    funnel: { type: 'object', additionalProperties: false, properties: { researched: { type: 'integer' }, selected: { type: 'integer' }, easy: { type: 'integer' }, medium: { type: 'integer' }, hard: { type: 'integer' } }, required: ['researched','selected','easy','medium','hard'] },
    opportunities: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, source: { type: 'string' }, status: { type: 'string' }, evidence: { type: 'string' }, nextAction: { type: 'string' } }, required: ['title','source','status','evidence','nextAction'] } },
    limitations: { type: 'array', items: { type: 'string' } }, nextActions: { type: 'array', items: { type: 'string' } },
  }, required: ['title','summary','reportingWindow','specialists','funnel','opportunities','limitations','nextActions'],
} as const;

export async function POST(request: NextRequest) {
  let body: { brand?: string; category?: string; trends?: unknown[]; selected?: unknown[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  const brand = body.brand === 'SAFE-K' ? 'SAFE-K' : 'Economize.vc';
  const trends = Array.isArray(body.trends) ? body.trends : [];
  const selected = Array.isArray(body.selected) ? body.selected : [];
  try {
    const manager = createManagerAgent(brand);
    const result = await manager.supervise('reporter', () => runReporterAgent(brand, body.category || 'não informada', trends, selected, schema), candidate => Boolean(candidate.report?.title && Array.isArray(candidate.report?.opportunities) && candidate.report.opportunities.length <= 5), 'O relatório não passou no contrato após duas tentativas.');
    return NextResponse.json({ report: result.report, specialistsUsed: result.specialists, agentTrace: manager.trace, manager: manager.summary() });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Falha desconhecida.';
    return NextResponse.json({ error: message === 'OPENAI_API_KEY_NOT_CONFIGURED' ? message : `Não foi possível gerar o relatório: ${message}` }, { status: 502 });
  }
}
