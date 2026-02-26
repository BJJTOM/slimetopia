package admin

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type SlimeRow struct {
	ID          string
	SpeciesName string
	Element     string
	Grade       string
	Level       int
	OwnerNick   string
}

func (h *AdminHandler) SlimeList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	search := c.Query("search")
	gradeFilter := c.Query("grade")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	baseQuery := `FROM slimes s JOIN slime_species sp ON sp.id = s.species_id JOIN users u ON u.id = s.user_id`
	where := " WHERE 1=1"
	args := make([]interface{}, 0)
	argIdx := 1

	if search != "" {
		where += ` AND (sp.name ILIKE $` + strconv.Itoa(argIdx) + ` OR u.nickname ILIKE $` + strconv.Itoa(argIdx) + `)`
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if gradeFilter != "" {
		where += ` AND sp.grade = $` + strconv.Itoa(argIdx)
		args = append(args, gradeFilter)
		argIdx++
	}

	var totalCount int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) `+baseQuery+where, countArgs...).Scan(&totalCount)

	selectQuery := `SELECT s.id, sp.name, s.element, sp.grade, s.level, u.nickname ` + baseQuery + where +
		` ORDER BY s.level DESC LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, selectQuery, args...)
	if err != nil {
		return h.render(c, "slimes.html", fiber.Map{
			"Title": "슬라임 관리", "Username": username, "Error": "Failed to fetch slimes",
			"Search": search, "Grade": gradeFilter, "TotalCount": 0,
			"Page": 1, "TotalPages": 1, "HasPrev": false, "HasNext": false,
			"PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	slimes := make([]SlimeRow, 0)
	for rows.Next() {
		var sl SlimeRow
		if rows.Scan(&sl.ID, &sl.SpeciesName, &sl.Element, &sl.Grade, &sl.Level, &sl.OwnerNick) == nil {
			slimes = append(slimes, sl)
		}
	}

	totalPages := (totalCount + limit - 1) / limit

	return h.render(c, "slimes.html", fiber.Map{
		"Title":      "슬라임 관리",
		"Username":   username,
		"Slimes":     slimes,
		"Search":     search,
		"Grade":      gradeFilter,
		"Page":       page,
		"TotalPages": totalPages,
		"TotalCount": totalCount,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}
