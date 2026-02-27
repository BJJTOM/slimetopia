package game

import (
	"context"
	"math/rand"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/slimetopia/server/internal/models"
)

// ===== Talent (IV) System =====

// InheritTalents creates child talents from two parent slimes.
// Each stat: 50% chance from parent A, 50% from parent B, then ±3 mutation.
func InheritTalents(a, b models.Slime) [6]int {
	parentA := [6]int{a.TalentStr, a.TalentVit, a.TalentSpd, a.TalentInt, a.TalentCha, a.TalentLck}
	parentB := [6]int{b.TalentStr, b.TalentVit, b.TalentSpd, b.TalentInt, b.TalentCha, b.TalentLck}

	var child [6]int
	for i := 0; i < 6; i++ {
		// Pick from one parent
		if rand.Float64() < 0.5 {
			child[i] = parentA[i]
		} else {
			child[i] = parentB[i]
		}
		// Mutation: ±3 random
		child[i] += rand.Intn(7) - 3
		if child[i] < 0 {
			child[i] = 0
		}
		if child[i] > 31 {
			child[i] = 31
		}
	}
	return child
}

// TalentTotal returns the sum of all 6 talent values.
func TalentTotal(s models.Slime) int {
	return s.TalentStr + s.TalentVit + s.TalentSpd + s.TalentInt + s.TalentCha + s.TalentLck
}

// TalentGrade returns a letter grade based on total talent.
func TalentGrade(total int) string {
	switch {
	case total >= 160: // 85%+ of max(186)
		return "S"
	case total >= 130:
		return "A"
	case total >= 100:
		return "B"
	case total >= 70:
		return "C"
	default:
		return "D"
	}
}

// ===== Awakening (Star) System =====

// GetAwakeningCost returns the cost for the next star level
func (h *Handler) GetAwakeningCost(c *fiber.Ctx) error {
	slimeID := c.Params("id")
	ctx := c.Context()

	slime, err := h.slimeRepo.FindByID(ctx, slimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}

	if slime.StarLevel >= 3 {
		return c.JSON(fiber.Map{"max_star": true, "star_level": slime.StarLevel})
	}

	species, err := h.slimeRepo.GetSpecies(ctx, slime.SpeciesID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "species not found"})
	}

	nextStar := slime.StarLevel + 1
	pool := h.slimeRepo.Pool()

	var goldCost, stardustCost, materialQty int
	var materialID *int
	err = pool.QueryRow(ctx,
		`SELECT gold_cost, stardust_cost, material_id, material_qty
		 FROM game_awakening_costs WHERE grade = $1 AND star_level = $2`,
		species.Grade, nextStar,
	).Scan(&goldCost, &stardustCost, &materialID, &materialQty)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "cost data not found"})
	}

	return c.JSON(fiber.Map{
		"star_level":    slime.StarLevel,
		"next_star":     nextStar,
		"gold_cost":     goldCost,
		"stardust_cost": stardustCost,
		"material_id":   materialID,
		"material_qty":  materialQty,
	})
}

// AwakenSlime performs star awakening
func (h *Handler) AwakenSlime(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	slimeID := c.Params("id")
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	slime, err := h.slimeRepo.FindByID(ctx, slimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}
	if slime.StarLevel >= 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "max_star_reached"})
	}

	species, err := h.slimeRepo.GetSpecies(ctx, slime.SpeciesID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "species not found"})
	}

	nextStar := slime.StarLevel + 1
	var goldCost, stardustCost, materialQty int
	var materialID *int
	err = pool.QueryRow(ctx,
		`SELECT gold_cost, stardust_cost, material_id, material_qty
		 FROM game_awakening_costs WHERE grade = $1 AND star_level = $2`,
		species.Grade, nextStar,
	).Scan(&goldCost, &stardustCost, &materialID, &materialQty)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cost data not found"})
	}

	// Check user currency
	user, err := h.userRepo.FindByID(ctx, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user not found"})
	}
	if user.Gold < int64(goldCost) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_gold"})
	}

	// Check stardust
	var stardust int
	pool.QueryRow(ctx, `SELECT COALESCE(stardust, 0) FROM users WHERE id = $1`, userID).Scan(&stardust)
	if stardust < stardustCost {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_stardust"})
	}

	// Check material if needed
	if materialID != nil && materialQty > 0 {
		var matQty int
		pool.QueryRow(ctx,
			`SELECT COALESCE(quantity, 0) FROM user_materials WHERE user_id = $1 AND material_id = $2`,
			userID, *materialID,
		).Scan(&matQty)
		if matQty < materialQty {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_material"})
		}
		// Consume material
		pool.Exec(ctx,
			`UPDATE user_materials SET quantity = quantity - $1 WHERE user_id = $2 AND material_id = $3`,
			materialQty, userID, *materialID,
		)
	}

	// Deduct gold + stardust
	pool.Exec(ctx, `UPDATE users SET gold = gold - $1 WHERE id = $2`, goldCost, userID)
	pool.Exec(ctx, `UPDATE users SET stardust = COALESCE(stardust, 0) - $1 WHERE id = $2`, stardustCost, userID)

	// Apply awakening: star_level++ and bonus talent growth
	talentBoost := rand.Intn(3) + 1 // 1~3 bonus to random talent
	talentStats := []string{"talent_str", "talent_vit", "talent_spd", "talent_int", "talent_cha", "talent_lck"}
	boostedStat := talentStats[rand.Intn(6)]

	pool.Exec(ctx,
		`UPDATE slimes SET star_level = star_level + 1,
		 `+boostedStat+` = LEAST(`+boostedStat+` + $1, 31),
		 updated_at = NOW() WHERE id = $2`,
		talentBoost, slimeID,
	)

	LogGameAction(pool, userID, "awaken", "slime", int64(goldCost), 0, 0, map[string]interface{}{
		"slime_id": slimeID, "star_level": nextStar, "talent_boost": boostedStat, "boost_amount": talentBoost,
	})

	return c.JSON(fiber.Map{
		"success":       true,
		"new_star":      nextStar,
		"talent_boost":  boostedStat,
		"boost_amount":  talentBoost,
		"gold_spent":    goldCost,
		"stardust_spent": stardustCost,
	})
}

// ===== Skills System =====

// GetSlimeSkills returns learned skills for a slime
func (h *Handler) GetSlimeSkills(c *fiber.Ctx) error {
	slimeID := c.Params("id")
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	rows, err := pool.Query(ctx,
		`SELECT ss.slot, gs.id, gs.name, gs.name_en, gs.description, gs.icon,
		        gs.skill_type, gs.element_affinity, gs.grade_req, gs.level_req, gs.effect,
		        ss.inherited
		 FROM slime_skills ss
		 JOIN game_skills gs ON gs.id = ss.skill_id
		 WHERE ss.slime_id = $1
		 ORDER BY ss.slot`,
		slimeID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch skills"})
	}
	defer rows.Close()

	skills := make([]fiber.Map, 0)
	for rows.Next() {
		var slot, skillID, levelReq int
		var name, nameEN, desc, icon, skillType, gradeReq string
		var elementAffinity *string
		var effect []byte
		var inherited bool

		if err := rows.Scan(&slot, &skillID, &name, &nameEN, &desc, &icon, &skillType,
			&elementAffinity, &gradeReq, &levelReq, &effect, &inherited); err != nil {
			continue
		}
		skills = append(skills, fiber.Map{
			"slot":             slot,
			"skill_id":         skillID,
			"name":             name,
			"name_en":          nameEN,
			"description":      desc,
			"icon":             icon,
			"skill_type":       skillType,
			"element_affinity": elementAffinity,
			"grade_req":        gradeReq,
			"level_req":        levelReq,
			"effect":           string(effect),
			"inherited":        inherited,
		})
	}

	// Also get available (learnable) skills for this slime's species
	slime, err := h.slimeRepo.FindByID(ctx, slimeID)
	if err != nil {
		return c.JSON(fiber.Map{"skills": skills, "available": []fiber.Map{}})
	}

	availableRows, err := pool.Query(ctx,
		`SELECT gss.slot, gss.learn_level, gs.id, gs.name, gs.name_en, gs.description, gs.icon,
		        gs.skill_type, gs.element_affinity, gs.grade_req, gs.level_req, gs.effect
		 FROM game_species_skills gss
		 JOIN game_skills gs ON gs.id = gss.skill_id
		 WHERE gss.species_id = $1
		 ORDER BY gss.slot`,
		slime.SpeciesID,
	)
	if err != nil {
		return c.JSON(fiber.Map{"skills": skills, "available": []fiber.Map{}})
	}
	defer availableRows.Close()

	available := make([]fiber.Map, 0)
	for availableRows.Next() {
		var slot, learnLevel, skillID, levelReq int
		var name, nameEN, desc, icon, skillType, gradeReq string
		var elementAffinity *string
		var effect []byte

		if err := availableRows.Scan(&slot, &learnLevel, &skillID, &name, &nameEN, &desc, &icon,
			&skillType, &elementAffinity, &gradeReq, &levelReq, &effect); err != nil {
			continue
		}
		available = append(available, fiber.Map{
			"slot":             slot,
			"learn_level":      learnLevel,
			"skill_id":         skillID,
			"name":             name,
			"name_en":          nameEN,
			"description":      desc,
			"icon":             icon,
			"skill_type":       skillType,
			"element_affinity": elementAffinity,
			"grade_req":        gradeReq,
			"level_req":        levelReq,
			"effect":           string(effect),
			"can_learn":        slime.Level >= learnLevel,
		})
	}

	return c.JSON(fiber.Map{"skills": skills, "available": available})
}

// LearnSkill learns a skill for a slime (from species skill pool)
func (h *Handler) LearnSkill(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	slimeID := c.Params("id")

	var body struct {
		SkillID int `json:"skill_id"`
		Slot    int `json:"slot"`
	}
	if err := c.BodyParser(&body); err != nil || body.SkillID == 0 || body.Slot < 1 || body.Slot > 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "skill_id and slot (1-3) required"})
	}

	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	slime, err := h.slimeRepo.FindByID(ctx, slimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// Check if species can learn this skill
	var learnLevel int
	err = pool.QueryRow(ctx,
		`SELECT learn_level FROM game_species_skills WHERE species_id = $1 AND skill_id = $2`,
		slime.SpeciesID, body.SkillID,
	).Scan(&learnLevel)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "skill not available for this species"})
	}
	if slime.Level < learnLevel {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "level_too_low", "required_level": learnLevel})
	}

	// Upsert: replace existing skill in that slot
	_, err = pool.Exec(ctx,
		`INSERT INTO slime_skills (slime_id, skill_id, slot, inherited)
		 VALUES ($1, $2, $3, false)
		 ON CONFLICT (slime_id, slot) DO UPDATE SET skill_id = $2, inherited = false`,
		slimeID, body.SkillID, body.Slot,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to learn skill"})
	}

	return c.JSON(fiber.Map{"success": true, "skill_id": body.SkillID, "slot": body.Slot})
}

// ===== Merge Forecast =====

// GetMergeForecast returns a preview of what merging two slimes would produce
func (h *Handler) GetMergeForecast(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeIDA   string `json:"slime_id_a"`
		SlimeIDB   string `json:"slime_id_b"`
		MaterialID int    `json:"material_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id_a and slime_id_b required"})
	}

	ctx := c.Context()

	slimeA, err := h.slimeRepo.FindByID(ctx, body.SlimeIDA)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime A not found"})
	}
	slimeB, err := h.slimeRepo.FindByID(ctx, body.SlimeIDB)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime B not found"})
	}
	if uuidToString(slimeA.UserID) != userID || uuidToString(slimeB.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slimes"})
	}

	// Predict talent range
	childTalents := InheritTalents(*slimeA, *slimeB)
	talentTotal := 0
	for _, v := range childTalents {
		talentTotal += v
	}

	// Get parent skills for inheritance preview
	pool := h.slimeRepo.Pool()
	parentSkillsA := getSlimeSkillIDs(ctx, pool, body.SlimeIDA)
	parentSkillsB := getSlimeSkillIDs(ctx, pool, body.SlimeIDB)

	// Determine merge type
	mergeType := "unknown"
	spA, _ := h.slimeRepo.GetSpecies(ctx, slimeA.SpeciesID)
	spB, _ := h.slimeRepo.GetSpecies(ctx, slimeB.SpeciesID)

	if slimeA.SpeciesID == slimeB.SpeciesID {
		mergeType = "upgrade"
	} else if recipe := h.findRecipe(slimeA.SpeciesID, slimeB.SpeciesID); recipe != nil {
		mergeType = "combination"
	} else if body.MaterialID > 0 {
		mergeType = "catalyzed"
	}

	return c.JSON(fiber.Map{
		"merge_type": mergeType,
		"parent_a": fiber.Map{
			"species_id":  slimeA.SpeciesID,
			"talents":     [6]int{slimeA.TalentStr, slimeA.TalentVit, slimeA.TalentSpd, slimeA.TalentInt, slimeA.TalentCha, slimeA.TalentLck},
			"talent_total": TalentTotal(*slimeA),
			"skills":       parentSkillsA,
			"grade":        safeGrade(spA),
		},
		"parent_b": fiber.Map{
			"species_id":  slimeB.SpeciesID,
			"talents":     [6]int{slimeB.TalentStr, slimeB.TalentVit, slimeB.TalentSpd, slimeB.TalentInt, slimeB.TalentCha, slimeB.TalentLck},
			"talent_total": TalentTotal(*slimeB),
			"skills":       parentSkillsB,
			"grade":        safeGrade(spB),
		},
		"predicted_talents":     childTalents,
		"predicted_talent_total": talentTotal,
		"predicted_talent_grade": TalentGrade(talentTotal),
		"skill_inheritance":      len(parentSkillsA) > 0 || len(parentSkillsB) > 0,
	})
}

func safeGrade(sp *models.SlimeSpecies) string {
	if sp == nil {
		return "common"
	}
	return sp.Grade
}

func getSlimeSkillIDs(ctx context.Context, pool *pgxpool.Pool, slimeID string) []int {
	rows, err := pool.Query(ctx,
		`SELECT skill_id FROM slime_skills WHERE slime_id = $1 ORDER BY slot`, slimeID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

// InheritSkills copies one random skill from parents to the child slime
func InheritSkills(ctx context.Context, pool *pgxpool.Pool, parentIDA, parentIDB, childID string) {
	// Gather all parent skills
	type parentSkill struct {
		skillID int
		slot    int
	}
	var allSkills []parentSkill

	rows, err := pool.Query(ctx,
		`SELECT skill_id, slot FROM slime_skills WHERE slime_id IN ($1, $2)`,
		parentIDA, parentIDB)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var ps parentSkill
		if rows.Scan(&ps.skillID, &ps.slot) == nil {
			allSkills = append(allSkills, ps)
		}
	}

	if len(allSkills) == 0 {
		return
	}

	// 30% chance to inherit one skill
	if rand.Float64() > 0.3 {
		return
	}

	// Pick a random skill from parents
	picked := allSkills[rand.Intn(len(allSkills))]
	pool.Exec(ctx,
		`INSERT INTO slime_skills (slime_id, skill_id, slot, inherited)
		 VALUES ($1, $2, $3, true)
		 ON CONFLICT (slime_id, slot) DO NOTHING`,
		childID, picked.skillID, picked.slot,
	)
}
