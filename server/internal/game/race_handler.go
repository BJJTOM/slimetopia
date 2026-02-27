package game

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// POST /api/race/start — request to start a race (unlimited)
func (h *Handler) StartRace(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeID string `json:"slime_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.SlimeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id required"})
	}

	ctx := c.Context()

	// Check ownership
	slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	return c.JSON(fiber.Map{
		"token":    fmt.Sprintf("race_%s_%d", userID[:8], time.Now().UnixMilli()),
		"slime_id": body.SlimeID,
	})
}

// POST /api/race/finish — submit race score
func (h *Handler) FinishRace(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeID string `json:"slime_id"`
		Score   int    `json:"score"`
		Token   string `json:"token"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Score < 0 {
		body.Score = 0
	}

	// Calculate rewards: base 50 + score/100 gold, score/20 exp (capped at 100exp)
	goldReward := 50 + body.Score/100
	expReward := body.Score / 20
	if expReward > 100 {
		expReward = 100
	}

	ctx := c.Context()

	// Daily gold cap of 2000 via Redis
	today := time.Now().Format("2006-01-02")
	dailyKey := fmt.Sprintf("race_gold:%s:%s", userID, today)
	currentDaily, _ := h.rdb.Get(c.Context(), dailyKey).Int()
	dailyRemaining := 2000 - currentDaily
	if dailyRemaining < 0 {
		dailyRemaining = 0
	}
	if goldReward > dailyRemaining {
		goldReward = dailyRemaining
	}

	// Record result
	h.slimeRepo.Pool().Exec(ctx,
		`INSERT INTO race_results (user_id, slime_id, score, gold_reward, exp_reward)
		 VALUES ($1, $2, $3, $4, $5)`,
		userID, body.SlimeID, body.Score, goldReward, expReward,
	)

	// Grant rewards
	if goldReward > 0 {
		h.userRepo.AddCurrency(ctx, userID, int64(goldReward), 0, 0)
		// Track daily gold in Redis (expire at end of day)
		h.rdb.IncrBy(c.Context(), dailyKey, int64(goldReward))
		ttl := time.Duration(24-time.Now().Hour())*time.Hour - time.Duration(time.Now().Minute())*time.Minute
		if ttl <= 0 {
			ttl = 24 * time.Hour
		}
		h.rdb.Expire(c.Context(), dailyKey, ttl)
	}
	if expReward > 0 && body.SlimeID != "" {
		slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
		if err == nil {
			newLevel, newExp, _ := checkLevelUp(slime.Level, slime.Exp+expReward)
			h.slimeRepo.SetLevelAndExp(ctx, body.SlimeID, newLevel, newExp)
		}
	}

	user, _ := h.userRepo.FindByID(ctx, userID)
	dailyGoldRemaining := 2000 - currentDaily - goldReward
	if dailyGoldRemaining < 0 {
		dailyGoldRemaining = 0
	}

	log.Debug().Str("user_id", userID).Int("gold_reward", goldReward).Int("daily_remaining", dailyGoldRemaining).Msg("Race finished")

	return c.JSON(fiber.Map{
		"score":                body.Score,
		"gold_reward":          goldReward,
		"exp_reward":           expReward,
		"daily_gold_remaining": dailyGoldRemaining,
		"user": fiber.Map{
			"gold": user.Gold,
		},
	})
}

// GET /api/race/history — recent race results
func (h *Handler) GetRaceHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	rows, err := h.slimeRepo.Pool().Query(c.UserContext(),
		`SELECT score, gold_reward, exp_reward, played_at
		 FROM race_results WHERE user_id = $1
		 ORDER BY played_at DESC LIMIT 10`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch history"})
	}
	defer rows.Close()

	results := make([]fiber.Map, 0)
	for rows.Next() {
		var score, goldR, expR int
		var playedAt time.Time
		if err := rows.Scan(&score, &goldR, &expR, &playedAt); err != nil {
			continue
		}
		results = append(results, fiber.Map{
			"score":       score,
			"gold_reward": goldR,
			"exp_reward":  expR,
			"played_at":   playedAt,
		})
	}

	return c.JSON(fiber.Map{
		"results": results,
	})
}
