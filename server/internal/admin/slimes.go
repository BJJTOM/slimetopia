package admin

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type SlimeRow struct {
	ID          int
	Name        string
	NameEN      string
	Element     string
	Grade       string
	Faction     string
	Description string
}

func (h *AdminHandler) SlimeList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	search := c.Query("search")
	gradeFilter := c.Query("grade")
	elementFilter := c.Query("element")
	factionFilter := c.Query("faction")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	where := "WHERE 1=1"
	args := make([]interface{}, 0)
	argIdx := 1

	if search != "" {
		where += " AND (name ILIKE $" + strconv.Itoa(argIdx) + " OR COALESCE(name_en,'') ILIKE $" + strconv.Itoa(argIdx) + ")"
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if gradeFilter != "" {
		where += " AND grade = $" + strconv.Itoa(argIdx)
		args = append(args, gradeFilter)
		argIdx++
	}
	if elementFilter != "" {
		where += " AND element = $" + strconv.Itoa(argIdx)
		args = append(args, elementFilter)
		argIdx++
	}
	if factionFilter != "" {
		where += " AND faction = $" + strconv.Itoa(argIdx)
		args = append(args, factionFilter)
		argIdx++
	}

	var totalCount int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	h.pool.QueryRow(ctx, "SELECT COUNT(*) FROM slime_species "+where, countArgs...).Scan(&totalCount)

	selectQuery := "SELECT id, name, COALESCE(name_en,''), element, grade, COALESCE(faction,''), COALESCE(description,'') FROM slime_species " + where +
		" ORDER BY id LIMIT $" + strconv.Itoa(argIdx) + " OFFSET $" + strconv.Itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return h.render(c, "slimes.html", fiber.Map{
			"Title": "슬라임 목록", "Username": username, "Error": "Failed to fetch species",
			"Search": search, "Grade": gradeFilter, "Element": elementFilter, "Faction": factionFilter,
			"TotalCount": 0, "Page": 1, "TotalPages": 1,
			"HasPrev": false, "HasNext": false, "PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	slimes := make([]SlimeRow, 0)
	for rows.Next() {
		var sl SlimeRow
		if rows.Scan(&sl.ID, &sl.Name, &sl.NameEN, &sl.Element, &sl.Grade, &sl.Faction, &sl.Description) == nil {
			slimes = append(slimes, sl)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "slimes.html", fiber.Map{
		"Title":      "슬라임 목록",
		"Username":   username,
		"Slimes":     slimes,
		"Search":     search,
		"Grade":      gradeFilter,
		"Element":    elementFilter,
		"Faction":    factionFilter,
		"Page":       page,
		"TotalPages": totalPages,
		"TotalCount": totalCount,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}
