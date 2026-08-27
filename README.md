# Viral Trend Curator

## Rodar localmente com PostgreSQL

Pré-requisitos: Node.js 22+ e Docker Desktop.

```powershell
npm install
npm run db:up
npm run dev
```

Abra `http://localhost:3000`. O PostgreSQL roda em `localhost:5432` e os favoritos ficam no volume Docker `viral_trend_postgres_data`.

O projeto usa, por padrão:

```text
DATABASE_URL=postgresql://trend_app:trend_app_local@127.0.0.1:5432/viral_trends
```

Para acompanhar o banco:

```powershell
npm run db:logs
```

Para parar os contêineres sem apagar os dados:

```powershell
npm run db:down
```

Não use `docker compose down -v` se quiser preservar as ideias salvas.
# Provedores de dados de vídeo

O aplicativo suporta dois modos de verificação:

- `VIDEO_DATA_PROVIDER=ytdlp`: gratuito e local, mas Instagram e TikTok podem bloquear métricas ou exigir cookies.
- `VIDEO_DATA_PROVIDER=brightdata`: coleta estruturada de Reels e TikToks por API, sem reutilizar cookies do navegador.

Para ativar Bright Data, coloque somente no `.env.local`:

```env
VIDEO_DATA_PROVIDER=brightdata
BRIGHTDATA_API_TOKEN=seu_token
```

Reinicie `npm run dev` depois de alterar o provedor. Nunca envie o token ao GitHub.
