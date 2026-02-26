DROP TABLE IF EXISTS community_post_views;
DROP TABLE IF EXISTS community_blocks;
DROP TABLE IF EXISTS community_reports;
ALTER TABLE community_replies DROP COLUMN IF EXISTS parent_id;
ALTER TABLE community_replies DROP COLUMN IF EXISTS reply_count;
ALTER TABLE community_posts DROP COLUMN IF EXISTS image_urls;
ALTER TABLE community_posts DROP COLUMN IF EXISTS view_count;
