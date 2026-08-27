export type AgentTrace = {
  agent: string;
  status: 'completed' | 'skipped' | 'failed';
  detail: string;
  attempt?: number;
  decision?: 'approved' | 'retry' | 'blocked';
  brand?: string;
};

export type VerifiedVideo = {
  source: string;
  status: 'Conteúdo confirmado' | 'Inacessível';
  observed: string;
  title?: string;
  creator?: string;
  metadata?: {
    title?: string;
    creator?: string;
    duration?: number;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    uploadDate?: string;
  };
};
