package game

import (
	"encoding/json"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/slimetopia/server/internal/models"
)

// Grade hierarchy for same-species upgrade merging
var gradeOrder = []string{
	models.GradeCommon,
	models.GradeUncommon,
	models.GradeRare,
	models.GradeEpic,
	models.GradeLegendary,
}

// Recipe represents a combination merge recipe
type Recipe struct {
	ID         int    `json:"id"`
	InputA     int    `json:"input_a"`
	InputB     int    `json:"input_b"`
	Output     int    `json:"output"`
	OutputName string `json:"output_name"`
	Type       string `json:"type"`
	Hint       string `json:"hint"`
	Hidden     bool   `json:"hidden"`
}

var recipes []Recipe

func init() {
	loadRecipes()
}

func loadRecipes() {
	// Try multiple paths (running from server/ or from project root)
	paths := []string{
		"../shared/recipes.json",
		"shared/recipes.json",
		"/app/shared/recipes.json",
	}

	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var wrapper struct {
			Recipes []Recipe `json:"recipes"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			log.Error().Err(err).Msg("Failed to parse recipes.json")
			continue
		}
		recipes = wrapper.Recipes
		log.Info().Int("count", len(recipes)).Msg("Loaded merge recipes")
		return
	}
	log.Warn().Msg("No recipes.json found, merge recipes empty")
}

// findRecipe checks if two species have a combination recipe
func findRecipe(speciesA, speciesB int) *Recipe {
	for _, r := range recipes {
		if (r.InputA == speciesA && r.InputB == speciesB) ||
			(r.InputA == speciesB && r.InputB == speciesA) {
			return &r
		}
	}
	return nil
}

// nextGrade returns the next grade in the hierarchy
func nextGrade(current string) (string, bool) {
	for i, g := range gradeOrder {
		if g == current && i+1 < len(gradeOrder) {
			return gradeOrder[i+1], true
		}
	}
	return "", false
}

// MergeSlimes handles POST /api/slimes/merge
// Supports optional material_id for the strategic synthesis system
func (h *Handler) MergeSlimes(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeIDA   string `json:"slime_id_a"`
		SlimeIDB   string `json:"slime_id_b"`
		MaterialID int    `json:"material_id"` // optional: 0 = no material
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "slime_id_a and slime_id_b required",
		})
	}

	if body.SlimeIDA == "" || body.SlimeIDB == "" || body.SlimeIDA == body.SlimeIDB {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "two different slime IDs required",
		})
	}

	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Fetch both slimes
	slimeA, err := h.slimeRepo.FindByID(ctx, body.SlimeIDA)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime A not found"})
	}
	slimeB, err := h.slimeRepo.FindByID(ctx, body.SlimeIDB)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime B not found"})
	}

	// Ownership check
	if uuidToString(slimeA.UserID) != userID || uuidToString(slimeB.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slimes"})
	}

	// Check if slimes are on exploration
	onExp, err := h.explorationRepo.IsSlimeOnExploration(ctx, userID, []string{body.SlimeIDA, body.SlimeIDB})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check exploration status"})
	}
	if onExp {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "one or more slimes are on exploration"})
	}

	// Check if slimes are in training
	var trainingCount int
	pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM training_slots WHERE user_id = $1 AND (slime_id = $2 OR slime_id = $3)`,
		userID, body.SlimeIDA, body.SlimeIDB,
	).Scan(&trainingCount)
	if trainingCount > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "one or more slimes are in training"})
	}

	// Material handling
	var material *Material
	if body.MaterialID > 0 {
		mat := FindMaterial(body.MaterialID)
		if mat == nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "material not found"})
		}
		if !ConsumeMaterial(ctx, pool, userID, body.MaterialID) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient material"})
		}
		material = mat
	}

	// Calculate user's collection score for mutation requirements
	_, _, _, collectionScore := CalculateCollectionScore(ctx, pool, userID)

	// Run synthesis engine
	result := Synthesize(ctx, h, *slimeA, *slimeB, material, collectionScore)
	if result.Error != "" {
		// Refund material if synthesis failed
		if material != nil {
			AddMaterial(ctx, pool, userID, body.MaterialID, 1)
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": result.Error})
	}

	// Delete both input slimes
	if err := h.slimeRepo.Delete(ctx, body.SlimeIDA); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "merge failed"})
	}
	if err := h.slimeRepo.Delete(ctx, body.SlimeIDB); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "merge failed"})
	}

	// Create result slime
	resultSlime, err := h.slimeRepo.Create(ctx, userID, result.SpeciesID, result.Element, result.Personality)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create result slime"})
	}

	// Add to codex
	h.slimeRepo.AddCodexEntry(ctx, userID, result.SpeciesID)

	// Track first discovery
	user, _ := h.userRepo.FindByID(ctx, userID)
	nickname := ""
	if user != nil {
		nickname = user.Nickname
	}
	isFirstDiscovery := TryFirstDiscovery(ctx, pool, userID, result.SpeciesID, nickname)

	// Track mission progress
	h.missionRepo.IncrementProgress(ctx, userID, "merge")

	// Track recipe discovery for combination merges
	newDiscovery := false
	if result.MergeType == "combination" {
		recipe := findRecipe(slimeA.SpeciesID, slimeB.SpeciesID)
		if recipe != nil {
			h.slimeRepo.AddRecipeDiscovery(ctx, userID, recipe.ID)
			newDiscovery = true
		}
	}

	// Get species info for response
	resultSpecies, _ := h.slimeRepo.GetSpecies(ctx, result.SpeciesID)

	// Log merge
	materialID := 0
	if material != nil {
		materialID = material.ID
	}
	LogGameAction(pool, userID, "merge", "item", 0, 0, 0, map[string]interface{}{
		"species_a": slimeA.SpeciesID, "species_b": slimeB.SpeciesID, "result": result.SpeciesID,
		"merge_type": result.MergeType, "material_id": materialID,
	})

	return c.JSON(fiber.Map{
		"merge_type":       result.MergeType,
		"new_discovery":    newDiscovery,
		"is_mutation":      result.IsMutation,
		"is_great_success": result.IsGreatSuccess,
		"is_first_discovery": isFirstDiscovery,
		"material_used":    material != nil,
		"result": fiber.Map{
			"slime":   slimeToMap(*resultSlime),
			"species": resultSpecies,
		},
	})
}
