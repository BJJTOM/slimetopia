package models

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type SlimeSpecies struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	NameEN      string `json:"name_en"`
	Element     string `json:"element"`
	Grade       string `json:"grade"`
	Description string `json:"description"`
}

type Slime struct {
	ID          pgtype.UUID `json:"id"`
	UserID      pgtype.UUID `json:"user_id"`
	SpeciesID   int         `json:"species_id"`
	Name        *string     `json:"name"`
	Level       int         `json:"level"`
	Exp         int         `json:"exp"`
	Element     string      `json:"element"`
	Personality string      `json:"personality"`
	Affection   int         `json:"affection"`
	Hunger      int         `json:"hunger"`
	Condition   int         `json:"condition"`
	PositionX   *int        `json:"position_x"`
	PositionY   *int        `json:"position_y"`
	Accessories []byte      `json:"accessories"` // JSONB
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// Grade constants
const (
	GradeCommon    = "common"
	GradeUncommon  = "uncommon"
	GradeRare      = "rare"
	GradeEpic      = "epic"
	GradeLegendary = "legendary"
	GradeMythic    = "mythic"
)

// Element constants
const (
	ElementWater = "water"
	ElementFire  = "fire"
	ElementGrass = "grass"
	ElementLight = "light"
	ElementDark  = "dark"
)

// Personality constants
const (
	PersonalityEnergetic = "energetic"
	PersonalityChill     = "chill"
	PersonalityFoodie    = "foodie"
	PersonalityCurious   = "curious"
	PersonalityTsundere  = "tsundere"
	PersonalityGentle    = "gentle"
)
