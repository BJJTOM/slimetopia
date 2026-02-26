package game

import (
	"github.com/gofiber/fiber/v2"
)

// GET /api/leaderboard?type=collection|level|race|gold
func (h *Handler) GetLeaderboard(c *fiber.Ctx) error {
	lbType := c.Query("type", "collection")
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	type Entry struct {
		Rank     int    `json:"rank"`
		Nickname string `json:"nickname"`
		Score    int    `json:"score"`
	}

	var query string
	switch lbType {
	case "collection":
		// Collection score = sum of grade-based points per discovered species
		query = `
			SELECT u.nickname,
				COALESCE(SUM(CASE ss.grade
					WHEN 'common' THEN 1
					WHEN 'uncommon' THEN 3
					WHEN 'rare' THEN 10
					WHEN 'epic' THEN 30
					WHEN 'legendary' THEN 100
					WHEN 'mythic' THEN 500
					ELSE 0
				END), 0)::int
				+ COALESCE((SELECT COUNT(*) * 50 FROM first_discoveries fd WHERE fd.user_id = u.id), 0)::int
				as score
			FROM users u
			LEFT JOIN codex_entries ce ON ce.user_id = u.id
			LEFT JOIN slime_species ss ON ss.id = ce.species_id
			GROUP BY u.id, u.nickname
			ORDER BY score DESC
			LIMIT 20`
	case "level":
		query = `
			SELECT u.nickname, COALESCE(MAX(s.level), 0) as score
			FROM users u
			LEFT JOIN slimes s ON s.user_id = u.id
			GROUP BY u.id, u.nickname
			ORDER BY score DESC
			LIMIT 20`
	case "race":
		query = `
			SELECT u.nickname, COALESCE(MAX(rr.score), 0) as score
			FROM users u
			LEFT JOIN race_results rr ON rr.user_id = u.id
			GROUP BY u.id, u.nickname
			ORDER BY score DESC
			LIMIT 20`
	case "gold":
		query = `
			SELECT nickname, gold::int as score
			FROM users
			ORDER BY gold DESC
			LIMIT 20`
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid leaderboard type"})
	}

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch leaderboard"})
	}
	defer rows.Close()

	entries := make([]Entry, 0, 20)
	rank := 1
	for rows.Next() {
		var nickname string
		var score int
		if err := rows.Scan(&nickname, &score); err != nil {
			continue
		}
		entries = append(entries, Entry{
			Rank:     rank,
			Nickname: nickname,
			Score:    score,
		})
		rank++
	}

	return c.JSON(fiber.Map{
		"type":    lbType,
		"entries": entries,
	})
}

// GET /api/leaderboard/my-rank — returns the current user's collection ranking
func (h *Handler) GetMyRank(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	var rank int
	err := pool.QueryRow(ctx, `
		WITH ranked AS (
			SELECT u.id,
				ROW_NUMBER() OVER (ORDER BY
					COALESCE(SUM(CASE ss.grade
						WHEN 'common' THEN 1
						WHEN 'uncommon' THEN 3
						WHEN 'rare' THEN 10
						WHEN 'epic' THEN 30
						WHEN 'legendary' THEN 100
						WHEN 'mythic' THEN 500
						ELSE 0
					END), 0)::int
					+ COALESCE((SELECT COUNT(*) * 50 FROM first_discoveries fd WHERE fd.user_id = u.id), 0)::int
				DESC) as rank
			FROM users u
			LEFT JOIN codex_entries ce ON ce.user_id = u.id
			LEFT JOIN slime_species ss ON ss.id = ce.species_id
			GROUP BY u.id
		)
		SELECT rank FROM ranked WHERE id = $1
	`, userID).Scan(&rank)
	if err != nil {
		return c.JSON(fiber.Map{"rank": 0})
	}
	return c.JSON(fiber.Map{"rank": rank})
}
