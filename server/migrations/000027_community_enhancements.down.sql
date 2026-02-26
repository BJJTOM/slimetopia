-- Rollback community enhancements

DROP TABLE IF EXISTS community_poll_votes CASCADE;
DROP TABLE IF EXISTS community_polls CASCADE;

DROP TRIGGER IF EXISTS trg_community_posts_search ON community_posts;
DROP FUNCTION IF EXISTS community_posts_search_trigger();
DROP INDEX IF EXISTS idx_posts_search;
ALTER TABLE community_posts DROP COLUMN IF EXISTS search_vector;

DROP TABLE IF EXISTS community_bookmarks CASCADE;
ALTER TABLE community_posts DROP COLUMN IF EXISTS bookmark_count;

DROP TABLE IF EXISTS community_post_reactions CASCADE;
ALTER TABLE community_posts DROP COLUMN IF EXISTS reaction_counts;
