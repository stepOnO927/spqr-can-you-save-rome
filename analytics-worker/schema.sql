CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  version TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  last_sequence INTEGER NOT NULL,
  page_ms INTEGER NOT NULL DEFAULT 0,
  foreground_ms INTEGER NOT NULL DEFAULT 0,
  active_ms INTEGER NOT NULL DEFAULT 0,
  actions INTEGER NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  game_started INTEGER NOT NULL DEFAULT 0,
  tutorial_completed INTEGER NOT NULL DEFAULT 0,
  ended INTEGER NOT NULL DEFAULT 0,
  campaign TEXT NOT NULL DEFAULT '',
  civilization TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT 'unknown',
  confidence REAL NOT NULL DEFAULT 0,
  reasons TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_sessions_seen ON sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_channel ON sessions(channel,last_seen);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  campaign TEXT NOT NULL DEFAULT '',
  civilization TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name,received_at);

