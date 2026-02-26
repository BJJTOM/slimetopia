package game

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pity thresholds: after N pulls without grade X or above, guarantee it
const (
	pityRare      = 15  // Guarantee rare+ after 15 pulls
	pityEpic      = 50  // Guarantee epic+ after 50 pulls
	pityLegendary = 120 // Guarantee legendary+ after 120 pulls
)

// gradeRank is declared in synthesis_engine.go — reuse it here

// GetPityCount returns the current pity counter for a user+egg_type
func GetPityCount(ctx context.Context, pool *pgxpool.Pool, userID, eggType string) int {
	var count int
	err := pool.QueryRow(ctx,
		`SELECT pull_count FROM gacha_pity WHERE user_id = $1 AND egg_type = $2`,
		userID, eggType,
	).Scan(&count)
	if err != nil {
		return 0
	}
	return count
}

// IncrementPity increases the pity counter by 1 and returns new count
func IncrementPity(ctx context.Context, pool *pgxpool.Pool, userID, eggType string) int {
	var count int
	err := pool.QueryRow(ctx,
		`INSERT INTO gacha_pity (user_id, egg_type, pull_count)
		 VALUES ($1, $2, 1)
		 ON CONFLICT (user_id, egg_type) DO UPDATE SET pull_count = gacha_pity.pull_count + 1
		 RETURNING pull_count`,
		userID, eggType,
	).Scan(&count)
	if err != nil {
		return 0
	}
	return count
}

// ResetPity resets pity counter to 0
func ResetPity(ctx context.Context, pool *pgxpool.Pool, userID, eggType string) {
	pool.Exec(ctx,
		`UPDATE gacha_pity SET pull_count = 0, last_high_grade_at = NOW() WHERE user_id = $1 AND egg_type = $2`,
		userID, eggType,
	)
}

// ApplyPityGuarantee checks if pity should override the grade, returns the minimum guaranteed grade or ""
func ApplyPityGuarantee(pullCount int) string {
	if pullCount >= pityLegendary {
		return "legendary"
	}
	if pullCount >= pityEpic {
		return "epic"
	}
	if pullCount >= pityRare {
		return "rare"
	}
	return ""
}

// ShouldResetPity checks if the result grade should reset pity (rare or above)
func ShouldResetPity(grade string) bool {
	return gradeRank[grade] >= gradeRank["rare"]
}

// gradeAtLeast checks if a grade meets a minimum threshold
func gradeAtLeast(grade, minGrade string) bool {
	return gradeRank[grade] >= gradeRank[minGrade]
}
