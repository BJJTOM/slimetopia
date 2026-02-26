-- Down migration for 000009: Cannot fully reverse - just clear everything
DELETE FROM equipped_accessories;
DELETE FROM collection_entries;
DELETE FROM codex_entries;
DELETE FROM recipe_discoveries;
DELETE FROM evolution_unlocks;
DELETE FROM first_discoveries;
DELETE FROM race_results;
DELETE FROM slimes;
DELETE FROM slime_species;
