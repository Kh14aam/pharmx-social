-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  auth0_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  gender TEXT CHECK(gender IN ('male', 'female')),
  date_of_birth DATE,
  avatar TEXT,
  avatar_url TEXT,
  image_key TEXT,
  bio TEXT,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  last_message_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id),
  FOREIGN KEY (user2_id) REFERENCES users(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Voice calls table (updated to match code expectations)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  a_user_id TEXT NOT NULL,
  b_user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT CHECK(end_reason IN ('duration', 'hangup', 'disconnect', 'error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (a_user_id) REFERENCES users(id),
  FOREIGN KEY (b_user_id) REFERENCES users(id)
);

-- Voice decisions table (for post-call choices)
CREATE TABLE IF NOT EXISTS voice_decisions (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  choice TEXT CHECK (choice IN ('stay','skip')) NOT NULL,
  decided_at TEXT DEFAULT (datetime('now')),
  UNIQUE (call_id, user_id),
  FOREIGN KEY (call_id) REFERENCES calls(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_chats_user1 ON chats(user1_id);
CREATE INDEX idx_chats_user2 ON chats(user2_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_calls_users ON calls(a_user_id, b_user_id);
CREATE INDEX idx_decisions_call ON voice_decisions(call_id);
CREATE INDEX idx_users_auth0 ON users(auth0_id);
