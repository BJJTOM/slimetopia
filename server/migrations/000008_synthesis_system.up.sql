-- ===== Synthesis System: Materials, First Discoveries, Hidden Slimes =====

-- Player material inventory
CREATE TABLE user_materials (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    PRIMARY KEY (user_id, material_id)
);

-- First discoverer tracking (per species, server-wide)
CREATE TABLE first_discoveries (
    species_id INT PRIMARY KEY REFERENCES slime_species(id),
    user_id UUID NOT NULL REFERENCES users(id),
    nickname VARCHAR(20) NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill first discoveries from existing codex entries
INSERT INTO first_discoveries (species_id, user_id, nickname, discovered_at)
SELECT DISTINCT ON (ce.species_id)
    ce.species_id, ce.user_id, u.nickname, ce.discovered_at
FROM codex_entries ce
JOIN users u ON u.id = ce.user_id
ORDER BY ce.species_id, ce.discovered_at ASC
ON CONFLICT DO NOTHING;

-- ===== Hidden Slime Species (The Three Legendary Ones) =====

-- Hidden #1: 무한빛 슬라임 (Prismatic Slime) — ID 777
-- Condition: Fire slime + Water slime + Rainbow Gel (material 18)
-- The rarest mutation born from the clash of opposing elements
INSERT INTO slime_species (id, name, name_en, element, grade, description)
VALUES (777, '무한빛 슬라임', 'Prismatic Slime', 'light', 'mythic',
  '불과 물의 상극이 무지개 젤과 만나 탄생한 전설의 슬라임. 몸에서 무한한 빛의 스펙트럼이 방출된다. 서버 최초 발견자의 이름이 영원히 새겨진다.')
ON CONFLICT (id) DO NOTHING;

-- Hidden #2: 심연의 군주 (Abyssal Lord) — ID 888
-- Condition: Dark slime (legendary+) + Poison slime + Deep Sea Pearl (material 6)
-- Born from the deepest darkness and the most lethal venom
INSERT INTO slime_species (id, name, name_en, element, grade, description)
VALUES (888, '심연의 군주', 'Abyssal Lord', 'dark', 'mythic',
  '심해의 진주가 어둠과 맹독의 합성에 촉매로 작용하여 탄생한 심연의 지배자. 모든 빛과 생명을 삼키며, 존재 자체가 공포다.')
ON CONFLICT (id) DO NOTHING;

-- Hidden #3: 만물의 근원 (The Origin) — ID 999
-- Condition: Celestial slime (legendary+) + Light slime + Void Fragment (material 20) + collection score 500+
-- The ultimate slime, requiring mastery of the entire collection
INSERT INTO slime_species (id, name, name_en, element, grade, description)
VALUES (999, '만물의 근원', 'The Origin', 'celestial', 'mythic',
  '공허의 파편이 천체와 빛의 근원적 힘을 융합시켜 탄생한 만물의 시작이자 끝. 수집 점수 500 이상의 마스터 수집가만이 소환할 수 있다. No.999 — 진정한 수집의 종착점.')
ON CONFLICT (id) DO NOTHING;
