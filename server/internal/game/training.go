package game

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	maxTrainingSlots  = 5   // expanded from 3 to 5
	trainingExpPerMin = 2   // base EXP per minute
	maxTrainingMins   = 480 // 8 hours cap
)

// Grade-based training EXP multiplier (narrowed variance for fairness)
var gradeTrainingMultiplier = map[string]float64{
	"common":    1.0,
	"uncommon":  1.1,
	"rare":      1.3,
	"epic":      1.6,
	"legendary": 2.0,
	"mythic":    2.5,
}

// Training modes: each mode focuses on growing specific talents
var trainingModes = map[string]struct {
	Label     string
	Primary   string // primary talent stat boosted
	Secondary string // secondary talent stat boosted
}{
	"balanced":  {Label: "균형 훈련", Primary: "", Secondary: ""},
	"strength":  {Label: "근력 훈련", Primary: "talent_str", Secondary: "talent_vit"},
	"speed":     {Label: "속도 훈련", Primary: "talent_spd", Secondary: "talent_str"},
	"intellect": {Label: "지능 훈련", Primary: "talent_int", Secondary: "talent_cha"},
	"charisma":  {Label: "매력 훈련", Primary: "talent_cha", Secondary: "talent_lck"},
	"luck":      {Label: "행운 훈련", Primary: "talent_lck", Secondary: "talent_int"},
}

// GetTrainingModes returns available training modes
func (h *Handler) GetTrainingModes(c *fiber.Ctx) error {
	modes := make([]fiber.Map, 0, len(trainingModes))
	for key, mode := range trainingModes {
		modes = append(modes, fiber.Map{
			"id":        key,
			"label":     mode.Label,
			"primary":   mode.Primary,
			"secondary": mode.Secondary,
		})
	}
	return c.JSON(fiber.Map{"modes": modes})
}

// GetTrainingSlots returns the current training slots for a user
func (h *Handler) GetTrainingSlots(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	rows, err := pool.Query(ctx,
		`SELECT t.id::text, t.slime_id::text, t.slot_number, t.started_at, t.training_mode,
		        s.species_id, s.level, s.exp, s.element, s.personality, s.name,
		        sp.name as species_name, sp.grade
		 FROM training_slots t
		 JOIN slimes s ON s.id = t.slime_id
		 JOIN slime_species sp ON sp.id = s.species_id
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
		var id, slimeID, element, personality, trainingMode string
		var speciesName, grade string
		var slotNumber, speciesID, level, exp int
		var startedAt time.Time
		var name *string

		if err := rows.Scan(&id, &slimeID, &slotNumber, &startedAt, &trainingMode, &speciesID, &level, &exp, &element, &personality, &name, &speciesName, &grade); err != nil {
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

		modeInfo := trainingModes[trainingMode]

		slots = append(slots, fiber.Map{
			"id":             id,
			"slime_id":       slimeID,
			"slot_number":    slotNumber,
			"started_at":     startedAt,
			"training_mode":  trainingMode,
			"mode_label":     modeInfo.Label,
			"species_id":     speciesID,
			"level":          level,
			"exp":            exp,
			"element":        element,
			"personality":    personality,
			"name":           displayName,
			"grade":          grade,
			"elapsed_mins":   elapsedMins,
			"pending_exp":    pendingExp,
			"multiplier":     mult,
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
		SlimeID      string `json:"slime_id"`
		TrainingMode string `json:"training_mode"`
	}
	if err := c.BodyParser(&body); err != nil || body.SlimeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id required"})
	}
	if body.TrainingMode == "" {
		body.TrainingMode = "balanced"
	}
	if _, ok := trainingModes[body.TrainingMode]; !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid training mode"})
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
		`INSERT INTO training_slots (user_id, slime_id, slot_number, training_mode) VALUES ($1, $2, $3, $4)`,
		userID, body.SlimeID, nextSlot, body.TrainingMode,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start training"})
	}

	return c.JSON(fiber.Map{"success": true, "slot_number": nextSlot, "training_mode": body.TrainingMode})
}

// CollectTraining collects EXP from a training slot and removes the slime
func (h *Handler) CollectTraining(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	slotID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Atomically delete the training slot and return its data to prevent double-collection
	var slimeID string
	var startedAt time.Time
	var trainingMode string
	err := pool.QueryRow(ctx,
		`DELETE FROM training_slots WHERE id = $1 AND user_id = $2 RETURNING slime_id::text, started_at, training_mode`,
		slotID, userID,
	).Scan(&slimeID, &startedAt, &trainingMode)
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
	pool.QueryRow(ctx, `SELECT grade FROM slime_species WHERE id = $1`, slime.SpeciesID).Scan(&grade)
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

	// Apply talent growth based on training mode (1 talent point per 60 mins trained)
	talentGrowth := elapsedMins / 60
	if talentGrowth > 4 {
		talentGrowth = 4 // cap at 4 per session
	}
	var grownStat string
	if mode, ok := trainingModes[trainingMode]; ok && mode.Primary != "" && talentGrowth > 0 {
		// Primary gets full growth, secondary gets half
		pool.Exec(ctx,
			`UPDATE slimes SET `+mode.Primary+` = LEAST(`+mode.Primary+` + $1, 31) WHERE id = $2`,
			talentGrowth, slimeID,
		)
		grownStat = mode.Primary
		if mode.Secondary != "" {
			secondaryGrowth := talentGrowth / 2
			if secondaryGrowth < 1 {
				secondaryGrowth = 1
			}
			pool.Exec(ctx,
				`UPDATE slimes SET `+mode.Secondary+` = LEAST(`+mode.Secondary+` + $1, 31) WHERE id = $2`,
				secondaryGrowth, slimeID,
			)
		}
	}

	// Log training collect
	LogGameAction(pool, userID, "training_collect", "training", 0, 0, 0, map[string]interface{}{
		"slime_id": slimeID, "exp_gained": earnedExp, "training_mode": trainingMode, "talent_growth": talentGrowth,
	})

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
		"success":        true,
		"exp_gained":     earnedExp,
		"new_level":      newLevel,
		"new_exp":        newExp,
		"level_up":       leveledUp,
		"training_mode":  trainingMode,
		"talent_growth":  talentGrowth,
		"grown_stat":     grownStat,
	})
}
