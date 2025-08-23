-- Migration to fix Google OAuth authentication
-- Run this in your D1 database

-- Add google_id column if it doesn't exist
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Create unique index on google_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update existing users to have google_id = id (for backward compatibility)
UPDATE users SET google_id = id WHERE google_id IS NULL;

-- Note: After running this migration, you may want to:
-- 1. Verify the data integrity
-- 2. Consider if you want to keep the old id column or migrate to use google_id as primary key