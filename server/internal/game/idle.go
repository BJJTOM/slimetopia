package game

import (
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	maxIdleMinutes   = 480 // 8 hours cap
	baseGoldRate     = 5   // per minute (was 10)
	slimeBonusPerMin = 1   // extra gold per slime per minute (was 2)
)

// GET /api/idle/status — preview offline accumulated rewards
func (h *Handler) GetIdleStatus(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	// Ensure idle_progress row exists
	pool.Exec(ctx, `INSERT INTO idle_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, userID)

	var lastCollected time.Time
	var goldRate int
	err := pool.QueryRow(ctx,
		`SELECT last_collected_at, gold_rate FROM idle_progress WHERE user_id = $1`,
		userID,
	).Scan(&lastCollected, &goldRate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch idle status"})
	}

	// Calculate elapsed minutes (capped)
	elapsed := time.Since(lastCollected).Minutes()
	if elapsed > maxIdleMinutes {
		elapsed = maxIdleMinutes
	}
	elapsedInt := int(math.Floor(elapsed))

	// Count user's slimes for bonus
	var slimeCount int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM slimes WHERE user_id = $1`, userID).Scan(&slimeCount)

	// Calculate total reward
	effectiveRate := goldRate + (slimeCount * slimeBonusPerMin)
	totalGold := elapsedInt * effectiveRate

	return c.JSON(fiber.Map{
		"elapsed_minutes": elapsedInt,
		"gold_rate":       effectiveRate,
		"total_gold":      totalGold,
		"slime_count":     slimeCount,
		"last_collected":  lastCollected.Format(time.RFC3339),
	})
}

// POST /api/idle/collect — claim offline rewards
func (h *Handler) CollectIdleReward(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	// Ensure row exists
	pool.Exec(ctx, `INSERT INTO idle_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, userID)

	var lastCollected time.Time
	var goldRate int
	err := pool.QueryRow(ctx,
		`SELECT last_collected_at, gold_rate FROM idle_progress WHERE user_id = $1`,
		userID,
	).Scan(&lastCollected, &goldRate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch idle status"})
	}

	elapsed := time.Since(lastCollected).Minutes()
	if elapsed > maxIdleMinutes {
		elapsed = maxIdleMinutes
	}
	elapsedInt := int(math.Floor(elapsed))

	if elapsedInt < 1 {
		return c.JSON(fiber.Map{
			"collected":       false,
			"total_gold":      0,
			"elapsed_minutes": 0,
		})
	}

	var slimeCount int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM slimes WHERE user_id = $1`, userID).Scan(&slimeCount)

	effectiveRate := goldRate + (slimeCount * slimeBonusPerMin)
	totalGold := int64(elapsedInt * effectiveRate)

	// Apply gold booster if active
	if h.IsBoosterActive(userID, BoosterGold) {
		totalGold *= 2
	}

	// Grant gold
	if err := h.userRepo.AddCurrency(ctx, userID, totalGold, 0, 0); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to grant reward"})
	}

	// Log idle collect
	LogGameAction(pool, userID, "idle_collect", "economy", totalGold, 0, 0, map[string]interface{}{
		"gold": totalGold, "minutes": elapsedInt,
	})

	// Update last_collected_at
	pool.Exec(ctx, `UPDATE idle_progress SET last_collected_at = NOW() WHERE user_id = $1`, userID)

	user, _ := h.userRepo.FindByID(ctx, userID)

	return c.JSON(fiber.Map{
		"collected":       true,
		"total_gold":      totalGold,
		"elapsed_minutes": elapsedInt,
		"slime_count":     slimeCount,
		"user": fiber.Map{
			"gold": user.Gold,
			"gems": user.Gems,
		},
	})
}
