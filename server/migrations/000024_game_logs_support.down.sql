DROP TABLE IF EXISTS support_replies;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS game_logs;
ALTER TABLE announcements DROP COLUMN IF EXISTS published_at;
ALTER TABLE announcements DROP COLUMN IF EXISTS category;
