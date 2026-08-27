import { loadScriptInstructions } from '@/lib/agent-skills';
import { generateStructured } from '@/lib/openai-client';
import type { AgentTrace } from './contracts';

export async function runHookScriptwriterAgent(brand: string, category: string, trend: unknown, schema: Record<string, unknown>) {
  const runtime = await loadScriptInstructions(brand);
  const output = await generateStructured(runtime.instructions, `Crie um roteiro original para ${brand}, categoria ${category}, usando exclusivamente esta referência verificada:\n${JSON.stringify(trend)}\nNão faça nova pesquisa. Marque afirmações sem prova em approvals.`, schema, 'production_script');
  const trace: AgentTrace = { agent: 'hook-scriptwriter', status: 'completed', detail: 'Gancho e roteiro produzidos a partir de uma referência verificada.' };
  return { script: JSON.parse(output), specialists: runtime.specialists, trace };
}

