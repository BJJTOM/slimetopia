package admin

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/slimetopia/server/internal/repository"
)

// ===== Helpers =====

func parseIntSlice(s string) []int {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	result := make([]int, 0, len(parts))
	for _, p := range parts {
		if v, err := strconv.Atoi(strings.TrimSpace(p)); err == nil {
			result = append(result, v)
		}
	}
	return result
}

func ensureJSON(s string) json.RawMessage {
	s = strings.TrimSpace(s)
	if s == "" || s == "null" {
		return json.RawMessage("{}")
	}
	return json.RawMessage(s)
}

func ensureJSONArray(s string) json.RawMessage {
	s = strings.TrimSpace(s)
	if s == "" || s == "null" {
		return json.RawMessage("[]")
	}
	return json.RawMessage(s)
}

// ===== Species Viewer (direct DB query, no game_* table) =====

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

	gradeCounts := map[string]int{}
	elementCounts := map[string]int{}
	for _, s := range species {
		gradeCounts[s.Grade]++
		elementCounts[s.Element]++
	}

	return h.render(c, "species.html", fiber.Map{
		"Title": "종족 뷰어", "Username": username,
		"Species": species, "Total": len(species),
		"Faction": faction, "Element": element, "Grade": grade,
		"GradeCounts": gradeCounts, "ElementCounts": elementCounts,
	})
}

// ===== Recipes CRUD =====

func (h *AdminHandler) RecipeViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	recipes, err := h.gameDataRepo.GetAllRecipesIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "recipes.html", fiber.Map{
			"Title": "레시피 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "레시피 관리", "Username": username,
		"Recipes": recipes, "Total": len(recipes), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, r := range recipes {
			if r.ID == id {
				data["EditItem"] = r
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "recipes.html", data)
}

func (h *AdminHandler) RecipeCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	inputA, _ := strconv.Atoi(c.FormValue("input_a"))
	inputB, _ := strconv.Atoi(c.FormValue("input_b"))
	output, _ := strconv.Atoi(c.FormValue("output"))
	rec := &repository.GameRecipe{
		ID: id, InputA: inputA, InputB: inputB, Output: output,
		OutputName: c.FormValue("output_name"),
		Type: c.FormValue("type"), Hint: c.FormValue("hint"),
		Hidden: c.FormValue("hidden") == "on", IsActive: true,
	}
	if err := h.gameDataRepo.CreateRecipe(ctx, rec); err != nil {
		return c.Redirect("/admin/gamedata/recipes?msg=error")
	}
	return c.Redirect("/admin/gamedata/recipes?msg=created")
}

func (h *AdminHandler) RecipeUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	inputA, _ := strconv.Atoi(c.FormValue("input_a"))
	inputB, _ := strconv.Atoi(c.FormValue("input_b"))
	output, _ := strconv.Atoi(c.FormValue("output"))
	rec := &repository.GameRecipe{
		ID: id, InputA: inputA, InputB: inputB, Output: output,
		OutputName: c.FormValue("output_name"),
		Type: c.FormValue("type"), Hint: c.FormValue("hint"),
		Hidden: c.FormValue("hidden") == "on",
		IsActive: c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateRecipe(ctx, rec); err != nil {
		return c.Redirect("/admin/gamedata/recipes?msg=error")
	}
	return c.Redirect("/admin/gamedata/recipes?msg=updated")
}

func (h *AdminHandler) RecipeDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteRecipe(ctx, id)
	return c.Redirect("/admin/gamedata/recipes?msg=deleted")
}

// ===== Materials CRUD =====

func (h *AdminHandler) MaterialViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	materials, err := h.gameDataRepo.GetAllMaterialsIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "materials.html", fiber.Map{
			"Title": "소재 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "소재 관리", "Username": username,
		"Materials": materials, "Total": len(materials), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, m := range materials {
			if m.ID == id {
				data["EditItem"] = m
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "materials.html", data)
}

func (h *AdminHandler) MaterialCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	m := &repository.GameMaterial{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Type: c.FormValue("type"), Rarity: c.FormValue("rarity"),
		Icon: c.FormValue("icon"), Description: c.FormValue("description"),
		Effects: ensureJSON(c.FormValue("effects")), IsActive: true,
	}
	if err := h.gameDataRepo.CreateMaterial(ctx, m); err != nil {
		return c.Redirect("/admin/gamedata/materials?msg=error")
	}
	return c.Redirect("/admin/gamedata/materials?msg=created")
}

func (h *AdminHandler) MaterialUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	m := &repository.GameMaterial{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Type: c.FormValue("type"), Rarity: c.FormValue("rarity"),
		Icon: c.FormValue("icon"), Description: c.FormValue("description"),
		Effects:  ensureJSON(c.FormValue("effects")),
		IsActive: c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateMaterial(ctx, m); err != nil {
		return c.Redirect("/admin/gamedata/materials?msg=error")
	}
	return c.Redirect("/admin/gamedata/materials?msg=updated")
}

func (h *AdminHandler) MaterialDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteMaterial(ctx, id)
	return c.Redirect("/admin/gamedata/materials?msg=deleted")
}

// ===== Explorations CRUD =====

func (h *AdminHandler) ExplorationViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	explorations, err := h.gameDataRepo.GetAllDestinationsIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "explorations.html", fiber.Map{
			"Title": "탐험 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "탐험 관리", "Username": username,
		"Explorations": explorations, "Total": len(explorations), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, e := range explorations {
			if e.ID == id {
				data["EditItem"] = e
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "explorations.html", data)
}

func (h *AdminHandler) ExplorationCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	dur, _ := strconv.Atoi(c.FormValue("duration_minutes"))
	uv, _ := strconv.Atoi(c.FormValue("unlock_value"))
	so, _ := strconv.Atoi(c.FormValue("sort_order"))
	e := &repository.GameExploration{
		ID: id, Name: c.FormValue("name"), DurationMinutes: dur,
		RecommendedElement: c.FormValue("recommended_element"),
		Rewards: ensureJSON(c.FormValue("rewards")),
		UnlockType: c.FormValue("unlock_type"), UnlockValue: uv,
		MaterialDrops: ensureJSONArray(c.FormValue("material_drops")),
		IsActive: true, SortOrder: so,
	}
	if err := h.gameDataRepo.CreateExploration(ctx, e); err != nil {
		return c.Redirect("/admin/gamedata/explorations?msg=error")
	}
	return c.Redirect("/admin/gamedata/explorations?msg=created")
}

func (h *AdminHandler) ExplorationUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	dur, _ := strconv.Atoi(c.FormValue("duration_minutes"))
	uv, _ := strconv.Atoi(c.FormValue("unlock_value"))
	so, _ := strconv.Atoi(c.FormValue("sort_order"))
	e := &repository.GameExploration{
		ID: id, Name: c.FormValue("name"), DurationMinutes: dur,
		RecommendedElement: c.FormValue("recommended_element"),
		Rewards: ensureJSON(c.FormValue("rewards")),
		UnlockType: c.FormValue("unlock_type"), UnlockValue: uv,
		MaterialDrops: ensureJSONArray(c.FormValue("material_drops")),
		IsActive: c.FormValue("is_active") == "on", SortOrder: so,
	}
	if err := h.gameDataRepo.UpdateExploration(ctx, e); err != nil {
		return c.Redirect("/admin/gamedata/explorations?msg=error")
	}
	return c.Redirect("/admin/gamedata/explorations?msg=updated")
}

func (h *AdminHandler) ExplorationDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteExploration(ctx, id)
	return c.Redirect("/admin/gamedata/explorations?msg=deleted")
}

// ===== Achievements CRUD =====

func (h *AdminHandler) AchievementViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	achievements, err := h.gameDataRepo.GetAllAchievementsIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "achievements.html", fiber.Map{
			"Title": "업적 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "업적 관리", "Username": username,
		"Achievements": achievements, "Total": len(achievements), "Message": msg,
	}

	if editKey := c.Query("edit"); editKey != "" {
		for _, a := range achievements {
			if a.Key == editKey {
				data["EditItem"] = a
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "achievements.html", data)
}

func (h *AdminHandler) AchievementCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	rg, _ := strconv.Atoi(c.FormValue("reward_gold"))
	rgems, _ := strconv.Atoi(c.FormValue("reward_gems"))
	so, _ := strconv.Atoi(c.FormValue("sort_order"))
	a := &repository.GameAchievement{
		Key: c.FormValue("key"), Name: c.FormValue("name"),
		Description: c.FormValue("description"), Icon: c.FormValue("icon"),
		RewardGold: rg, RewardGems: rgems, IsActive: true, SortOrder: so,
	}
	if err := h.gameDataRepo.CreateAchievement(ctx, a); err != nil {
		return c.Redirect("/admin/gamedata/achievements?msg=error")
	}
	return c.Redirect("/admin/gamedata/achievements?msg=created")
}

func (h *AdminHandler) AchievementUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	key := c.Params("id") // using key as route param
	rg, _ := strconv.Atoi(c.FormValue("reward_gold"))
	rgems, _ := strconv.Atoi(c.FormValue("reward_gems"))
	so, _ := strconv.Atoi(c.FormValue("sort_order"))
	a := &repository.GameAchievement{
		Key: key, Name: c.FormValue("name"),
		Description: c.FormValue("description"), Icon: c.FormValue("icon"),
		RewardGold: rg, RewardGems: rgems,
		IsActive: c.FormValue("is_active") == "on", SortOrder: so,
	}
	if err := h.gameDataRepo.UpdateAchievement(ctx, a); err != nil {
		return c.Redirect("/admin/gamedata/achievements?msg=error")
	}
	return c.Redirect("/admin/gamedata/achievements?msg=updated")
}

func (h *AdminHandler) AchievementDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	key := c.Params("id")
	h.gameDataRepo.DeleteAchievement(ctx, key)
	return c.Redirect("/admin/gamedata/achievements?msg=deleted")
}

// ===== Accessories CRUD =====

func (h *AdminHandler) AccessoryViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	accessories, err := h.gameDataRepo.GetAllAccessoriesIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "accessories.html", fiber.Map{
			"Title": "악세서리 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "악세서리 관리", "Username": username,
		"Accessories": accessories, "Total": len(accessories), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, a := range accessories {
			if a.ID == id {
				data["EditItem"] = a
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "accessories.html", data)
}

func (h *AdminHandler) AccessoryCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	cg, _ := strconv.Atoi(c.FormValue("cost_gold"))
	cgems, _ := strconv.Atoi(c.FormValue("cost_gems"))
	a := &repository.GameAccessory{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Slot: c.FormValue("slot"), Icon: c.FormValue("icon"),
		CostGold: cg, CostGems: cgems,
		SvgOverlay: c.FormValue("svg_overlay"), IsActive: true,
	}
	if err := h.gameDataRepo.CreateAccessory(ctx, a); err != nil {
		return c.Redirect("/admin/gamedata/accessories?msg=error")
	}
	return c.Redirect("/admin/gamedata/accessories?msg=created")
}

func (h *AdminHandler) AccessoryUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	cg, _ := strconv.Atoi(c.FormValue("cost_gold"))
	cgems, _ := strconv.Atoi(c.FormValue("cost_gems"))
	a := &repository.GameAccessory{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Slot: c.FormValue("slot"), Icon: c.FormValue("icon"),
		CostGold: cg, CostGems: cgems,
		SvgOverlay: c.FormValue("svg_overlay"),
		IsActive:   c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateAccessory(ctx, a); err != nil {
		return c.Redirect("/admin/gamedata/accessories?msg=error")
	}
	return c.Redirect("/admin/gamedata/accessories?msg=updated")
}

func (h *AdminHandler) AccessoryDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteAccessory(ctx, id)
	return c.Redirect("/admin/gamedata/accessories?msg=deleted")
}

// ===== Missions CRUD =====

func (h *AdminHandler) MissionViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	missions, err := h.gameDataRepo.GetAllMissionsIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "missions.html", fiber.Map{
			"Title": "미션 관리", "Username": username, "Error": err.Error(),
		})
	}

	attendance, _ := h.gameDataRepo.GetAttendanceRewards(ctx)

	data := fiber.Map{
		"Title": "미션 관리", "Username": username,
		"Missions": missions, "Total": len(missions),
		"Attendance": attendance, "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, m := range missions {
			if m.ID == id {
				data["EditItem"] = m
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "missions.html", data)
}

func (h *AdminHandler) MissionCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	target, _ := strconv.Atoi(c.FormValue("target"))
	rg, _ := strconv.ParseInt(c.FormValue("reward_gold"), 10, 64)
	rgems, _ := strconv.Atoi(c.FormValue("reward_gems"))
	m := &repository.GameMission{
		ID: id, Name: c.FormValue("name"), Description: c.FormValue("description"),
		Action: c.FormValue("action"), Target: target,
		RewardGold: rg, RewardGems: rgems, IsActive: true,
	}
	if err := h.gameDataRepo.CreateMission(ctx, m); err != nil {
		return c.Redirect("/admin/gamedata/missions?msg=error")
	}
	return c.Redirect("/admin/gamedata/missions?msg=created")
}

func (h *AdminHandler) MissionUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	target, _ := strconv.Atoi(c.FormValue("target"))
	rg, _ := strconv.ParseInt(c.FormValue("reward_gold"), 10, 64)
	rgems, _ := strconv.Atoi(c.FormValue("reward_gems"))
	m := &repository.GameMission{
		ID: id, Name: c.FormValue("name"), Description: c.FormValue("description"),
		Action: c.FormValue("action"), Target: target,
		RewardGold: rg, RewardGems: rgems,
		IsActive: c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateMission(ctx, m); err != nil {
		return c.Redirect("/admin/gamedata/missions?msg=error")
	}
	return c.Redirect("/admin/gamedata/missions?msg=updated")
}

func (h *AdminHandler) MissionDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteMission(ctx, id)
	return c.Redirect("/admin/gamedata/missions?msg=deleted")
}

// ===== Seasons CRUD =====

func (h *AdminHandler) SeasonViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	seasons, err := h.gameDataRepo.GetAllSeasons(ctx)
	if err != nil {
		return h.render(c, "seasons.html", fiber.Map{
			"Title": "시즌 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "시즌 관리", "Username": username,
		"Seasons": seasons, "Total": len(seasons), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, s := range seasons {
			if s.ID == id {
				data["EditItem"] = s
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "seasons.html", data)
}

func (h *AdminHandler) SeasonCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	s := &repository.GameSeason{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		StartDate: c.FormValue("start_date"), EndDate: c.FormValue("end_date"),
		LimitedSpecies:   parseIntSlice(c.FormValue("limited_species")),
		SpecialShopItems: ensureJSONArray(c.FormValue("special_shop_items")),
		BannerColor:      c.FormValue("banner_color"),
		Description:      c.FormValue("description"),
		Buffs:            ensureJSON(c.FormValue("buffs")),
		IsActive:         true,
	}
	if err := h.gameDataRepo.CreateSeason(ctx, s); err != nil {
		return c.Redirect("/admin/gamedata/seasons?msg=error")
	}
	return c.Redirect("/admin/gamedata/seasons?msg=created")
}

func (h *AdminHandler) SeasonUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	s := &repository.GameSeason{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		StartDate: c.FormValue("start_date"), EndDate: c.FormValue("end_date"),
		LimitedSpecies:   parseIntSlice(c.FormValue("limited_species")),
		SpecialShopItems: ensureJSONArray(c.FormValue("special_shop_items")),
		BannerColor:      c.FormValue("banner_color"),
		Description:      c.FormValue("description"),
		Buffs:            ensureJSON(c.FormValue("buffs")),
		IsActive:         c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateSeason(ctx, s); err != nil {
		return c.Redirect("/admin/gamedata/seasons?msg=error")
	}
	return c.Redirect("/admin/gamedata/seasons?msg=updated")
}

func (h *AdminHandler) SeasonDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteSeason(ctx, id)
	return c.Redirect("/admin/gamedata/seasons?msg=deleted")
}

// ===== Sets CRUD =====

func (h *AdminHandler) SetViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	sets, err := h.gameDataRepo.GetAllSetsIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "sets.html", fiber.Map{
			"Title": "세트 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "세트 관리", "Username": username,
		"Sets": sets, "Total": len(sets), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, s := range sets {
			if s.ID == id {
				data["EditItem"] = s
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "sets.html", data)
}

func (h *AdminHandler) SetCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	bs, _ := strconv.Atoi(c.FormValue("bonus_score"))
	bv, _ := strconv.ParseFloat(c.FormValue("buff_value"), 64)
	s := &repository.GameSlimeSet{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Description: c.FormValue("description"),
		SpeciesIDs:  parseIntSlice(c.FormValue("species_ids")),
		BonusScore:  bs, BuffType: c.FormValue("buff_type"),
		BuffValue: bv, BuffLabel: c.FormValue("buff_label"),
		IsActive: true,
	}
	if err := h.gameDataRepo.CreateSet(ctx, s); err != nil {
		return c.Redirect("/admin/gamedata/sets?msg=error")
	}
	return c.Redirect("/admin/gamedata/sets?msg=created")
}

func (h *AdminHandler) SetUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	bs, _ := strconv.Atoi(c.FormValue("bonus_score"))
	bv, _ := strconv.ParseFloat(c.FormValue("buff_value"), 64)
	s := &repository.GameSlimeSet{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Description: c.FormValue("description"),
		SpeciesIDs:  parseIntSlice(c.FormValue("species_ids")),
		BonusScore:  bs, BuffType: c.FormValue("buff_type"),
		BuffValue: bv, BuffLabel: c.FormValue("buff_label"),
		IsActive: c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateSet(ctx, s); err != nil {
		return c.Redirect("/admin/gamedata/sets?msg=error")
	}
	return c.Redirect("/admin/gamedata/sets?msg=updated")
}

func (h *AdminHandler) SetDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteSet(ctx, id)
	return c.Redirect("/admin/gamedata/sets?msg=deleted")
}

// ===== Mutations CRUD =====

func (h *AdminHandler) MutationViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	mutations, err := h.gameDataRepo.GetAllMutationRecipesIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "mutations.html", fiber.Map{
			"Title": "돌연변이 관리", "Username": username, "Error": err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "돌연변이 관리", "Username": username,
		"Mutations": mutations, "Total": len(mutations), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, m := range mutations {
			if m.ID == id {
				data["EditItem"] = m
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "mutations.html", data)
}

func (h *AdminHandler) MutationCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	rm, _ := strconv.Atoi(c.FormValue("required_material"))
	rs, _ := strconv.Atoi(c.FormValue("result_species_id"))
	mcs, _ := strconv.Atoi(c.FormValue("min_collection_score"))
	m := &repository.GameMutationRecipe{
		RequiredElementA: c.FormValue("required_element_a"),
		RequiredElementB: c.FormValue("required_element_b"),
		RequiredMaterial: rm, ResultSpeciesID: rs,
		MinCollectionScore: mcs, IsActive: true,
	}
	if err := h.gameDataRepo.CreateMutationRecipe(ctx, m); err != nil {
		return c.Redirect("/admin/gamedata/mutations?msg=error")
	}
	return c.Redirect("/admin/gamedata/mutations?msg=created")
}

func (h *AdminHandler) MutationUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	rm, _ := strconv.Atoi(c.FormValue("required_material"))
	rs, _ := strconv.Atoi(c.FormValue("result_species_id"))
	mcs, _ := strconv.Atoi(c.FormValue("min_collection_score"))
	m := &repository.GameMutationRecipe{
		ID:               id,
		RequiredElementA: c.FormValue("required_element_a"),
		RequiredElementB: c.FormValue("required_element_b"),
		RequiredMaterial: rm, ResultSpeciesID: rs,
		MinCollectionScore: mcs,
		IsActive:           c.FormValue("is_active") == "on",
	}
	if err := h.gameDataRepo.UpdateMutationRecipe(ctx, m); err != nil {
		return c.Redirect("/admin/gamedata/mutations?msg=error")
	}
	return c.Redirect("/admin/gamedata/mutations?msg=updated")
}

func (h *AdminHandler) MutationDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteMutationRecipe(ctx, id)
	return c.Redirect("/admin/gamedata/mutations?msg=deleted")
}

// ===== Evolutions CRUD =====

func (h *AdminHandler) EvolutionViewer(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	speciesIDs, err := h.gameDataRepo.GetAllEvolutionSpecies(ctx)
	if err != nil {
		return h.render(c, "evolutions.html", fiber.Map{
			"Title": "진화트리 관리", "Username": username, "Error": err.Error(),
		})
	}

	// Get species names for display
	type EvolutionSpecies struct {
		ID   int
		Name string
	}
	species := make([]EvolutionSpecies, 0, len(speciesIDs))
	for _, sid := range speciesIDs {
		var name string
		err := h.pool.QueryRow(ctx, "SELECT name FROM slime_species WHERE id=$1", sid).Scan(&name)
		if err != nil {
			name = "Unknown"
		}
		species = append(species, EvolutionSpecies{ID: sid, Name: name})
	}

	return h.render(c, "evolutions.html", fiber.Map{
		"Title": "진화트리 관리", "Username": username,
		"Species": species, "Total": len(species), "Message": msg,
	})
}

func (h *AdminHandler) EvolutionDetail(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")
	speciesID, _ := strconv.Atoi(c.Params("species_id"))

	nodes, err := h.gameDataRepo.GetEvolutionTree(ctx, speciesID)
	if err != nil {
		return h.render(c, "evolution_detail.html", fiber.Map{
			"Title": "진화트리 상세", "Username": username, "Error": err.Error(),
			"SpeciesID": speciesID,
		})
	}

	var speciesName string
	h.pool.QueryRow(ctx, "SELECT name FROM slime_species WHERE id=$1", speciesID).Scan(&speciesName)

	data := fiber.Map{
		"Title": speciesName + " 진화트리", "Username": username,
		"Nodes": nodes, "Total": len(nodes),
		"SpeciesID": speciesID, "SpeciesName": speciesName, "Message": msg,
	}

	if editNodeID := c.Query("edit"); editNodeID != "" {
		nid, _ := strconv.Atoi(editNodeID)
		for _, n := range nodes {
			if n.NodeID == nid {
				data["EditItem"] = n
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "evolution_detail.html", data)
}

func (h *AdminHandler) EvolutionNodeUpsert(c *fiber.Ctx) error {
	ctx := c.Context()
	speciesID, _ := strconv.Atoi(c.Params("species_id"))
	nodeID, _ := strconv.Atoi(c.FormValue("node_id"))
	cost, _ := strconv.Atoi(c.FormValue("cost"))
	n := &repository.GameEvolutionNode{
		SpeciesID: speciesID, NodeID: nodeID,
		Name: c.FormValue("name"), Type: c.FormValue("type"),
		Buff:     ensureJSON(c.FormValue("buff")),
		Cost:     cost,
		Requires: parseIntSlice(c.FormValue("requires")),
	}
	if err := h.gameDataRepo.UpsertEvolutionNode(ctx, n); err != nil {
		return c.Redirect("/admin/gamedata/evolutions/" + strconv.Itoa(speciesID) + "?msg=error")
	}
	return c.Redirect("/admin/gamedata/evolutions/" + strconv.Itoa(speciesID) + "?msg=saved")
}

func (h *AdminHandler) EvolutionNodeDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	speciesID, _ := strconv.Atoi(c.Params("species_id"))
	nodeID, _ := strconv.Atoi(c.Params("node_id"))
	h.gameDataRepo.DeleteEvolutionNode(ctx, speciesID, nodeID)
	return c.Redirect("/admin/gamedata/evolutions/" + strconv.Itoa(speciesID) + "?msg=deleted")
}

// ===== Gacha Rate Viewer (static data, no DB) =====

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
