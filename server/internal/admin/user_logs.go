package admin

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type UserLogRow struct {
	ID        string
	Nickname  string
	Email     string
	Provider  string
	Action    string
	Detail    string
	CreatedAt time.Time
}

// UserLogs shows user signups and bans
func (h *AdminHandler) UserLogs(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	tab := c.Query("tab", "signups")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 50
	offset := (page - 1) * limit

	var logs []UserLogRow
	var totalCount int

	if tab == "bans" {
		h.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('ban_user','unban_user')`,
		).Scan(&totalCount)

		rows, err := h.pool.Query(ctx,
			`SELECT id::text, username, action, COALESCE(target_type,''), COALESCE(detail,''), created_at
			 FROM admin_audit_log WHERE action IN ('ban_user','unban_user')
			 ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
			limit, offset,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var l UserLogRow
				if rows.Scan(&l.ID, &l.Nickname, &l.Action, &l.Provider, &l.Detail, &l.CreatedAt) == nil {
					logs = append(logs, l)
				}
			}
		}
	} else {
		h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&totalCount)

		rows, err := h.pool.Query(ctx,
			`SELECT id::text, nickname, COALESCE(email,''), COALESCE(provider,''), '', created_at
			 FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
			limit, offset,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var l UserLogRow
				if rows.Scan(&l.ID, &l.Nickname, &l.Email, &l.Provider, &l.Detail, &l.CreatedAt) == nil {
					logs = append(logs, l)
				}
			}
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "logs_users.html", fiber.Map{
		"Title":      "유저 로그",
		"Username":   username,
		"Logs":       logs,
		"Tab":        tab,
		"TotalCount": totalCount,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}
