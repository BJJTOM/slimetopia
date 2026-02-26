package game

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	maxTrainingSlots  = 3
	trainingExpPerMin = 2 // base EXP per minute
	maxTrainingMins   = 480
)

// Grade-based training EXP multiplier (higher grades train faster)
var gradeTrainingMultiplier = map[string]float64{
	"common":    1.0,
	"uncommon":  1.2,
	"rare":      1.5,
	"epic":      1.8,
	"legendary": 2.2,
	"mythic":    3.0,
}

// GetTrainingSlots returns the current training slots for a user
func (h *Handler) GetTrainingSlots(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	rows, err := pool.Query(ctx,
		`SELECT t.id::text, t.slime_id::text, t.slot_number, t.started_at,
		        s.species_id, s.level, s.exp, s.element, s.personality, s.name,
		        sp.name as species_name, sp.grade
		 FROM training_slots t
		 JOIN slimes s ON s.id = t.slime_id
		 JOIN species sp ON sp.id = s.species_id
		 WHERE t.user_id = $1
		 ORDER BY t.slot_number`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch training"})
	}
	defer rows.Close()

	slots := make([]fiber.Map, 0)
	for rows.Next() {
		var id, slimeID, element, personality string
		var speciesName, grade string
		var slotNumber, speciesID, level, exp int
		var startedAt time.Time
		var name *string

		if err := rows.Scan(&id, &slimeID, &slotNumber, &startedAt, &speciesID, &level, &exp, &element, &personality, &name, &speciesName, &grade); err != nil {
			continue
		}

		elapsed := time.Since(startedAt)
		elapsedMins := int(elapsed.Minutes())
		if elapsedMins > maxTrainingMins {
			elapsedMins = maxTrainingMins
		}
		mult := gradeTrainingMultiplier[grade]
		if mult == 0 {
			mult = 1.0
		}
		pendingExp := int(float64(elapsedMins*trainingExpPerMin) * mult)

		displayName := speciesName
		if name != nil && *name != "" {
			displayName = *name
		}

		slots = append(slots, fiber.Map{
			"id":           id,
			"slime_id":     slimeID,
			"slot_number":  slotNumber,
			"started_at":   startedAt,
			"species_id":   speciesID,
			"level":        level,
			"exp":          exp,
			"element":      element,
			"personality":  personality,
			"name":         displayName,
			"grade":        grade,
			"elapsed_mins": elapsedMins,
			"pending_exp":  pendingExp,
			"multiplier":   mult,
		})
	}

	return c.JSON(fiber.Map{
		"slots":     slots,
		"max_slots": maxTrainingSlots,
	})
}

// StartTraining assigns a slime to a training slot
func (h *Handler) StartTraining(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeID string `json:"slime_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.SlimeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id required"})
	}

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Verify slime ownership
	slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// Check if slime is already training
	var existing int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM training_slots WHERE user_id = $1 AND slime_id = $2`, userID, body.SlimeID).Scan(&existing)
	if existing > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already_training"})
	}

	// Check if slime is on exploration
	onExp, _ := h.explorationRepo.IsSlimeOnExploration(ctx, userID, []string{body.SlimeID})
	if onExp {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "on_exploration"})
	}

	// Check slot count
	var slotCount int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM training_slots WHERE user_id = $1`, userID).Scan(&slotCount)
	if slotCount >= maxTrainingSlots {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slots_full"})
	}

	// Find next available slot number
	nextSlot := slotCount + 1

	_, err = pool.Exec(ctx,
		`INSERT INTO training_slots (user_id, slime_id, slot_number) VALUES ($1, $2, $3)`,
		userID, body.SlimeID, nextSlot,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start training"})
	}

	return c.JSON(fiber.Map{"success": true, "slot_number": nextSlot})
}

// CollectTraining collects EXP from a training slot and removes the slime
func (h *Handler) CollectTraining(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	slotID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	var slimeID string
	var startedAt time.Time
	err := pool.QueryRow(ctx,
		`SELECT slime_id::text, started_at FROM training_slots WHERE id = $1 AND user_id = $2`,
		slotID, userID,
	).Scan(&slimeID, &startedAt)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "training slot not found"})
	}

	elapsed := time.Since(startedAt)
	elapsedMins := int(elapsed.Minutes())

	// Cap at 8 hours
	if elapsedMins > maxTrainingMins {
		elapsedMins = maxTrainingMins
	}

	// Get slime's grade for multiplier
	slime, err := h.slimeRepo.FindByID(ctx, slimeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "slime not found"})
	}

	// Look up grade
	var grade string
	pool.QueryRow(ctx, `SELECT grade FROM species WHERE id = $1`, slime.SpeciesID).Scan(&grade)
	mult := gradeTrainingMultiplier[grade]
	if mult == 0 {
		mult = 1.0
	}

	earnedExp := int(float64(elapsedMins*trainingExpPerMin) * mult)
	if earnedExp < 1 {
		earnedExp = 1
	}

	// Apply EXP to slime
	newLevel, newExp, leveledUp := checkLevelUp(slime.Level, slime.Exp+earnedExp)
	h.slimeRepo.SetLevelAndExp(ctx, slimeID, newLevel, newExp)

	// Log training collect
	LogGameAction(pool, userID, "training_collect", "training", 0, 0, 0, map[string]interface{}{
		"slime_id": slimeID, "exp_gained": earnedExp,
	})

	// Remove training slot and reorder remaining slots
	pool.Exec(ctx, `DELETE FROM training_slots WHERE id = $1`, slotID)

	// Reorder remaining slots
	pool.Exec(ctx,
		`WITH numbered AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY slot_number) as new_slot
			FROM training_slots WHERE user_id = $1
		)
		UPDATE training_slots t SET slot_number = n.new_slot
		FROM numbered n WHERE t.id = n.id`,
		userID,
	)

	return c.JSON(fiber.Map{
		"success":    true,
		"exp_gained": earnedExp,
		"new_level":  newLevel,
		"new_exp":    newExp,
		"level_up":   leveledUp,
	})
}
