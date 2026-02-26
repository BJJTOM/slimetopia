package game

import (
	"github.com/gofiber/fiber/v2"
	"github.com/slimetopia/server/internal/repository"
)

// GET /api/missions/daily
func (h *Handler) GetDailyMissions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	missions, err := h.missionRepo.GetOrCreateDaily(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch missions"})
	}
	if missions == nil {
		missions = []repository.DailyMission{}
	}
	return c.JSON(fiber.Map{"missions": missions})
}

// POST /api/missions/:id/claim
func (h *Handler) ClaimMission(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	missionID := c.Params("id")

	gold, gems, err := h.missionRepo.ClaimReward(c.Context(), userID, missionID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot claim mission"})
	}

	// Grant reward
	if gold > 0 || gems > 0 {
		if err := h.userRepo.AddCurrency(c.Context(), userID, gold, gems, 0); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to grant reward"})
		}
	}

	pool := h.slimeRepo.Pool()
	LogGameAction(pool, userID, "mission_claim", "mission", gold, gems, 0, map[string]interface{}{
		"mission_id": missionID, "gold": gold, "gems": gems,
	})

	user, _ := h.userRepo.FindByID(c.Context(), userID)

	return c.JSON(fiber.Map{
		"gold":   gold,
		"gems":   gems,
		"user": fiber.Map{
			"gold": user.Gold,
			"gems": user.Gems,
		},
	})
}

// GET /api/attendance
func (h *Handler) GetAttendance(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	info, err := h.missionRepo.CheckAttendance(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check attendance"})
	}

	return c.JSON(fiber.Map{
		"day_number":     info.DayNumber,
		"reward_claimed": info.RewardClaimed,
		"today_checked":  info.TodayChecked,
		"rewards":        h.missionRepo.GetAttendanceRewards(),
	})
}

// POST /api/attendance/claim
func (h *Handler) ClaimAttendance(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	gold, gems, dayNum, err := h.missionRepo.ClaimAttendance(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot claim attendance"})
	}

	// Grant reward
	if gold > 0 || gems > 0 {
		if err := h.userRepo.AddCurrency(c.Context(), userID, gold, gems, 0); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to grant reward"})
		}
	}

	pool := h.slimeRepo.Pool()
	LogGameAction(pool, userID, "attendance_claim", "mission", gold, int(gems), 0, map[string]interface{}{
		"day": dayNum, "gold": gold, "gems": gems,
	})

	user, _ := h.userRepo.FindByID(c.Context(), userID)

	return c.JSON(fiber.Map{
		"day_number": dayNum,
		"gold":       gold,
		"gems":       gems,
		"user": fiber.Map{
			"gold": user.Gold,
			"gems": user.Gems,
		},
	})
}
