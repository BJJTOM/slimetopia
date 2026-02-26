package game

import (
	"github.com/gofiber/fiber/v2"
)

// Grade -> minimum level required for collection submission
var collectionLevelRequirements = map[string]int{
	"common":    3,
	"uncommon":  5,
	"rare":      10,
	"epic":      15,
	"legendary": 20,
	"mythic":    25,
}

// SubmitToCollection handles POST /api/collection/submit
func (h *Handler) SubmitToCollection(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeID string `json:"slime_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.SlimeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id required"})
	}

	ctx := c.Context()

	// 1. Find slime + ownership check
	slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// 2. Get species info for grade
	species, err := h.slimeRepo.GetSpecies(ctx, slime.SpeciesID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "species not found"})
	}

	// 3. Check level requirement
	requiredLevel, ok := collectionLevelRequirements[species.Grade]
	if !ok {
		requiredLevel = 3 // fallback
	}
	if slime.Level < requiredLevel {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":          "level_too_low",
			"required_level": requiredLevel,
			"current_level":  slime.Level,
		})
	}

	// 4. Check if already submitted (species x personality)
	pool := h.slimeRepo.Pool()
	var existing int
	err = pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM collection_entries WHERE user_id = $1 AND species_id = $2 AND personality = $3`,
		userID, slime.SpeciesID, slime.Personality,
	).Scan(&existing)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check collection"})
	}
	if existing > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already_submitted"})
	}

	// 5. Check if slime is on exploration
	onExp, err := h.explorationRepo.IsSlimeOnExploration(ctx, userID, []string{body.SlimeID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check exploration"})
	}
	if onExp {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_on_exploration"})
	}

	// 6. Insert into collection_entries
	_, err = pool.Exec(ctx,
		`INSERT INTO collection_entries (user_id, species_id, personality) VALUES ($1, $2, $3)`,
		userID, slime.SpeciesID, slime.Personality,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to submit"})
	}

	// 7. Delete slime
	if err := h.slimeRepo.Delete(ctx, body.SlimeID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete slime"})
	}

	// 8. Track mission progress
	h.missionRepo.IncrementProgress(ctx, userID, "submit")

	// Log collection submit
	LogGameAction(pool, userID, "collection_submit", "collection", 0, 0, 0, map[string]interface{}{
		"slime_id": body.SlimeID, "species_id": slime.SpeciesID, "grade": species.Grade, "personality": slime.Personality, "level": slime.Level,
	})

	// 9. Return updated collection count
	var count int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM collection_entries WHERE user_id = $1`, userID).Scan(&count)

	return c.JSON(fiber.Map{
		"success":          true,
		"collection_count": count,
		"species_id":       slime.SpeciesID,
		"personality":      slime.Personality,
	})
}

// GetCollectionEntries handles GET /api/collection/entries
func (h *Handler) GetCollectionEntries(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	rows, err := pool.Query(ctx,
		`SELECT species_id, personality FROM collection_entries WHERE user_id = $1 ORDER BY species_id, personality`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch entries"})
	}
	defer rows.Close()

	type Entry struct {
		SpeciesID   int    `json:"species_id"`
		Personality string `json:"personality"`
	}
	entries := make([]Entry, 0)
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.SpeciesID, &e.Personality); err != nil {
			continue
		}
		entries = append(entries, e)
	}

	return c.JSON(fiber.Map{"entries": entries})
}

// GetCollectionRequirements handles GET /api/collection/requirements
func (h *Handler) GetCollectionRequirements(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"requirements": collectionLevelRequirements})
}
