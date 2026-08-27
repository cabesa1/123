import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://trend_app:trend_app_local@127.0.0.1:5432/viral_trends';

const globalForDatabase = globalThis as typeof globalThis & { trendDatabasePool?: Pool };

export const database = globalForDatabase.trendDatabasePool || new Pool({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 3000,
});

if (process.env.NODE_ENV !== 'production') globalForDatabase.trendDatabasePool = database;
