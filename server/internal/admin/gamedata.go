package admin

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

func getSharedDir() string {
	_, filename, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(filename), "..", "..", "..", "shared")
}

func loadJSON(filename string, target interface{}) error {
	dir := getSharedDir()
	data, err := os.ReadFile(filepath.Join(dir, filename))
	if err != nil {
		// Fallback paths
		fallbacks := []string{
			filepath.Join("shared", filename),
			filepath.Join("..", "shared", filename),
		}
		for _, fb := range fallbacks {
			data, err = os.ReadFile(fb)
			if err == nil {
				break
			}
		}
		if err != nil {
			return err
		}
	}
	return json.Unmarshal(data, target)
}

// --- Species Viewer ---

type SpeciesRow struct {
	ID          int
	Name        string
	NameEN      string
	Element     string
	Grade       string
	Faction     string
	Description string
}

func (h *AdminHandler) SpeciesViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	faction := c.Query("faction")
	element := c.Query("element")
	grade := c.Query("grade")

	where := "WHERE 1=1"
	args := make([]interface{}, 0)
	argIdx := 1

	// Faction filter (direct column query)
	if faction != "" {
		where += " AND faction = $" + strconv.Itoa(argIdx)
		args = append(args, faction)
		argIdx++
	}

	if element != "" {
		where += " AND element = $" + strconv.Itoa(argIdx)
		args = append(args, element)
		argIdx++
	}
	if grade != "" {
		where += " AND grade = $" + strconv.Itoa(argIdx)
		args = append(args, grade)
		argIdx++
	}

	query := "SELECT id, name, COALESCE(name_en, ''), element, grade, COALESCE(faction, ''), COALESCE(description, '') FROM slime_species " + where + " ORDER BY id"
	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return h.render(c, "species.html", fiber.Map{
			"Title": "종족 뷰어", "Username": username, "Error": err.Error(),
			"Faction": "", "Element": "", "Grade": "", "Total": 0,
		})
	}
	defer rows.Close()

	var species []SpeciesRow
	for rows.Next() {
		var s SpeciesRow
		if rows.Scan(&s.ID, &s.Name, &s.NameEN, &s.Element, &s.Grade, &s.Faction, &s.Description) == nil {
			species = append(species, s)
		}
	}

	// Grade stats
	gradeCounts := map[string]int{}
	for _, s := range species {
		gradeCounts[s.Grade]++
	}

	// Element stats
	elementCounts := map[string]int{}
	for _, s := range species {
		elementCounts[s.Element]++
	}

	return h.render(c, "species.html", fiber.Map{
		"Title":         "종족 뷰어",
		"Username":      username,
		"Species":       species,
		"Total":         len(species),
		"Faction":       faction,
		"Element":       element,
		"Grade":         grade,
		"GradeCounts":   gradeCounts,
		"ElementCounts": elementCounts,
	})
}

// --- Recipe Viewer ---

type RecipeJSON struct {
	Recipes []struct {
		ID         int    `json:"id"`
		InputA     int    `json:"input_a"`
		InputB     int    `json:"input_b"`
		Output     int    `json:"output"`
		OutputName string `json:"output_name"`
		Type       string `json:"type"`
		Hint       string `json:"hint"`
		Hidden     bool   `json:"hidden"`
		Catalyst   *struct {
			MaterialID int `json:"material_id"`
		} `json:"catalyst,omitempty"`
	} `json:"recipes"`
}

func (h *AdminHandler) RecipeViewer(c *fiber.Ctx) error {
	username := c.Locals("admin_username").(string)

	var data RecipeJSON
	if err := loadJSON("recipes.json", &data); err != nil {
		return h.render(c, "recipes.html", fiber.Map{
			"Title": "레시피 뷰어", "Username": username, "Error": "Failed to load recipes.json",
		})
	}

	return h.render(c, "recipes.html", fiber.Map{
		"Title":    "레시피 뷰어",
		"Username": username,
		"Recipes":  data.Recipes,
		"Total":    len(data.Recipes),
	})
}

// --- Exploration Viewer ---

type ExplorationJSON struct {
	Explorations []struct {
		ID                 int    `json:"id"`
		Name               string `json:"name"`
		DurationMinutes    int    `json:"duration_minutes"`
		RecommendedElement string `json:"recommended_element"`
		Rewards            struct {
			Gold struct {
				Min int `json:"min"`
				Max int `json:"max"`
			} `json:"gold"`
			Items []string `json:"items"`
		} `json:"rewards"`
		Unlock struct {
			Type  string `json:"type"`
			Value int    `json:"value"`
		} `json:"unlock"`
		MaterialDrops []struct {
			MaterialID int     `json:"material_id"`
			Chance     float64 `json:"chance"`
			MinQty     int     `json:"min_qty"`
			MaxQty     int     `json:"max_qty"`
		} `json:"material_drops"`
	} `json:"explorations"`
}

func (h *AdminHandler) ExplorationViewer(c *fiber.Ctx) error {
	username := c.Locals("admin_username").(string)

	var data ExplorationJSON
	if err := loadJSON("explorations.json", &data); err != nil {
		return h.render(c, "explorations.html", fiber.Map{
			"Title": "탐험 뷰어", "Username": username, "Error": "Failed to load explorations.json",
		})
	}

	return h.render(c, "explorations.html", fiber.Map{
		"Title":        "탐험 뷰어",
		"Username":     username,
		"Explorations": data.Explorations,
		"Total":        len(data.Explorations),
	})
}

// --- Material Viewer ---

type MaterialJSON struct {
	Materials []struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		NameEN      string `json:"name_en"`
		Type        string `json:"type"`
		Rarity      string `json:"rarity"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
	} `json:"materials"`
}

func (h *AdminHandler) MaterialViewer(c *fiber.Ctx) error {
	username := c.Locals("admin_username").(string)

	var data MaterialJSON
	if err := loadJSON("materials.json", &data); err != nil {
		return h.render(c, "materials.html", fiber.Map{
			"Title": "소재 뷰어", "Username": username, "Error": "Failed to load materials.json",
		})
	}

	return h.render(c, "materials.html", fiber.Map{
		"Title":     "소재 뷰어",
		"Username":  username,
		"Materials": data.Materials,
		"Total":     len(data.Materials),
	})
}

// --- Achievement Viewer ---

type AchievementJSON struct {
	Achievements []struct {
		Key         string `json:"key"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Icon        string `json:"icon"`
		RewardGold  int    `json:"reward_gold"`
		RewardGems  int    `json:"reward_gems"`
	} `json:"achievements"`
}

func (h *AdminHandler) AchievementViewer(c *fiber.Ctx) error {
	username := c.Locals("admin_username").(string)

	var data AchievementJSON
	if err := loadJSON("achievements.json", &data); err != nil {
		return h.render(c, "achievements.html", fiber.Map{
			"Title": "업적 뷰어", "Username": username, "Error": "Failed to load achievements.json",
		})
	}

	return h.render(c, "achievements.html", fiber.Map{
		"Title":        "업적 뷰어",
		"Username":     username,
		"Achievements": data.Achievements,
		"Total":        len(data.Achievements),
	})
}

// --- Accessory Viewer ---

type AccessoryJSON struct {
	Accessories []struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		NameEN   string `json:"name_en"`
		Slot     string `json:"slot"`
		Icon     string `json:"icon"`
		CostGold int    `json:"cost_gold"`
		CostGems int    `json:"cost_gems"`
	} `json:"accessories"`
}

func (h *AdminHandler) AccessoryViewer(c *fiber.Ctx) error {
	username := c.Locals("admin_username").(string)

	var data AccessoryJSON
	if err := loadJSON("accessories.json", &data); err != nil {
		return h.render(c, "accessories.html", fiber.Map{
			"Title": "악세서리 뷰어", "Username": username, "Error": "Failed to load accessories.json",
		})
	}

	return h.render(c, "accessories.html", fiber.Map{
		"Title":       "악세서리 뷰어",
		"Username":    username,
		"Accessories": data.Accessories,
		"Total":       len(data.Accessories),
	})
}

// --- Gacha Rate Viewer ---

type GachaRate struct {
	Grade  string
	Rate   float64
	Pity   int
	Detail string
}

func (h *AdminHandler) GachaRateViewer(c *fiber.Ctx) error {
	username := c.Locals("admin_username").(string)

	normalRates := []GachaRate{
		{"common", 50.0, 0, "기본 등급"},
		{"uncommon", 30.0, 0, "약간 희귀"},
		{"rare", 15.0, 0, "희귀"},
		{"epic", 4.0, 0, "에픽"},
		{"legendary", 0.9, 50, "50회 피티"},
		{"mythic", 0.1, 0, "매우 희귀"},
	}
	premiumRates := []GachaRate{
		{"common", 30.0, 0, "기본 등급"},
		{"uncommon", 35.0, 0, "약간 희귀"},
		{"rare", 22.0, 0, "희귀"},
		{"epic", 10.0, 0, "에픽"},
		{"legendary", 2.5, 30, "30회 피티"},
		{"mythic", 0.5, 0, "매우 희귀"},
	}
	legendaryRates := []GachaRate{
		{"rare", 40.0, 0, "최소 레어"},
		{"epic", 35.0, 0, "에픽"},
		{"legendary", 20.0, 20, "20회 피티"},
		{"mythic", 5.0, 0, "미씩"},
	}

	return h.render(c, "gacha.html", fiber.Map{
		"Title":          "가챠 확률표",
		"Username":       username,
		"NormalRates":    normalRates,
		"PremiumRates":   premiumRates,
		"LegendaryRates": legendaryRates,
	})
}
