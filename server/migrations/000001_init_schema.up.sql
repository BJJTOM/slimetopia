-- SlimeTopia Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname    VARCHAR(20) UNIQUE NOT NULL,
    provider    VARCHAR(10) NOT NULL,           -- google / kakao
    provider_id VARCHAR(100) NOT NULL,
    gold        BIGINT NOT NULL DEFAULT 0,
    gems        INT NOT NULL DEFAULT 0,
    stardust    INT NOT NULL DEFAULT 0,
    level       INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_provider ON users(provider, provider_id);

-- Slime species reference table
CREATE TABLE slime_species (
    id          INT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    name_en     VARCHAR(50) NOT NULL,
    element     VARCHAR(10) NOT NULL,           -- water / fire / grass / light / dark
    grade       VARCHAR(15) NOT NULL,           -- common / uncommon / rare / epic / legendary / mythic
    description TEXT NOT NULL DEFAULT ''
);

-- Slimes (player-owned instances)
CREATE TABLE slimes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_id    INT NOT NULL REFERENCES slime_species(id),
    name          VARCHAR(20),
    level         INT NOT NULL DEFAULT 1,
    exp           INT NOT NULL DEFAULT 0,
    element       VARCHAR(10) NOT NULL,
    personality   VARCHAR(15) NOT NULL DEFAULT 'gentle',
    affection     INT NOT NULL DEFAULT 0 CHECK (affection >= 0 AND affection <= 100),
    hunger        INT NOT NULL DEFAULT 100 CHECK (hunger >= 0 AND hunger <= 100),
    condition     INT NOT NULL DEFAULT 100 CHECK (condition >= 0 AND condition <= 100),
    position_x    INT,
    position_y    INT,
    accessories   JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slimes_user ON slimes(user_id);

-- Villages
CREATE TABLE villages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(30) NOT NULL DEFAULT 'My Village',
    grid_size   INT NOT NULL DEFAULT 8,
    terrain     VARCHAR(10) NOT NULL DEFAULT 'grass',
    layout      JSONB NOT NULL DEFAULT '{}',
    visit_count INT NOT NULL DEFAULT 0,
    likes       INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Explorations (active expeditions)
CREATE TABLE explorations (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id INT NOT NULL,
    slime_ids      UUID[] NOT NULL,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at        TIMESTAMPTZ NOT NULL,
    claimed        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_explorations_user ON explorations(user_id);

-- Codex (discovered species per user)
CREATE TABLE codex_entries (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species_id    INT NOT NULL REFERENCES slime_species(id),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, species_id)
);

-- Guestbook
CREATE TABLE guestbook_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    village_id  UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guestbook_village ON guestbook_entries(village_id, created_at DESC);

-- Seed initial slime species
INSERT INTO slime_species (id, name, name_en, element, grade, description) VALUES
    (1, '물방울 슬라임', 'Droplet Slime', 'water', 'common', '맑은 물방울 모양의 기본 슬라임. 촉촉하고 시원한 느낌이 든다.'),
    (2, '풀잎 슬라임', 'Leaf Slime', 'grass', 'common', '풀잎처럼 싱그러운 초록빛 슬라임. 상쾌한 풀 향기가 난다.'),
    (3, '불씨 슬라임', 'Ember Slime', 'fire', 'common', '따뜻한 불씨를 품은 슬라임. 만지면 포근하게 따뜻하다.'),
    (4, '반딧불 슬라임', 'Glow Slime', 'light', 'common', '은은하게 빛나는 슬라임. 어둠 속에서도 길을 밝혀준다.'),
    (5, '그림자 슬라임', 'Shadow Slime', 'dark', 'common', '그림자처럼 어둑한 슬라임. 낮에는 조용히 쉬는 걸 좋아한다.'),
    (6, '이끼 슬라임', 'Moss Slime', 'grass', 'uncommon', '물과 풀이 만나 탄생한 이끼 슬라임. 습한 곳을 좋아한다.'),
    (7, '안개 슬라임', 'Mist Slime', 'water', 'uncommon', '물과 불이 만나 뿌옇게 피어오른 안개 슬라임.'),
    (8, '황혼 슬라임', 'Twilight Slime', 'light', 'uncommon', '빛과 어둠의 경계에서 태어난 신비로운 슬라임.');
