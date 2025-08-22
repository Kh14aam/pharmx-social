-- Voice decisions table
CREATE TABLE IF NOT EXISTS voice_decisions (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('stay','skip')),
  decided_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (call_id, user_id)
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chat participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calls_users ON calls(a_user_id, b_user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_call ON voice_decisions(call_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
