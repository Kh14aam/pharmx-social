-- Drop existing profile fields from users table to ensure a clean state
ALTER TABLE users DROP COLUMN gender;
ALTER TABLE users DROP COLUMN date_of_birth;
ALTER TABLE users DROP COLUMN avatar_url;
ALTER TABLE users DROP COLUMN image_key;
