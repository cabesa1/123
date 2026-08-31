import { NextRequest, NextResponse } from 'next/server';
import { runHookScriptwriterAgent } from '@/lib/agents/hook-scriptwriter-agent';
import { createManagerAgent } from '@/lib/agents/marketing-orchestrator';

export const runtime = 'nodejs';

function scriptQuality(candidate: Awaited<ReturnType<typeof runHookScriptwriterAgent>>) {
  const script = candidate.script;
  const issues: string[] = [];
  if (!script?.chosenHook?.trim()) issues.push('Criar um gancho principal específico.');
  if (!Array.isArray(script?.alternativeHooks) || script.alternativeHooks.length !== 2 || script.alternativeHooks.some((hook: string) => !hook.trim())) issues.push('Entregar exatamente dois ganchos alternativos válidos.');
  if (!Array.isArray(script?.scenes) || script.scenes.length < 3 || script.scenes.length > 8) issues.push('Estruturar de 3 a 8 cenas.');
  if (script?.scenes?.some((scene: { time?: string; shot?: string; action?: string; purpose?: string }) => !scene.time?.trim() || !scene.shot?.trim() || !scene.action?.trim() || !scene.purpose?.trim())) issues.push('Toda cena precisa de tempo, enquadramento, ação e propósito.');
  if (!script?.cta?.trim()) issues.push('Incluir CTA claro.');
  if (!script?.caption?.trim() || !script?.coverText?.trim()) issues.push('Incluir legenda e texto de capa.');
  if (!Array.isArray(script?.filmingChecklist) || script.filmingChecklist.length === 0) issues.push('Incluir checklist de gravação.');
  return issues.length ? issues : true;
}

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    objective: { type: 'string' }, format: { type: 'string' }, duration: { type: 'string' }, difficulty: { type: 'string', enum: ['Fácil', 'Médio', 'Difícil'] },
    resources: { type: 'array', items: { type: 'string' } }, chosenHook: { type: 'string' }, alternativeHooks: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } },
    scenes: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', additionalProperties: false, properties: {
      time: { type: 'string' }, shot: { type: 'string' }, action: { type: 'string' }, spokenLine: { type: 'string' }, onScreenText: { type: 'string' }, edit: { type: 'string' }, purpose: { type: 'string' },
    }, required: ['time','shot','action','spokenLine','onScreenText','edit','purpose'] } },
    caption: { type: 'string' }, cta: { type: 'string' }, coverText: { type: 'string' }, titles: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    filmingChecklist: { type: 'array', items: { type: 'string' } }, editingChecklist: { type: 'array', items: { type: 'string' } }, approvals: { type: 'array', items: { type: 'string' } }, simplerVersion: { type: 'string' },
  },
  required: ['objective','format','duration','difficulty','resources','chosenHook','alternativeHooks','scenes','caption','cta','coverText','titles','filmingChecklist','editingChecklist','approvals','simplerVersion'],
} as const;

export async function POST(request: NextRequest) {
  let body: { brand?: string; category?: string; trend?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  if (!body.trend || typeof body.trend !== 'object') return NextResponse.json({ error: 'Selecione uma referência válida.' }, { status: 400 });
  const brand = body.brand === 'SAFE-K' ? 'SAFE-K' : 'Economize.vc';
  try {
    const manager = createManagerAgent(brand);
    const result = await manager.supervise('hook-scriptwriter', (_attempt, feedback) => runHookScriptwriterAgent(brand, body.category || 'não informada', body.trend, schema, feedback), scriptQuality, 'O roteiro não passou no contrato estrito após três tentativas.');
    return NextResponse.json({ script: result.script, specialistsUsed: result.specialists, agentTrace: manager.trace, manager: manager.summary() });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Falha desconhecida.';
    return NextResponse.json({ error: message === 'OPENAI_API_KEY_NOT_CONFIGURED' ? message : `Não foi possível gerar o roteiro: ${message}` }, { status: 502 });
  }
}
