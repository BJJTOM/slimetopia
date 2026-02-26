package game

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Booster durations and types
const boosterDuration = 1 * time.Hour

type BoosterType string

const (
	BoosterExp  BoosterType = "exp_2x"
	BoosterGold BoosterType = "gold_2x"
	BoosterLuck BoosterType = "luck_up"
)

// ActivateBooster sets a booster in Redis with TTL
func (h *Handler) ActivateBooster(userID string, boosterType BoosterType) error {
	ctx := context.Background()
	key := fmt.Sprintf("booster:%s:%s", boosterType, userID)
	return h.rdb.Set(ctx, key, "1", boosterDuration).Err()
}

// GetActiveBoosterTTL returns remaining seconds, 0 if not active
func (h *Handler) GetActiveBoosterTTL(userID string, boosterType BoosterType) int {
	ctx := context.Background()
	key := fmt.Sprintf("booster:%s:%s", boosterType, userID)
	ttl, err := h.rdb.TTL(ctx, key).Result()
	if err != nil || ttl <= 0 {
		return 0
	}
	return int(ttl.Seconds())
}

// IsBoosterActive checks if a booster is active
func (h *Handler) IsBoosterActive(userID string, boosterType BoosterType) bool {
	return h.GetActiveBoosterTTL(userID, boosterType) > 0
}

// GET /api/boosters — get all active boosters for user
func (h *Handler) GetActiveBoosters(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	boosters := make([]fiber.Map, 0, 3)

	for _, bt := range []BoosterType{BoosterExp, BoosterGold, BoosterLuck} {
		ttl := h.GetActiveBoosterTTL(userID, bt)
		if ttl > 0 {
			boosters = append(boosters, fiber.Map{
				"type":              string(bt),
				"remaining_seconds": ttl,
			})
		}
	}

	return c.JSON(fiber.Map{"boosters": boosters})
}

// getBoosterTypeForItem maps shop item IDs to booster types
func getBoosterTypeForItem(itemID int) BoosterType {
	switch itemID {
	case 14:
		return BoosterExp
	case 15:
		return BoosterGold
	case 16:
		return BoosterLuck
	default:
		return ""
	}
}

// boosterName returns display name
func boosterName(bt BoosterType) string {
	switch bt {
	case BoosterExp:
		return "EXP 2배 부스터 활성화!"
	case BoosterGold:
		return "골드 2배 부스터 활성화!"
	case BoosterLuck:
		return "행운의 부적 활성화!"
	default:
		return "부스터 활성화!"
	}
}
