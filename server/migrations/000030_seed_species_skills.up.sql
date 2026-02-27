-- ===== Seed game_species_skills: map every species to learnable skills =====
-- Rules:
--   Slot 1 (Lv.5):  element-matching common skill  OR universal uncommon
--   Slot 2 (Lv.10): element-matching rare skill     OR universal rare
--   Slot 3 (Lv.20): element-matching epic/legendary  OR universal uncommon (Fighting Spirit)
-- Species without a direct element skill get a universal fallback.

-- Helper: get skill IDs by name_en (from 000029 seed)
-- water:  1=Water Blessing(common,5), 2=Healing Wave(rare,10), 3=Tsunami(epic,20)
-- fire:   4=Flame Will(common,5),     5=Lava Armor(rare,10),   6=Inferno(epic,20)
-- grass:  7=Nature Grace(common,5),   8=Photosynthesis(rare,10),9=World Tree(epic,20)
-- universal: 10=Lucky Star(uncommon,8), 11=Elemental Affinity(rare,12), 12=Fighting Spirit(uncommon,7)
-- light:  13=Light Blessing(common,5)
-- dark:   14=Dark Power(common,5)
-- ice:    15=Freeze(rare,10)
-- electric: 16=Lightning Rush(common,5)
-- celestial: 17=Divine Blessing(legendary,25)
-- poison: 18=Poison Immunity(rare,10)
-- earth:  19=Earth Power(uncommon,8)
-- wind:   20=Wind Whisper(common,5)

-- ===== WATER species (element='water') =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 1, 5, 1 FROM slime_species WHERE element = 'water'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 2, 10, 2 FROM slime_species WHERE element = 'water'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 3, 20, 3 FROM slime_species WHERE element = 'water'
ON CONFLICT DO NOTHING;

-- ===== FIRE species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 4, 5, 1 FROM slime_species WHERE element = 'fire'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 5, 10, 2 FROM slime_species WHERE element = 'fire'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 6, 20, 3 FROM slime_species WHERE element = 'fire'
ON CONFLICT DO NOTHING;

-- ===== GRASS species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 7, 5, 1 FROM slime_species WHERE element = 'grass'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 8, 10, 2 FROM slime_species WHERE element = 'grass'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 9, 20, 3 FROM slime_species WHERE element = 'grass'
ON CONFLICT DO NOTHING;

-- ===== LIGHT species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 13, 5, 1 FROM slime_species WHERE element = 'light'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 11, 12, 2 FROM slime_species WHERE element = 'light'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 10, 8, 3 FROM slime_species WHERE element = 'light'
ON CONFLICT DO NOTHING;

-- ===== DARK species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 14, 5, 1 FROM slime_species WHERE element = 'dark'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 11, 12, 2 FROM slime_species WHERE element = 'dark'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 12, 7, 3 FROM slime_species WHERE element = 'dark'
ON CONFLICT DO NOTHING;

-- ===== ICE species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 10, 8, 1 FROM slime_species WHERE element = 'ice'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 15, 10, 2 FROM slime_species WHERE element = 'ice'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 12, 7, 3 FROM slime_species WHERE element = 'ice'
ON CONFLICT DO NOTHING;

-- ===== ELECTRIC species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 16, 5, 1 FROM slime_species WHERE element = 'electric'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 11, 12, 2 FROM slime_species WHERE element = 'electric'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 12, 7, 3 FROM slime_species WHERE element = 'electric'
ON CONFLICT DO NOTHING;

-- ===== POISON species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 12, 7, 1 FROM slime_species WHERE element = 'poison'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 18, 10, 2 FROM slime_species WHERE element = 'poison'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 10, 8, 3 FROM slime_species WHERE element = 'poison'
ON CONFLICT DO NOTHING;

-- ===== EARTH species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 19, 8, 1 FROM slime_species WHERE element = 'earth'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 11, 12, 2 FROM slime_species WHERE element = 'earth'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 12, 7, 3 FROM slime_species WHERE element = 'earth'
ON CONFLICT DO NOTHING;

-- ===== WIND species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 20, 5, 1 FROM slime_species WHERE element = 'wind'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 11, 12, 2 FROM slime_species WHERE element = 'wind'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 12, 7, 3 FROM slime_species WHERE element = 'wind'
ON CONFLICT DO NOTHING;

-- ===== CELESTIAL species =====
INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 10, 8, 1 FROM slime_species WHERE element = 'celestial'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 11, 12, 2 FROM slime_species WHERE element = 'celestial'
ON CONFLICT DO NOTHING;

INSERT INTO game_species_skills (species_id, skill_id, learn_level, slot)
SELECT id, 17, 25, 3 FROM slime_species WHERE element = 'celestial'
ON CONFLICT DO NOTHING;
