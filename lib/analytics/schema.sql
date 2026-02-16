-- ============================================================
-- Tunnel Analytics — Neon Postgres
-- Run this ONCE on the Neon console to create the tables.
-- ============================================================

-- 1. Main events table — every single event from the tunnel
CREATE TABLE IF NOT EXISTS tunnel_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Identifiers
  session_id      TEXT NOT NULL,
  lead_tunnel_id  TEXT,
  backoffice_lead_id TEXT,

  -- Event
  event_type      TEXT NOT NULL,
  logical_step    TEXT,
  screen_id       TEXT,

  -- Acquisition (captured from URL params)
  source          TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  gclid           TEXT,
  fbclid          TEXT,
  referrer        TEXT,
  landing_url     TEXT,

  -- Geo (enriched server-side via Vercel/CF headers)
  country         TEXT,
  region          TEXT,
  city_geo        TEXT,

  -- Device (from browser)
  device          TEXT,
  user_agent      TEXT,
  screen_width    INT,
  screen_height   INT,
  language        TEXT,
  timezone        TEXT,
  connection_type TEXT,

  -- Tunnel context
  url_path        TEXT NOT NULL,
  email           TEXT,
  is_test_user    BOOLEAN NOT NULL DEFAULT false,

  -- Rich snapshots (JSON)
  form_snapshot   JSONB,
  pricing_snapshot JSONB,

  -- Extensible extra payload
  extra           JSONB,

  -- Client vs server timestamp
  client_timestamp TIMESTAMPTZ
);

-- 2. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_te_created_at ON tunnel_events (created_at);
CREATE INDEX IF NOT EXISTS idx_te_session ON tunnel_events (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_te_source ON tunnel_events (source, created_at);
CREATE INDEX IF NOT EXISTS idx_te_event_step ON tunnel_events (event_type, logical_step, created_at);
CREATE INDEX IF NOT EXISTS idx_te_test_user ON tunnel_events (is_test_user, created_at);
CREATE INDEX IF NOT EXISTS idx_te_country ON tunnel_events (country, created_at);
CREATE INDEX IF NOT EXISTS idx_te_device ON tunnel_events (device, created_at);

-- 3. Aggregated sessions table (populated via upsert on each event)
CREATE TABLE IF NOT EXISTS tunnel_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Acquisition (frozen at first event)
  source          TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  referrer        TEXT,
  country         TEXT,
  device          TEXT,
  landing_url     TEXT,

  -- Outcome
  backoffice_lead_id TEXT,
  completed       BOOLEAN NOT NULL DEFAULT false,
  last_step       TEXT,
  max_step_index  INT DEFAULT 0,
  total_duration_ms INT,
  events_count    INT NOT NULL DEFAULT 1,

  -- Flags
  is_test_user    BOOLEAN NOT NULL DEFAULT false,
  email           TEXT
);

CREATE INDEX IF NOT EXISTS idx_ts_created_at ON tunnel_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_ts_source ON tunnel_sessions (source, created_at);
CREATE INDEX IF NOT EXISTS idx_ts_completed ON tunnel_sessions (completed, created_at);
CREATE INDEX IF NOT EXISTS idx_ts_session_id ON tunnel_sessions (session_id);
