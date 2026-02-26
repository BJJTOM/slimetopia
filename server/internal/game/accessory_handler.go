package game

import (
	"encoding/json"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// AccessoryDef from shared/accessories.json
type AccessoryDef struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	NameEn   string `json:"name_en"`
	Slot     string `json:"slot"`
	Icon     string `json:"icon"`
	CostGold int    `json:"cost_gold"`
	CostGems int    `json:"cost_gems"`
	SvgOvl   string `json:"svg_overlay"`
}

var accessoryDefs []AccessoryDef

func init() {
	loadAccessoryDefs()
}

func loadAccessoryDefs() {
	paths := []string{
		"../shared/accessories.json",
		"shared/accessories.json",
		"/app/shared/accessories.json",
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var wrapper struct {
			Accessories []AccessoryDef `json:"accessories"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			log.Error().Err(err).Msg("Failed to parse accessories.json")
			continue
		}
		accessoryDefs = wrapper.Accessories
		log.Info().Int("count", len(accessoryDefs)).Msg("Loaded accessory definitions")
		return
	}
	log.Warn().Msg("No accessories.json found")
}

// GET /api/accessories — list all accessories with owned status
func (h *Handler) GetAccessories(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Get owned accessories
	rows, err := h.slimeRepo.Pool().Query(ctx,
		`SELECT accessory_id FROM slime_accessories WHERE user_id = (
			SELECT id FROM users WHERE id::text = $1 OR provider_id = $1 LIMIT 1
		)`, userID)

	owned := make(map[int]bool)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var accID int
			if rows.Scan(&accID) == nil {
				owned[accID] = true
			}
		}
	}

	result := make([]fiber.Map, 0, len(accessoryDefs))
	for _, def := range accessoryDefs {
		result = append(result, fiber.Map{
			"id":        def.ID,
			"name":      def.Name,
			"name_en":   def.NameEn,
			"slot":      def.Slot,
			"icon":      def.Icon,
			"cost_gold": def.CostGold,
			"cost_gems": def.CostGems,
			"svg_overlay": def.SvgOvl,
			"owned":     owned[def.ID],
		})
	}

	return c.JSON(fiber.Map{"accessories": result})
}

// POST /api/accessories/buy — purchase an accessory
func (h *Handler) BuyAccessory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	var body struct {
		AccessoryID int `json:"accessory_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	// Find accessory definition
	var def *AccessoryDef
	for i := range accessoryDefs {
		if accessoryDefs[i].ID == body.AccessoryID {
			def = &accessoryDefs[i]
			break
		}
	}
	if def == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "accessory not found"})
	}

	// Get user UUID
	var userUUID string
	err := h.slimeRepo.Pool().QueryRow(ctx,
		`SELECT id::text FROM users WHERE id::text = $1 OR provider_id = $1 LIMIT 1`, userID).Scan(&userUUID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user not found"})
	}

	// Check if already owned
	var exists bool
	h.slimeRepo.Pool().QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM slime_accessories WHERE user_id = $1::uuid AND accessory_id = $2)`,
		userUUID, def.ID).Scan(&exists)
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already owned"})
	}

	// Deduct currency
	if def.CostGold > 0 {
		tag, err := h.slimeRepo.Pool().Exec(ctx,
			`UPDATE users SET gold = gold - $1 WHERE id = $2::uuid AND gold >= $1`,
			def.CostGold, userUUID)
		if err != nil || tag.RowsAffected() == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient gold"})
		}
	}
	if def.CostGems > 0 {
		tag, err := h.slimeRepo.Pool().Exec(ctx,
			`UPDATE users SET gems = gems - $1 WHERE id = $2::uuid AND gems >= $1`,
			def.CostGems, userUUID)
		if err != nil || tag.RowsAffected() == 0 {
			// Refund gold if gems fail
			if def.CostGold > 0 {
				h.slimeRepo.Pool().Exec(ctx, `UPDATE users SET gold = gold + $1 WHERE id = $2::uuid`, def.CostGold, userUUID)
			}
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient gems"})
		}
	}

	// Grant accessory
	_, err = h.slimeRepo.Pool().Exec(ctx,
		`INSERT INTO slime_accessories (user_id, accessory_id) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING`,
		userUUID, def.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"accessory": fiber.Map{
			"id":   def.ID,
			"name": def.Name,
			"icon": def.Icon,
		},
	})
}

// POST /api/accessories/equip — equip accessory on a slime
func (h *Handler) EquipAccessory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	var body struct {
		SlimeID     string `json:"slime_id"`
		AccessoryID int    `json:"accessory_id"`
		Unequip     bool   `json:"unequip"` // true to remove
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	// Get user UUID
	var userUUID string
	err := h.slimeRepo.Pool().QueryRow(ctx,
		`SELECT id::text FROM users WHERE id::text = $1 OR provider_id = $1 LIMIT 1`, userID).Scan(&userUUID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user not found"})
	}

	if body.Unequip {
		// Find the slot for this accessory
		var slot string
		for _, def := range accessoryDefs {
			if def.ID == body.AccessoryID {
				slot = def.Slot
				break
			}
		}
		if slot != "" {
			h.slimeRepo.Pool().Exec(ctx,
				`DELETE FROM equipped_accessories WHERE slime_id = $1::uuid AND slot = $2`,
				body.SlimeID, slot)
		}
		return c.JSON(fiber.Map{"success": true})
	}

	// Find accessory def
	var def *AccessoryDef
	for i := range accessoryDefs {
		if accessoryDefs[i].ID == body.AccessoryID {
			def = &accessoryDefs[i]
			break
		}
	}
	if def == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "accessory not found"})
	}

	// Verify ownership
	var owned bool
	h.slimeRepo.Pool().QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM slime_accessories WHERE user_id = $1::uuid AND accessory_id = $2)`,
		userUUID, def.ID).Scan(&owned)
	if !owned {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not owned"})
	}

	// Verify slime ownership
	var slimeOwned bool
	h.slimeRepo.Pool().QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM slimes WHERE id = $1::uuid AND user_id = $2::uuid)`,
		body.SlimeID, userUUID).Scan(&slimeOwned)
	if !slimeOwned {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// Equip (upsert by slot)
	_, err = h.slimeRepo.Pool().Exec(ctx,
		`INSERT INTO equipped_accessories (slime_id, slot, accessory_id)
		 VALUES ($1::uuid, $2, $3)
		 ON CONFLICT (slime_id, slot) DO UPDATE SET accessory_id = EXCLUDED.accessory_id`,
		body.SlimeID, def.Slot, def.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to equip"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"slot":    def.Slot,
	})
}

// GET /api/accessories/all-equipped — get all equipped accessories for all user's slimes
func (h *Handler) GetAllEquippedAccessories(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	rows, err := h.slimeRepo.Pool().Query(ctx,
		`SELECT ea.slime_id::text, ea.slot, ea.accessory_id
		 FROM equipped_accessories ea
		 JOIN slimes s ON s.id = ea.slime_id
		 JOIN users u ON u.id = s.user_id
		 WHERE u.id::text = $1 OR u.provider_id = $1`, userID)
	if err != nil {
		return c.JSON(fiber.Map{"equipped_map": fiber.Map{}})
	}
	defer rows.Close()

	result := make(map[string][]fiber.Map)
	for rows.Next() {
		var slimeID, slot string
		var accID int
		if rows.Scan(&slimeID, &slot, &accID) == nil {
			for _, def := range accessoryDefs {
				if def.ID == accID {
					result[slimeID] = append(result[slimeID], fiber.Map{
						"slot":         slot,
						"accessory_id": accID,
						"name":         def.Name,
						"icon":         def.Icon,
						"svg_overlay":  def.SvgOvl,
					})
					break
				}
			}
		}
	}

	return c.JSON(fiber.Map{"equipped_map": result})
}

// GET /api/slimes/:id/accessories — get equipped accessories for a slime
func (h *Handler) GetSlimeAccessories(c *fiber.Ctx) error {
	slimeID := c.Params("id")
	ctx := c.Context()

	rows, err := h.slimeRepo.Pool().Query(ctx,
		`SELECT slot, accessory_id FROM equipped_accessories WHERE slime_id = $1::uuid`, slimeID)
	if err != nil {
		return c.JSON(fiber.Map{"equipped": []fiber.Map{}})
	}
	defer rows.Close()

	equipped := make([]fiber.Map, 0)
	for rows.Next() {
		var slot string
		var accID int
		if rows.Scan(&slot, &accID) == nil {
			// Find the def
			for _, def := range accessoryDefs {
				if def.ID == accID {
					equipped = append(equipped, fiber.Map{
						"slot":        slot,
						"accessory_id": accID,
						"name":        def.Name,
						"icon":        def.Icon,
						"svg_overlay": def.SvgOvl,
					})
					break
				}
			}
		}
	}

	return c.JSON(fiber.Map{"equipped": equipped})
}
