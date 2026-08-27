import type { AgentTrace } from './contracts';

type AgentResult = { trace: AgentTrace };

export function createManagerAgent(brand: string, maxAttempts = 2) {
  const trace: AgentTrace[] = [];
  return {
    trace,
    add(item: AgentTrace) { trace.push(item); },
    async supervise<T extends AgentResult>(agent: string, task: (attempt: number) => Promise<T>, qualityGate: (result: T) => boolean, failureDetail: string) {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await task(attempt);
          trace.push({ ...result.trace, attempt, brand });
          if (qualityGate(result)) {
            trace.push({ agent: 'manager', status: 'completed', attempt, decision: 'approved', brand, detail: `${agent} aprovado pelo controle de qualidade.` });
            return result;
          }
          trace.push({ agent: 'manager', status: attempt < maxAttempts ? 'completed' : 'failed', attempt, decision: attempt < maxAttempts ? 'retry' : 'blocked', brand, detail: attempt < maxAttempts ? `${agent} não passou no critério; nova tentativa autorizada.` : failureDetail });
        } catch (error) {
          lastError = error;
          trace.push({ agent, status: 'failed', attempt, brand, detail: error instanceof Error ? error.message : failureDetail });
          trace.push({ agent: 'manager', status: attempt < maxAttempts ? 'completed' : 'failed', attempt, decision: attempt < maxAttempts ? 'retry' : 'blocked', brand, detail: attempt < maxAttempts ? `${agent} falhou; nova tentativa autorizada.` : failureDetail });
        }
      }
      throw lastError instanceof Error ? lastError : new Error(failureDetail);
    },
    specialists() { return [...new Set(trace.filter(item => item.agent !== 'manager').map(item => item.agent))]; },
    summary() {
      const blocked = trace.some(item => item.agent === 'manager' && item.decision === 'blocked');
      return { manager: 'marketing-manager', brand, maxAttempts, status: blocked ? 'blocked' : 'approved', decisions: trace.filter(item => item.agent === 'manager').length };
    },
  };
}

export type ManagerAgent = ReturnType<typeof createManagerAgent>;
