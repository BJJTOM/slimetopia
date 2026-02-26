-- Expand slime species: 30 new species (IDs 13-42) across 11 elements and 6 grades
INSERT INTO slime_species (id, name, name_en, element, grade, description)
VALUES
  -- Ice element
  (13, '눈송이 슬라임',   'Snowflake',    'ice',       'common',    '작고 보송보송한 얼음 슬라임. 만지면 시원하다.'),
  (14, '빙하 슬라임',     'Glacier',      'ice',       'uncommon',  '단단한 얼음으로 이루어진 슬라임. 주변을 서늘하게 만든다.'),
  (15, '서리 슬라임',     'Frost',        'ice',       'rare',      '서리 무늬를 두른 아름다운 슬라임. 지나간 자리에 얼음꽃이 핀다.'),
  (31, '블리자드 슬라임', 'Blizzard',     'ice',       'epic',      '눈보라를 일으키는 강력한 얼음 슬라임. 주변 온도를 급격히 낮춘다.'),
  (39, '오로라 슬라임',   'Aurora',       'ice',       'mythic',    '극광의 기운을 머금은 전설의 슬라임. 밤하늘에 오로라를 수놓는다.'),

  -- Electric element
  (16, '번개 슬라임',     'Spark',        'electric',  'common',    '몸에서 작은 전기가 튀는 슬라임. 머리카락이 쭈뼛 선다.'),
  (17, '방전 슬라임',     'Discharge',    'electric',  'uncommon',  '축적된 전기를 방출하는 슬라임. 가끔 감전된다.'),
  (18, '뇌전 슬라임',     'Thunder',      'electric',  'rare',      '번개를 다루는 슬라임. 폭풍우 때 더 강해진다.'),
  (32, '플라즈마 슬라임', 'Plasma',       'electric',  'epic',      '플라즈마 상태의 초고에너지 슬라임. 만지면 감전 주의!'),
  (40, '천둥신 슬라임',   'Thunder God',  'electric',  'mythic',    '천둥과 번개를 지배하는 신화의 슬라임. 하늘이 포효한다.'),

  -- Poison element
  (19, '독버섯 슬라임',   'Mushroom',     'poison',    'common',    '보라빛 독버섯 모양의 슬라임. 귀엽지만 독이 있다.'),
  (20, '독안개 슬라임',   'Toxic Mist',   'poison',    'uncommon',  '보라색 안개를 뿜는 슬라임. 가까이 가면 어지럽다.'),
  (21, '맹독 슬라임',     'Venom',        'poison',    'rare',      '강력한 독을 지닌 슬라임. 만진 것은 모두 보라색으로 변한다.'),
  (33, '역병 슬라임',     'Plague',       'poison',    'epic',      '역병의 기운을 머금은 슬라임. 주변의 모든 것을 부식시킨다.'),

  -- Earth element
  (22, '모래 슬라임',     'Sand',         'earth',     'common',    '사막에서 온 모래빛 슬라임. 바람에 모래가 흩날린다.'),
  (23, '바위 슬라임',     'Boulder',      'earth',     'uncommon',  '단단한 바위로 덮인 슬라임. 방어력이 매우 높다.'),
  (24, '용암석 슬라임',   'Magma Rock',   'earth',     'epic',      '뜨거운 용암이 흐르는 바위 슬라임. 대지의 분노를 품고 있다.'),
  (34, '대지모 슬라임',   'Terra Mother', 'earth',     'legendary', '대지의 어머니라 불리는 전설의 슬라임. 생명을 키우는 힘이 있다.'),

  -- Wind element
  (25, '산들바람 슬라임', 'Breeze',       'wind',      'common',    '투명에 가까운 바람 슬라임. 살랑살랑 바람이 분다.'),
  (26, '돌풍 슬라임',     'Gust',         'wind',      'uncommon',  '갑자기 세찬 바람을 일으키는 슬라임. 모자를 조심해!'),
  (27, '태풍 슬라임',     'Typhoon',      'wind',      'epic',      '강력한 태풍을 일으키는 슬라임. 주변의 모든 것을 휩쓴다.'),
  (35, '폭풍신 슬라임',   'Storm God',    'wind',      'legendary', '폭풍을 지배하는 신화의 슬라임. 하늘과 바다를 뒤흔든다.'),

  -- Celestial element
  (28, '별빛 슬라임',     'Starlight',    'celestial', 'uncommon',  '별빛을 머금은 몽환적인 슬라임. 밤에 은은하게 빛난다.'),
  (29, '성운 슬라임',     'Nebula',       'celestial', 'rare',      '성운의 기운을 가진 슬라임. 우주의 색채를 품고 있다.'),
  (30, '은하 슬라임',     'Galaxy',       'celestial', 'epic',      '은하수를 담은 슬라임. 몸 안에 별들이 반짝인다.'),
  (36, '우주 슬라임',     'Cosmos',       'celestial', 'legendary', '우주 전체를 품은 슬라임. 시공간을 넘나든다.'),
  (41, '창조 슬라임',     'Creation',     'celestial', 'mythic',    '만물의 시작이라 불리는 창조의 슬라임. 새로운 별을 탄생시킨다.'),

  -- Light (legendary)
  (37, '영원 슬라임',     'Eternal',      'light',     'legendary', '영원한 빛을 가진 전설의 슬라임. 어둠을 완전히 물리친다.'),

  -- Dark (legendary + mythic)
  (38, '심연 슬라임',     'Abyss',        'dark',      'legendary', '깊은 심연에서 온 슬라임. 빛조차 삼키는 어둠의 힘을 가졌다.'),
  (42, '혼돈 슬라임',     'Chaos',        'dark',      'mythic',    '혼돈 그 자체인 신화의 슬라임. 현실의 법칙을 뒤틀린다.')
ON CONFLICT (id) DO NOTHING;
