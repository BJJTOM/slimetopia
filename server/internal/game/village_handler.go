package game

import (
	"github.com/gofiber/fiber/v2"
)

// GET /api/village — get current user's village (auto-create if none)
func (h *Handler) GetMyVillage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	village, err := h.villageRepo.GetOrCreate(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get village",
		})
	}

	return c.JSON(fiber.Map{
		"village": fiber.Map{
			"id":          uuidToString(village.ID),
			"name":        village.Name,
			"grid_size":   village.GridSize,
			"terrain":     village.Terrain,
			"layout":      village.Layout,
			"visit_count": village.VisitCount,
			"likes":       village.Likes,
			"created_at":  village.CreatedAt,
			"updated_at":  village.UpdatedAt,
		},
	})
}

// GET /api/village/visit — get random villages to visit (excludes own)
func (h *Handler) GetRandomVillages(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	villages, err := h.villageRepo.GetRandom(c.Context(), userID, 5)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch villages",
		})
	}

	result := make([]fiber.Map, 0, len(villages))
	for _, v := range villages {
		ownerID := uuidToString(v.UserID)
		nickname := "unknown"
		owner, err := h.userRepo.FindByID(c.Context(), ownerID)
		if err == nil {
			nickname = owner.Nickname
		}

		result = append(result, fiber.Map{
			"id":          uuidToString(v.ID),
			"name":        v.Name,
			"visit_count": v.VisitCount,
			"likes":       v.Likes,
			"owner": fiber.Map{
				"id":       ownerID,
				"nickname": nickname,
			},
		})
	}

	return c.JSON(fiber.Map{"villages": result})
}

// GET /api/village/:id — visit a specific village
func (h *Handler) VisitVillage(c *fiber.Ctx) error {
	villageID := c.Params("id")
	ctx := c.Context()

	village, err := h.villageRepo.GetByID(ctx, villageID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "village not found",
		})
	}

	// Increment visit count
	_ = h.villageRepo.IncrementVisit(ctx, villageID)

	// Get owner info
	ownerID := uuidToString(village.UserID)
	nickname := "unknown"
	owner, err := h.userRepo.FindByID(ctx, ownerID)
	if err == nil {
		nickname = owner.Nickname
	}

	// Get owner's slimes
	slimes, err := h.slimeRepo.FindByUser(ctx, ownerID)
	if err != nil {
		slimes = nil
	}
	slimeList := make([]fiber.Map, 0, len(slimes))
	for _, s := range slimes {
		slimeList = append(slimeList, slimeToMap(s))
	}

	// Get guestbook entries
	entries, err := h.villageRepo.GetGuestbook(ctx, villageID, 20)
	if err != nil {
		entries = nil
	}

	return c.JSON(fiber.Map{
		"village": fiber.Map{
			"id":          uuidToString(village.ID),
			"name":        village.Name,
			"grid_size":   village.GridSize,
			"terrain":     village.Terrain,
			"layout":      village.Layout,
			"visit_count": village.VisitCount + 1,
			"likes":       village.Likes,
			"created_at":  village.CreatedAt,
			"updated_at":  village.UpdatedAt,
		},
		"owner": fiber.Map{
			"id":       ownerID,
			"nickname": nickname,
		},
		"slimes":    slimeList,
		"guestbook": entries,
	})
}

// POST /api/village/:id/like — like a village
func (h *Handler) LikeVillage(c *fiber.Ctx) error {
	villageID := c.Params("id")

	if err := h.villageRepo.AddLike(c.Context(), villageID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to like village",
		})
	}

	return c.JSON(fiber.Map{"liked": true})
}

// GET /api/village/:id/guestbook — get guestbook entries for a village
func (h *Handler) GetGuestbook(c *fiber.Ctx) error {
	villageID := c.Params("id")

	entries, err := h.villageRepo.GetGuestbook(c.Context(), villageID, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch guestbook",
		})
	}

	if entries == nil {
		return c.JSON(fiber.Map{"entries": []fiber.Map{}})
	}

	return c.JSON(fiber.Map{"entries": entries})
}

// POST /api/village/:id/guestbook — post a guestbook entry
func (h *Handler) PostGuestbook(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	villageID := c.Params("id")

	var body struct {
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if len(body.Message) < 1 || len(body.Message) > 200 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "message must be 1-200 characters",
		})
	}

	ctx := c.Context()

	// Verify village exists
	_, err := h.villageRepo.GetByID(ctx, villageID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "village not found",
		})
	}

	if err := h.villageRepo.AddGuestbookEntry(ctx, villageID, userID, body.Message); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to post guestbook entry",
		})
	}

	return c.JSON(fiber.Map{"posted": true})
}
