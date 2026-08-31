import type { VerifiedVideo } from './contracts';

const INSTAGRAM_REELS_DATASET = 'gd_lyclm20il4r5helnj';
const TIKTOK_POSTS_DATASET = 'gd_lu702nij2f790tmv9h';

type BrightRecord = Record<string, unknown>;

function number(record: BrightRecord, ...keys: string[]) {
  for (const key of keys) if (typeof record[key] === 'number') return record[key] as number;
  return undefined;
}

function string(record: BrightRecord, ...keys: string[]) {
  for (const key of keys) if (typeof record[key] === 'string') return record[key] as string;
  return undefined;
}

async function scrape(datasetId: string, sources: string[]) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error('BRIGHTDATA_API_TOKEN_NOT_CONFIGURED');
  const response = await fetch(`https://api.brightdata.com/datasets/v3/scrape?dataset_id=${datasetId}&format=json&include_errors=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: sources.map(url => ({ url })) }),
    signal: AbortSignal.timeout(65_000),
  });
  const raw = await response.text();
  let data: BrightRecord[] | { snapshot_id?: string; error?: string; message?: string };
  try { data = JSON.parse(raw) as typeof data; }
  catch { throw new Error(`Bright Data respondeu HTTP ${response.status}: ${raw.slice(0, 240) || 'resposta vazia'}`); }
  if (!response.ok) throw new Error(!Array.isArray(data) ? data.error || data.message || `Bright Data respondeu HTTP ${response.status}.` : `Bright Data respondeu HTTP ${response.status}.`);
  if (!Array.isArray(data)) throw new Error(data.snapshot_id ? `A coleta virou job assíncrono (${data.snapshot_id}); tente novamente em instantes.` : 'Bright Data não retornou registros.');
  return data;
}

function mapped(source: string, record: BrightRecord, platform: 'Instagram' | 'TikTok'): VerifiedVideo {
  const viewCount = number(record, 'views', 'video_play_count', 'play_count');
  const likeCount = number(record, 'likes', 'digg_count');
  const metadata = {
    title: string(record, 'description', 'caption'),
    creator: string(record, 'user_posted', 'profile_username', 'author_name'),
    duration: number(record, 'length', 'video_duration'),
    viewCount,
    likeCount,
    commentCount: number(record, 'num_comments', 'comment_count'),
    uploadDate: string(record, 'date_posted', 'create_time'),
  };
  return viewCount === undefined
    ? { source, status: 'Inacessível', observed: `${platform}: registro recebido sem visualizações.` }
    : { source, status: 'Conteúdo confirmado', title: metadata.title, creator: metadata.creator, metadata, observed: `Métricas coletadas em tempo real pelo provedor Bright Data para ${platform}.` };
}

export async function verifyWithBrightData(sources: string[]) {
  const instagram = sources.filter(source => source.includes('instagram.com/'));
  const tiktok = sources.filter(source => source.includes('tiktok.com/'));
  const [instagramRecords, tiktokRecords] = await Promise.all([
    instagram.length ? scrape(INSTAGRAM_REELS_DATASET, instagram) : Promise.resolve([]),
    tiktok.length ? scrape(TIKTOK_POSTS_DATASET, tiktok) : Promise.resolve([]),
  ]);
  return [
    ...instagram.map((source, index) => mapped(source, instagramRecords[index] || {}, 'Instagram')),
    ...tiktok.map((source, index) => mapped(source, tiktokRecords[index] || {}, 'TikTok')),
  ];
}
