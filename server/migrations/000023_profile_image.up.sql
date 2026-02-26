-- Add profile image URL to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT DEFAULT '';
