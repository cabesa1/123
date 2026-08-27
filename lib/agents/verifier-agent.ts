import { inspectWithYtDlp } from '@/app/api/search/ytdlp';
import type { AgentTrace, VerifiedVideo } from './contracts';
import { verifyWithBrightData } from './brightdata-provider';

function compactNumber(value: number | undefined) {
  return value === undefined ? undefined : new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export async function runVerifierAgent(sources: string[]) {
  const provider = process.env.VIDEO_DATA_PROVIDER === 'brightdata' ? 'brightdata' : 'yt-dlp';
  const videos = provider === 'brightdata' ? await verifyWithBrightData(sources) : await Promise.all(sources.map(async (source): Promise<VerifiedVideo> => {
    try {
      const metadata = await inspectWithYtDlp(source);
      if (metadata) {
        const facts = [
          metadata.creator && `autor ${metadata.creator}`,
          metadata.duration !== undefined && `duração ${Math.round(metadata.duration)}s`,
          metadata.viewCount !== undefined && `${compactNumber(metadata.viewCount)} visualizações`,
          metadata.likeCount !== undefined && `${compactNumber(metadata.likeCount)} curtidas`,
        ].filter(Boolean).join(', ');
        return { source, status: 'Conteúdo confirmado', creator: metadata.creator, metadata, observed: `Vídeo lido automaticamente pelo yt-dlp${facts ? `: ${facts}` : ''}.` };
      }
      const url = new URL(source);
      if (url.hostname.replace(/^www\./, '') === 'tiktok.com') {
        const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(source)}`, { signal: AbortSignal.timeout(8_000), headers: { Accept: 'application/json' } });
        if (response.ok) {
          const data = await response.json() as { title?: string; author_name?: string };
          if (data.title || data.author_name) return { source, status: 'Conteúdo confirmado', title: data.title, creator: data.author_name, observed: 'Vídeo confirmado pelo TikTok, mas sem métricas suficientes para pontuação.' };
        }
      }
      return { source, status: 'Inacessível', observed: 'A plataforma não liberou conteúdo e métricas para verificação.' };
    } catch {
      return { source, status: 'Inacessível', observed: 'A plataforma bloqueou ou não respondeu à verificação.' };
    }
  }));
  const confirmed = videos.filter(video => video.status === 'Conteúdo confirmado' && video.metadata?.viewCount !== undefined);
  const trace: AgentTrace = { agent: 'verifier', status: confirmed.length ? 'completed' : 'failed', detail: `${confirmed.length} de ${sources.length} vídeo(s) possuem visualizações verificadas via ${provider}.` };
  return { videos, confirmed, trace };
}
