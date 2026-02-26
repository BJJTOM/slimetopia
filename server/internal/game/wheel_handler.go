package game

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
)

type WheelReward struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Icon   string `json:"icon"`
	Type   string `json:"type"`   // gold, gems, egg_ticket, stardust
	Amount int    `json:"amount"` // quantity or gold/gem amount
	Weight int    `json:"-"`      // probability weight
	Color  string `json:"color"`
}

var wheelRewards = []WheelReward{
	{ID: 0, Name: "50 골드", Icon: "🪙", Type: "gold", Amount: 50, Weight: 30, Color: "#FFEAA7"},
	{ID: 1, Name: "100 골드", Icon: "💰", Type: "gold", Amount: 100, Weight: 20, Color: "#FFEAA7"},
	{ID: 2, Name: "300 골드", Icon: "💰", Type: "gold", Amount: 300, Weight: 10, Color: "#F9CA24"},
	{ID: 3, Name: "1 젬", Icon: "💎", Type: "gems", Amount: 1, Weight: 15, Color: "#74B9FF"},
	{ID: 4, Name: "3 젬", Icon: "💎", Type: "gems", Amount: 3, Weight: 8, Color: "#74B9FF"},
	{ID: 5, Name: "5 젬", Icon: "💎", Type: "gems", Amount: 5, Weight: 3, Color: "#0984E3"},
	{ID: 6, Name: "프리미엄 알", Icon: "🥚", Type: "egg_ticket", Amount: 1, Weight: 5, Color: "#A29BFE"},
	{ID: 7, Name: "10 별가루", Icon: "⭐", Type: "stardust", Amount: 10, Weight: 9, Color: "#A29BFE"},
}

const extraSpinCostGems = 3

// GET /api/wheel — wheel info + free spin availability
func (h *Handler) GetWheel(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	today := time.Now().Format("2006-01-02")
	key := fmt.Sprintf("wheel_free:%s:%s", userID, today)
	used, _ := h.rdb.Get(ctx, key).Int()

	return c.JSON(fiber.Map{
		"rewards":    wheelRewards,
		"free_spins": 1 - used,
		"extra_cost": extraSpinCostGems,
	})
}

// POST /api/wheel/spin — spin the wheel
func (h *Handler) SpinWheel(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	var body struct {
		UseGems bool `json:"use_gems"`
	}
	c.BodyParser(&body)

	today := time.Now().Format("2006-01-02")
	key := fmt.Sprintf("wheel_free:%s:%s", userID, today)
	used, _ := h.rdb.Get(ctx, key).Int()

	if used >= 1 && !body.UseGems {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":    "no free spins left",
			"free_spins": 0,
		})
	}

	// If using gems for extra spin, deduct gems
	if used >= 1 && body.UseGems {
		user, err := h.userRepo.FindByID(ctx, userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user not found"})
		}
		if user.Gems < extraSpinCostGems {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "not enough gems"})
		}
		h.userRepo.AddCurrency(ctx, userID, 0, -extraSpinCostGems, 0)
	}

	// Weighted random selection
	totalWeight := 0
	for _, r := range wheelRewards {
		totalWeight += r.Weight
	}
	roll := rand.Intn(totalWeight)
	var selected WheelReward
	cumulative := 0
	for _, r := range wheelRewards {
		cumulative += r.Weight
		if roll < cumulative {
			selected = r
			break
		}
	}

	// Grant reward
	switch selected.Type {
	case "gold":
		h.userRepo.AddCurrency(ctx, userID, int64(selected.Amount), 0, 0)
	case "gems":
		h.userRepo.AddCurrency(ctx, userID, 0, selected.Amount, 0)
	case "stardust":
		h.userRepo.AddCurrency(ctx, userID, 0, 0, selected.Amount)
	case "egg_ticket":
		// Store ticket count in Redis
		ticketKey := fmt.Sprintf("egg_tickets:%s", userID)
		h.rdb.IncrBy(ctx, ticketKey, int64(selected.Amount))
	}

	// Log wheel spin with accurate currency deltas
	pool := h.slimeRepo.Pool()
	usedGemsLog := 0
	if used >= 1 && body.UseGems {
		usedGemsLog = extraSpinCostGems
	}
	var logGold int64
	var logGems, logStardust int
	switch selected.Type {
	case "gold":
		logGold = int64(selected.Amount)
	case "gems":
		logGems = selected.Amount
	case "stardust":
		logStardust = selected.Amount
	}
	logGems -= usedGemsLog // net gems = reward - cost
	LogGameAction(pool, userID, "wheel_spin", "minigame", logGold, logGems, logStardust, map[string]interface{}{
		"reward_type": selected.Type, "amount": selected.Amount, "used_gems": usedGemsLog,
	})

	// Mark free spin used
	if used < 1 {
		h.rdb.Set(ctx, key, "1", 24*time.Hour)
	}

	newUsed := used + 1
	if newUsed > 1 {
		newUsed = 1
	}

	return c.JSON(fiber.Map{
		"reward_id":  selected.ID,
		"reward":     selected,
		"free_spins": 1 - newUsed,
	})
}
