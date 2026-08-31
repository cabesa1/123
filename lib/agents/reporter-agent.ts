import { loadReportInstructions } from '@/lib/agent-skills';
import { generateStructured } from '@/lib/openai-client';
import type { AgentTrace } from './contracts';

export async function runReporterAgent(brand: string, category: string, trends: unknown[], selected: unknown[], schema: Record<string, unknown>, managerFeedback: string[] = []) {
  const runtime = await loadReportInstructions(brand);
  const input = `Gere o relatório da sessão atual para ${brand}, categoria ${category}. Data local: ${new Date().toISOString()}.\nResultados reais:\n${JSON.stringify(trends)}\nSelecionados:\n${JSON.stringify(selected)}\nNão invente produção, publicação ou métricas.`;
  const reviewedInput = `${input}${managerFeedback.length ? `\nCORREÇÕES OBRIGATÓRIAS DO GERENTE:\n- ${managerFeedback.join('\n- ')}` : ''}`;
  const output = await generateStructured(runtime.instructions, reviewedInput, schema, 'marketing_report');
  const trace: AgentTrace = { agent: 'reporter', status: 'completed', detail: `${trends.length} resultado(s) consolidados; ${selected.length} selecionado(s).` };
  return { report: JSON.parse(output), specialists: runtime.specialists, trace };
}
