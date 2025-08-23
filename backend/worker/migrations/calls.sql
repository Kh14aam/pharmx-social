CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  a_user_id TEXT NOT NULL,
  b_user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT
);
