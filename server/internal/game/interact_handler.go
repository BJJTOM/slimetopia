package game

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
)

// POST /api/interact/tree — shake tree for item drop (8hr cooldown)
func (h *Handler) InteractTree(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Check cooldown (8 hours)
	cdKey := fmt.Sprintf("tree_cd:%s", userID)
	ttl, err := h.rdb.TTL(ctx, cdKey).Result()
	if err == nil && ttl > 0 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":             "tree cooldown active",
			"remaining_seconds": int(ttl.Seconds()),
		})
	}

	// Random gold reward 10-50
	goldReward := int64(10 + rand.Intn(41))

	// Grant reward
	h.userRepo.AddCurrency(ctx, userID, goldReward, 0, 0)

	// Log tree interaction
	pool := h.slimeRepo.Pool()
	LogGameAction(pool, userID, "interact_tree", "minigame", goldReward, 0, 0, map[string]interface{}{
		"gold": goldReward,
	})

	// Set cooldown (8 hours)
	h.rdb.Set(ctx, cdKey, "1", 8*time.Hour)

	return c.JSON(fiber.Map{
		"gold_reward": goldReward,
		"message":     "나무를 흔들어 아이템을 얻었습니다!",
	})
}

// POST /api/interact/bench — rest slime on bench (condition +5)
func (h *Handler) InteractBench(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Find the slime with lowest condition
	slimes, err := h.slimeRepo.FindByUser(ctx, userID)
	if err != nil || len(slimes) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no slimes available"})
	}

	var lowest = slimes[0]
	for _, s := range slimes[1:] {
		if s.Condition < lowest.Condition {
			lowest = s
		}
	}

	// Apply +5 condition
	newCondition := lowest.Condition + 5
	if newCondition > 100 {
		newCondition = 100
	}

	slimeID := uuidToString(lowest.ID)
	if err := h.slimeRepo.UpdateStats(ctx, slimeID, lowest.Affection, lowest.Hunger, newCondition); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update condition"})
	}

	return c.JSON(fiber.Map{
		"slime_id":      slimeID,
		"slime_name":    lowest.Name,
		"new_condition":  newCondition,
		"message":       "슬라임이 벤치에서 쉬고 있습니다!",
	})
}
