-- New slime species (9-12)
INSERT INTO slime_species (id, name, name_en, element, grade, description)
VALUES
  (9,  '용암 슬라임',   'Lava',    'fire',  'rare',      '불과 어둠의 힘이 합쳐진 뜨거운 슬라임. 어둠 속에서도 붉게 빛난다.'),
  (10, '무지개 슬라임', 'Rainbow', 'light', 'epic',      '이끼와 황혼의 조화로 탄생한 신비로운 슬라임. 일곱 빛깔로 빛난다.'),
  (11, '벚꽃 슬라임',   'Blossom', 'grass', 'rare',      '봄의 기운을 머금은 분홍빛 슬라임. 주변에 꽃잎이 날린다.'),
  (12, '파도 슬라임',   'Tide',    'water', 'rare',      '깊은 바다의 힘을 지닌 슬라임. 파도처럼 출렁인다.')
ON CONFLICT (id) DO NOTHING;
