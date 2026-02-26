-- Add faction column to slime_species for organizing species by group
ALTER TABLE slime_species ADD COLUMN IF NOT EXISTS faction VARCHAR(30) NOT NULL DEFAULT '';

-- Update factions based on species ID ranges
UPDATE slime_species SET faction = 'east_blue' WHERE id BETWEEN 1 AND 11;
UPDATE slime_species SET faction = 'grand_line' WHERE id BETWEEN 12 AND 29;
UPDATE slime_species SET faction = 'straw_hat' WHERE id BETWEEN 30 AND 40;
UPDATE slime_species SET faction = 'baroque' WHERE id BETWEEN 41 AND 50;
UPDATE slime_species SET faction = 'sky_island' WHERE id BETWEEN 51 AND 62;
UPDATE slime_species SET faction = 'cipher_pol' WHERE id BETWEEN 63 AND 72;
UPDATE slime_species SET faction = 'warlords' WHERE id BETWEEN 73 AND 84;
UPDATE slime_species SET faction = 'worst_gen' WHERE id BETWEEN 85 AND 98;
UPDATE slime_species SET faction = 'marines' WHERE id BETWEEN 99 AND 118;
UPDATE slime_species SET faction = 'yonko' WHERE id BETWEEN 119 AND 143;
UPDATE slime_species SET faction = 'logia' WHERE id BETWEEN 144 AND 158;
UPDATE slime_species SET faction = 'paramecia' WHERE id BETWEEN 159 AND 172;
UPDATE slime_species SET faction = 'zoan' WHERE id BETWEEN 173 AND 187;
UPDATE slime_species SET faction = 'revolutionary' WHERE id BETWEEN 188 AND 195;
UPDATE slime_species SET faction = 'celestial' WHERE id BETWEEN 196 AND 200;
UPDATE slime_species SET faction = 'hidden' WHERE id IN (777, 888, 999);

-- Index for faction filtering
CREATE INDEX IF NOT EXISTS idx_species_faction ON slime_species(faction);
