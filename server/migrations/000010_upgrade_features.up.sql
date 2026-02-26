-- 000010_upgrade_features.up.sql
-- Idle progress, Crafting, Gifting, Admin features

-- ========== Idle/Offline Progress ==========
CREATE TABLE IF NOT EXISTS idle_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  last_collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gold_rate INT NOT NULL DEFAULT 10  -- gold per minute
);

-- ========== Crafting System ==========
CREATE TABLE IF NOT EXISTS crafting_recipes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  result_type VARCHAR(50) NOT NULL,  -- 'material', 'egg', 'accessory', 'booster'
  result_id INT NOT NULL,
  result_qty INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crafting_ingredients (
  recipe_id INT REFERENCES crafting_recipes(id) ON DELETE CASCADE,
  material_id INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (recipe_id, material_id)
);

-- ========== Gift Logs ==========
CREATE TABLE IF NOT EXISTS gift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  gift_type VARCHAR(20) NOT NULL,  -- 'gold', 'gems'
  amount INT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_logs_sender ON gift_logs(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gift_logs_receiver ON gift_logs(receiver_id, created_at);

-- ========== Admin Users ==========
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== Initial Crafting Recipes ==========
-- Recipe 1: Premium Egg (슬라임젤 x5 + 별조각 x2)
INSERT INTO crafting_recipes (id, name, result_type, result_id, result_qty) VALUES
  (1, '프리미엄 에그', 'egg', 2, 1),
  (2, '레전더리 에그', 'egg', 6, 1),
  (3, '불꽃의 정수', 'egg', 3, 1),
  (4, '파도의 정수', 'egg', 4, 1),
  (5, '대지의 정수', 'egg', 23, 1),
  (6, '번개의 정수', 'egg', 22, 1),
  (7, '경험치 물약', 'booster', 1, 1),
  (8, '골드 부스터', 'booster', 2, 1),
  (9, '빛나는 왕관', 'accessory', 1, 1),
  (10, '심해 진주', 'material', 8, 1);

-- Recipe ingredients
-- 1: Premium Egg = 슬라임젤(1) x5 + 별조각(2) x2
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (1, 1, 5), (1, 2, 2);
-- 2: Legendary Egg = 무지개젤(3) x3 + 달빛이슬(4) x5 + 별조각(2) x10
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (2, 3, 3), (2, 4, 5), (2, 2, 10);
-- 3: Fire Essence = 화염석(5) x3 + 슬라임젤(1) x2
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (3, 5, 3), (3, 1, 2);
-- 4: Water Essence = 물의결정(6) x3 + 슬라임젤(1) x2
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (4, 6, 3), (4, 1, 2);
-- 5: Earth Essence = 대지코어(9) x3 + 슬라임젤(1) x2
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (5, 9, 3), (5, 1, 2);
-- 6: Lightning Essence = 번개수정(10) x3 + 슬라임젤(1) x2
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (6, 10, 3), (6, 1, 2);
-- 7: EXP Potion = 슬라임젤(1) x10 + 별조각(2) x5
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (7, 1, 10), (7, 2, 5);
-- 8: Gold Booster = 슬라임젤(1) x8 + 달빛이슬(4) x3
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (8, 1, 8), (8, 4, 3);
-- 9: Crown = 무지개젤(3) x5 + 달빛이슬(4) x5 + 별조각(2) x20
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (9, 3, 5), (9, 4, 5), (9, 2, 20);
-- 10: Deep Sea Pearl = 물의결정(6) x10 + 달빛이슬(4) x10 + 보이드조각(11) x1
INSERT INTO crafting_ingredients (recipe_id, material_id, quantity) VALUES
  (10, 6, 10), (10, 4, 10), (10, 11, 1);

-- Initialize idle_progress for existing users
INSERT INTO idle_progress (user_id, last_collected_at)
SELECT id, now() FROM users
ON CONFLICT DO NOTHING;
