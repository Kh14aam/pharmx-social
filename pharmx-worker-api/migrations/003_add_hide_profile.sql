-- Add hide_profile field to users table
ALTER TABLE users ADD COLUMN hide_profile BOOLEAN DEFAULT FALSE;
