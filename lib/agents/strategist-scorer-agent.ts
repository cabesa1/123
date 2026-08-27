import type { AgentTrace, VerifiedVideo } from './contracts';

function compactNumber(value: number | undefined) {
  return value === undefined ? 'Indisponível' : new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function percentile(value: number, values: number[]) {
  if (values.length < 2) return 50;
  const below = values.filter(candidate => candidate < value).length;
  const equal = values.filter(candidate => candidate === value).length;
  return Math.round(((below + (equal - 1) / 2) / (values.length - 1)) * 100);
}

export function runStrategistScorerAgent(candidates: Array<Record<string, unknown>>, verified: VerifiedVideo[]) {
  const bySource = new Map(verified.map(video => [video.source, video]));
  const usable = candidates.flatMap(candidate => {
    const verification = bySource.get(String(candidate.source || ''));
    return verification?.metadata?.viewCount !== undefined ? [{ candidate, verification }] : [];
  });
  const viewValues = usable.map(item => item.verification.metadata!.viewCount!);
  const engagementValues = usable.flatMap(item => item.verification.metadata?.likeCount !== undefined && item.verification.metadata.viewCount ? [item.verification.metadata.likeCount / item.verification.metadata.viewCount] : []);
  const trends = usable.map(({ candidate, verification }) => {
    const metadata = verification.metadata!;
    const viewScore = percentile(metadata.viewCount!, viewValues);
    const engagement = metadata.likeCount !== undefined && metadata.viewCount ? metadata.likeCount / metadata.viewCount : undefined;
    const score = engagement === undefined ? viewScore : Math.round(viewScore * .7 + percentile(engagement, engagementValues) * .3);
    return { ...candidate, score, title: metadata.title || verification.title || 'Vídeo confirmado', creator: metadata.creator || verification.creator || 'Indisponível', publishedAt: metadata.uploadDate || 'Indisponível', views: compactNumber(metadata.viewCount), likes: compactNumber(metadata.likeCount), growth: 'Não calculável sem duas capturas', verification: 'Conteúdo confirmado' as const, observedContent: verification.observed, evidence: `Métricas lidas diretamente do vídeo. Pontuação relativa: visualizações (70%) e engajamento disponível (30%) em ${usable.length} resultado(s).` };
  }).sort((a, b) => b.score - a.score).slice(0, 5).map((trend, index) => ({ ...trend, rank: index + 1 }));
  const trace: AgentTrace = { agent: 'strategist-scorer', status: trends.length ? 'completed' : 'failed', detail: `${trends.length} oportunidade(s) classificadas com evidência numérica.` };
  return { trends, trace };
}

