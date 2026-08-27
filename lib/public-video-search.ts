function decode(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function acceptedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    return host.endsWith('tiktok.com') || (host === 'instagram.com' && /^\/(?:reel|reels|p)\//.test(url.pathname));
  } catch { return false; }
}

async function searchBing(query: string) {
  const response = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return [];
  const xml = await response.text();
  return [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/gi)].map(match => decode(match[1].trim()));
}

async function searchDuckDuckGo(query: string) {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return [];
  const html = await response.text();
  return [...html.matchAll(/uddg=([^&"']+)/gi)].map(match => decodeURIComponent(match[1]));
}

export async function discoverPublicVideoUrls(query: string, platform: string) {
  const scopes = platform === 'TikTok'
    ? ['site:tiktok.com/@ inurl:/video/']
    : platform === 'Instagram'
      ? ['site:instagram.com/reel/']
      : ['site:tiktok.com/@ inurl:/video/', 'site:instagram.com/reel/'];
  const searches = scopes.map(scope => `${scope} ${query}`);
  const batches = await Promise.all(searches.flatMap(search => [searchBing(search), searchDuckDuckGo(search)]));
  return [...new Set(batches.flat().filter(acceptedVideoUrl))].slice(0, 20);
}
