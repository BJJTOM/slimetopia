-- Migration 000009: Replace all species with 200 new One Piece-inspired faction species + 3 hidden
-- WARNING: This is a destructive migration that removes all existing slime data

-- Clear all dependent data first (respecting foreign key order)
DELETE FROM equipped_accessories;
DELETE FROM collection_entries;
DELETE FROM codex_entries;
DELETE FROM recipe_discoveries;
DELETE FROM evolution_unlocks;
DELETE FROM first_discoveries;
DELETE FROM race_results;
DELETE FROM slimes;
DELETE FROM slime_species;

-- Insert 200 new species + 3 hidden mutation species
INSERT INTO slime_species (id, name, name_en, element, grade, description) VALUES
-- ============================================================
-- FACTION 1: 동해 해적단 (East Blue Pirates) — IDs 1-11, ALL COMMON
-- ============================================================
(1,   '물방울 해적 슬라임',     'Droplet Pirate Slime',      'water',     'common',    '동해에서 처음 만나는 물 슬라임. 순수하고 맑다.'),
(2,   '불씨 해적 슬라임',       'Ember Pirate Slime',        'fire',      'common',    '작지만 뜨거운 열정을 가진 슬라임.'),
(3,   '풀잎 해적 슬라임',       'Leaf Pirate Slime',         'grass',     'common',    '동해의 숲에서 자란 싱그러운 슬라임.'),
(4,   '반딧불 해적 슬라임',     'Firefly Pirate Slime',      'light',     'common',    '밤바다를 밝히는 작은 빛 슬라임.'),
(5,   '그림자 해적 슬라임',     'Shadow Pirate Slime',       'dark',      'common',    '어둠 속에서 조용히 움직이는 슬라임.'),
(6,   '눈송이 해적 슬라임',     'Snowflake Pirate Slime',    'ice',       'common',    '차가운 동해 바람과 함께 태어난 슬라임.'),
(7,   '번개 해적 슬라임',       'Spark Pirate Slime',        'electric',  'common',    '작은 정전기를 일으키는 장난꾸러기 슬라임.'),
(8,   '독버섯 해적 슬라임',     'Mushroom Pirate Slime',     'poison',    'common',    '독버섯 모양의 귀여운 슬라임.'),
(9,   '모래 해적 슬라임',       'Sand Pirate Slime',         'earth',     'common',    '동해 해변의 모래로 이루어진 슬라임.'),
(10,  '산들바람 해적 슬라임',   'Breeze Pirate Slime',       'wind',      'common',    '가벼운 바람처럼 자유로운 슬라임.'),
(11,  '별빛 해적 슬라임',       'Starlight Pirate Slime',    'celestial', 'common',    '밤하늘 별빛을 머금은 신비한 슬라임.'),

-- ============================================================
-- FACTION 2: 위대한 항로 (Grand Line) — IDs 12-29
-- ============================================================
-- Common (12-20)
(12,  '나침반 슬라임',           'Compass Slime',             'light',     'common',    '기록지침을 품은 항해의 동반자.'),
(13,  '해류 슬라임',             'Current Slime',             'water',     'common',    '위대한 항로의 해류를 타고 다니는 슬라임.'),
(14,  '연기 슬라임',             'Smoke Slime',               'fire',      'common',    '뿌연 연기를 내뿜는 모호한 슬라임.'),
(15,  '덩굴 슬라임',             'Vine Slime',                'grass',     'common',    '정글의 덩굴처럼 감아 올라가는 슬라임.'),
(16,  '유령 슬라임',             'Ghost Slime',               'dark',      'common',    '마법의 삼각지대에서 나타난 유령 슬라임.'),
(17,  '서리 슬라임',             'Frost Slime',               'ice',       'common',    '서리를 뿌리며 지나가는 차가운 슬라임.'),
(18,  '정전기 슬라임',           'Static Slime',              'electric',  'common',    '몸에서 정전기가 튀는 깜짝 슬라임.'),
(19,  '이끼 슬라임',             'Moss Slime',                'poison',    'common',    '독성 이끼에 덮인 위험한 슬라임.'),
(20,  '자갈 슬라임',             'Pebble Slime',              'earth',     'common',    '작은 자갈처럼 단단한 피부의 슬라임.'),
-- Uncommon (21-29)
(21,  '기록계 슬라임',           'Log Slime',                 'wind',      'uncommon',  '기록지침처럼 방향을 안내하는 슬라임.'),
(22,  '안개 슬라임',             'Mist Slime',                'water',     'uncommon',  '짙은 안개를 만들어내는 신비한 슬라임.'),
(23,  '횃불 슬라임',             'Torch Slime',               'fire',      'uncommon',  '어둠을 밝히는 횃불 같은 슬라임.'),
(24,  '꽃향기 슬라임',           'Floral Slime',              'grass',     'uncommon',  '달콤한 꽃향기를 풍기는 매력적인 슬라임.'),
(25,  '무지개빛 슬라임',         'Prismatic Slime',           'light',     'uncommon',  '무지개빛으로 반짝이는 아름다운 슬라임.'),
(26,  '밤안개 슬라임',           'Night Mist Slime',          'dark',      'uncommon',  '밤의 안개처럼 스며드는 슬라임.'),
(27,  '결빙 슬라임',             'Freeze Slime',              'ice',       'uncommon',  '주변을 얼리는 차가운 기운의 슬라임.'),
(28,  '낙뢰 슬라임',             'Lightning Slime',           'electric',  'uncommon',  '번개를 불러오는 강력한 슬라임.'),
(29,  '수정 슬라임',             'Crystal Slime',             'earth',     'uncommon',  '보석처럼 투명한 수정 슬라임.'),

-- ============================================================
-- FACTION 3: 밀짚모자 일당 (Straw Hat Crew) — IDs 30-40
-- ============================================================
-- Rare (30-35)
(30,  '고무 슬라임',             'Rubber Slime',              'fire',      'rare',      '고무처럼 늘어나고 튕기는 자유로운 슬라임.'),
(31,  '삼검 슬라임',             'Triple Blade Slime',        'wind',      'rare',      '세 자루 검을 휘두르는 전사 슬라임.'),
(32,  '항해 슬라임',             'Navigator Slime',           'water',     'rare',      '날씨를 읽는 천재 항해사 슬라임.'),
(33,  '저격 슬라임',             'Sniper Slime',              'grass',     'rare',      '멀리서도 정확하게 맞추는 명사수 슬라임.'),
(34,  '요리사 슬라임',           'Chef Slime',                'fire',      'rare',      '최고의 요리를 만드는 미식가 슬라임.'),
(35,  '순록 슬라임',             'Reindeer Slime',            'ice',       'rare',      '치유의 능력을 가진 작은 의사 슬라임.'),
-- Epic (36-39)
(36,  '고고학 슬라임',           'Scholar Slime',             'light',     'epic',      '고대 문자를 해독하는 지식의 슬라임.'),
(37,  '기계 슬라임',             'Cyborg Slime',              'electric',  'epic',      '몸을 개조한 초 강력 기계 슬라임.'),
(38,  '해골 슬라임',             'Skeleton Slime',            'dark',      'epic',      '음악과 함께 부활한 해골 검사 슬라임.'),
(39,  '어인 슬라임',             'Fishman Slime',             'water',     'epic',      '바다에서 무적인 어인족 슬라임.'),
-- Legendary (40)
(40,  '태양신 슬라임',           'Sun God Slime',             'fire',      'legendary', '자유의 전사가 각성한 태양신 슬라임.'),

-- ============================================================
-- FACTION 4: 바로크 워크스 (Baroque Works) — IDs 41-50
-- ============================================================
-- Uncommon (41-45)
(41,  '밀랍 슬라임',             'Wax Slime',                 'earth',     'uncommon',  '밀랍으로 무엇이든 만들어내는 슬라임.'),
(42,  '폭탄 슬라임',             'Bomb Slime',                'fire',      'uncommon',  '몸이 폭탄인 위험한 슬라임.'),
(43,  '가시 슬라임',             'Spike Slime',               'poison',    'uncommon',  '날카로운 가시로 뒤덮인 슬라임.'),
(44,  '무중력 슬라임',           'Zero-G Slime',              'wind',      'uncommon',  '중력을 무시하고 떠다니는 슬라임.'),
(45,  '색칠 슬라임',             'Paint Slime',               'light',     'uncommon',  '화려한 색으로 변장하는 슬라임.'),
-- Rare (46-50)
(46,  '모래폭풍 슬라임',         'Sandstorm Slime',           'earth',     'rare',      '사막의 왕이 일으키는 모래폭풍 슬라임.'),
(47,  '칼날 슬라임',             'Blade Slime',               'dark',      'rare',      '온몸이 날카로운 칼날인 암살자 슬라임.'),
(48,  '점토 슬라임',             'Clay Slime',                'earth',     'rare',      '자유자재로 형태를 바꾸는 슬라임.'),
(49,  '향수 슬라임',             'Perfume Slime',             'grass',     'rare',      '매혹적인 향기로 적을 마비시키는 슬라임.'),
(50,  '거울 슬라임',             'Mirror Slime',              'light',     'rare',      '모든 것을 반사하는 신비한 거울 슬라임.'),

-- ============================================================
-- FACTION 5: 공중도시 (Sky Island/Skypiea) — IDs 51-62
-- ============================================================
-- Uncommon (51-56)
(51,  '구름 슬라임',             'Cloud Slime',               'wind',      'uncommon',  '구름 위를 자유롭게 떠다니는 슬라임.'),
(52,  '천사 슬라임',             'Angel Slime',               'light',     'uncommon',  '하얀 날개를 가진 천사 모양 슬라임.'),
(53,  '다이얼 슬라임',           'Dial Slime',                'wind',      'uncommon',  '조개 다이얼의 힘을 사용하는 슬라임.'),
(54,  '날개 슬라임',             'Wing Slime',                'wind',      'uncommon',  '바람을 타고 하늘을 나는 슬라임.'),
(55,  '하늘기둥 슬라임',         'Sky Pillar Slime',          'light',     'uncommon',  '하늘과 땅을 잇는 기둥 같은 슬라임.'),
(56,  '번개신 슬라임',           'Thunder God Slime',         'electric',  'uncommon',  '번개를 자유자재로 다루는 신적 슬라임.'),
-- Rare (57-62)
(57,  '천공 슬라임',             'Celestial Sky Slime',       'celestial', 'rare',      '하늘 너머의 우주를 품은 슬라임.'),
(58,  '상승기류 슬라임',         'Updraft Slime',             'wind',      'rare',      '강력한 상승기류를 만들어내는 슬라임.'),
(59,  '구름해 슬라임',           'Cloud Sea Slime',           'water',     'rare',      '구름 바다를 헤엄치는 슬라임.'),
(60,  '철구름 슬라임',           'Iron Cloud Slime',          'earth',     'rare',      '구름을 철처럼 단단하게 만드는 슬라임.'),
(61,  '번개구름 슬라임',         'Thunder Cloud Slime',       'electric',  'rare',      '번개를 품은 먹구름 슬라임.'),
(62,  '황금종 슬라임',           'Golden Bell Slime',         'light',     'rare',      '울리면 소원이 이루어지는 종 모양 슬라임.'),

-- ============================================================
-- FACTION 6: CP 기관 (Cipher Pol) — IDs 63-72
-- ============================================================
-- Rare (63-67)
(63,  '암살 슬라임',             'Assassin Slime',            'dark',      'rare',      '소리 없이 다가오는 비밀 요원 슬라임.'),
(64,  '지문 슬라임',             'Fingerprint Slime',         'light',     'rare',      '어떤 모습으로든 변할 수 있는 슬라임.'),
(65,  '철괴 슬라임',             'Iron Block Slime',          'earth',     'rare',      '몸을 쇠처럼 단단하게 만드는 슬라임.'),
(66,  '지탄 슬라임',             'Finger Bullet Slime',       'wind',      'rare',      '손가락에서 총알을 쏘는 슬라임.'),
(67,  '종이 슬라임',             'Paper Slime',               'grass',     'rare',      '종이처럼 얇아져 스며드는 슬라임.'),
-- Epic (68-72)
(68,  '비밀 슬라임',             'Secret Slime',              'dark',      'epic',      '세계정부의 비밀을 지키는 슬라임.'),
(69,  '사이퍼 슬라임',           'Cipher Slime',              'electric',  'epic',      '암호를 해독하는 천재 정보원 슬라임.'),
(70,  '정의 슬라임',             'Dark Justice Slime',        'dark',      'epic',      '어둠의 정의를 실행하는 냉혹한 슬라임.'),
(71,  '육식 슬라임',             'Rokushiki Slime',           'wind',      'epic',      '여섯 가지 체술을 마스터한 슬라임.'),
(72,  '패왕 슬라임',             'Conqueror Slime',           'dark',      'epic',      '압도적인 패기로 적을 제압하는 슬라임.'),

-- ============================================================
-- FACTION 7: 칠무해 (Seven Warlords) — IDs 73-84
-- ============================================================
-- Epic (73-78)
(73,  '검황 슬라임',             'Sword Emperor Slime',       'dark',      'epic',      '세계 최강의 검을 휘두르는 검사 슬라임.'),
(74,  '사막왕 슬라임',           'Desert King Slime',         'earth',     'epic',      '사막을 지배하는 왕자 슬라임.'),
(75,  '인형술 슬라임',           'Puppet Master Slime',       'grass',     'epic',      '실로 모든 것을 조종하는 슬라임.'),
(76,  '독룡 슬라임',             'Poison Dragon Slime',       'poison',    'epic',      '맹독의 용 형태를 가진 슬라임.'),
(77,  '그림자왕 슬라임',         'Shadow Lord Slime',         'dark',      'epic',      '그림자를 지배하는 공포의 슬라임.'),
(78,  '뱀황후 슬라임',           'Snake Empress Slime',       'grass',     'epic',      '아름다움으로 적을 석화시키는 슬라임.'),
-- Legendary (79-84)
(79,  '검은칼 슬라임',           'Black Blade Slime',         'dark',      'legendary', '세계 최강검을 든 전설의 검사 슬라임.'),
(80,  '폭군 슬라임',             'Tyrant Slime',              'wind',      'legendary', '모든 고통을 밀어내는 폭군 슬라임.'),
(81,  '불꽃왕 슬라임',           'Flame Lord Slime',          'fire',      'legendary', '불꽃으로 모든 것을 태우는 왕 슬라임.'),
(82,  '패왕색 슬라임',           'Supreme King Slime',        'celestial', 'legendary', '패왕색 패기의 소유자 슬라임.'),
(83,  '해적여제 슬라임',         'Pirate Empress Slime',      'water',     'legendary', '바다의 여제가 된 전설의 슬라임.'),
(84,  '현자 슬라임',             'Sage Slime',                'light',     'legendary', '모든 것을 꿰뚫어 보는 현자 슬라임.'),

-- ============================================================
-- FACTION 8: 최악의 세대 (Worst Generation) — IDs 85-98
-- ============================================================
-- Rare (85-91)
(85,  '자기장 슬라임',           'Magnetic Slime',            'electric',  'rare',      '자력으로 금속을 조종하는 슬라임.'),
(86,  '수술 슬라임',             'Surgery Slime',             'water',     'rare',      '공간을 조작하는 천재 외과의 슬라임.'),
(87,  '파괴자 슬라임',           'Destroyer Slime',           'fire',      'rare',      '모든 것을 파괴하는 흉폭한 슬라임.'),
(88,  '음파 슬라임',             'Sound Wave Slime',          'wind',      'rare',      '음파로 적을 쓰러뜨리는 슬라임.'),
(89,  '식인 슬라임',             'Glutton Slime',             'dark',      'rare',      '모든 것을 먹어치우는 탐욕스러운 슬라임.'),
(90,  '초속 슬라임',             'Superspeed Slime',          'wind',      'rare',      '빛보다 빠르게 움직이는 슬라임.'),
(91,  '점성 슬라임',             'Viscous Slime',             'poison',    'rare',      '끈적끈적한 점액으로 적을 가두는 슬라임.'),
-- Epic (92-98)
(92,  '마법진 슬라임',           'Magic Circle Slime',        'celestial', 'epic',      '마법진을 그려 공간을 조작하는 슬라임.'),
(93,  '공중해적 슬라임',         'Sky Pirate Slime',          'wind',      'epic',      '하늘에서 습격하는 해적 슬라임.'),
(94,  '불사조날개 슬라임',       'Phoenix Wing Slime',        'fire',      'epic',      '불사조의 날개를 가진 재생의 슬라임.'),
(95,  '화약 슬라임',             'Gunpowder Slime',           'fire',      'epic',      '화약의 힘으로 폭발하는 슬라임.'),
(96,  '바다괴물 슬라임',         'Sea Beast Slime',           'water',     'epic',      '심해의 괴물처럼 거대한 슬라임.'),
(97,  '육중 슬라임',             'Heavy Slime',               'earth',     'epic',      '중력을 조작하는 무거운 슬라임.'),
(98,  '겁쟁이해적 슬라임',       'Coward Pirate Slime',       'grass',     'epic',      '겁쟁이지만 놀라운 힘을 숨긴 슬라임.'),

-- ============================================================
-- FACTION 9: 해군 본부 (Marine HQ) — IDs 99-118
-- ============================================================
-- Common (99-104)
(99,  '해군병 슬라임',           'Marine Soldier Slime',      'water',     'common',    '정의를 위해 싸우는 해군 병사 슬라임.'),
(100, '해군하사 슬라임',         'Marine Sergeant Slime',     'earth',     'common',    '부대를 이끄는 하사관 슬라임.'),
(101, '정의검 슬라임',           'Justice Sword Slime',       'light',     'common',    '정의의 검을 든 해군 슬라임.'),
(102, '포격 슬라임',             'Cannon Slime',              'fire',      'common',    '대포를 쏘는 해군 포병 슬라임.'),
(103, '순찰 슬라임',             'Patrol Slime',              'wind',      'common',    '바다를 순찰하는 해군 정찰 슬라임.'),
(104, '방패병 슬라임',           'Shield Soldier Slime',      'earth',     'common',    '방패로 동료를 지키는 슬라임.'),
-- Uncommon (105-110)
(105, '해병대장 슬라임',         'Marine Captain Slime',      'water',     'uncommon',  '부대를 지휘하는 해병 대장 슬라임.'),
(106, '전투참모 슬라임',         'Tactician Slime',           'light',     'uncommon',  '전략을 짜는 천재 참모 슬라임.'),
(107, '철권 슬라임',             'Iron Fist Slime',           'earth',     'uncommon',  '강철 주먹으로 싸우는 슬라임.'),
(108, '망원경 슬라임',           'Telescope Slime',           'light',     'uncommon',  '먼 바다를 감시하는 정보 슬라임.'),
(109, '군의관 슬라임',           'Medic Slime',               'grass',     'uncommon',  '부상병을 치료하는 군의관 슬라임.'),
(110, '기관포 슬라임',           'Gatling Slime',             'electric',  'uncommon',  '연사포를 발사하는 화력 슬라임.'),
-- Rare (111-114)
(111, '준장 슬라임',             'Commodore Slime',           'water',     'rare',      '함대를 이끄는 해군 준장 슬라임.'),
(112, '소장 슬라임',             'Rear Admiral Slime',        'wind',      'rare',      '바람을 다루는 해군 소장 슬라임.'),
(113, '중장 슬라임',             'Vice Admiral Slime',        'earth',     'rare',      '패기를 사용하는 해군 중장 슬라임.'),
(114, '과학자 슬라임',           'Scientist Slime',           'electric',  'rare',      '천재 과학으로 병기를 만드는 슬라임.'),
-- Epic (115-117)
(115, '빛의 정의 슬라임',       'Light Justice Slime',       'light',     'epic',      '빛의 속도로 공격하는 대장 슬라임.'),
(116, '얼음의 정의 슬라임',     'Ice Justice Slime',         'ice',       'epic',      '세상을 얼리는 냉정한 대장 슬라임.'),
(117, '용암의 정의 슬라임',     'Magma Justice Slime',       'fire',      'epic',      '용암으로 모든 악을 태우는 대장 슬라임.'),
-- Legendary (118)
(118, '원수 슬라임',             'Fleet Admiral Slime',       'fire',      'legendary', '해군의 정점에 선 최강의 슬라임.'),

-- ============================================================
-- FACTION 10: 사황 해적단 (Yonko/Four Emperors) — IDs 119-143
-- ============================================================
-- Epic (119-128)
-- 흰수염 해적단 (Whitebeard)
(119, '지진 슬라임',             'Quake Slime',               'earth',     'epic',      '대지를 흔드는 진동의 슬라임.'),
(120, '불사조 슬라임',           'Phoenix Slime',             'fire',      'epic',      '불꽃으로 재생하는 불사조 슬라임.'),
(121, '다이아몬드 슬라임',       'Diamond Slime',             'ice',       'epic',      '몸을 다이아몬드로 만드는 슬라임.'),
(122, '사령관 슬라임',           'Commander Slime',           'water',     'epic',      '함대를 이끄는 사령관 슬라임.'),
-- 빅맘 해적단 (Big Mom)
(123, '혼의 여왕 슬라임',       'Soul Queen Slime',          'dark',      'epic',      '영혼을 빼앗는 공포의 여왕 슬라임.'),
(124, '달빛기사 슬라임',         'Moon Knight Slime',         'light',     'epic',      '달빛 아래 빛나는 기사 슬라임.'),
(125, '과자성 슬라임',           'Candy Slime',               'grass',     'epic',      '달콤한 과자로 이루어진 슬라임.'),
(126, '젤리 슬라임',             'Jelly Slime',               'water',     'epic',      '탄력있는 젤리 몸을 가진 슬라임.'),
-- 백수 해적단 (Beast Pirates)
(127, '비늘 슬라임',             'Scale Slime',               'earth',     'epic',      '용의 비늘로 뒤덮인 슬라임.'),
(128, '역병의 슬라임',           'Plague Slime',              'poison',    'epic',      '역병을 퍼뜨리는 공포의 슬라임.'),
-- Legendary (129-138)
(129, '흰수염왕 슬라임',         'White Emperor Slime',       'earth',     'legendary', '세계를 흔든 최강의 대지 슬라임.'),
(130, '빅맘왕 슬라임',           'Soul Emperor Slime',        'dark',      'legendary', '만물의 영혼을 지배하는 슬라임.'),
(131, '화재왕 슬라임',           'Wildfire Emperor Slime',    'fire',      'legendary', '모든 것을 태우는 화재의 슬라임.'),
(132, '대홍수왕 슬라임',         'Flood Emperor Slime',       'water',     'legendary', '바다를 지배하는 대홍수 슬라임.'),
(133, '저격왕 슬라임',           'Sniper King Slime',         'wind',      'legendary', '먼 곳의 적도 맞추는 저격왕 슬라임.'),
(134, '번개검왕 슬라임',         'Lightning Emperor Slime',   'electric',  'legendary', '번개를 품은 검으로 싸우는 슬라임.'),
(135, '암흑왕 슬라임',           'Darkness Emperor Slime',    'dark',      'legendary', '모든 빛을 삼키는 암흑 슬라임.'),
(136, '지진흡수 슬라임',         'Quake Absorb Slime',        'earth',     'legendary', '지진의 힘을 흡수한 슬라임.'),
(137, '독사과 슬라임',           'Poison Apple Slime',        'poison',    'legendary', '독사과를 들고 다니는 공포의 슬라임.'),
(138, '투명왕 슬라임',           'Invisible Emperor Slime',   'light',     'legendary', '투명화가 가능한 정보왕 슬라임.'),
-- Mythic (139-143)
(139, '용왕 슬라임',             'Dragon King Slime',         'fire',      'mythic',    '하늘을 나는 용의 왕. 모든 생물이 두려워하는 존재.'),
(140, '패왕자 슬라임',           'King Aura Slime',           'celestial', 'mythic',    '한 팔로 시대를 끝낸 패왕. 패기만으로 세상을 제압한다.'),
(141, '암흑대제 슬라임',         'Dark Emperor Slime',        'dark',      'mythic',    '가장 사악한 힘을 가진 암흑의 대제. 두 가지 악마의 힘을 가졌다.'),
(142, '대해적왕 슬라임',         'Pirate King Slime',         'fire',      'mythic',    '바다의 왕이 될 운명을 가진 전설의 슬라임.'),
(143, '흰수염신 슬라임',         'Quake God Slime',           'earth',     'mythic',    '세계를 멸망시킬 수 있는 지진신의 슬라임.'),

-- ============================================================
-- FACTION 11: 자연계 (Logia/Devil Fruit) — IDs 144-158
-- ============================================================
-- Legendary (144-153)
(144, '불꽃불꽃 슬라임',         'Flame-Flame Slime',         'fire',      'legendary', '온몸이 불꽃인 자연계 슬라임.'),
(145, '빙하빙하 슬라임',         'Ice-Ice Slime',             'ice',       'legendary', '모든 것을 얼리는 빙하의 슬라임.'),
(146, '번개번개 슬라임',         'Thunder-Thunder Slime',     'electric',  'legendary', '번개 그 자체가 된 자연계 슬라임.'),
(147, '마그마마그마 슬라임',     'Magma-Magma Slime',         'fire',      'legendary', '용암보다 뜨거운 마그마 슬라임.'),
(148, '모래모래 슬라임',         'Sand-Sand Slime',           'earth',     'legendary', '모래로 모든 것을 건조시키는 슬라임.'),
(149, '어둠어둠 슬라임',         'Dark-Dark Slime',           'dark',      'legendary', '어둠을 삼키고 끌어당기는 슬라임.'),
(150, '가스가스 슬라임',         'Gas-Gas Slime',             'poison',    'legendary', '치명적 독가스를 내뿜는 슬라임.'),
(151, '연기연기 슬라임',         'Smoke-Smoke Slime',         'wind',      'legendary', '연기처럼 사라지는 자유의 슬라임.'),
(152, '늪늪 슬라임',             'Swamp-Swamp Slime',         'earth',     'legendary', '모든 것을 삼키는 늪지 슬라임.'),
(153, '눈눈 슬라임',             'Snow-Snow Slime',           'ice',       'legendary', '아름다운 눈을 내리는 자연계 슬라임.'),
-- Mythic (154-158)
(154, '빛빛 슬라임',             'Light-Light Slime',         'light',     'mythic',    '빛의 속도로 움직이는 가장 빠른 슬라임.'),
(155, '숲숲 슬라임',             'Forest-Forest Slime',       'grass',     'mythic',    '숲 전체를 지배하는 자연의 왕 슬라임.'),
(156, '회오리 슬라임',           'Whirlwind Slime',           'wind',      'mythic',    '모든 바람을 지배하는 최강의 풍신.'),
(157, '순간이동 슬라임',         'Teleport Slime',            'celestial', 'mythic',    '공간을 초월하는 우주의 슬라임.'),
(158, '원소통합 슬라임',         'Element Unity Slime',       'celestial', 'mythic',    '모든 원소를 합친 궁극의 슬라임.'),

-- ============================================================
-- FACTION 12: 초인계 (Paramecia) — IDs 159-172
-- ============================================================
-- Uncommon (159-163)
(159, '고무고무 슬라임',         'Rubber-Rubber Slime',       'fire',      'uncommon',  '고무처럼 늘어나는 초인계 슬라임.'),
(160, '꽃꽃 슬라임',             'Flower-Flower Slime',       'grass',     'uncommon',  '어디서든 꽃을 피우는 슬라임.'),
(161, '문문 슬라임',             'Door-Door Slime',           'wind',      'uncommon',  '공간에 문을 만드는 슬라임.'),
(162, '거품 슬라임',             'Bubble Slime',              'water',     'uncommon',  '거품으로 방어하는 슬라임.'),
(163, '메모 슬라임',             'Memo Slime',                'light',     'uncommon',  '기억을 조작하는 슬라임.'),
-- Rare (164-168)
(164, '실실 슬라임',             'String Slime',              'light',     'rare',      '실로 모든 것을 조종하는 슬라임.'),
(165, '감옥 슬라임',             'Cage Slime',                'dark',      'rare',      '적을 새장에 가두는 슬라임.'),
(166, '소리소리 슬라임',         'Sound-Sound Slime',         'wind',      'rare',      '소리를 무기로 만드는 슬라임.'),
(167, '운운 슬라임',             'Luck-Luck Slime',           'celestial', 'rare',      '행운을 조종하는 슬라임.'),
(168, '시간 슬라임',             'Time Slime',                'celestial', 'rare',      '시간을 조작하는 슬라임.'),
-- Epic (169-172)
(169, '중력 슬라임',             'Gravity Slime',             'earth',     'epic',      '중력을 자유자재로 다루는 슬라임.'),
(170, '떡떡 슬라임',             'Mochi Slime',               'grass',     'epic',      '탄력 있는 떡 몸을 가진 슬라임.'),
(171, '수술수술 슬라임',         'Op-Op Slime',               'water',     'epic',      '공간을 수술하는 천재 의사 슬라임.'),
(172, '영혼영혼 슬라임',         'Soul-Soul Slime',           'dark',      'epic',      '영혼을 조종하는 슬라임.'),

-- ============================================================
-- FACTION 13: 동물계 (Zoan) — IDs 173-187
-- ============================================================
-- Common (173-178)
(173, '강아지 슬라임',           'Puppy Slime',               'earth',     'common',    '강아지처럼 충성스러운 슬라임.'),
(174, '고양이 슬라임',           'Cat Slime',                 'grass',     'common',    '고양이처럼 민첩한 슬라임.'),
(175, '새 슬라임',               'Bird Slime',                'wind',      'common',    '하늘을 나는 새 모양 슬라임.'),
(176, '물고기 슬라임',           'Fish Slime',                'water',     'common',    '물에서 사는 물고기 슬라임.'),
(177, '곤충 슬라임',             'Insect Slime',              'poison',    'common',    '벌레처럼 작지만 강한 슬라임.'),
(178, '토끼 슬라임',             'Rabbit Slime',              'grass',     'common',    '토끼처럼 빠르게 뛰는 슬라임.'),
-- Uncommon (179-183)
(179, '늑대 슬라임',             'Wolf Slime',                'dark',      'uncommon',  '늑대의 본능을 가진 사냥꾼 슬라임.'),
(180, '표범 슬라임',             'Leopard Slime',             'grass',     'uncommon',  '표범처럼 빠르고 강한 슬라임.'),
(181, '독수리 슬라임',           'Eagle Slime',               'wind',      'uncommon',  '하늘의 왕자 독수리 슬라임.'),
(182, '뱀 슬라임',               'Snake Slime',               'poison',    'uncommon',  '교활한 뱀 모양의 슬라임.'),
(183, '사슴 슬라임',             'Deer Slime',                'grass',     'uncommon',  '숲의 수호자 사슴 슬라임.'),
-- Rare (184-186)
(184, '공룡 슬라임',             'Dinosaur Slime',            'earth',     'rare',      '고대 공룡의 힘을 가진 슬라임.'),
(185, '용 슬라임',               'Dragon Slime',              'fire',      'rare',      '용으로 변신하는 강력한 슬라임.'),
(186, '맘모스 슬라임',           'Mammoth Slime',             'ice',       'rare',      '빙하 시대의 맘모스 슬라임.'),
-- Epic (187)
(187, '대붕 슬라임',             'Great Bird Slime',          'wind',      'epic',      '하늘을 뒤덮는 거대한 새 슬라임.'),

-- ============================================================
-- FACTION 14: 혁명군 (Revolutionary Army) — IDs 188-195
-- ============================================================
-- Rare (188-190)
(188, '자유 슬라임',             'Freedom Slime',             'wind',      'rare',      '자유를 위해 싸우는 혁명의 슬라임.'),
(189, '혁명가 슬라임',           'Revolutionary Slime',       'fire',      'rare',      '혁명의 불꽃을 품은 슬라임.'),
(190, '저항 슬라임',             'Resistance Slime',          'earth',     'rare',      '압제에 저항하는 강인한 슬라임.'),
-- Epic (191-193)
(191, '카라스 슬라임',           'Crow Slime',                'dark',      'epic',      '까마귀 군단을 이끄는 슬라임.'),
(192, '참모총장 슬라임',         'Chief of Staff Slime',      'fire',      'epic',      '혁명군의 2인자. 불꽃의 의지를 이은 슬라임.'),
(193, '군단장 슬라임',           'Division Commander Slime',  'light',     'epic',      '군단을 이끄는 혁명군 간부 슬라임.'),
-- Legendary (194-195)
(194, '용의얼굴 슬라임',         'Dragon Face Slime',         'wind',      'legendary', '세계에서 가장 위험한 인물이라 불리는 혁명의 지도자.'),
(195, '해방자 슬라임',           'Liberator Slime',           'celestial', 'legendary', '세상을 해방시키려는 전설의 슬라임.'),

-- ============================================================
-- FACTION 15: 천룡인 & 고대병기 (Celestial Dragons & Ancient Weapons) — IDs 196-200
-- ============================================================
-- Legendary (196-197)
(196, '천룡 슬라임',             'Celestial Dragon Slime',    'celestial', 'legendary', '세계의 정점에 서 있는 고귀한 슬라임.'),
(197, '세계귀족 슬라임',         'World Noble Slime',         'light',     'legendary', '천상의 권위를 가진 귀족 슬라임.'),
-- Mythic (198-200)
(198, '플루톤 슬라임',           'Pluton Slime',              'earth',     'mythic',    '대지를 파괴하는 고대병기 슬라임. 전함의 힘을 가졌다.'),
(199, '포세이돈 슬라임',         'Poseidon Slime',            'water',     'mythic',    '바다의 왕. 모든 해왕류를 지배하는 슬라임.'),
(200, '우라노스 슬라임',         'Uranus Slime',              'celestial', 'mythic',    '하늘의 고대병기. 세상을 심판하는 슬라임.'),

-- ============================================================
-- HIDDEN MUTATION SPECIES
-- ============================================================
(777, '조이보이 슬라임',         'Joy Boy Slime',             'celestial', 'mythic',    '800년 전 약속을 지키러 돌아온 전설의 슬라임.'),
(888, '이무 슬라임',             'Im Slime',                  'dark',      'mythic',    '빈 옥좌에 앉은 세계의 진정한 지배자.'),
(999, '원피스 슬라임',           'One Piece Slime',           'celestial', 'mythic',    '모든 것을 하나로 만드는 궁극의 보물 슬라임.');
