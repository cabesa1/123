CREATE TABLE IF NOT EXISTS saved_trends (
  key TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_trends_brand_idx ON saved_trends (brand);
