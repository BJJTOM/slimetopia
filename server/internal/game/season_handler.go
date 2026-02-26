package game

import (
	"encoding/json"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
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

var seasons []Season

func init() {
	loadSeasons()
}

func loadSeasons() {
	paths := []string{
		"../shared/seasons.json",
		"shared/seasons.json",
		"/app/shared/seasons.json",
	}

	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var wrapper struct {
			Seasons []Season `json:"seasons"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			log.Error().Err(err).Msg("Failed to parse seasons.json")
			continue
		}
		seasons = wrapper.Seasons
		log.Info().Int("count", len(seasons)).Msg("Loaded seasons")
		return
	}
	log.Warn().Msg("No seasons.json found, seasons empty")
}

// GET /api/seasons/active — returns the currently active season, if any
func (h *Handler) GetActiveSeason(c *fiber.Ctx) error {
	now := time.Now()

	for _, s := range seasons {
		start, err1 := time.Parse("2006-01-02", s.Start)
		end, err2 := time.Parse("2006-01-02", s.End)
		if err1 != nil || err2 != nil {
			continue
		}
		// Include the full end day
		end = end.Add(24*time.Hour - time.Second)

		if now.After(start) && now.Before(end) {
			daysLeft := int(end.Sub(now).Hours()/24) + 1
			return c.JSON(fiber.Map{
				"active": true,
				"season": fiber.Map{
					"id":                 s.ID,
					"name":               s.Name,
					"name_en":            s.NameEn,
					"start":              s.Start,
					"end":                s.End,
					"limited_species":    s.LimitedSpecies,
					"special_shop_items": s.SpecialShopItems,
					"banner_color":       s.BannerColor,
					"description":        s.Description,
					"days_left":          daysLeft,
				},
			})
		}
	}

	return c.JSON(fiber.Map{
		"active": false,
		"season": nil,
	})
}
