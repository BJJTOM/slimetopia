package game

import (
	"github.com/gofiber/fiber/v2"
)

// Grade -> minimum level required for collection submission
var collectionLevelRequirements = map[string]int{
	"common":    1,
	"uncommon":  1,
	"rare":      3,
	"epic":      8,
	"legendary": 15,
	"mythic":    20,
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
		requiredLevel = 1 // fallback
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

// Collection milestones: count → {gold, gems}
var collectionMilestones = []struct {
	Count int `json:"count"`
	Gold  int `json:"gold"`
	Gems  int `json:"gems"`
}{
	{10, 500, 5},
	{25, 1000, 10},
	{50, 2000, 15},
	{100, 5000, 25},
	{200, 10000, 50},
	{500, 25000, 100},
	{1000, 60000, 200},
	{1200, 100000, 500},
}

// GetCollectionMilestones handles GET /api/collection/milestones
func (h *Handler) GetCollectionMilestones(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Get collection count
	var count int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM collection_entries WHERE user_id = $1`, userID).Scan(&count)

	// Get claimed milestones
	rows, err := pool.Query(ctx, `SELECT milestone FROM collection_milestones WHERE user_id = $1`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch milestones"})
	}
	defer rows.Close()

	claimed := make(map[int]bool)
	for rows.Next() {
		var m int
		if rows.Scan(&m) == nil {
			claimed[m] = true
		}
	}

	type MilestoneStatus struct {
		Count   int  `json:"count"`
		Gold    int  `json:"gold"`
		Gems    int  `json:"gems"`
		Reached bool `json:"reached"`
		Claimed bool `json:"claimed"`
	}

	result := make([]MilestoneStatus, 0, len(collectionMilestones))
	for _, ms := range collectionMilestones {
		result = append(result, MilestoneStatus{
			Count:   ms.Count,
			Gold:    ms.Gold,
			Gems:    ms.Gems,
			Reached: count >= ms.Count,
			Claimed: claimed[ms.Count],
		})
	}

	return c.JSON(fiber.Map{"milestones": result, "collection_count": count})
}

// ClaimCollectionMilestone handles POST /api/collection/claim-milestone
func (h *Handler) ClaimCollectionMilestone(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		Milestone int `json:"milestone"`
	}
	if err := c.BodyParser(&body); err != nil || body.Milestone == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "milestone required"})
	}

	// Find milestone reward
	var gold, gems int
	found := false
	for _, ms := range collectionMilestones {
		if ms.Count == body.Milestone {
			gold = ms.Gold
			gems = ms.Gems
			found = true
			break
		}
	}
	if !found {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid milestone"})
	}

	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Check collection count
	var count int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM collection_entries WHERE user_id = $1`, userID).Scan(&count)
	if count < body.Milestone {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "milestone_not_reached"})
	}

	// Check if already claimed
	var exists bool
	pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM collection_milestones WHERE user_id = $1 AND milestone = $2)`, userID, body.Milestone).Scan(&exists)
	if exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already_claimed"})
	}

	// Claim: insert record + grant rewards
	_, err := pool.Exec(ctx, `INSERT INTO collection_milestones (user_id, milestone) VALUES ($1, $2)`, userID, body.Milestone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to claim"})
	}

	// Grant gold + gems
	pool.Exec(ctx, `UPDATE users SET gold = gold + $1, gems = gems + $2 WHERE id = $3`, gold, gems, userID)

	// Log
	LogGameAction(pool, userID, "milestone_claim", "collection", int64(gold), gems, 0, map[string]interface{}{
		"milestone": body.Milestone,
	})

	return c.JSON(fiber.Map{
		"success":   true,
		"milestone": body.Milestone,
		"gold":      gold,
		"gems":      gems,
	})
}
