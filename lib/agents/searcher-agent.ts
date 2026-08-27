import { discoverPublicVideoUrls } from '@/lib/public-video-search';
import type { AgentTrace } from './contracts';

export async function runSearcherAgent(query: string, platform: string) {
  const urls = await discoverPublicVideoUrls(query, platform);
  const trace: AgentTrace = {
    agent: 'searcher',
    status: urls.length ? 'completed' : 'failed',
    detail: `${urls.length} URL(s) direta(s) encontrada(s) em fontes públicas.`,
  };
  return { urls, trace };
}

