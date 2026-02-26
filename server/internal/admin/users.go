package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type UserRow struct {
	ID        string
	Nickname  string
	Gold      int64
	Gems      int
	Level     int
	CreatedAt time.Time
}

type UserSlimeRow struct {
	ID          string
	SpeciesName string
	Element     string
	Grade       string
	Level       int
}

type UserDetailData struct {
	ID        string
	Nickname  string
	Gold      int64
	Gems      int
	Stardust  int
	Level     int
	Provider  string
	CreatedAt time.Time
	Slimes    []UserSlimeRow
}

func (h *AdminHandler) UserList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	search := c.Query("search")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 20
	offset := (page - 1) * limit

	var totalCount int
	var rows_query string
	var countQuery string
	var args []interface{}

	if search != "" {
		countQuery = `SELECT COUNT(*) FROM users WHERE nickname ILIKE $1`
		rows_query = `SELECT id, nickname, gold, gems, level, created_at FROM users WHERE nickname ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = []interface{}{"%" + search + "%", limit, offset}
		h.pool.QueryRow(ctx, countQuery, "%"+search+"%").Scan(&totalCount)
	} else {
		countQuery = `SELECT COUNT(*) FROM users`
		rows_query = `SELECT id, nickname, gold, gems, level, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`
		args = []interface{}{limit, offset}
		h.pool.QueryRow(ctx, countQuery).Scan(&totalCount)
	}

	rows, err := h.pool.Query(ctx, rows_query, args...)
	if err != nil {
		return h.render(c, "users.html", fiber.Map{
			"Title": "유저 관리", "Username": username, "Error": "Failed to fetch users",
			"Search": search, "TotalCount": 0,
			"Page": 1, "TotalPages": 1, "HasPrev": false, "HasNext": false,
			"PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	users := make([]UserRow, 0)
	for rows.Next() {
		var u UserRow
		if rows.Scan(&u.ID, &u.Nickname, &u.Gold, &u.Gems, &u.Level, &u.CreatedAt) == nil {
			users = append(users, u)
		}
	}

	totalPages := (totalCount + limit - 1) / limit

	return h.render(c, "users.html", fiber.Map{
		"Title":      "유저 관리",
		"Username":   username,
		"Users":      users,
		"Search":     search,
		"Page":       page,
		"TotalPages": totalPages,
		"TotalCount": totalCount,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}

func (h *AdminHandler) UserDetail(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	userID := c.Params("id")
	message := c.Query("msg")

	var u UserDetailData
	err := h.pool.QueryRow(ctx,
		`SELECT id, nickname, gold, gems, stardust, level, provider, created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Nickname, &u.Gold, &u.Gems, &u.Stardust, &u.Level, &u.Provider, &u.CreatedAt)
	if err != nil {
		return c.Status(404).SendString("User not found")
	}

	// Fetch user's slimes
	rows, err := h.pool.Query(ctx,
		`SELECT s.id, sp.name, s.element, s.level, sp.grade
		 FROM slimes s JOIN slime_species sp ON sp.id = s.species_id
		 WHERE s.user_id = $1 ORDER BY s.level DESC LIMIT 50`,
		userID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var sl UserSlimeRow
			if rows.Scan(&sl.ID, &sl.SpeciesName, &sl.Element, &sl.Level, &sl.Grade) == nil {
				u.Slimes = append(u.Slimes, sl)
			}
		}
	}

	return h.render(c, "user_detail.html", fiber.Map{
		"Title":    fmt.Sprintf("유저: %s", u.Nickname),
		"Username": username,
		"User":     u,
		"Message":  message,
	})
}

func (h *AdminHandler) GiveUserCurrency(c *fiber.Ctx) error {
	ctx := c.Context()
	userID := c.Params("id")
	goldStr := c.FormValue("gold")
	gemsStr := c.FormValue("gems")

	gold, _ := strconv.ParseInt(goldStr, 10, 64)
	gems, _ := strconv.Atoi(gemsStr)

	if gold == 0 && gems == 0 {
		return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=no_amount", userID))
	}

	_, err := h.pool.Exec(ctx,
		`UPDATE users SET gold = gold + $1, gems = gems + $2, updated_at = NOW() WHERE id = $3`,
		gold, gems, userID,
	)
	if err != nil {
		return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=error", userID))
	}

	return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=success", userID))
}
