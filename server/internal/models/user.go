package models

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type User struct {
	ID           pgtype.UUID `json:"id"`
	Nickname     string      `json:"nickname"`
	Provider     string      `json:"provider"`
	ProviderID   string      `json:"provider_id"`
	Gold         int64       `json:"gold"`
	Gems         int         `json:"gems"`
	Stardust     int         `json:"stardust"`
	Level        int         `json:"level"`
	Email        string      `json:"email"`
	PasswordHash string      `json:"-"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}
