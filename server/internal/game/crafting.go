package game

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CraftingIngredient struct {
	MaterialID int `json:"material_id"`
	Quantity   int `json:"quantity"`
}

type CraftingRecipe struct {
	ID          int                  `json:"id"`
	Name        string               `json:"name"`
	ResultType  string               `json:"result_type"`
	ResultID    int                  `json:"result_id"`
	ResultQty   int                  `json:"result_qty"`
	Ingredients []CraftingIngredient `json:"ingredients"`
	CanCraft    bool                 `json:"can_craft"`
}

func loadCraftingRecipes(ctx context.Context, pool *pgxpool.Pool, userID string) ([]CraftingRecipe, error) {
	rows, err := pool.Query(ctx, `SELECT id, name, result_type, result_id, result_qty FROM crafting_recipes ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipes []CraftingRecipe
	for rows.Next() {
		var r CraftingRecipe
		if err := rows.Scan(&r.ID, &r.Name, &r.ResultType, &r.ResultID, &r.ResultQty); err != nil {
			continue
		}
		recipes = append(recipes, r)
	}

	// Load ingredients for each recipe
	for i := range recipes {
		ingRows, err := pool.Query(ctx,
			`SELECT material_id, quantity FROM crafting_ingredients WHERE recipe_id = $1`,
			recipes[i].ID,
		)
		if err != nil {
			continue
		}

		for ingRows.Next() {
			var ing CraftingIngredient
			if ingRows.Scan(&ing.MaterialID, &ing.Quantity) == nil {
				recipes[i].Ingredients = append(recipes[i].Ingredients, ing)
			}
		}
		ingRows.Close()
	}

	// Check craftability against user's inventory
	userMats := make(map[int]int)
	matRows, err := pool.Query(ctx,
		`SELECT material_id, quantity FROM user_materials WHERE user_id = $1 AND quantity > 0`,
		userID,
	)
	if err == nil {
		for matRows.Next() {
			var mid, qty int
			if matRows.Scan(&mid, &qty) == nil {
				userMats[mid] = qty
			}
		}
		matRows.Close()
	}

	for i := range recipes {
		canCraft := true
		for _, ing := range recipes[i].Ingredients {
			if userMats[ing.MaterialID] < ing.Quantity {
				canCraft = false
				break
			}
		}
		recipes[i].CanCraft = canCraft
	}

	return recipes, nil
}

// GET /api/crafting/recipes
func (h *Handler) GetCraftingRecipes(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	recipes, err := loadCraftingRecipes(ctx, pool, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load recipes"})
	}
	if recipes == nil {
		recipes = []CraftingRecipe{}
	}

	return c.JSON(fiber.Map{"recipes": recipes})
}

// POST /api/crafting/craft
func (h *Handler) CraftItem(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	var body struct {
		RecipeID int `json:"recipe_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "recipe_id required"})
	}

	// Load the specific recipe
	var recipe CraftingRecipe
	err := pool.QueryRow(ctx,
		`SELECT id, name, result_type, result_id, result_qty FROM crafting_recipes WHERE id = $1`,
		body.RecipeID,
	).Scan(&recipe.ID, &recipe.Name, &recipe.ResultType, &recipe.ResultID, &recipe.ResultQty)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "recipe not found"})
	}

	// Load ingredients
	ingRows, err := pool.Query(ctx,
		`SELECT material_id, quantity FROM crafting_ingredients WHERE recipe_id = $1`,
		recipe.ID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load ingredients"})
	}
	for ingRows.Next() {
		var ing CraftingIngredient
		if ingRows.Scan(&ing.MaterialID, &ing.Quantity) == nil {
			recipe.Ingredients = append(recipe.Ingredients, ing)
		}
	}
	ingRows.Close()

	// Check user has enough materials
	for _, ing := range recipe.Ingredients {
		var qty int
		err := pool.QueryRow(ctx,
			`SELECT COALESCE(quantity, 0) FROM user_materials WHERE user_id = $1 AND material_id = $2`,
			userID, ing.MaterialID,
		).Scan(&qty)
		if err != nil || qty < ing.Quantity {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_materials"})
		}
	}

	// Deduct materials
	for _, ing := range recipe.Ingredients {
		pool.Exec(ctx,
			`UPDATE user_materials SET quantity = quantity - $1 WHERE user_id = $2 AND material_id = $3`,
			ing.Quantity, userID, ing.MaterialID,
		)
	}

	// Grant result based on type
	var resultMsg string
	switch recipe.ResultType {
	case "material":
		AddMaterial(ctx, pool, userID, recipe.ResultID, recipe.ResultQty)
		mat := h.FindMaterial(recipe.ResultID)
		name := fmt.Sprintf("재료 #%d", recipe.ResultID)
		if mat != nil {
			name = mat.Name
		}
		resultMsg = fmt.Sprintf("%s x%d 획득!", name, recipe.ResultQty)

	case "egg":
		// Use the shop egg-hatching logic by creating an egg purchase equivalent
		// For simplicity, grant a random slime of the egg's type
		resultMsg = fmt.Sprintf("%s 제작 완료! 상점에서 확인하세요.", recipe.Name)
		// Grant the egg equivalent by running the shop's hatchEgg logic
		h.craftEgg(ctx, userID, recipe.ResultID)

	case "booster":
		// Activate the booster
		h.craftBooster(ctx, userID, recipe.ResultID)
		resultMsg = fmt.Sprintf("%s 활성화!", recipe.Name)

	case "accessory":
		// Grant the accessory
		pool.Exec(ctx,
			`INSERT INTO user_accessories (user_id, accessory_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			userID, recipe.ResultID,
		)
		resultMsg = fmt.Sprintf("%s 획득!", recipe.Name)

	default:
		resultMsg = fmt.Sprintf("%s 제작 완료!", recipe.Name)
	}

	LogGameAction(pool, userID, "craft", "item", 0, 0, 0, map[string]interface{}{
		"recipe_id": recipe.ID, "result_type": recipe.ResultType, "result_id": recipe.ResultID,
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": resultMsg,
	})
}

// craftEgg handles egg crafting - creates a slime from the given shop egg item ID
func (h *Handler) craftEgg(ctx context.Context, userID string, eggItemID int) {
	// Find the shop item to determine egg type
	eggType := getEggType(eggItemID)
	speciesID, element := h.hatchEggFromDB(ctx, eggType)

	personalities := []string{"energetic", "chill", "foodie", "curious", "tsundere", "gentle"}
	personality := personalities[rand.Intn(len(personalities))]

	newSlime, err := h.slimeRepo.Create(ctx, userID, speciesID, element, personality)
	if err != nil {
		return
	}
	h.slimeRepo.AddCodexEntry(ctx, userID, newSlime.SpeciesID)
}

// craftBooster activates a booster for the user
func (h *Handler) craftBooster(ctx context.Context, userID string, boosterID int) {
	// Map booster IDs: 1=exp, 2=gold, 3=luck
	var boosterType BoosterType
	switch boosterID {
	case 1:
		boosterType = BoosterExp
	case 2:
		boosterType = BoosterGold
	case 3:
		boosterType = BoosterLuck
	default:
		return
	}
	h.ActivateBooster(userID, boosterType)
}
