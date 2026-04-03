CREATE TABLE IF NOT EXISTS transfers (
  event_id UUID PRIMARY KEY, -- Changed from TEXT to UUID
  station_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfers_station_id ON transfers (station_id);
