package game

import (
	"context"
	"math/rand"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/slimetopia/server/internal/models"
	"github.com/slimetopia/server/internal/repository"
)

type ShopItemCost struct {
	Gold int64 `json:"gold"`
	Gems int   `json:"gems"`
}

type ShopItem struct {
	ID          int          `json:"id"`
	Name        string       `json:"name"`
	NameEN      string       `json:"name_en"`
	Type        string       `json:"type"`
	Category    string       `json:"category"`
	Cost        ShopItemCost `json:"cost"`
	Icon        string       `json:"icon"`
	Description string       `json:"description"`
	Quantity    int          `json:"quantity,omitempty"`
	EggType     string       `json:"egg_type,omitempty"`
}

func (h *Handler) findShopItem(id int) *ShopItem {
	item, err := h.gameDataRepo.GetShopItemByID(context.Background(), id)
	if err != nil {
		return nil
	}
	return &ShopItem{
		ID: item.ID, Name: item.Name, NameEN: item.NameEN,
		Type: item.Type, Category: item.Category,
		Cost: ShopItemCost{Gold: item.CostGold, Gems: item.CostGems},
		Icon: item.Icon, Description: item.Description,
		Quantity: item.Quantity, EggType: item.EggType,
	}
}

// hatchEggFromDB: weighted random species selection using DB data
func (h *Handler) hatchEggFromDB(ctx context.Context, eggType string, luckBoost ...bool) (speciesID int, element string) {
	hasLuck := len(luckBoost) > 0 && luckBoost[0]
	_ = hasLuck
	allSpecies, err := h.slimeRepo.GetAllSpecies(ctx)
	if err != nil || len(allSpecies) == 0 {
		// Fallback
		return 1, "water"
	}

	// Group by grade
	gradeMap := map[string][]models.SlimeSpecies{}
	for _, sp := range allSpecies {
		gradeMap[sp.Grade] = append(gradeMap[sp.Grade], sp)
	}

	var selectedGrade string
	r := rand.Float64() * 100

	switch eggType {
	case "premium":
		// Premium: rare 60%, epic 30%, legendary 8%, mythic 2%
		if r < 60 {
			selectedGrade = "rare"
		} else if r < 90 {
			selectedGrade = "epic"
		} else if r < 98 {
			selectedGrade = "legendary"
		} else {
			selectedGrade = "mythic"
		}
	case "fire_egg":
		selectedGrade = pickGradeNormal(r)
		// Filter to fire element only
		candidates := filterByElement(gradeMap[selectedGrade], "fire")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "fire")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 2, "fire"
	case "water_egg":
		selectedGrade = pickGradeNormal(r)
		candidates := filterByElement(gradeMap[selectedGrade], "water")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "water")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 1, "water"
	case "grass_egg":
		selectedGrade = pickGradeNormal(r)
		candidates := filterByElement(gradeMap[selectedGrade], "grass")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "grass")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 3, "grass"
	case "dark_egg":
		selectedGrade = pickGradeNormal(r)
		candidates := filterByElement(gradeMap[selectedGrade], "dark")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "dark")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 5, "dark"
	case "ice_egg":
		selectedGrade = pickGradeNormal(r)
		candidates := filterByElement(gradeMap[selectedGrade], "ice")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "ice")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 6, "ice"
	case "electric_egg":
		selectedGrade = pickGradeNormal(r)
		candidates := filterByElement(gradeMap[selectedGrade], "electric")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "electric")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 7, "electric"
	case "earth_egg":
		selectedGrade = pickGradeNormal(r)
		candidates := filterByElement(gradeMap[selectedGrade], "earth")
		if len(candidates) == 0 {
			candidates = filterByElement(allSpecies, "earth")
		}
		if len(candidates) > 0 {
			chosen := candidates[rand.Intn(len(candidates))]
			return chosen.ID, chosen.Element
		}
		return 9, "earth"
	case "legendary_egg":
		// Only epic/legendary/mythic
		if r < 50 {
			selectedGrade = "epic"
		} else if r < 85 {
			selectedGrade = "legendary"
		} else {
			selectedGrade = "mythic"
		}
	default:
		// Normal egg: common 45%, uncommon 30%, rare 15%, epic 7%, legendary 2.5%, mythic 0.5%
		if hasLuck {
			selectedGrade = pickGradeLucky(r)
		} else {
			selectedGrade = pickGradeNormal(r)
		}
	}

	candidates := gradeMap[selectedGrade]
	if len(candidates) == 0 {
		// Fallback to nearest lower grade
		for _, g := range []string{"epic", "rare", "uncommon", "common"} {
			if len(gradeMap[g]) > 0 {
				candidates = gradeMap[g]
				break
			}
		}
	}
	if len(candidates) == 0 {
		return 1, "water"
	}

	chosen := candidates[rand.Intn(len(candidates))]
	return chosen.ID, chosen.Element
}

// hatchEggWithMinGrade: force a minimum grade (for pity system)
func (h *Handler) hatchEggWithMinGrade(ctx context.Context, eggType string, minGrade string) (int, string) {
	allSpecies, err := h.slimeRepo.GetAllSpecies(ctx)
	if err != nil || len(allSpecies) == 0 {
		return 1, "water"
	}

	// Filter to species at or above minGrade
	minRank := gradeRank[minGrade]
	var candidates []models.SlimeSpecies
	for _, sp := range allSpecies {
		if gradeRank[sp.Grade] >= minRank {
			candidates = append(candidates, sp)
		}
	}
	if len(candidates) == 0 {
		return 1, "water"
	}

	// For element eggs, filter further
	switch eggType {
	case "fire_egg":
		candidates = filterByElement(candidates, "fire")
	case "water_egg":
		candidates = filterByElement(candidates, "water")
	case "grass_egg":
		candidates = filterByElement(candidates, "grass")
	case "dark_egg":
		candidates = filterByElement(candidates, "dark")
	case "ice_egg":
		candidates = filterByElement(candidates, "ice")
	case "electric_egg":
		candidates = filterByElement(candidates, "electric")
	case "earth_egg":
		candidates = filterByElement(candidates, "earth")
	}

	if len(candidates) == 0 {
		return 1, "water"
	}
	chosen := candidates[rand.Intn(len(candidates))]
	return chosen.ID, chosen.Element
}

func pickGradeNormal(r float64) string {
	if r < 45 {
		return "common"
	} else if r < 75 {
		return "uncommon"
	} else if r < 90 {
		return "rare"
	} else if r < 97 {
		return "epic"
	} else if r < 99.5 {
		return "legendary"
	}
	return "mythic"
}

// pickGradeLucky: boosted rates - shifts common/uncommon chance to higher grades
func pickGradeLucky(r float64) string {
	// common 25%, uncommon 30%, rare 25%, epic 12%, legendary 6%, mythic 2%
	if r < 25 {
		return "common"
	} else if r < 55 {
		return "uncommon"
	} else if r < 80 {
		return "rare"
	} else if r < 92 {
		return "epic"
	} else if r < 98 {
		return "legendary"
	}
	return "mythic"
}

func filterByElement(species []models.SlimeSpecies, element string) []models.SlimeSpecies {
	var result []models.SlimeSpecies
	for _, sp := range species {
		if sp.Element == element {
			result = append(result, sp)
		}
	}
	return result
}

// GetShopItems returns the shop item list
func (h *Handler) GetShopItems(c *fiber.Ctx) error {
	items, err := h.gameDataRepo.GetAllShopItems(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load shop items"})
	}
	// Convert to ShopItem format for API compatibility
	result := make([]ShopItem, 0, len(items))
	for _, item := range items {
		result = append(result, ShopItem{
			ID: item.ID, Name: item.Name, NameEN: item.NameEN,
			Type: item.Type, Category: item.Category,
			Cost: ShopItemCost{Gold: item.CostGold, Gems: item.CostGems},
			Icon: item.Icon, Description: item.Description,
			Quantity: item.Quantity, EggType: item.EggType,
		})
	}
	return c.JSON(fiber.Map{"items": result})
}

// GetPityStatus returns pity counters for all egg types
func (h *Handler) GetPityStatus(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	rows, err := pool.Query(ctx,
		`SELECT egg_type, pull_count FROM gacha_pity WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return c.JSON(fiber.Map{"pity": fiber.Map{}})
	}
	defer rows.Close()

	pity := fiber.Map{}
	for rows.Next() {
		var eggType string
		var count int
		if rows.Scan(&eggType, &count) == nil {
			pity[eggType] = fiber.Map{
				"count":          count,
				"next_rare":      pityRare,
				"next_epic":      pityEpic,
				"next_legendary": pityLegendary,
			}
		}
	}

	return c.JSON(fiber.Map{"pity": pity})
}

// BuyItem handles POST /api/shop/buy
func (h *Handler) BuyItem(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		ItemID   int    `json:"item_id"`
		SlimeID  string `json:"slime_id"`
		Quantity int    `json:"quantity"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id required"})
	}

	item := h.findShopItem(body.ItemID)
	if item == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "item not found"})
	}

	// Spend currency
	if err := h.userRepo.SpendCurrency(c.Context(), userID, item.Cost.Gold, item.Cost.Gems, 0); err != nil {
		if err == repository.ErrInsufficientFunds {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient funds"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "payment failed"})
	}

	ctx := c.Context()

	// Track mission progress
	h.missionRepo.IncrementProgress(ctx, userID, "buy")

	maxSlimes, _ := h.userRepo.GetCapacity(ctx, userID)
	if maxSlimes <= 0 {
		maxSlimes = 30
	}

	switch item.Type {
	case "egg":
		eggType := getEggType(item.ID)
		luckActive := h.IsBoosterActive(userID, BoosterLuck)
		pool := h.slimeRepo.Pool()

		// Multi-pull: if quantity > 1, batch hatch
		qty := body.Quantity
		if qty > 1 {
			if qty > 18 {
				qty = 18
			}

			// Enforce slime count cap
			currentCount, err := h.slimeRepo.CountByUser(ctx, userID)
			if err != nil {
				h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check slime count"})
			}
			available := maxSlimes - currentCount
			if available <= 0 {
				h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "슬라임 보유 한도에 도달했습니다"})
			}
			if qty > available {
				qty = available
			}

			// Charge additional cost for qty-1 more pulls (first already paid above)
			extraGold := item.Cost.Gold * int64(qty-1)
			extraGems := item.Cost.Gems * (qty - 1)
			if extraGold > 0 || extraGems > 0 {
				if err := h.userRepo.SpendCurrency(ctx, userID, extraGold, extraGems, 0); err != nil {
					// Refund the first pull cost
					h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
					return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient funds for multi-pull"})
				}
			}

			type HatchResult struct {
				Slime   fiber.Map `json:"slime"`
				Species fiber.Map `json:"species"`
			}
			results := make([]HatchResult, 0, qty)
			personalities := []string{
				models.PersonalityEnergetic, models.PersonalityChill,
				models.PersonalityFoodie, models.PersonalityCurious,
				models.PersonalityTsundere, models.PersonalityGentle,
			}
			for i := 0; i < qty; i++ {
				pityCount := IncrementPity(ctx, pool, userID, eggType)
				speciesID, element := h.hatchEggFromDB(ctx, eggType, luckActive)
				species, _ := h.slimeRepo.GetSpecies(ctx, speciesID)
				if species != nil {
					minGrade := ApplyPityGuarantee(pityCount)
					if minGrade != "" && gradeRank[species.Grade] < gradeRank[minGrade] {
						speciesID, element = h.hatchEggWithMinGrade(ctx, eggType, minGrade)
						species, _ = h.slimeRepo.GetSpecies(ctx, speciesID)
					}
				}
				if species != nil && ShouldResetPity(species.Grade) {
					ResetPity(ctx, pool, userID, eggType)
				}
				personality := personalities[rand.Intn(len(personalities))]
				newSlime, err := h.slimeRepo.Create(ctx, userID, speciesID, element, personality)
				if err != nil {
					log.Error().Err(err).Str("user_id", userID).Int("species_id", speciesID).Msg("multi-pull: failed to create slime")
					continue
				}
				h.slimeRepo.AddCodexEntry(ctx, userID, speciesID)
				spMap := fiber.Map{}
				if species != nil {
					spMap = fiber.Map{
						"id": species.ID, "name": species.Name, "name_en": species.NameEN,
						"element": species.Element, "grade": species.Grade, "description": species.Description,
					}
				}
				results = append(results, HatchResult{Slime: slimeToMap(*newSlime), Species: spMap})
			}
			user, _ := h.userRepo.FindByID(ctx, userID)
			LogGameAction(pool, userID, "gacha_multi", "gacha", -(item.Cost.Gold * int64(qty)), -(item.Cost.Gems * qty), 0, map[string]interface{}{
				"egg_type": eggType, "count": len(results),
			})
			return c.JSON(fiber.Map{
				"type": "multi_egg",
				"result": fiber.Map{"results": results, "count": len(results)},
				"user":   fiber.Map{"gold": user.Gold, "gems": user.Gems},
			})
		}

		// Single pull — enforce slime cap
		currentCount, err := h.slimeRepo.CountByUser(ctx, userID)
		if err == nil && currentCount >= maxSlimes {
			h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "슬라임 보유 한도에 도달했습니다"})
		}

		pityCount := IncrementPity(ctx, pool, userID, eggType)
		speciesID, element := h.hatchEggFromDB(ctx, eggType, luckActive)

		// Check pity guarantee — upgrade grade if needed
		species, _ := h.slimeRepo.GetSpecies(ctx, speciesID)
		if species != nil {
			minGrade := ApplyPityGuarantee(pityCount)
			if minGrade != "" && gradeRank[species.Grade] < gradeRank[minGrade] {
				speciesID, element = h.hatchEggWithMinGrade(ctx, eggType, minGrade)
				species, _ = h.slimeRepo.GetSpecies(ctx, speciesID)
			}
		}

		if species != nil && ShouldResetPity(species.Grade) {
			ResetPity(ctx, pool, userID, eggType)
		}

		personalities := []string{
			models.PersonalityEnergetic, models.PersonalityChill,
			models.PersonalityFoodie, models.PersonalityCurious,
			models.PersonalityTsundere, models.PersonalityGentle,
		}
		personality := personalities[rand.Intn(len(personalities))]

		newSlime, err := h.slimeRepo.Create(ctx, userID, speciesID, element, personality)
		if err != nil {
			h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hatch egg"})
		}

		h.slimeRepo.AddCodexEntry(ctx, userID, speciesID)

		user, _ := h.userRepo.FindByID(ctx, userID)
		newPityCount := GetPityCount(ctx, pool, userID, eggType)

		// Log gacha
		gradeName := ""
		if species != nil {
			gradeName = species.Grade
		}
		LogGameAction(pool, userID, "gacha_single", "gacha", -item.Cost.Gold, -item.Cost.Gems, 0, map[string]interface{}{
			"egg_type": eggType, "species_id": speciesID, "grade": gradeName, "personality": personality,
		})

		return c.JSON(fiber.Map{
			"type": "egg",
			"result": fiber.Map{
				"slime":   slimeToMap(*newSlime),
				"species": species,
			},
			"user": fiber.Map{
				"gold": user.Gold,
				"gems": user.Gems,
			},
			"pity": fiber.Map{
				"count":           newPityCount,
				"next_rare":       pityRare,
				"next_epic":       pityEpic,
				"next_legendary":  pityLegendary,
			},
		})

	case "food":
		if body.SlimeID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id required for food"})
		}

		slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
		if err != nil {
			h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
		}
		if uuidToString(slime.UserID) != userID {
			h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
		}

		hungerBonus, affectionBonus, expBonus := getFoodBonuses(item.ID)

		newHunger := clamp(slime.Hunger+hungerBonus, 0, 100)
		newAffection := clamp(slime.Affection+affectionBonus, 0, 100)

		if err := h.slimeRepo.UpdateStats(ctx, body.SlimeID, newAffection, newHunger, slime.Condition); err != nil {
			h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to apply food"})
		}

		// Apply EXP
		newExp := slime.Exp + expBonus
		newLevel, finalExp, leveledUp := checkLevelUp(slime.Level, newExp)
		h.slimeRepo.SetLevelAndExp(ctx, body.SlimeID, newLevel, finalExp)

		user, _ := h.userRepo.FindByID(ctx, userID)

		LogGameAction(h.slimeRepo.Pool(), userID, "shop_buy_food", "shop", -item.Cost.Gold, -item.Cost.Gems, 0, map[string]interface{}{
			"item_id": item.ID, "slime_id": body.SlimeID, "hunger_bonus": hungerBonus, "affection_bonus": affectionBonus, "exp_gained": expBonus,
		})

		return c.JSON(fiber.Map{
			"type": "food",
			"result": fiber.Map{
				"slime_id":   body.SlimeID,
				"affection":  newAffection,
				"hunger":     newHunger,
				"condition":  slime.Condition,
				"exp_gained": expBonus,
				"new_exp":    finalExp,
				"new_level":  newLevel,
				"level_up":   leveledUp,
			},
			"user": fiber.Map{
				"gold": user.Gold,
				"gems": user.Gems,
			},
		})

	case "multi_egg":
		qty := item.Quantity
		if qty <= 0 {
			qty = 10
		}
		eggType := item.EggType
		if eggType == "" {
			eggType = "normal"
		}
		luckActive := h.IsBoosterActive(userID, BoosterLuck)

		// Enforce slime count cap
		currentCount, err := h.slimeRepo.CountByUser(ctx, userID)
		if err == nil {
			available := maxSlimes - currentCount
			if available <= 0 {
				h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "슬라임 보유 한도에 도달했습니다"})
			}
			if qty > available {
				qty = available
			}
		}

		type HatchResult struct {
			Slime   fiber.Map `json:"slime"`
			Species fiber.Map `json:"species"`
		}
		results := make([]HatchResult, 0, qty)

		personalities := []string{
			models.PersonalityEnergetic, models.PersonalityChill,
			models.PersonalityFoodie, models.PersonalityCurious,
			models.PersonalityTsundere, models.PersonalityGentle,
		}

		for i := 0; i < qty; i++ {
			speciesID, element := h.hatchEggFromDB(ctx, eggType, luckActive)
			personality := personalities[rand.Intn(len(personalities))]
			newSlime, err := h.slimeRepo.Create(ctx, userID, speciesID, element, personality)
			if err != nil {
				log.Error().Err(err).Str("user_id", userID).Int("species_id", speciesID).Msg("multi_egg: failed to create slime")
				continue
			}
			h.slimeRepo.AddCodexEntry(ctx, userID, speciesID)
			sp, _ := h.slimeRepo.GetSpecies(ctx, speciesID)

			spMap := fiber.Map{}
			if sp != nil {
				spMap = fiber.Map{
					"id":          sp.ID,
					"name":        sp.Name,
					"name_en":     sp.NameEN,
					"element":     sp.Element,
					"grade":       sp.Grade,
					"description": sp.Description,
				}
			}

			results = append(results, HatchResult{
				Slime:   slimeToMap(*newSlime),
				Species: spMap,
			})
		}

		user, _ := h.userRepo.FindByID(ctx, userID)
		LogGameAction(h.slimeRepo.Pool(), userID, "gacha_multi", "gacha", -item.Cost.Gold, -item.Cost.Gems, 0, map[string]interface{}{
			"egg_type": eggType, "count": len(results),
		})
		return c.JSON(fiber.Map{
			"type": "multi_egg",
			"result": fiber.Map{
				"results": results,
				"count":   len(results),
			},
			"user": fiber.Map{
				"gold": user.Gold,
				"gems": user.Gems,
			},
		})

	case "booster":
		bt := getBoosterTypeForItem(item.ID)
		if bt == "" {
			user, _ := h.userRepo.FindByID(ctx, userID)
			return c.JSON(fiber.Map{
				"type":   "booster",
				"result": fiber.Map{"message": "알 수 없는 부스터입니다"},
				"user":   fiber.Map{"gold": user.Gold, "gems": user.Gems},
			})
		}

		// Check if already active
		if h.IsBoosterActive(userID, bt) {
			// Refund — can't stack
			h.userRepo.AddCurrency(ctx, userID, item.Cost.Gold, item.Cost.Gems, 0)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "booster already active"})
		}

		h.ActivateBooster(userID, bt)
		user, _ := h.userRepo.FindByID(ctx, userID)
		LogGameAction(h.slimeRepo.Pool(), userID, "shop_buy_booster", "shop", -item.Cost.Gold, -item.Cost.Gems, 0, map[string]interface{}{
			"item_id": item.ID, "booster_type": string(bt),
		})
		return c.JSON(fiber.Map{
			"type": "booster",
			"result": fiber.Map{
				"message":           boosterName(bt),
				"booster_type":      string(bt),
				"remaining_seconds": int(boosterDuration.Seconds()),
			},
			"user": fiber.Map{"gold": user.Gold, "gems": user.Gems},
		})

	case "decoration":
		user, _ := h.userRepo.FindByID(ctx, userID)
		LogGameAction(h.slimeRepo.Pool(), userID, "shop_buy_deco", "shop", -item.Cost.Gold, -item.Cost.Gems, 0, map[string]interface{}{
			"item_id": item.ID,
		})
		return c.JSON(fiber.Map{
			"type":   "decoration",
			"result": fiber.Map{"message": "장식이 적용되었습니다!"},
			"user":   fiber.Map{"gold": user.Gold, "gems": user.Gems},
		})
	}

	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown item type"})
}

func getEggType(itemID int) string {
	switch itemID {
	case 2:
		return "premium"
	case 5:
		return "fire_egg"
	case 9:
		return "water_egg"
	case 10:
		return "grass_egg"
	case 20:
		return "dark_egg"
	case 21:
		return "ice_egg"
	case 22:
		return "electric_egg"
	case 23:
		return "earth_egg"
	case 6:
		return "legendary_egg"
	default:
		return "normal"
	}
}

// ─── Capacity Expansion ─────────────────────────────────────────────────────

type capacityTier struct {
	From     int   `json:"from"`
	To       int   `json:"to"`
	GoldCost int64 `json:"gold_cost"`
	GemsCost int   `json:"gems_cost"`
}

var capacityTiers = []capacityTier{
	{From: 30, To: 50, GoldCost: 5000, GemsCost: 0},
	{From: 50, To: 100, GoldCost: 15000, GemsCost: 0},
	{From: 100, To: 200, GoldCost: 50000, GemsCost: 10},
	{From: 200, To: 500, GoldCost: 200000, GemsCost: 50},
	{From: 500, To: 999, GoldCost: 500000, GemsCost: 100},
}

func (h *Handler) ExpandCapacity(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	currentCap, err := h.userRepo.GetCapacity(ctx, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get capacity"})
	}

	// Find the next tier
	var nextTier *capacityTier
	for i := range capacityTiers {
		if capacityTiers[i].From == currentCap {
			nextTier = &capacityTiers[i]
			break
		}
	}
	if nextTier == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "이미 최대 보관함입니다"})
	}

	// Spend currency
	if err := h.userRepo.SpendCurrency(ctx, userID, nextTier.GoldCost, nextTier.GemsCost, 0); err != nil {
		if err == repository.ErrInsufficientFunds {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "재화가 부족합니다"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to spend currency"})
	}

	// Update capacity
	if err := h.userRepo.UpdateCapacity(ctx, userID, nextTier.To); err != nil {
		// Refund on failure
		h.userRepo.AddCurrency(ctx, userID, nextTier.GoldCost, nextTier.GemsCost, 0)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update capacity"})
	}

	user, _ := h.userRepo.FindByID(ctx, userID)

	pool := h.slimeRepo.Pool()
	LogGameAction(pool, userID, "capacity_expand", "shop", -nextTier.GoldCost, -nextTier.GemsCost, 0, map[string]interface{}{
		"from": nextTier.From, "to": nextTier.To,
	})

	return c.JSON(fiber.Map{
		"new_capacity": nextTier.To,
		"user":         fiber.Map{"gold": user.Gold, "gems": user.Gems},
	})
}

func (h *Handler) GetCapacityInfo(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	currentCap, _ := h.userRepo.GetCapacity(ctx, userID)
	slimeCount, _ := h.slimeRepo.CountByUser(ctx, userID)

	var nextTier *capacityTier
	for i := range capacityTiers {
		if capacityTiers[i].From == currentCap {
			nextTier = &capacityTiers[i]
			break
		}
	}

	resp := fiber.Map{
		"current_capacity": currentCap,
		"slime_count":      slimeCount,
		"max_reached":      nextTier == nil,
	}
	if nextTier != nil {
		resp["next_tier"] = nextTier
	}

	return c.JSON(resp)
}

// ─── Currency Shop ──────────────────────────────────────────────────────────

type CurrencyPackage struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "gem", "gold", "stardust"
	Amount   int    `json:"amount"`
	Price    int    `json:"price"` // 0 = free for testing
	Bonus    string `json:"bonus"` // e.g. "+10% 보너스"
	Icon     string `json:"icon"`
}

// Keep old type for backwards compatibility
type GemPackage = CurrencyPackage

var gemPackages = []CurrencyPackage{
	{ID: 1, Name: "보석 주머니", Type: "gem", Amount: 100, Price: 0, Bonus: "", Icon: "💎"},
	{ID: 2, Name: "보석 상자", Type: "gem", Amount: 500, Price: 0, Bonus: "+50 보너스!", Icon: "💎"},
	{ID: 3, Name: "보석 가방", Type: "gem", Amount: 1200, Price: 0, Bonus: "+200 보너스!", Icon: "💎"},
	{ID: 4, Name: "보석 궤짝", Type: "gem", Amount: 3500, Price: 0, Bonus: "+500 보너스!", Icon: "💎"},
	{ID: 5, Name: "보석 금고", Type: "gem", Amount: 10000, Price: 0, Bonus: "+2000 보너스!", Icon: "💎"},
}

var goldPackages = []CurrencyPackage{
	{ID: 11, Name: "골드 주머니", Type: "gold", Amount: 5000, Price: 0, Bonus: "", Icon: "🪙"},
	{ID: 12, Name: "골드 상자", Type: "gold", Amount: 20000, Price: 0, Bonus: "+2000 보너스!", Icon: "🪙"},
	{ID: 13, Name: "골드 가방", Type: "gold", Amount: 50000, Price: 0, Bonus: "+8000 보너스!", Icon: "🪙"},
	{ID: 14, Name: "골드 궤짝", Type: "gold", Amount: 150000, Price: 0, Bonus: "+30000 보너스!", Icon: "🪙"},
	{ID: 15, Name: "골드 금고", Type: "gold", Amount: 500000, Price: 0, Bonus: "+100000 보너스!", Icon: "🪙"},
}

var stardustPackages = []CurrencyPackage{
	{ID: 21, Name: "별가루 한줌", Type: "stardust", Amount: 50, Price: 0, Bonus: "", Icon: "✨"},
	{ID: 22, Name: "별가루 병", Type: "stardust", Amount: 200, Price: 0, Bonus: "+20 보너스!", Icon: "✨"},
	{ID: 23, Name: "별가루 항아리", Type: "stardust", Amount: 500, Price: 0, Bonus: "+80 보너스!", Icon: "✨"},
}

func (h *Handler) GetGemPackages(c *fiber.Ctx) error {
	all := append(append(gemPackages, goldPackages...), stardustPackages...)
	return c.JSON(fiber.Map{"packages": all})
}

func (h *Handler) BuyGems(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		PackageID int `json:"package_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "package_id required"})
	}

	// Search all currency package lists
	allPkgs := append(append(gemPackages, goldPackages...), stardustPackages...)
	var pkg *CurrencyPackage
	for i := range allPkgs {
		if allPkgs[i].ID == body.PackageID {
			pkg = &allPkgs[i]
			break
		}
	}
	if pkg == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "package not found"})
	}

	// Free for testing — add currency based on type
	var addGold int64
	var addGems, addStardust int
	switch pkg.Type {
	case "gem":
		addGems = pkg.Amount
	case "gold":
		addGold = int64(pkg.Amount)
	case "stardust":
		addStardust = pkg.Amount
	default:
		addGems = pkg.Amount
	}

	h.userRepo.AddCurrency(c.Context(), userID, addGold, addGems, addStardust)

	pool := h.slimeRepo.Pool()
	LogGameAction(pool, userID, "buy_currency", "shop", addGold, addGems, addStardust, map[string]interface{}{
		"package_id": pkg.ID, "type": pkg.Type, "amount": pkg.Amount,
	})

	user, _ := h.userRepo.FindByID(c.Context(), userID)
	return c.JSON(fiber.Map{
		"amount_added": pkg.Amount,
		"type":         pkg.Type,
		"user":         fiber.Map{"gold": user.Gold, "gems": user.Gems, "stardust": user.Stardust},
	})
}

// ─── Food Bonuses Helper ────────────────────────────────────────────────────

func getFoodBonuses(itemID int) (hunger, affection, exp int) {
	switch itemID {
	case 3: // 맛있는 먹이
		return 50, 5, 3
	case 4: // 고급 먹이
		return 100, 10, 8
	case 7: // 슈퍼 먹이
		return 100, 20, 15
	case 8: // 원소강화 먹이
		return 80, 15, 10
	default:
		return 50, 5, 3
	}
}

// ─── Food Inventory ────────────────────────────────────────────────────────

func (h *Handler) GetFoodInventory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()

	rows, err := pool.Query(c.Context(),
		`SELECT item_id, quantity FROM food_inventory WHERE user_id = $1 AND quantity > 0`, userID)
	if err != nil {
		return c.JSON(fiber.Map{"items": []fiber.Map{}})
	}
	defer rows.Close()

	type FoodEntry struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}
	items := []FoodEntry{}
	for rows.Next() {
		var e FoodEntry
		if rows.Scan(&e.ItemID, &e.Quantity) == nil {
			items = append(items, e)
		}
	}

	return c.JSON(fiber.Map{"items": items})
}

func (h *Handler) BuyFoodToInventory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id and quantity required"})
	}
	if body.Quantity <= 0 || body.Quantity > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity must be 1-100"})
	}

	item := h.findShopItem(body.ItemID)
	if item == nil || item.Type != "food" {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "food item not found"})
	}

	// Calculate total cost
	totalGold := item.Cost.Gold * int64(body.Quantity)
	totalGems := item.Cost.Gems * body.Quantity

	if err := h.userRepo.SpendCurrency(c.Context(), userID, totalGold, totalGems, 0); err != nil {
		if err == repository.ErrInsufficientFunds {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient funds"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "payment failed"})
	}

	pool := h.slimeRepo.Pool()
	pool.Exec(c.Context(),
		`INSERT INTO food_inventory (user_id, item_id, quantity) VALUES ($1, $2, $3)
		 ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = food_inventory.quantity + $3`,
		userID, body.ItemID, body.Quantity)

	LogGameAction(pool, userID, "buy_food_inv", "shop", -totalGold, -totalGems, 0, map[string]interface{}{
		"item_id": body.ItemID, "quantity": body.Quantity,
	})

	user, _ := h.userRepo.FindByID(c.Context(), userID)
	return c.JSON(fiber.Map{
		"item_id":  body.ItemID,
		"quantity": body.Quantity,
		"user":     fiber.Map{"gold": user.Gold, "gems": user.Gems},
	})
}

func (h *Handler) ApplyFood(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		ItemID  int    `json:"item_id"`
		SlimeID string `json:"slime_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id and slime_id required"})
	}

	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Check inventory
	var qty int
	err := pool.QueryRow(ctx,
		`SELECT quantity FROM food_inventory WHERE user_id = $1 AND item_id = $2`,
		userID, body.ItemID).Scan(&qty)
	if err != nil || qty <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "먹이가 없습니다"})
	}

	// Get slime
	slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// Apply food effects
	hungerBonus, affectionBonus, expBonus := getFoodBonuses(body.ItemID)

	newHunger := clamp(slime.Hunger+hungerBonus, 0, 100)
	newAffection := clamp(slime.Affection+affectionBonus, 0, 100)

	if err := h.slimeRepo.UpdateStats(ctx, body.SlimeID, newAffection, newHunger, slime.Condition); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to apply food"})
	}

	// Apply EXP
	newExp := slime.Exp + expBonus
	newLevel, finalExp, leveledUp := checkLevelUp(slime.Level, newExp)
	if err := h.slimeRepo.SetLevelAndExp(ctx, body.SlimeID, newLevel, finalExp); err != nil {
		log.Error().Err(err).Str("slime_id", body.SlimeID).Msg("failed to set level/exp after food")
	}

	// Decrement inventory
	pool.Exec(ctx,
		`UPDATE food_inventory SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2`,
		userID, body.ItemID)

	LogGameAction(pool, userID, "apply_food", "item", 0, 0, 0, map[string]interface{}{
		"item_id": body.ItemID, "slime_id": body.SlimeID, "exp_gained": expBonus,
	})

	return c.JSON(fiber.Map{
		"slime_id":   body.SlimeID,
		"affection":  newAffection,
		"hunger":     newHunger,
		"condition":  slime.Condition,
		"remaining":  qty - 1,
		"exp_gained": expBonus,
		"new_exp":    finalExp,
		"new_level":  newLevel,
		"level_up":   leveledUp,
	})
}

func (h *Handler) ApplyFoodBatch(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		ItemID   int    `json:"item_id"`
		SlimeID  string `json:"slime_id"`
		Quantity int    `json:"quantity"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id, slime_id, quantity required"})
	}
	if body.Quantity <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "quantity must be > 0"})
	}

	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Check inventory
	var qty int
	err := pool.QueryRow(ctx,
		`SELECT quantity FROM food_inventory WHERE user_id = $1 AND item_id = $2`,
		userID, body.ItemID).Scan(&qty)
	if err != nil || qty <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "먹이가 없습니다"})
	}

	// Clamp quantity to available stock
	useQty := body.Quantity
	if useQty > qty {
		useQty = qty
	}

	// Get slime
	slime, err := h.slimeRepo.FindByID(ctx, body.SlimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// Apply food effects × quantity
	hungerBonus, affectionBonus, expPerUnit := getFoodBonuses(body.ItemID)

	newHunger := clamp(slime.Hunger+hungerBonus*useQty, 0, 100)
	newAffection := clamp(slime.Affection+affectionBonus*useQty, 0, 100)

	if err := h.slimeRepo.UpdateStats(ctx, body.SlimeID, newAffection, newHunger, slime.Condition); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to apply food"})
	}

	// Apply EXP
	totalExp := expPerUnit * useQty
	newExp := slime.Exp + totalExp
	newLevel, finalExp, leveledUp := checkLevelUp(slime.Level, newExp)
	if err := h.slimeRepo.SetLevelAndExp(ctx, body.SlimeID, newLevel, finalExp); err != nil {
		log.Error().Err(err).Str("slime_id", body.SlimeID).Msg("failed to set level/exp after food batch")
	}

	// Decrement inventory
	pool.Exec(ctx,
		`UPDATE food_inventory SET quantity = quantity - $3 WHERE user_id = $1 AND item_id = $2`,
		userID, body.ItemID, useQty)

	LogGameAction(pool, userID, "apply_food_batch", "item", 0, 0, 0, map[string]interface{}{
		"item_id": body.ItemID, "slime_id": body.SlimeID, "quantity": useQty, "exp_gained": totalExp,
	})

	return c.JSON(fiber.Map{
		"slime_id":   body.SlimeID,
		"affection":  newAffection,
		"hunger":     newHunger,
		"condition":  slime.Condition,
		"remaining":  qty - useQty,
		"exp_gained": totalExp,
		"new_exp":    finalExp,
		"new_level":  newLevel,
		"level_up":   leveledUp,
	})
}

// ApplyFoodToAll feeds all hungry slimes at once using inventory food
func (h *Handler) ApplyFoodToAll(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		ItemID int `json:"item_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "item_id required"})
	}

	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Check inventory
	var qty int
	err := pool.QueryRow(ctx,
		`SELECT quantity FROM food_inventory WHERE user_id = $1 AND item_id = $2`,
		userID, body.ItemID).Scan(&qty)
	if err != nil || qty <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "먹이가 없습니다"})
	}

	// Get all slimes
	slimes, err := h.slimeRepo.FindByUser(ctx, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load slimes"})
	}

	// Filter hungry slimes (hunger < 80)
	type hungrySlime struct {
		idx int
		s   *models.Slime
	}
	var hungry []hungrySlime
	for i := range slimes {
		if slimes[i].Hunger < 80 {
			hungry = append(hungry, hungrySlime{idx: i, s: &slimes[i]})
		}
	}

	if len(hungry) == 0 {
		return c.JSON(fiber.Map{"results": []fiber.Map{}, "fed_count": 0, "used": 0})
	}

	// Use min(hungry count, inventory) food items
	useCount := len(hungry)
	if useCount > qty {
		useCount = qty
	}

	hungerBonus, affectionBonus, expPerUnit := getFoodBonuses(body.ItemID)

	type feedResult struct {
		SlimeID   string `json:"slime_id"`
		Affection int    `json:"affection"`
		Hunger    int    `json:"hunger"`
		Condition int    `json:"condition"`
		ExpGained int    `json:"exp_gained"`
		NewExp    int    `json:"new_exp"`
		NewLevel  int    `json:"new_level"`
		LevelUp   bool   `json:"level_up"`
	}

	results := make([]feedResult, 0, useCount)
	for i := 0; i < useCount; i++ {
		s := hungry[i].s
		sid := uuidToString(s.ID)

		newHunger := clamp(s.Hunger+hungerBonus, 0, 100)
		newAffection := clamp(s.Affection+affectionBonus, 0, 100)

		if err := h.slimeRepo.UpdateStats(ctx, sid, newAffection, newHunger, s.Condition); err != nil {
			log.Error().Err(err).Str("slime_id", sid).Msg("apply-all: failed to update stats")
			continue
		}

		newExp := s.Exp + expPerUnit
		newLevel, finalExp, leveledUp := checkLevelUp(s.Level, newExp)
		if err := h.slimeRepo.SetLevelAndExp(ctx, sid, newLevel, finalExp); err != nil {
			log.Error().Err(err).Str("slime_id", sid).Msg("apply-all: failed to set level/exp")
		}

		results = append(results, feedResult{
			SlimeID:   sid,
			Affection: newAffection,
			Hunger:    newHunger,
			Condition: s.Condition,
			ExpGained: expPerUnit,
			NewExp:    finalExp,
			NewLevel:  newLevel,
			LevelUp:   leveledUp,
		})
	}

	// Decrement inventory
	pool.Exec(ctx,
		`UPDATE food_inventory SET quantity = quantity - $3 WHERE user_id = $1 AND item_id = $2`,
		userID, body.ItemID, len(results))

	LogGameAction(pool, userID, "apply_food_all", "item", 0, 0, 0, map[string]interface{}{
		"item_id": body.ItemID, "fed_count": len(results),
	})

	return c.JSON(fiber.Map{
		"results":   results,
		"fed_count": len(results),
		"used":      len(results),
		"remaining": qty - len(results),
	})
}
