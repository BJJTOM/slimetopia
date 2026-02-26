package models

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type Village struct {
	ID         pgtype.UUID `json:"id"`
	UserID     pgtype.UUID `json:"user_id"`
	Name       string      `json:"name"`
	GridSize   int         `json:"grid_size"`
	Terrain    string      `json:"terrain"`
	Layout     []byte      `json:"layout"` // JSONB
	VisitCount int         `json:"visit_count"`
	Likes      int         `json:"likes"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}
