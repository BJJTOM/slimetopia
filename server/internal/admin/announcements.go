package admin

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AnnouncementRow struct {
	ID        int
	Title     string
	Content   string
	Priority  string
	Active    bool
	CreatedBy string
	CreatedAt time.Time
	ExpiresAt *time.Time
}

func (h *AdminHandler) AnnouncementList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	message := c.Query("msg")

	rows, err := h.pool.Query(ctx,
		`SELECT id, title, content, priority, active, COALESCE(created_by, ''), created_at, expires_at
		 FROM announcements ORDER BY created_at DESC LIMIT 50`,
	)
	if err != nil {
		return h.render(c, "announcements.html", fiber.Map{
			"Title":    "공지사항 관리",
			"Username": username,
			"Error":    "Failed to fetch announcements",
		})
	}
	defer rows.Close()

	announcements := make([]AnnouncementRow, 0)
	for rows.Next() {
		var a AnnouncementRow
		if rows.Scan(&a.ID, &a.Title, &a.Content, &a.Priority, &a.Active, &a.CreatedBy, &a.CreatedAt, &a.ExpiresAt) == nil {
			announcements = append(announcements, a)
		}
	}

	return h.render(c, "announcements.html", fiber.Map{
		"Title":         "공지사항 관리",
		"Username":      username,
		"Announcements": announcements,
		"Message":       message,
	})
}

func (h *AdminHandler) CreateAnnouncement(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	title := c.FormValue("title")
	content := c.FormValue("content")
	priority := c.FormValue("priority")
	if priority == "" {
		priority = "normal"
	}

	expiresAtStr := c.FormValue("expires_at")

	if title == "" || content == "" {
		return c.Redirect("/admin/announcements?msg=required")
	}

	var expiresAt *time.Time
	if expiresAtStr != "" {
		t, err := time.Parse("2006-01-02", expiresAtStr)
		if err == nil {
			expiresAt = &t
		}
	}

	_, err := h.pool.Exec(ctx,
		`INSERT INTO announcements (title, content, priority, created_by, expires_at) VALUES ($1, $2, $3, $4, $5)`,
		title, content, priority, username, expiresAt,
	)
	if err != nil {
		return c.Redirect("/admin/announcements?msg=error")
	}

	return c.Redirect("/admin/announcements?msg=created")
}

func (h *AdminHandler) ToggleAnnouncement(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	if id == 0 {
		return c.Redirect("/admin/announcements?msg=invalid")
	}

	_, err := h.pool.Exec(ctx,
		`UPDATE announcements SET active = NOT active WHERE id = $1`,
		id,
	)
	if err != nil {
		return c.Redirect("/admin/announcements?msg=error")
	}

	return c.Redirect("/admin/announcements?msg=toggled")
}

func (h *AdminHandler) DeleteAnnouncement(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	if id == 0 {
		return c.Redirect("/admin/announcements?msg=invalid")
	}

	_, err := h.pool.Exec(ctx,
		`DELETE FROM announcements WHERE id = $1`,
		id,
	)
	if err != nil {
		return c.Redirect("/admin/announcements?msg=error")
	}

	return c.Redirect("/admin/announcements?msg=deleted")
}
