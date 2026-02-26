-- Allow shorts without video (card-based shorts)
ALTER TABLE shorts ALTER COLUMN video_url SET DEFAULT '';
ALTER TABLE shorts ALTER COLUMN video_url DROP NOT NULL;
