package game

import (
	"context"
	"encoding/json"
	"math/rand"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/slimetopia/server/internal/models"
)

// ===== Material Data Structures =====

type ElementBoost struct {
	Element string  `json:"element"`
	Chance  float64 `json:"chance"`
}

type MaterialEffect struct {
	ElementBoost   *ElementBoost `json:"element_boost,omitempty"`
	GradeBoost     float64       `json:"grade_boost,omitempty"`
	MutationBoost  float64       `json:"mutation_boost,omitempty"`
	MutationTarget int           `json:"mutation_target,omitempty"`
	GreatSuccess   float64       `json:"great_success,omitempty"`
}

type Material struct {
	ID          int            `json:"id"`
	Name        string         `json:"name"`
	NameEN      string         `json:"name_en"`
	Type        string         `json:"type"`
	Rarity      string         `json:"rarity"`
	Icon        string         `json:"icon"`
	Description string         `json:"description"`
	Effects     MaterialEffect `json:"effects"`
}

// ===== Slime Set Data =====

type SetBuff struct {
	Type  string  `json:"type"`
	Value float64 `json:"value"`
	Label string  `json:"label"`
}

type SlimeSet struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	NameEN      string  `json:"name_en"`
	Description string  `json:"description"`
	SpeciesIDs  []int   `json:"species_ids"`
	BonusScore  int     `json:"bonus_score"`
	Buff        SetBuff `json:"buff"`
}

// ===== Mutation Recipes =====

type MutationRecipe struct {
	RequiredElementA   string
	RequiredElementB   string
	RequiredMaterial   int
	ResultSpeciesID    int
	MinCollectionScore int // 0 = no minimum
}

// ===== Synthesis Result =====

type SynthesisResult struct {
	SpeciesID      int
	Element        string
	Personality    string
	MergeType      string // "combination", "upgrade", "catalyzed", "mutation"
	IsMutation     bool
	IsGreatSuccess bool
	IsNewDiscovery bool
	Error          string
}

// ===== Grade Scoring =====

var gradeScore = map[string]int{
	"common":    1,
	"uncommon":  3,
	"rare":      10,
	"epic":      30,
	"legendary": 100,
	"mythic":    500,
}

var gradeRank = map[string]int{
	"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "legendary": 4, "mythic": 5,
}

var gradeByRank = []string{"common", "uncommon", "rare", "epic", "legendary", "mythic"}

// FindMaterial looks up a material by ID from the database.
func (h *Handler) FindMaterial(id int) *Material {
	m, err := h.gameDataRepo.GetMaterialByID(context.Background(), id)
	if err != nil {
		return nil
	}
	var effects MaterialEffect
	json.Unmarshal(m.Effects, &effects)
	return &Material{
		ID: m.ID, Name: m.Name, NameEN: m.NameEN, Type: m.Type,
		Rarity: m.Rarity, Icon: m.Icon, Description: m.Description,
		Effects: effects,
	}
}

// ===== Core Synthesis Engine =====

func Synthesize(
	ctx context.Context,
	h *Handler,
	slimeA, slimeB models.Slime,
	material *Material,
	collectionScore int,
) SynthesisResult {
	allSpecies, _ := h.slimeRepo.GetAllSpecies(ctx)
	speciesMap := make(map[int]models.SlimeSpecies)
	for _, sp := range allSpecies {
		speciesMap[sp.ID] = sp
	}

	spA := speciesMap[slimeA.SpeciesID]
	spB := speciesMap[slimeB.SpeciesID]

	// Random personality for result
	personalities := []string{
		models.PersonalityEnergetic, models.PersonalityChill,
		models.PersonalityFoodie, models.PersonalityCurious,
		models.PersonalityTsundere, models.PersonalityGentle,
	}
	personality := personalities[rand.Intn(len(personalities))]

	// 1. Check mutation recipes from DB (only if material provided)
	if material != nil {
		dbMutations, _ := h.gameDataRepo.GetAllMutationRecipes(ctx)
		for _, dbMR := range dbMutations {
			mr := MutationRecipe{
				RequiredElementA:   dbMR.RequiredElementA,
				RequiredElementB:   dbMR.RequiredElementB,
				RequiredMaterial:   dbMR.RequiredMaterial,
				ResultSpeciesID:    dbMR.ResultSpeciesID,
				MinCollectionScore: dbMR.MinCollectionScore,
			}
			if !matchesMutation(slimeA, slimeB, material.ID, mr) {
				continue
			}
			if mr.MinCollectionScore > 0 && collectionScore < mr.MinCollectionScore {
				continue
			}
			// Roll for mutation
			mutChance := 0.3 + material.Effects.MutationBoost
			if rand.Float64() < mutChance {
				sp, ok := speciesMap[mr.ResultSpeciesID]
				if ok {
					return SynthesisResult{
						SpeciesID:   mr.ResultSpeciesID,
						Element:     sp.Element,
						Personality: personality,
						MergeType:   "mutation",
						IsMutation:  true,
					}
				}
			}
		}
	}

	// 2. Check regular recipes
	recipe := h.findRecipe(slimeA.SpeciesID, slimeB.SpeciesID)
	if recipe != nil {
		result := SynthesisResult{
			SpeciesID:   recipe.Output,
			MergeType:   "combination",
			Personality: personality,
		}
		sp, ok := speciesMap[recipe.Output]
		if ok {
			result.Element = sp.Element
		}

		// Material can cause "great success" → upgrade grade of result
		if material != nil && material.Effects.GreatSuccess > 0 {
			if rand.Float64() < material.Effects.GreatSuccess {
				result.IsGreatSuccess = true
			}
		}
		if material != nil && material.Effects.GradeBoost > 0 {
			if rand.Float64() < material.Effects.GradeBoost {
				result.IsGreatSuccess = true
			}
		}
		return result
	}

	// 3. Same-species upgrade
	if slimeA.SpeciesID == slimeB.SpeciesID {
		_, ok := nextGrade(spA.Grade)
		if !ok {
			return SynthesisResult{Error: "already at maximum grade"}
		}
		result := SynthesisResult{
			SpeciesID:   slimeA.SpeciesID,
			Element:     slimeA.Element,
			MergeType:   "upgrade",
			Personality: personality,
		}
		// Material grade boost can cause great success
		if material != nil && material.Effects.GradeBoost > 0 {
			if rand.Float64() < material.Effects.GradeBoost {
				result.IsGreatSuccess = true
			}
		}
		return result
	}

	// 4. Catalyzed synthesis (material required, different species without recipe)
	if material != nil {
		return catalyzedSynthesis(spA, spB, material, allSpecies, personality)
	}

	// 5. No valid merge
	return SynthesisResult{Error: "no valid merge: same species for upgrade or valid recipe for combination required"}
}

func matchesMutation(a, b models.Slime, materialID int, mr MutationRecipe) bool {
	if materialID != mr.RequiredMaterial {
		return false
	}
	// Check elements match in either order
	return (a.Element == mr.RequiredElementA && b.Element == mr.RequiredElementB) ||
		(a.Element == mr.RequiredElementB && b.Element == mr.RequiredElementA)
}

// catalyzedSynthesis: free-form synthesis using material to influence result
func catalyzedSynthesis(
	spA, spB models.SlimeSpecies,
	material *Material,
	allSpecies []models.SlimeSpecies,
	personality string,
) SynthesisResult {
	// Determine target element
	targetElement := pickTargetElement(spA, spB, material)

	// Determine target grade
	targetGrade := pickTargetGrade(spA, spB, material)

	// Find candidates matching element + grade
	candidates := filterSpecies(allSpecies, targetElement, targetGrade)

	// Fallback: try adjacent grades
	if len(candidates) == 0 {
		gr := gradeRank[targetGrade]
		for offset := 1; offset <= 2; offset++ {
			if gr-offset >= 0 {
				candidates = filterSpecies(allSpecies, targetElement, gradeByRank[gr-offset])
			}
			if len(candidates) > 0 {
				break
			}
			if gr+offset < len(gradeByRank) {
				candidates = filterSpecies(allSpecies, targetElement, gradeByRank[gr+offset])
			}
			if len(candidates) > 0 {
				break
			}
		}
	}

	// Fallback: any species of target element
	if len(candidates) == 0 {
		for _, sp := range allSpecies {
			if sp.Element == targetElement {
				candidates = append(candidates, sp)
			}
		}
	}

	// Final fallback: any species
	if len(candidates) == 0 {
		candidates = allSpecies
	}

	chosen := candidates[rand.Intn(len(candidates))]

	result := SynthesisResult{
		SpeciesID:   chosen.ID,
		Element:     chosen.Element,
		MergeType:   "catalyzed",
		Personality: personality,
	}

	// Great success check
	if material.Effects.GreatSuccess > 0 && rand.Float64() < material.Effects.GreatSuccess {
		result.IsGreatSuccess = true
	}
	if material.Effects.GradeBoost > 0 && rand.Float64() < material.Effects.GradeBoost {
		result.IsGreatSuccess = true
	}

	return result
}

func pickTargetElement(spA, spB models.SlimeSpecies, material *Material) string {
	// If material has element boost, bias towards that element
	if material.Effects.ElementBoost != nil {
		if rand.Float64() < material.Effects.ElementBoost.Chance {
			return material.Effects.ElementBoost.Element
		}
	}
	// Otherwise random between parent elements
	if rand.Float64() < 0.5 {
		return spA.Element
	}
	return spB.Element
}

func pickTargetGrade(spA, spB models.SlimeSpecies, material *Material) string {
	// Base grade = lower of two parents
	grA := gradeRank[spA.Grade]
	grB := gradeRank[spB.Grade]
	baseGR := grA
	if grB < baseGR {
		baseGR = grB
	}

	// Material grade boost can push up
	if material.Effects.GradeBoost > 0 {
		if rand.Float64() < material.Effects.GradeBoost {
			baseGR++
		}
	}

	if baseGR >= len(gradeByRank) {
		baseGR = len(gradeByRank) - 1
	}
	return gradeByRank[baseGR]
}

func filterSpecies(all []models.SlimeSpecies, element, grade string) []models.SlimeSpecies {
	var result []models.SlimeSpecies
	for _, sp := range all {
		// Exclude hidden slimes from random selection
		if sp.ID >= 777 {
			continue
		}
		if sp.Element == element && sp.Grade == grade {
			result = append(result, sp)
		}
	}
	return result
}

// ===== Collection Score Calculation =====

func (h *Handler) CalculateCollectionScore(ctx context.Context, pool *pgxpool.Pool, userID string) (speciesPoints int, setBonus int, firstDiscoveryBonus int, total int) {
	// 1. Species grade points
	rows, err := pool.Query(ctx, `
		SELECT ss.grade FROM codex_entries ce
		JOIN slime_species ss ON ss.id = ce.species_id
		WHERE ce.user_id = $1
	`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var grade string
			if rows.Scan(&grade) == nil {
				speciesPoints += gradeScore[grade]
			}
		}
	}

	// 2. Set bonuses (loaded from DB)
	dbSets, _ := h.gameDataRepo.GetAllSets(ctx)
	for _, set := range dbSets {
		completed := 0
		for _, sid := range set.SpeciesIDs {
			var exists bool
			pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM codex_entries WHERE user_id = $1 AND species_id = $2)`, userID, sid).Scan(&exists)
			if exists {
				completed++
			}
		}
		if completed == len(set.SpeciesIDs) {
			setBonus += set.BonusScore
		}
	}

	// 3. First discoverer bonuses (50 points each)
	var fdCount int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM first_discoveries WHERE user_id = $1`, userID).Scan(&fdCount)
	firstDiscoveryBonus = fdCount * 50

	total = speciesPoints + setBonus + firstDiscoveryBonus
	return
}

// TryFirstDiscovery attempts to record a first discovery. Returns discoverer nickname if newly recorded.
func TryFirstDiscovery(ctx context.Context, pool *pgxpool.Pool, userID string, speciesID int, nickname string) bool {
	tag, err := pool.Exec(ctx, `
		INSERT INTO first_discoveries (species_id, user_id, nickname)
		VALUES ($1, $2, $3)
		ON CONFLICT (species_id) DO NOTHING
	`, speciesID, userID, nickname)
	if err != nil {
		return false
	}
	return tag.RowsAffected() > 0
}

// ConsumeMaterial checks and consumes 1 unit of a material from user inventory
func ConsumeMaterial(ctx context.Context, pool *pgxpool.Pool, userID string, materialID int) bool {
	tag, err := pool.Exec(ctx, `
		UPDATE user_materials SET quantity = quantity - 1
		WHERE user_id = $1 AND material_id = $2 AND quantity > 0
	`, userID, materialID)
	if err != nil {
		return false
	}
	return tag.RowsAffected() > 0
}

// AddMaterial adds quantity of a material to user inventory
func AddMaterial(ctx context.Context, pool *pgxpool.Pool, userID string, materialID, qty int) {
	pool.Exec(ctx, `
		INSERT INTO user_materials (user_id, material_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, material_id) DO UPDATE SET quantity = user_materials.quantity + $3
	`, userID, materialID, qty)
}
