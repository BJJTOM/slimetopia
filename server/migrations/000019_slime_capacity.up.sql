-- Add slime capacity column to users (default 30, expandable up to 999)
ALTER TABLE users ADD COLUMN IF NOT EXISTS slime_capacity INT NOT NULL DEFAULT 30;
