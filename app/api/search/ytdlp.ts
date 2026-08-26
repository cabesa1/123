export type YtDlpMetadata = {
  title?: string;
  creator?: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  uploadDate?: string;
};

export async function inspectWithYtDlp(source: string): Promise<YtDlpMetadata | null> {
  try {
    const response=await fetch('http://127.0.0.1:4317/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:source}),signal:AbortSignal.timeout(30_000)});
    if(!response.ok)return null;
    return await response.json() as YtDlpMetadata;
  } catch {
    return null;
  }
}
