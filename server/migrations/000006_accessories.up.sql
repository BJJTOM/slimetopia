-- Slime accessories / cosmetics
CREATE TABLE IF NOT EXISTS slime_accessories (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  accessory_id INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, accessory_id)
);

-- Which accessory is equipped on which slime (per slot)
CREATE TABLE IF NOT EXISTS equipped_accessories (
  id SERIAL PRIMARY KEY,
  slime_id UUID REFERENCES slimes(id) ON DELETE CASCADE,
  slot VARCHAR(10) NOT NULL, -- head, face, body
  accessory_id INT NOT NULL,
  UNIQUE(slime_id, slot)
);
