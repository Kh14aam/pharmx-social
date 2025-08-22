-- Migration 002: Voice Feature Tables
-- Creates tables for voice calls, decisions, and chat functionality

-- Table for tracking voice calls
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,                 -- uuid
  a_user_id TEXT NOT NULL,
  b_user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,                       -- set when finished
  end_reason TEXT,                     -- "duration", "hangup", "disconnect", "error"
  FOREIGN KEY (a_user_id) REFERENCES users(id),
  FOREIGN KEY (b_user_id) REFERENCES users(id)
);

-- Table for post-call decisions (Stay in touch / Skip)
CREATE TABLE IF NOT EXISTS voice_decisions (
  id TEXT PRIMARY KEY,                 -- uuid
  call_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice TEXT CHECK (choice IN ('stay','skip')) NOT NULL,
  decided_at TEXT DEFAULT (datetime('now')),
  UNIQUE (call_id, user_id),
  FOREIGN KEY (call_id) REFERENCES calls(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table for chat threads
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,                 -- uuid
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table for chat participants (many-to-many)
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (chat_id, user_id),
  FOREIGN KEY (chat_id) REFERENCES chats(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table for chat messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,                 -- uuid
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_users ON calls(a_user_id, b_user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_call ON voice_decisions(call_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
