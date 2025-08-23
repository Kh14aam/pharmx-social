-- Add missing profile fields to users table
ALTER TABLE users ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female'));
ALTER TABLE users ADD COLUMN date_of_birth DATE;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN image_key TEXT;
