-- Migration 002: Voice Feature Tables (Simplified for SQLite)

-- Table for tracking voice calls
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  a_user_id TEXT NOT NULL,
  b_user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT
);

-- Table for post-call decisions
CREATE TABLE IF NOT EXISTS voice_decisions (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('stay','skip')),
  decided_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (call_id, user_id)
);

-- Table for chat threads
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table for chat participants
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- Table for chat messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_users ON calls(a_user_id, b_user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_call ON voice_decisions(call_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
