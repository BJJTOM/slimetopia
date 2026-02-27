-- Rollback nurture & merge enhancement

DROP TABLE IF EXISTS game_awakening_costs CASCADE;
DROP TABLE IF EXISTS slime_skills CASCADE;
DROP TABLE IF EXISTS game_species_skills CASCADE;
DROP TABLE IF EXISTS game_skills CASCADE;

ALTER TABLE training_slots DROP COLUMN IF EXISTS training_mode;

ALTER TABLE slimes DROP COLUMN IF EXISTS star_level;
ALTER TABLE slimes DROP COLUMN IF EXISTS talent_lck;
ALTER TABLE slimes DROP COLUMN IF EXISTS talent_cha;
ALTER TABLE slimes DROP COLUMN IF EXISTS talent_int;
ALTER TABLE slimes DROP COLUMN IF EXISTS talent_spd;
ALTER TABLE slimes DROP COLUMN IF EXISTS talent_vit;
ALTER TABLE slimes DROP COLUMN IF EXISTS talent_str;
