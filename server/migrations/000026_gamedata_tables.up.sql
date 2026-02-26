-- 게임 데이터 테이블: JSON → DB 이관
-- 12 tables: recipes, shop_items, materials, explorations, achievements, accessories, missions, attendance_rewards, evolution_trees, seasons, slime_sets, mutation_recipes

-- 1. 레시피
CREATE TABLE IF NOT EXISTS game_recipes (
    id INT PRIMARY KEY,
    input_a INT NOT NULL,
    input_b INT NOT NULL,
    output INT NOT NULL,
    output_name VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'combination',
    hint TEXT DEFAULT '',
    hidden BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 상점 아이템
CREATE TABLE IF NOT EXISTS game_shop_items (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) DEFAULT '',
    type VARCHAR(30) NOT NULL,
    category VARCHAR(30) DEFAULT '',
    cost_gold BIGINT DEFAULT 0,
    cost_gems INT DEFAULT 0,
    icon VARCHAR(100) DEFAULT '',
    description TEXT DEFAULT '',
    quantity INT DEFAULT 0,
    egg_type VARCHAR(30) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

-- 3. 소재
CREATE TABLE IF NOT EXISTS game_materials (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) DEFAULT '',
    type VARCHAR(30) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common',
    icon VARCHAR(20) DEFAULT '',
    description TEXT DEFAULT '',
    effects JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. 탐험
CREATE TABLE IF NOT EXISTS game_explorations (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    duration_minutes INT NOT NULL,
    recommended_element VARCHAR(20) DEFAULT '',
    rewards JSONB DEFAULT '{}',
    unlock_type VARCHAR(30) DEFAULT 'default',
    unlock_value INT DEFAULT 0,
    material_drops JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

-- 5. 업적
CREATE TABLE IF NOT EXISTS game_achievements (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    icon VARCHAR(20) DEFAULT '',
    reward_gold INT DEFAULT 0,
    reward_gems INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

-- 6. 악세서리
CREATE TABLE IF NOT EXISTS game_accessories (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) DEFAULT '',
    slot VARCHAR(20) NOT NULL,
    icon VARCHAR(20) DEFAULT '',
    cost_gold INT DEFAULT 0,
    cost_gems INT DEFAULT 0,
    svg_overlay VARCHAR(50) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. 미션
CREATE TABLE IF NOT EXISTS game_missions (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    action VARCHAR(30) NOT NULL,
    target INT DEFAULT 1,
    reward_gold BIGINT DEFAULT 0,
    reward_gems INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. 출석보상
CREATE TABLE IF NOT EXISTS game_attendance_rewards (
    day INT PRIMARY KEY,
    gold BIGINT DEFAULT 0,
    gems INT DEFAULT 0
);

-- 9. 진화트리
CREATE TABLE IF NOT EXISTS game_evolution_trees (
    species_id INT NOT NULL,
    node_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    buff JSONB DEFAULT '{}',
    cost INT DEFAULT 0,
    requires INT[] DEFAULT '{}',
    PRIMARY KEY (species_id, node_id)
);

-- 10. 시즌
CREATE TABLE IF NOT EXISTS game_seasons (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) DEFAULT '',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    limited_species INT[] DEFAULT '{}',
    special_shop_items JSONB DEFAULT '[]',
    banner_color VARCHAR(20) DEFAULT '',
    description TEXT DEFAULT '',
    buffs JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE
);

-- 11. 세트
CREATE TABLE IF NOT EXISTS game_slime_sets (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) DEFAULT '',
    description TEXT DEFAULT '',
    species_ids INT[] DEFAULT '{}',
    bonus_score INT DEFAULT 0,
    buff_type VARCHAR(50) DEFAULT '',
    buff_value FLOAT DEFAULT 0,
    buff_label VARCHAR(100) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE
);

-- 12. 돌연변이 레시피
CREATE TABLE IF NOT EXISTS game_mutation_recipes (
    id SERIAL PRIMARY KEY,
    required_element_a VARCHAR(20) NOT NULL,
    required_element_b VARCHAR(20) NOT NULL,
    required_material INT NOT NULL,
    result_species_id INT NOT NULL,
    min_collection_score INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Recipes (30)
INSERT INTO game_recipes (id, input_a, input_b, output, output_name, type, hint, hidden) VALUES
(1, 1, 2, 22, '안개 슬라임', 'combination', '물과 불이 만나면 뿌연 안개가...', false),
(2, 3, 8, 24, '꽃향기 슬라임', 'combination', '풀잎과 독버섯이 만나면 향기가...', false),
(3, 4, 5, 25, '무지개빛 슬라임', 'combination', '빛과 어둠의 경계에서 무지개가...', false),
(4, 6, 7, 27, '결빙 슬라임', 'combination', '눈송이에 번개가 치면 모든 것이 얼어붙는다...', false),
(5, 9, 10, 21, '기록계 슬라임', 'combination', '모래와 바람이 새로운 항로를 기록한다...', false),
(6, 1, 9, 29, '수정 슬라임', 'combination', '물과 모래가 오랜 시간 굳으면 수정이...', false),
(7, 22, 23, 32, '항해 슬라임', 'combination', '안개 속 횃불이 항해의 길을 밝힌다...', false),
(8, 21, 24, 33, '저격 슬라임', 'combination', '기록계와 꽃향기가 정확한 저격을...', false),
(9, 25, 28, 37, '기계 슬라임', 'combination', '무지개빛과 낙뢰가 기계에 생명을...', false),
(10, 51, 52, 57, '천공 슬라임', 'combination', '구름과 천사가 만나면 하늘 너머의 세계가...', false),
(11, 46, 47, 74, '사막왕 슬라임', 'combination', '모래폭풍과 칼날이 사막의 왕을 만든다...', false),
(12, 99, 100, 105, '해병대장 슬라임', 'combination', '병사와 하사가 함께 성장하면...', false),
(13, 173, 174, 179, '늑대 슬라임', 'combination', '강아지와 고양이의 야생 본능이 깨어나면...', false),
(14, 159, 160, 164, '실실 슬라임', 'combination', '고무와 꽃이 실처럼 엮이면...', false),
(15, 188, 189, 191, '카라스 슬라임', 'combination', '자유와 혁명이 어둠 속에서 까마귀로 변한다...', false),
(16, 30, 31, 40, '태양신 슬라임', 'combination', '고무의 의지와 삼검의 각오가 태양의 힘을 깨운다...', true),
(17, 36, 38, 39, '어인 슬라임', 'combination', '학자의 지식과 해골의 영혼이 바다로 향한다...', true),
(18, 63, 65, 72, '패왕 슬라임', 'combination', '암살과 철괴의 극한 수련이 패왕의 기운을...', true),
(19, 73, 79, 82, '패왕색 슬라임', 'combination', '검황과 검은칼이 만나면 패왕의 별빛이...', true),
(20, 115, 117, 118, '원수 슬라임', 'combination', '빛의 정의와 용암의 정의가 합쳐져 원수가...', true),
(21, 119, 120, 129, '흰수염왕 슬라임', 'combination', '지진과 불사조의 힘이 황제를 만든다...', true),
(22, 123, 125, 130, '빅맘왕 슬라임', 'combination', '혼의 여왕과 과자성이 합쳐져 영혼의 황제가...', true),
(23, 131, 135, 141, '암흑대제 슬라임', 'combination', '화재와 암흑의 전설이 만나 대제가 탄생한다...', true),
(24, 144, 147, 139, '용왕 슬라임', 'combination', '불꽃과 마그마가 용의 왕을 깨운다...', true),
(25, 145, 146, 154, '빛빛 슬라임', 'combination', '빙하와 번개가 극한에서 순수한 빛이 된다...', true),
(26, 169, 171, 172, '영혼영혼 슬라임', 'combination', '중력과 수술이 영혼의 경지에 도달한다...', true),
(27, 184, 185, 187, '대붕 슬라임', 'combination', '공룡과 용의 고대 힘이 전설의 새로 부활한다...', true),
(28, 192, 193, 194, '용의얼굴 슬라임', 'combination', '참모총장과 군단장의 혁명이 용의 얼굴을 드러낸다...', true),
(29, 196, 197, 200, '우라노스 슬라임', 'combination', '천룡과 세계귀족이 고대병기를 깨운다...', true),
(30, 198, 199, 200, '우라노스 슬라임', 'combination', '플루톤과 포세이돈이 합쳐져 최후의 병기가...', true)
ON CONFLICT (id) DO NOTHING;

-- Shop Items (23)
INSERT INTO game_shop_items (id, name, name_en, type, category, cost_gold, cost_gems, icon, description, quantity, egg_type, sort_order) VALUES
(1,  '슬라임 알',       'Slime Egg',         'egg',       'egg',     800,   0,  'egg.png',       '랜덤 슬라임이 부화합니다', 0, '', 1),
(2,  '프리미엄 알',     'Premium Egg',       'egg',       'egg',     0,     4,  'slime_egg.png', '레어 이상 확정', 0, '', 2),
(5,  '불꽃 알',         'Fire Egg',          'egg',       'egg',     1000,  0,  'egg.png',       '불 원소 슬라임이 부화합니다', 0, '', 3),
(9,  '물방울 알',       'Water Egg',         'egg',       'egg',     1000,  0,  'egg.png',       '물 원소 슬라임이 부화합니다', 0, '', 4),
(10, '풀잎 알',         'Grass Egg',         'egg',       'egg',     1000,  0,  'egg.png',       '풀 원소 슬라임이 부화합니다', 0, '', 5),
(6,  '전설의 알',       'Legendary Egg',     'egg',       'egg',     0,     12, 'slime_egg.png', '에픽 이상 확정!', 0, '', 6),
(20, '어둠 알',         'Dark Egg',          'egg',       'egg',     1000,  0,  'egg.png',       '어둠 원소 슬라임이 부화합니다', 0, '', 7),
(21, '얼음 알',         'Ice Egg',           'egg',       'egg',     1000,  0,  'egg.png',       '얼음 원소 슬라임이 부화합니다', 0, '', 8),
(22, '번개 알',         'Electric Egg',      'egg',       'egg',     1000,  0,  'egg.png',       '전기 원소 슬라임이 부화합니다', 0, '', 9),
(23, '대지 알',         'Earth Egg',         'egg',       'egg',     1000,  0,  'egg.png',       '대지 원소 슬라임이 부화합니다', 0, '', 10),
(3,  '맛있는 먹이',     'Tasty Food',        'food',      'food',    100,   0,  'food_1.png',    '만복도 +50, 친밀도 +5', 0, '', 11),
(4,  '고급 먹이',       'Premium Food',      'food',      'food',    200,   0,  'food_2.png',    '만복도 MAX, 친밀도 +10', 0, '', 12),
(7,  '슈퍼 먹이',       'Super Food',        'food',      'food',    400,   0,  'food_2.png',    '만복도 MAX, 친밀도 +20, 컨디션 +30', 0, '', 13),
(8,  '원소강화 먹이',   'Elemental Food',    'food',      'food',    0,     1,  'food_1.png',    '만복도 +80, 친밀도 +15, 원소 친화력 UP', 0, '', 14),
(11, '리본',            'Ribbon',            'decoration','special', 300,   0,  'bow.png',       '귀여운 리본 장식', 0, '', 15),
(12, '안경',            'Glasses',           'decoration','special', 400,   0,  'glasses.png',   '지적인 안경 장식', 0, '', 16),
(13, '모자',            'Hat',               'decoration','special', 500,   0,  'hat.png',       '멋진 모자 장식', 0, '', 17),
(14, 'EXP 2배 부스터',  'EXP Booster',       'booster',   'special', 0,     2,  'stardust.png',  '2시간 동안 EXP 2배', 0, '', 18),
(15, '골드 2배 부스터', 'Gold Booster',      'booster',   'special', 0,     2,  'gold.png',      '2시간 동안 골드 획득 2배', 0, '', 19),
(16, '행운의 부적',     'Lucky Charm',       'booster',   'special', 0,     3,  'gems.png',      '2시간 동안 레어+ 확률 UP', 0, '', 20),
(17, '10연차 소환',     '10-Pull Normal',    'multi_egg', 'egg',     7200,  0,  'egg.png',       '슬라임 알 10개를 한번에! (10% 할인)', 10, 'normal', 21),
(18, '10연차 프리미엄', '10-Pull Premium',   'multi_egg', 'egg',     0,     36, 'slime_egg.png', '프리미엄 알 10개! 레어 이상 확정 (10% 할인)', 10, 'premium', 22),
(19, '10연차 전설',     '10-Pull Legendary', 'multi_egg', 'egg',     0,     108,'slime_egg.png', '전설의 알 10개! 에픽 이상 확정 (10% 할인)', 10, 'legendary_egg', 23)
ON CONFLICT (id) DO NOTHING;

-- Materials (20)
INSERT INTO game_materials (id, name, name_en, type, rarity, icon, description, effects) VALUES
(1,  '철광석',       'Iron Ore',           'basic',         'common',    '⛏️', '단단한 광물. 기본적인 합성 촉매제로 사용된다.', '{}'),
(2,  '별의 조각',    'Star Fragment',      'element_stone', 'rare',      '⭐', '별빛을 머금은 조각. 빛 속성 확률이 크게 증가한다.', '{"element_boost":{"element":"light","chance":0.8}}'),
(3,  '신선한 먹이',  'Fresh Feed',         'basic',         'common',    '🥬', '잘 자란 풀사료. 합성 결과물의 초기 능력치가 높아진다.', '{}'),
(4,  '네잎클로버',   'Four-leaf Clover',   'catalyst',      'rare',      '🍀', '행운의 상징. 합성 대성공 확률이 크게 증가한다.', '{"great_success":0.15}'),
(5,  '고대 화석',    'Ancient Fossil',     'basic',         'common',    '🦴', '심해에서 발굴된 오래된 화석. 대지와 물의 힘이 깃들어 있다.', '{}'),
(6,  '심해의 진주',  'Deep Sea Pearl',     'element_stone', 'rare',      '🦪', '심해에서 자란 영롱한 진주. 물 속성과 돌연변이 확률이 증가한다.', '{"element_boost":{"element":"water","chance":0.6},"mutation_boost":0.05}'),
(7,  '불꽃 열매',    'Flame Fruit',        'element_stone', 'uncommon',  '🔥', '불의 기운이 응축된 열매. 불 속성 확률이 크게 증가한다.', '{"element_boost":{"element":"fire","chance":0.8}}'),
(8,  '황금 가루',    'Golden Dust',        'grade_boost',   'rare',      '✨', '순수한 황금 가루. 상위 등급 탄생 확률이 증가한다.', '{"grade_boost":0.2}'),
(9,  '방사능 젤리',  'Radioactive Jelly',  'mutation',      'epic',      '☢️', '위험한 돌연변이 촉매. 예상치 못한 슬라임이 탄생할 수 있다.', '{"mutation_boost":0.15}'),
(10, '얼음 결정',    'Ice Crystal',        'element_stone', 'uncommon',  '❄️', '차가운 얼음 결정. 얼음 속성 확률이 증가한다.', '{"element_boost":{"element":"ice","chance":0.7}}'),
(11, '천둥석',       'Thunder Stone',      'element_stone', 'uncommon',  '⚡', '전기가 흐르는 돌. 전기 속성 확률이 증가한다.', '{"element_boost":{"element":"electric","chance":0.7}}'),
(12, '독 에센스',    'Poison Essence',     'element_stone', 'uncommon',  '🧪', '농축된 독 성분. 독 속성 확률이 증가한다.', '{"element_boost":{"element":"poison","chance":0.7}}'),
(13, '대지의 핵',    'Earth Core',         'element_stone', 'uncommon',  '🪨', '대지의 중심에서 온 핵. 땅 속성 확률이 증가한다.', '{"element_boost":{"element":"earth","chance":0.7}}'),
(14, '바람의 깃털',  'Wind Feather',       'element_stone', 'uncommon',  '🪶', '바람에 날리는 신비한 깃털. 바람 속성 확률이 증가한다.', '{"element_boost":{"element":"wind","chance":0.7}}'),
(15, '천체의 파편',  'Celestial Shard',    'element_stone', 'rare',      '💫', '우주에서 떨어진 파편. 천체 속성 확률이 증가한다.', '{"element_boost":{"element":"celestial","chance":0.7}}'),
(16, '어둠의 수정',  'Dark Crystal',       'element_stone', 'uncommon',  '🔮', '어둠의 기운이 담긴 수정. 어둠 속성 확률이 증가한다.', '{"element_boost":{"element":"dark","chance":0.7}}'),
(17, '자연의 정수',  'Nature Essence',     'element_stone', 'uncommon',  '🌿', '자연의 힘이 농축된 정수. 풀 속성 확률이 증가한다.', '{"element_boost":{"element":"grass","chance":0.7}}'),
(18, '무지개 젤',    'Rainbow Gel',        'mutation',      'legendary', '🌈', '모든 속성이 혼합된 전설의 젤. 불과 물의 슬라임에게 사용하면...', '{"mutation_boost":0.3,"mutation_target":777}'),
(19, '현자의 돌',    'Philosopher''s Stone','grade_boost',   'epic',      '💎', '연금술의 정수. 등급 상승 확률이 대폭 증가한다.', '{"grade_boost":0.4}'),
(20, '공허의 파편',  'Void Fragment',      'mutation',      'legendary', '🕳️', '존재와 비존재의 경계에서 온 파편. 천체와 빛의 슬라임에게 사용하면...', '{"mutation_boost":0.3,"mutation_target":999}')
ON CONFLICT (id) DO NOTHING;

-- Explorations (13)
INSERT INTO game_explorations (id, name, duration_minutes, recommended_element, rewards, unlock_type, unlock_value, material_drops, sort_order) VALUES
(1,  '초원 들판',     30,  'grass',     '{"gold":{"min":80,"max":180},"items":["grass_seed"]}', 'default', 0, '[{"material_id":17,"chance":0.50,"min_qty":1,"max_qty":2},{"material_id":3,"chance":0.40,"min_qty":1,"max_qty":3},{"material_id":4,"chance":0.08,"min_qty":1,"max_qty":1}]', 1),
(2,  '맑은 호수',     60,  'water',     '{"gold":{"min":150,"max":350},"gems":{"min":0,"max":1},"items":["water_seed","recipe_hint"]}', 'level', 5, '[{"material_id":10,"chance":0.45,"min_qty":1,"max_qty":2},{"material_id":6,"chance":0.10,"min_qty":1,"max_qty":1},{"material_id":5,"chance":0.30,"min_qty":1,"max_qty":2}]', 2),
(3,  '붉은 화산',     120, 'fire',      '{"gold":{"min":300,"max":600},"gems":{"min":1,"max":4},"items":["fire_seed","rare_egg"]}', 'level', 10, '[{"material_id":7,"chance":0.50,"min_qty":1,"max_qty":2},{"material_id":1,"chance":0.40,"min_qty":1,"max_qty":3},{"material_id":8,"chance":0.08,"min_qty":1,"max_qty":1}]', 3),
(4,  '얼음 동굴',     45,  'ice',       '{"gold":{"min":120,"max":250},"items":["ice_crystal"]}', 'level', 8, '[{"material_id":10,"chance":0.55,"min_qty":1,"max_qty":3},{"material_id":2,"chance":0.10,"min_qty":1,"max_qty":1},{"material_id":1,"chance":0.30,"min_qty":1,"max_qty":2}]', 4),
(5,  '천둥 봉우리',   60,  'electric',  '{"gold":{"min":180,"max":350},"gems":{"min":0,"max":2},"items":["thunder_shard"]}', 'level', 12, '[{"material_id":11,"chance":0.55,"min_qty":1,"max_qty":2},{"material_id":1,"chance":0.35,"min_qty":1,"max_qty":2},{"material_id":8,"chance":0.05,"min_qty":1,"max_qty":1}]', 5),
(6,  '독안개 늪',     30,  'poison',    '{"gold":{"min":100,"max":200},"items":["toxic_spore"]}', 'level', 6, '[{"material_id":12,"chance":0.55,"min_qty":1,"max_qty":2},{"material_id":9,"chance":0.05,"min_qty":1,"max_qty":1},{"material_id":5,"chance":0.25,"min_qty":1,"max_qty":2}]', 6),
(7,  '대지의 협곡',   90,  'earth',     '{"gold":{"min":250,"max":500},"gems":{"min":1,"max":3},"items":["earth_core"]}', 'level', 15, '[{"material_id":13,"chance":0.50,"min_qty":1,"max_qty":2},{"material_id":5,"chance":0.35,"min_qty":1,"max_qty":2},{"material_id":19,"chance":0.03,"min_qty":1,"max_qty":1}]', 7),
(8,  '바람의 사원',   45,  'wind',      '{"gold":{"min":150,"max":280},"gems":{"min":0,"max":1},"items":["wind_feather"]}', 'level', 10, '[{"material_id":14,"chance":0.55,"min_qty":1,"max_qty":2},{"material_id":17,"chance":0.30,"min_qty":1,"max_qty":2},{"material_id":4,"chance":0.05,"min_qty":1,"max_qty":1}]', 8),
(9,  '천체 관측소',   120, 'celestial', '{"gold":{"min":400,"max":700},"gems":{"min":2,"max":5},"items":["star_fragment"]}', 'level', 20, '[{"material_id":15,"chance":0.45,"min_qty":1,"max_qty":2},{"material_id":2,"chance":0.25,"min_qty":1,"max_qty":1},{"material_id":16,"chance":0.20,"min_qty":1,"max_qty":1},{"material_id":18,"chance":0.01,"min_qty":1,"max_qty":1},{"material_id":20,"chance":0.01,"min_qty":1,"max_qty":1}]', 9),
(10, '빛의 신전',     60,  'light',     '{"gold":{"min":200,"max":400},"gems":{"min":1,"max":3},"items":["light_orb"]}', 'level', 12, '[{"material_id":2,"chance":0.50,"min_qty":1,"max_qty":2},{"material_id":8,"chance":0.15,"min_qty":1,"max_qty":1},{"material_id":4,"chance":0.10,"min_qty":1,"max_qty":1},{"material_id":15,"chance":0.08,"min_qty":1,"max_qty":1}]', 10),
(11, '그림자 미궁',   75,  'dark',      '{"gold":{"min":250,"max":450},"gems":{"min":1,"max":3},"items":["shadow_shard"]}', 'level', 14, '[{"material_id":16,"chance":0.50,"min_qty":1,"max_qty":2},{"material_id":9,"chance":0.08,"min_qty":1,"max_qty":1},{"material_id":5,"chance":0.30,"min_qty":1,"max_qty":2},{"material_id":6,"chance":0.06,"min_qty":1,"max_qty":1}]', 11),
(12, '용암 심해',     180, 'fire',      '{"gold":{"min":500,"max":900},"gems":{"min":3,"max":7},"items":["rare_egg","fire_seed"]}', 'level', 25, '[{"material_id":7,"chance":0.55,"min_qty":2,"max_qty":4},{"material_id":8,"chance":0.20,"min_qty":1,"max_qty":2},{"material_id":19,"chance":0.05,"min_qty":1,"max_qty":1},{"material_id":9,"chance":0.04,"min_qty":1,"max_qty":1},{"material_id":18,"chance":0.02,"min_qty":1,"max_qty":1}]', 12),
(13, '차원의 틈',     240, 'celestial', '{"gold":{"min":600,"max":1200},"gems":{"min":5,"max":10},"items":["legendary_egg","star_fragment"]}', 'level', 30, '[{"material_id":15,"chance":0.50,"min_qty":2,"max_qty":3},{"material_id":2,"chance":0.35,"min_qty":1,"max_qty":2},{"material_id":19,"chance":0.08,"min_qty":1,"max_qty":1},{"material_id":9,"chance":0.06,"min_qty":1,"max_qty":1},{"material_id":18,"chance":0.03,"min_qty":1,"max_qty":1},{"material_id":20,"chance":0.03,"min_qty":1,"max_qty":1}]', 13)
ON CONFLICT (id) DO NOTHING;

-- Achievements (12)
INSERT INTO game_achievements (key, name, description, icon, reward_gold, reward_gems, sort_order) VALUES
('first_slime',       '첫 만남',         '첫 슬라임을 획득하세요',              '🥚', 100,  0,  1),
('collector_10',      '수집가',          '도감에서 10종을 발견하세요',           '📖', 300,  3,  2),
('collector_30',      '대수집가',        '도감에서 30종을 발견하세요',           '📚', 1000, 10, 3),
('merge_master',      '합성의 달인',     '합성을 10회 수행하세요',              '⚗️', 500,  5,  4),
('race_champion',     '레이스 챔피언',   '레이스에서 5000점 이상 달성하세요',    '🏆', 500,  5,  5),
('fishing_pro',       '낚시왕',          '전설의 물고기를 낚으세요',            '🎣', 300,  3,  6),
('max_level',         '만렙 달성',       '슬라임 Lv.30에 도달하세요',           '⭐', 800,  8,  7),
('attendance_28',     '개근상',          '28일 출석을 달성하세요',              '📅', 1500, 15, 8),
('mythic_owner',      '신화의 주인',     '미시크 등급 슬라임을 보유하세요',      '👑', 1000, 10, 9),
('social_butterfly',  '사교왕',          '마을 방문을 10회 수행하세요',         '🏘️', 200,  2,  10),
('rich',              '부자',            '골드 10000을 달성하세요',             '💰', 0,    5,  11),
('explorer',          '탐험가',          '탐험을 20회 완료하세요',              '🧭', 500,  5,  12)
ON CONFLICT (key) DO NOTHING;

-- Accessories (15)
INSERT INTO game_accessories (id, name, name_en, slot, icon, cost_gold, cost_gems, svg_overlay) VALUES
(1,  '빨간 리본',       'Red Ribbon',        'head', '🎀', 200, 0,  'ribbon_red'),
(2,  '왕관',            'Crown',             'head', '👑', 0,   15, 'crown'),
(3,  '마법사 모자',     'Wizard Hat',        'head', '🧙', 500, 0,  'wizard_hat'),
(4,  '꽃 화관',         'Flower Crown',      'head', '🌸', 300, 0,  'flower_crown'),
(5,  '산타 모자',       'Santa Hat',         'head', '🎅', 0,   5,  'santa_hat'),
(6,  '고양이 귀',       'Cat Ears',          'head', '🐱', 400, 0,  'cat_ears'),
(7,  '하트 선글라스',   'Heart Sunglasses',  'face', '💕', 350, 0,  'heart_glasses'),
(8,  '둥근 안경',       'Round Glasses',     'face', '🤓', 250, 0,  'round_glasses'),
(9,  '별 스티커',       'Star Sticker',      'face', '⭐', 150, 0,  'star_sticker'),
(10, '나비 넥타이',     'Bow Tie',           'body', '🎩', 200, 0,  'bow_tie'),
(11, '목도리',          'Scarf',             'body', '🧣', 300, 0,  'scarf'),
(12, '망토',            'Cape',              'body', '🦸', 0,   10, 'cape'),
(13, '천사 날개',       'Angel Wings',       'body', '😇', 0,   20, 'angel_wings'),
(14, '악마 뿔',         'Devil Horns',       'head', '😈', 0,   8,  'devil_horns'),
(15, '무지개 후광',     'Rainbow Halo',      'head', '🌈', 0,   25, 'rainbow_halo')
ON CONFLICT (id) DO NOTHING;

-- Missions (8)
INSERT INTO game_missions (id, name, description, action, target, reward_gold, reward_gems) VALUES
(1, '먹이주기',    '슬라임에게 먹이를 3번 주세요',     'feed',        3, 150, 0),
(2, '쓰다듬기',    '슬라임을 5번 쓰다듬어 주세요',     'pet',         5, 120, 0),
(3, '합성하기',    '슬라임 합성을 1번 하세요',         'merge',       1, 250, 1),
(4, '탐험 보내기', '탐험을 1번 보내세요',              'explore',     1, 200, 1),
(5, '놀아주기',    '슬라임과 3번 놀아주세요',          'play',        3, 150, 0),
(6, '상점 구매',   '상점에서 1번 구매하세요',          'buy',         1, 100, 1),
(7, '쇼츠 시청',   '쇼츠를 3개 시청하세요',            'watch_short', 3, 100, 1),
(8, '쇼츠 좋아요', '쇼츠에 좋아요를 5번 눌러주세요',   'like_short',  5, 120, 1)
ON CONFLICT (id) DO NOTHING;

-- Attendance Rewards (28)
INSERT INTO game_attendance_rewards (day, gold, gems) VALUES
(1,  150,  1),  (2,  180,  0),  (3,  0,    2),  (4,  200,  0),
(5,  250,  1),  (6,  0,    3),  (7,  500,  5),  (8,  180,  1),
(9,  200,  0),  (10, 0,    3),  (11, 250,  0),  (12, 300,  1),
(13, 0,    4),  (14, 600,  8),  (15, 200,  1),  (16, 250,  0),
(17, 0,    4),  (18, 300,  0),  (19, 350,  1),  (20, 0,    5),
(21, 1000, 10), (22, 300,  1),  (23, 350,  0),  (24, 0,    6),
(25, 400,  1),  (26, 450,  0),  (27, 0,    10), (28, 2000, 20)
ON CONFLICT (day) DO NOTHING;

-- Evolution Trees (15 species, ~52 nodes)
INSERT INTO game_evolution_trees (species_id, node_id, name, type, buff, cost, requires) VALUES
-- Species 1: 물방울 해적 슬라임
(1, 1, '물방울 강화', 'stat_buff',    '{"affection":5}', 50, '{}'),
(1, 2, '수분 충전',   'nurture_buff', '{"hunger_decay_reduce":1}', 80, '{1}'),
(1, 3, '동해의 축복', 'explore_buff', '{"water_explore_bonus":0.1}', 120, '{2}'),
-- Species 2: 불씨 해적 슬라임
(2, 1, '불씨 강화',   'stat_buff',    '{"exp":3}', 50, '{}'),
(2, 2, '열정의 불꽃', 'nurture_buff', '{"play_bonus":2}', 80, '{1}'),
(2, 3, '동해의 화염', 'explore_buff', '{"fire_explore_bonus":0.1}', 120, '{2}'),
-- Species 3: 풀잎 해적 슬라임
(3, 1, '풀잎 강화',   'stat_buff',    '{"condition":5}', 50, '{}'),
(3, 2, '광합성',      'nurture_buff', '{"exp_bonus":1}', 80, '{1}'),
(3, 3, '동해의 녹음', 'explore_buff', '{"grass_explore_bonus":0.1}', 120, '{2}'),
-- Species 4: 반딧불 해적 슬라임
(4, 1, '빛 강화',     'stat_buff',    '{"affection":3}', 50, '{}'),
(4, 2, '빛의 치유',   'nurture_buff', '{"pet_bonus":2}', 80, '{1}'),
(4, 3, '동해의 빛',   'explore_buff', '{"light_explore_bonus":0.1}', 120, '{2}'),
-- Species 5: 그림자 해적 슬라임
(5, 1, '어둠 강화',   'stat_buff',    '{"exp":5}', 50, '{}'),
(5, 2, '그림자 은신', 'nurture_buff', '{"condition_decay_reduce":1}', 80, '{1}'),
(5, 3, '동해의 어둠', 'explore_buff', '{"dark_explore_bonus":0.1}', 120, '{2}'),
-- Species 30: 고무 슬라임
(30, 1, '고무 탄성',   'stat_buff',    '{"affection":8,"condition":5}', 80, '{}'),
(30, 2, '기어 세컨드', 'nurture_buff', '{"exp_bonus":3,"play_bonus":3}', 150, '{1}'),
(30, 3, '기어 포스',   'evolution',    '{"fire_explore_bonus":0.2}', 250, '{2}'),
(30, 4, '태양의 각성', 'explore_buff', '{"fire_explore_bonus":0.3,"exp_bonus":5}', 400, '{3}'),
-- Species 40: 태양신 슬라임
(40, 1, '니카의 자유',   'stat_buff',    '{"affection":15,"condition":10}', 200, '{}'),
(40, 2, '태양의 드럼',   'nurture_buff', '{"exp_bonus":8,"play_bonus":5,"pet_bonus":5}', 350, '{1}'),
(40, 3, '해방의 불꽃',   'evolution',    '{"fire_explore_bonus":0.25,"all_explore_bonus":0.1}', 500, '{2}'),
(40, 4, '해방의 전사',   'explore_buff', '{"all_explore_bonus":0.2,"exp_bonus":10}', 700, '{3}'),
-- Species 73: 검황 슬라임
(73, 1, '검기 연마',       'stat_buff',    '{"exp":8,"condition":5}', 100, '{}'),
(73, 2, '흑도 강화',       'nurture_buff', '{"play_bonus":5,"condition_decay_reduce":2}', 180, '{1}'),
(73, 3, '세계최강의 검',   'explore_buff', '{"dark_explore_bonus":0.2,"exp_bonus":5}', 300, '{2}'),
-- Species 118: 원수 슬라임
(118, 1, '원수의 위엄',       'stat_buff',    '{"affection":12,"exp":10}', 200, '{}'),
(118, 2, '절대 정의',         'nurture_buff', '{"exp_bonus":6,"hunger_decay_reduce":3}', 350, '{1}'),
(118, 3, '마그마의 심판',     'evolution',    '{"fire_explore_bonus":0.25}', 500, '{2}'),
(118, 4, '해군의 절대 권위',  'explore_buff', '{"fire_explore_bonus":0.3,"all_explore_bonus":0.1,"exp_bonus":8}', 700, '{3}'),
-- Species 139: 용왕 슬라임
(139, 1, '용의 비늘',     'stat_buff',    '{"affection":15,"condition":15}', 300, '{}'),
(139, 2, '보로브레스',    'nurture_buff', '{"exp_bonus":10,"play_bonus":8,"condition_decay_reduce":5}', 500, '{1}'),
(139, 3, '용의 각성',     'evolution',    '{"fire_explore_bonus":0.3,"all_explore_bonus":0.15}', 750, '{2}'),
(139, 4, '사황의 패기',   'explore_buff', '{"all_explore_bonus":0.25,"exp_bonus":15}', 1000, '{3}'),
-- Species 140: 패왕자 슬라임
(140, 1, '패왕색 각성',   'stat_buff',    '{"affection":15,"exp":15}', 300, '{}'),
(140, 2, '왕의 자질',     'nurture_buff', '{"exp_bonus":10,"pet_bonus":8,"hunger_decay_reduce":5}', 500, '{1}'),
(140, 3, '만물의 지배',   'evolution',    '{"celestial_explore_bonus":0.3,"all_explore_bonus":0.15}', 750, '{2}'),
(140, 4, '천상의 패기',   'explore_buff', '{"all_explore_bonus":0.25,"exp_bonus":15}', 1000, '{3}'),
-- Species 154: 빛빛 슬라임
(154, 1, '광속의 힘',     'stat_buff',    '{"exp":15,"condition":10}', 300, '{}'),
(154, 2, '레이저 집중',   'nurture_buff', '{"exp_bonus":10,"play_bonus":10,"condition_decay_reduce":5}', 500, '{1}'),
(154, 3, '빛의 지배',     'evolution',    '{"light_explore_bonus":0.3,"all_explore_bonus":0.15}', 750, '{2}'),
(154, 4, '절대 광속',     'explore_buff', '{"all_explore_bonus":0.25,"exp_bonus":15}', 1000, '{3}'),
-- Species 198: 플루톤 슬라임
(198, 1, '전함의 장갑',     'stat_buff',    '{"condition":20,"affection":10}', 400, '{}'),
(198, 2, '고대 포격',       'nurture_buff', '{"exp_bonus":12,"hunger_decay_reduce":5,"condition_decay_reduce":5}', 600, '{1}'),
(198, 3, '섬 파괴 포',      'evolution',    '{"earth_explore_bonus":0.35,"all_explore_bonus":0.15}', 900, '{2}'),
(198, 4, '고대병기의 진가', 'explore_buff', '{"all_explore_bonus":0.3,"exp_bonus":20}', 1200, '{3}'),
-- Species 199: 포세이돈 슬라임
(199, 1, '해왕류 소환',     'stat_buff',    '{"affection":20,"exp":10}', 400, '{}'),
(199, 2, '바다의 지배',     'nurture_buff', '{"exp_bonus":12,"feed_bonus":8,"pet_bonus":8}', 600, '{1}'),
(199, 3, '해왕류 군단',     'evolution',    '{"water_explore_bonus":0.35,"all_explore_bonus":0.15}', 900, '{2}'),
(199, 4, '고대병기의 진가', 'explore_buff', '{"all_explore_bonus":0.3,"exp_bonus":20}', 1200, '{3}'),
-- Species 200: 우라노스 슬라임
(200, 1, '천벌의 힘',       'stat_buff',    '{"exp":20,"affection":15}', 400, '{}'),
(200, 2, '하늘의 심판',     'nurture_buff', '{"exp_bonus":15,"play_bonus":10,"condition_decay_reduce":5}', 600, '{1}'),
(200, 3, '천상의 포격',     'evolution',    '{"celestial_explore_bonus":0.35,"all_explore_bonus":0.15}', 900, '{2}'),
(200, 4, '고대병기의 진가', 'explore_buff', '{"all_explore_bonus":0.3,"exp_bonus":20}', 1200, '{3}')
ON CONFLICT (species_id, node_id) DO NOTHING;

-- Seasons (4)
INSERT INTO game_seasons (id, name, name_en, start_date, end_date, limited_species, special_shop_items, banner_color, description, buffs) VALUES
(1, '봄꽃 축제',     'Spring Blossom Festival', '2026-03-01', '2026-05-31', '{24}',
   '[{"id":101,"name":"봄꽃 알","name_en":"Blossom Egg","type":"egg","cost":{"gold":500,"gems":0},"icon":"blossom_egg.png","description":"풀 원소 슬라임이 태어날 수 있는 봄 한정 알","species_pool":[3,15,24]}]',
   '#FFB8D0', '봄의 기운이 가득한 축제! 한정 꽃향기 슬라임을 만나보세요.', '{"grass":1.2,"light":1.1}'),
(2, '여름 파도 축제', 'Summer Tide Festival',    '2026-07-01', '2026-08-31', '{32}',
   '[{"id":102,"name":"파도 알","name_en":"Tide Egg","type":"egg","cost":{"gold":500,"gems":0},"icon":"tide_egg.png","description":"물 원소 슬라임이 태어날 수 있는 여름 한정 알","species_pool":[1,13,22]}]',
   '#74B9FF', '시원한 파도와 함께하는 여름 축제! 한정 항해 슬라임을 만나보세요.', '{"water":1.2,"electric":1.1}'),
(3, '가을 수확 축제', 'Autumn Harvest Festival',  '2026-09-01', '2026-11-30', '{}',
   '[{"id":103,"name":"수확 알","name_en":"Harvest Egg","type":"egg","cost":{"gold":400,"gems":0},"icon":"harvest_egg.png","description":"대지와 바람의 슬라임이 태어날 수 있는 알","species_pool":[9,10,20]}]',
   '#E17055', '풍성한 가을! 탐험 보상이 1.5배 증가합니다.', '{"earth":1.3,"wind":1.2,"poison":1.1}'),
(4, '겨울 결정 축제', 'Winter Crystal Festival',  '2026-12-01', '2027-02-28', '{}',
   '[{"id":104,"name":"결정 알","name_en":"Crystal Egg","type":"egg","cost":{"gold":600,"gems":0},"icon":"crystal_egg.png","description":"얼음과 천체의 슬라임이 태어날 수 있는 알","species_pool":[6,17,11]}]',
   '#81ECEC', '겨울 결정 축제! 한정 얼음 & 천체 슬라임을 만나보세요.', '{"ice":1.3,"celestial":1.2,"dark":1.1}')
ON CONFLICT (id) DO NOTHING;

-- Slime Sets (10)
INSERT INTO game_slime_sets (id, name, name_en, description, species_ids, bonus_score, buff_type, buff_value, buff_label) VALUES
(1,  '동해의 시작',     'East Blue Beginnings', '동해 해적단의 다섯 기본 원소 슬라임을 모아보세요. 모든 모험은 여기서 시작됩니다.', '{1,2,3,4,5}', 30, 'nurture_exp', 1.1, '육성 EXP +10%'),
(2,  '밀짚모자의 여행', 'Straw Hat Journey',    '밀짚모자 일당의 여섯 동료 슬라임을 모아보세요. 위대한 항로의 모험이 시작됩니다.', '{30,31,32,33,34,35}', 80, 'exploration_gold', 1.15, '탐험 골드 +15%'),
(3,  '사황의 위엄',     'Yonko Majesty',        '사황급 신화 슬라임을 모두 모아보세요. 세계의 균형을 지배하는 절대적 힘입니다.', '{139,140,141,142,143}', 300, 'mutation_chance', 1.2, '돌연변이 확률 +20%'),
(4,  '자연계의 힘',     'Logia Power',          '자연계의 다섯 전설 슬라임을 모아보세요. 자연의 원소 그 자체가 된 존재들입니다.', '{144,145,146,149,150}', 200, 'exploration_gold', 1.2, '탐험 골드 +20%'),
(5,  '해군의 정의',     'Marine Justice',        '해군 본부의 정의를 실현하는 네 슬라임을 모아보세요. 빛, 얼음, 용암의 정의가 원수에게 모입니다.', '{115,116,117,118}', 120, 'material_drop', 1.15, '재료 드롭률 +15%'),
(6,  '칠무해의 전설',   'Warlord Legends',       '칠무해의 네 전설적인 슬라임을 모아보세요. 바다의 균형을 유지하는 정부의 비밀 무기입니다.', '{79,80,81,83}', 150, 'synthesis_grade', 1.1, '합성 등급 UP +10%'),
(7,  '고대병기',        'Ancient Weapons',        '세 고대병기 슬라임을 모두 모아보세요. 세계를 멸망시킬 수 있는 궁극의 힘입니다.', '{198,199,200}', 500, 'mutation_chance', 1.25, '돌연변이 확률 +25%'),
(8,  '최악의 세대',     'Worst Generation',       '최악의 세대 다섯 슬라임을 모아보세요. 바다를 뒤흔드는 새로운 시대의 주역들입니다.', '{85,86,87,92,94}', 100, 'exploration_gold', 1.12, '탐험 골드 +12%'),
(9,  '혁명의 불꽃',     'Revolutionary Flame',    '혁명군의 다섯 핵심 슬라임을 모아보세요. 세계를 바꾸려는 불꽃이 타오릅니다.', '{191,192,193,194,195}', 150, 'material_drop', 1.18, '재료 드롭률 +18%'),
(10, '하늘의 모험',     'Sky Adventure',           '공중도시의 네 하늘 슬라임을 모아보세요. 구름 위의 세계에서 날아다니는 모험가들입니다.', '{57,58,61,62}', 80, 'nurture_exp', 1.12, '육성 EXP +12%')
ON CONFLICT (id) DO NOTHING;

-- Mutation Recipes (3)
INSERT INTO game_mutation_recipes (required_element_a, required_element_b, required_material, result_species_id, min_collection_score) VALUES
('fire',      'water',  18, 777, 0),
('dark',      'poison', 6,  888, 0),
('celestial', 'light',  20, 999, 500)
ON CONFLICT DO NOTHING;
