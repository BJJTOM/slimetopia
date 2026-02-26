package game

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
)

const maxDailyFishing = 10

// POST /api/fishing/start — start a fishing session
func (h *Handler) StartFishing(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Daily limit via Redis
	today := time.Now().Format("2006-01-02")
	fishKey := fmt.Sprintf("fishing_count:%s:%s", userID, today)
	count, _ := h.rdb.Get(ctx, fishKey).Int()
	if count >= maxDailyFishing {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":     "daily fishing limit reached",
			"remaining": 0,
		})
	}

	// Increment count
	h.rdb.Incr(ctx, fishKey)
	h.rdb.ExpireAt(ctx, fishKey, time.Now().Add(24*time.Hour))

	return c.JSON(fiber.Map{
		"remaining": maxDailyFishing - count - 1,
	})
}

// POST /api/fishing/catch — submit fishing result
func (h *Handler) CatchFish(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		Success bool `json:"success"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	ctx := c.Context()

	// Check remaining
	today := time.Now().Format("2006-01-02")
	fishKey := fmt.Sprintf("fishing_count:%s:%s", userID, today)
	count, _ := h.rdb.Get(ctx, fishKey).Int()
	remaining := maxDailyFishing - count
	if remaining < 0 {
		remaining = 0
	}

	if !body.Success {
		return c.JSON(fiber.Map{
			"success":     false,
			"catch_type":  "",
			"catch_name":  "",
			"gold_reward": 0,
			"gems_reward": 0,
			"rarity":      "common",
			"remaining":   remaining,
		})
	}

	// Determine catch rarity
	roll := rand.Intn(100)
	var catchType, catchName, rarity string
	var goldReward int64
	var gemsReward int

	switch {
	case roll < 60: // 60% common
		catchType = "fish_common"
		catchName = "일반 물고기"
		rarity = "common"
		goldReward = 50
		gemsReward = 0
	case roll < 85: // 25% rare
		catchType = "fish_rare"
		catchName = "희귀 물고기"
		rarity = "rare"
		goldReward = 150
		gemsReward = 0
	case roll < 95: // 10% treasure
		catchType = "treasure_chest"
		catchName = "보물 상자"
		rarity = "treasure"
		goldReward = 300
		gemsReward = 2
	default: // 5% legendary
		catchType = "legendary_coral"
		catchName = "전설의 산호"
		rarity = "legendary"
		goldReward = 500
		gemsReward = 5
	}

	// Grant rewards
	if goldReward > 0 || gemsReward > 0 {
		h.userRepo.AddCurrency(ctx, userID, goldReward, gemsReward, 0)
	}

	// Log fishing catch
	pool := h.slimeRepo.Pool()
	LogGameAction(pool, userID, "fishing_catch", "minigame", goldReward, gemsReward, 0, map[string]interface{}{
		"rarity": rarity, "gold": goldReward, "gems": gemsReward,
	})

	// Track achievement for legendary catch
	if rarity == "legendary" {
		h.rdb.Set(ctx, fmt.Sprintf("ach:fishing_pro:%s", userID), "1", 0)
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"catch_type":  catchType,
		"catch_name":  catchName,
		"gold_reward": goldReward,
		"gems_reward": gemsReward,
		"rarity":      rarity,
		"remaining":   remaining,
	})
}
