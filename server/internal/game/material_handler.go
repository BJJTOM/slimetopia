package game

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
)

// GET /api/materials — list all material definitions from DB
func (h *Handler) GetMaterials(c *fiber.Ctx) error {
	ctx := c.Context()
	dbMaterials, err := h.gameDataRepo.GetAllMaterials(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch materials"})
	}

	materials := make([]Material, 0, len(dbMaterials))
	for _, m := range dbMaterials {
		var effects MaterialEffect
		json.Unmarshal(m.Effects, &effects)
		materials = append(materials, Material{
			ID: m.ID, Name: m.Name, NameEN: m.NameEN, Type: m.Type,
			Rarity: m.Rarity, Icon: m.Icon, Description: m.Description,
			Effects: effects,
		})
	}

	return c.JSON(fiber.Map{"materials": materials})
}

// GET /api/materials/inventory — user's material inventory
func (h *Handler) GetMaterialInventory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	rows, err := pool.Query(ctx, `
		SELECT material_id, quantity FROM user_materials
		WHERE user_id = $1 AND quantity > 0
		ORDER BY material_id
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch inventory"})
	}
	defer rows.Close()

	type InventoryItem struct {
		MaterialID int `json:"material_id"`
		Quantity   int `json:"quantity"`
	}

	items := make([]InventoryItem, 0)
	for rows.Next() {
		var item InventoryItem
		if rows.Scan(&item.MaterialID, &item.Quantity) == nil {
			items = append(items, item)
		}
	}

	return c.JSON(fiber.Map{"inventory": items})
}

// GET /api/codex/score — collection score breakdown
func (h *Handler) GetCollectionScore(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	speciesPoints, setBonus, firstDiscoveryBonus, total := h.CalculateCollectionScore(ctx, pool, userID)

	return c.JSON(fiber.Map{
		"species_points":        speciesPoints,
		"set_bonus":             setBonus,
		"first_discovery_bonus": firstDiscoveryBonus,
		"total":                 total,
	})
}

// GET /api/codex/sets — set progress for user
func (h *Handler) GetCodexSets(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	type SetProgress struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		NameEN      string  `json:"name_en"`
		Description string  `json:"description"`
		SpeciesIDs  []int   `json:"species_ids"`
		Completed   int     `json:"completed"`
		Total       int     `json:"total"`
		BonusScore  int     `json:"bonus_score"`
		Buff        SetBuff `json:"buff"`
		IsComplete  bool    `json:"is_complete"`
	}

	dbSets, err := h.gameDataRepo.GetAllSets(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch sets"})
	}

	sets := make([]SetProgress, 0, len(dbSets))
	for _, s := range dbSets {
		sp := SetProgress{
			ID:          s.ID,
			Name:        s.Name,
			NameEN:      s.NameEN,
			Description: s.Description,
			SpeciesIDs:  s.SpeciesIDs,
			Total:       len(s.SpeciesIDs),
			BonusScore:  s.BonusScore,
			Buff: SetBuff{
				Type:  s.BuffType,
				Value: s.BuffValue,
				Label: s.BuffLabel,
			},
		}
		for _, sid := range s.SpeciesIDs {
			var exists bool
			pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM codex_entries WHERE user_id = $1 AND species_id = $2)`, userID, sid).Scan(&exists)
			if exists {
				sp.Completed++
			}
		}
		sp.IsComplete = sp.Completed == sp.Total
		sets = append(sets, sp)
	}

	return c.JSON(fiber.Map{"sets": sets})
}

// GET /api/codex/first-discoveries — first discoverers
func (h *Handler) GetFirstDiscoveries(c *fiber.Ctx) error {
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	rows, err := pool.Query(ctx, `
		SELECT species_id, nickname, discovered_at FROM first_discoveries
		ORDER BY discovered_at DESC LIMIT 100
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch"})
	}
	defer rows.Close()

	type Discovery struct {
		SpeciesID int    `json:"species_id"`
		Nickname  string `json:"nickname"`
	}

	discoveries := make([]Discovery, 0)
	for rows.Next() {
		var d Discovery
		var at interface{}
		if rows.Scan(&d.SpeciesID, &d.Nickname, &at) == nil {
			discoveries = append(discoveries, d)
		}
	}

	return c.JSON(fiber.Map{"discoveries": discoveries})
}
