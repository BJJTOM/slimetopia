package game

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
)

type SeasonShopItem struct {
	ID          int            `json:"id"`
	Name        string         `json:"name"`
	NameEn      string         `json:"name_en"`
	Type        string         `json:"type"`
	Cost        map[string]int `json:"cost"`
	Icon        string         `json:"icon"`
	Description string         `json:"description"`
	SpeciesPool []int          `json:"species_pool"`
}

type Season struct {
	ID               int              `json:"id"`
	Name             string           `json:"name"`
	NameEn           string           `json:"name_en"`
	Start            string           `json:"start"`
	End              string           `json:"end"`
	LimitedSpecies   []int            `json:"limited_species"`
	SpecialShopItems []SeasonShopItem `json:"special_shop_items"`
	BannerColor      string           `json:"banner_color"`
	Description      string           `json:"description"`
}

// GET /api/seasons/active — returns the currently active season, if any
func (h *Handler) GetActiveSeason(c *fiber.Ctx) error {
	ctx := c.Context()

	// Query active season from DB
	gameSeason, err := h.gameDataRepo.GetActiveSeason(ctx)
	if err != nil {
		// No active season found
		return c.JSON(fiber.Map{
			"active": false,
			"season": nil,
		})
	}

	// Parse special_shop_items from JSON
	var shopItems []SeasonShopItem
	if len(gameSeason.SpecialShopItems) > 0 {
		json.Unmarshal(gameSeason.SpecialShopItems, &shopItems)
	}

	// Calculate days left
	now := time.Now()
	end, err := time.Parse("2006-01-02", gameSeason.EndDate)
	if err != nil {
		end = now
	}
	end = end.Add(24*time.Hour - time.Second)
	daysLeft := int(end.Sub(now).Hours()/24) + 1
	if daysLeft < 0 {
		daysLeft = 0
	}

	return c.JSON(fiber.Map{
		"active": true,
		"season": fiber.Map{
			"id":                 gameSeason.ID,
			"name":               gameSeason.Name,
			"name_en":            gameSeason.NameEN,
			"start":              gameSeason.StartDate,
			"end":                gameSeason.EndDate,
			"limited_species":    gameSeason.LimitedSpecies,
			"special_shop_items": shopItems,
			"banner_color":       gameSeason.BannerColor,
			"description":        gameSeason.Description,
			"days_left":          daysLeft,
		},
	})
}
