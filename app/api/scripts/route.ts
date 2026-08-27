import { NextRequest, NextResponse } from 'next/server';
import { runHookScriptwriterAgent } from '@/lib/agents/hook-scriptwriter-agent';
import { createManagerAgent } from '@/lib/agents/marketing-orchestrator';

export const runtime = 'nodejs';

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
    const result = await manager.supervise('hook-scriptwriter', () => runHookScriptwriterAgent(brand, body.category || 'não informada', body.trend, schema), candidate => Boolean(candidate.script?.chosenHook && Array.isArray(candidate.script?.scenes) && candidate.script.scenes.length >= 3), 'O roteiro não passou nos critérios de gancho e cenas após duas tentativas.');
    return NextResponse.json({ script: result.script, specialistsUsed: result.specialists, agentTrace: manager.trace, manager: manager.summary() });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Falha desconhecida.';
    return NextResponse.json({ error: message === 'OPENAI_API_KEY_NOT_CONFIGURED' ? message : `Não foi possível gerar o roteiro: ${message}` }, { status: 502 });
  }
}
