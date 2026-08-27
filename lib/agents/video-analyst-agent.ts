import type { AgentTrace } from './contracts';

export async function runVideoAnalystAgent(url: string, brand: string, title: string) {
  const response = await fetch('http://127.0.0.1:4317/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, brand, title }), signal: AbortSignal.timeout(15_000) });
  const data = await response.json() as { jobId?: string; error?: string };
  if (!response.ok || !data.jobId) throw new Error(data.error || 'O agente audiovisual não iniciou.');
  const trace: AgentTrace = { agent: 'video-analyst', status: 'completed', detail: `Análise audiovisual enfileirada no job ${data.jobId}.` };
  return { jobId: data.jobId, trace };
}

