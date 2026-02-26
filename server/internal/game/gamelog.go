package game

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// LogGameAction inserts a game log entry in a fire-and-forget manner.
// It uses context.Background() so game logic is never blocked by logging failures.
func LogGameAction(pool *pgxpool.Pool, userID string, action string, category string, goldDelta int64, gemsDelta int, stardustDelta int, detail map[string]interface{}) {
	go func() {
		detailJSON, err := json.Marshal(detail)
		if err != nil {
			detailJSON = []byte("{}")
		}

		_, err = pool.Exec(context.Background(),
			`INSERT INTO game_logs (user_id, action, category, detail, gold_delta, gems_delta, stardust_delta)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			userID, action, category, detailJSON, goldDelta, gemsDelta, stardustDelta,
		)
		if err != nil {
			log.Debug().Err(err).Str("action", action).Str("user_id", userID).Msg("Failed to log game action")
		}
	}()
}
