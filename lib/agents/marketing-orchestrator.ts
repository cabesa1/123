import type { AgentTrace } from './contracts';

type AgentResult = { trace: AgentTrace };
export type QualityAssessment = boolean | string[];

function qualityIssues(assessment: QualityAssessment) {
  if (assessment === true) return [];
  if (assessment === false) return ['O resultado não cumpriu o contrato de qualidade.'];
  return assessment.filter(issue => issue.trim().length > 0);
}

export function createManagerAgent(brand: string, maxAttempts = 3) {
  const trace: AgentTrace[] = [];
  let learnedCorrections: string[] = [];
  return {
    trace,
    add(item: AgentTrace) { trace.push(item); },
    async supervise<T extends AgentResult>(agent: string, task: (attempt: number, feedback: string[]) => Promise<T>, qualityGate: (result: T) => QualityAssessment, failureDetail: string) {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await task(attempt, [...learnedCorrections]);
          trace.push({ ...result.trace, attempt, brand });
          const issues = qualityIssues(qualityGate(result));
          if (issues.length === 0) {
            trace.push({ agent: 'manager', status: 'completed', attempt, decision: 'approved', brand, detail: `${agent} aprovado após validação estrita${learnedCorrections.length ? ` e ${learnedCorrections.length} correção(ões)` : ''}.` });
            return result;
          }
          learnedCorrections = [...new Set([...learnedCorrections, ...issues])];
          const retry = attempt < maxAttempts;
          trace.push({ agent: 'manager', status: retry ? 'completed' : 'failed', attempt, decision: retry ? 'retry' : 'blocked', brand, detail: retry ? `${agent} reprovado. Correções obrigatórias: ${issues.join(' | ')}` : `${failureDetail} Pendências: ${learnedCorrections.join(' | ')}` });
        } catch (error) {
          lastError = error;
          const issue = error instanceof Error ? error.message : failureDetail;
          learnedCorrections = [...new Set([...learnedCorrections, `Corrigir falha de execução: ${issue}`])];
          trace.push({ agent, status: 'failed', attempt, brand, detail: issue });
          const retry = attempt < maxAttempts;
          trace.push({ agent: 'manager', status: retry ? 'completed' : 'failed', attempt, decision: retry ? 'retry' : 'blocked', brand, detail: retry ? `${agent} falhou. A próxima tentativa deve corrigir: ${issue}` : failureDetail });
        }
      }
      throw lastError instanceof Error ? lastError : new Error(`${failureDetail}${learnedCorrections.length ? ` ${learnedCorrections.join(' | ')}` : ''}`);
    },
    specialists() { return [...new Set(trace.filter(item => item.agent !== 'manager').map(item => item.agent))]; },
    summary() {
      const blocked = trace.some(item => item.agent === 'manager' && item.decision === 'blocked');
      return { manager: 'marketing-manager-strict', brand, maxAttempts, status: blocked ? 'blocked' : 'approved', decisions: trace.filter(item => item.agent === 'manager').length, correctionsLearned: learnedCorrections.length, qualityPolicy: 'evidence-first' };
    },
  };
}

export type ManagerAgent = ReturnType<typeof createManagerAgent>;
