package admin

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type SpeciesDetailData struct {
	ID          int
	Name        string
	NameEN      string
	Element     string
	Grade       string
	Faction     string
	Description string
}

type FactionInfo struct {
	ID      string
	Name    string
	NameEN  string
	RangeStart int
	RangeEnd   int
	Count   int
	Members []FactionMember
}

type FactionMember struct {
	ID      int
	Name    string
	Element string
	Grade   string
}

type RelatedRecipe struct {
	ID         int
	InputAID   int
	InputAName string
	InputBID   int
	InputBName string
	OutputID   int
	OutputName string
	Role       string // "재료 A", "재료 B", "결과물"
	Hidden     bool
	Hint       string
}

type SameElementSpecies struct {
	ID    int
	Name  string
	Grade string
}

func (h *AdminHandler) SlimeDetail(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	speciesIDStr := c.Params("id")
	speciesID, _ := strconv.Atoi(speciesIDStr)
	if speciesID == 0 {
		return c.Redirect("/admin/slimes")
	}

	// 1. Basic species info
	var sp SpeciesDetailData
	err := h.pool.QueryRow(ctx,
		`SELECT id, name, COALESCE(name_en,''), element, grade, COALESCE(faction,''), COALESCE(description,'')
		 FROM slime_species WHERE id = $1`, speciesID,
	).Scan(&sp.ID, &sp.Name, &sp.NameEN, &sp.Element, &sp.Grade, &sp.Faction, &sp.Description)
	if err != nil {
		return c.Redirect("/admin/slimes")
	}

	// 2. Collection level requirement
	collectionReqs := map[string]int{
		"common": 3, "uncommon": 5, "rare": 10, "epic": 15, "legendary": 20, "mythic": 25,
	}
	requiredLevel := collectionReqs[sp.Grade]

	// 3. Faction info + members
	var faction FactionInfo
	fRows, err := h.pool.Query(ctx,
		`SELECT id, name, element, grade FROM slime_species WHERE faction = $1 ORDER BY id`, sp.Faction)
	if err == nil {
		defer fRows.Close()
		for fRows.Next() {
			var m FactionMember
			if fRows.Scan(&m.ID, &m.Name, &m.Element, &m.Grade) == nil {
				faction.Members = append(faction.Members, m)
			}
		}
	}
	faction.ID = sp.Faction
	faction.Count = len(faction.Members)
	// Faction metadata from JSON
	factionNames := map[string][2]string{
		"east_blue": {"이스트 블루", "East Blue"}, "grand_line": {"그랜드 라인", "Grand Line"},
		"straw_hat": {"밀짚모자 해적단", "Straw Hat Pirates"}, "baroque": {"바로크 워크스", "Baroque Works"},
		"sky_island": {"스카이 아일랜드", "Sky Island"}, "cipher_pol": {"사이퍼 폴", "Cipher Pol"},
		"warlords": {"칠무해", "Seven Warlords"}, "worst_gen": {"최악의 세대", "Worst Generation"},
		"marines": {"해군", "Marines"}, "yonko": {"사황", "Yonko"},
		"logia": {"자연계", "Logia"}, "paramecia": {"초인계", "Paramecia"},
		"zoan": {"동물계", "Zoan"}, "revolutionary": {"혁명군", "Revolutionary Army"},
		"celestial": {"천룡인", "Celestial Dragons"}, "hidden": {"히든", "Hidden"},
	}
	if names, ok := factionNames[sp.Faction]; ok {
		faction.Name = names[0]
		faction.NameEN = names[1]
	}
	if len(faction.Members) > 0 {
		faction.RangeStart = faction.Members[0].ID
		faction.RangeEnd = faction.Members[len(faction.Members)-1].ID
	}

	// 4. Find position in faction
	positionInFaction := 0
	for i, m := range faction.Members {
		if m.ID == speciesID {
			positionInFaction = i + 1
			break
		}
	}

	// 5. Related recipes (this species as input or output)
	var recipes []RelatedRecipe
	recipesData := loadRecipesJSON()
	speciesNameCache := map[int]string{}
	getSpeciesNameCached := func(id int) string {
		if n, ok := speciesNameCache[id]; ok {
			return n
		}
		var name string
		h.pool.QueryRow(ctx, `SELECT name FROM slime_species WHERE id = $1`, id).Scan(&name)
		speciesNameCache[id] = name
		return name
	}

	for _, r := range recipesData {
		if r.InputA == speciesID || r.InputB == speciesID || r.Output == speciesID {
			role := "결과물"
			if r.InputA == speciesID {
				role = "재료 A"
			} else if r.InputB == speciesID {
				role = "재료 B"
			}
			recipes = append(recipes, RelatedRecipe{
				ID: r.ID, InputAID: r.InputA, InputAName: getSpeciesNameCached(r.InputA),
				InputBID: r.InputB, InputBName: getSpeciesNameCached(r.InputB),
				OutputID: r.Output, OutputName: r.OutputName,
				Role: role, Hidden: r.Hidden, Hint: r.Hint,
			})
		}
	}

	// 6. Same element species (other factions, limit 10)
	var sameElement []SameElementSpecies
	seRows, err := h.pool.Query(ctx,
		`SELECT id, name, grade FROM slime_species WHERE element = $1 AND id != $2 ORDER BY id LIMIT 12`,
		sp.Element, speciesID)
	if err == nil {
		defer seRows.Close()
		for seRows.Next() {
			var s SameElementSpecies
			if seRows.Scan(&s.ID, &s.Name, &s.Grade) == nil {
				sameElement = append(sameElement, s)
			}
		}
	}

	// 7. Same grade species (limit 12)
	var sameGrade []SameElementSpecies
	sgRows, err := h.pool.Query(ctx,
		`SELECT id, name, grade FROM slime_species WHERE grade = $1 AND id != $2 ORDER BY id LIMIT 12`,
		sp.Grade, speciesID)
	if err == nil {
		defer sgRows.Close()
		for sgRows.Next() {
			var s SameElementSpecies
			if sgRows.Scan(&s.ID, &s.Name, &s.Grade) == nil {
				sameGrade = append(sameGrade, s)
			}
		}
	}

	// 8. Element/grade counts for context
	var totalSameElement, totalSameGrade int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM slime_species WHERE element = $1`, sp.Element).Scan(&totalSameElement)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM slime_species WHERE grade = $1`, sp.Grade).Scan(&totalSameGrade)

	// 9. Is starter slime?
	isStarter := speciesID == 1 || speciesID == 2 || speciesID == 3

	// 10. Egg obtainability
	eggInfo := getEggInfo(sp.Grade, sp.Element)

	// 11. Prev/Next species navigation
	var prevID, nextID int
	h.pool.QueryRow(ctx, `SELECT id FROM slime_species WHERE id < $1 ORDER BY id DESC LIMIT 1`, speciesID).Scan(&prevID)
	h.pool.QueryRow(ctx, `SELECT id FROM slime_species WHERE id > $1 ORDER BY id ASC LIMIT 1`, speciesID).Scan(&nextID)

	return h.render(c, "slime_detail.html", fiber.Map{
		"Title":             fmt.Sprintf("#%d %s", sp.ID, sp.Name),
		"Username":          username,
		"Species":           sp,
		"RequiredLevel":     requiredLevel,
		"Faction":           faction,
		"PositionInFaction": positionInFaction,
		"Recipes":           recipes,
		"SameElement":       sameElement,
		"SameGrade":         sameGrade,
		"TotalSameElement":  totalSameElement,
		"TotalSameGrade":    totalSameGrade,
		"IsStarter":         isStarter,
		"EggInfo":           eggInfo,
		"PrevID":            prevID,
		"NextID":            nextID,
	})
}

// --- Helpers ---

type recipeEntry struct {
	ID      int
	InputA  int
	InputB  int
	Output  int
	OutputName string
	Hidden  bool
	Hint    string
}

func loadRecipesJSON() []recipeEntry {
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Join(filepath.Dir(filename), "..", "..", "..", "shared")
	paths := []string{
		filepath.Join(dir, "recipes.json"),
		"shared/recipes.json",
		"../shared/recipes.json",
	}
	var data []byte
	var err error
	for _, p := range paths {
		data, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil
	}
	var raw struct {
		Recipes []struct {
			ID         int    `json:"id"`
			InputA     int    `json:"input_a"`
			InputB     int    `json:"input_b"`
			Output     int    `json:"output"`
			OutputName string `json:"output_name"`
			Hidden     bool   `json:"hidden"`
			Hint       string `json:"hint"`
		} `json:"recipes"`
	}
	if json.Unmarshal(data, &raw) != nil {
		return nil
	}
	result := make([]recipeEntry, len(raw.Recipes))
	for i, r := range raw.Recipes {
		result[i] = recipeEntry{ID: r.ID, InputA: r.InputA, InputB: r.InputB, Output: r.Output, OutputName: r.OutputName, Hidden: r.Hidden, Hint: r.Hint}
	}
	return result
}

func getEggInfo(grade, element string) []string {
	var info []string
	switch grade {
	case "common":
		info = append(info, "일반 알 (50%)")
	case "uncommon":
		info = append(info, "일반 알 (30%)", "프리미엄 알 (35%)")
	case "rare":
		info = append(info, "일반 알 (15%)", "프리미엄 알 (22%)", "레전더리 알 (40%)")
	case "epic":
		info = append(info, "일반 알 (4%)", "프리미엄 알 (10%)", "레전더리 알 (35%)")
	case "legendary":
		info = append(info, "일반 알 (0.9%/50회 피티)", "프리미엄 알 (2.5%/30회 피티)", "레전더리 알 (20%/20회 피티)")
	case "mythic":
		info = append(info, "일반 알 (0.1%)", "프리미엄 알 (0.5%)", "레전더리 알 (5%)")
	}
	// Element-specific eggs
	elementEggs := map[string]string{
		"fire": "불 속성 알", "water": "물 속성 알", "grass": "풀 속성 알",
		"dark": "어둠 속성 알", "ice": "얼음 속성 알", "electric": "번개 속성 알", "earth": "대지 속성 알",
	}
	if eggName, ok := elementEggs[element]; ok {
		info = append(info, eggName+" (속성 확정)")
	}
	return info
}
