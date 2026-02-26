package game

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetAnnouncements returns active announcements for the game client
func (h *Handler) GetAnnouncements(c *fiber.Ctx) error {
	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	rows, err := pool.Query(ctx,
		`SELECT id, title, content, priority, created_at
		 FROM announcements
		 WHERE active = true AND (expires_at IS NULL OR expires_at > NOW())
		 ORDER BY
		   CASE priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
		   created_at DESC
		 LIMIT 10`,
	)
	if err != nil {
		return c.JSON(fiber.Map{"announcements": []fiber.Map{}})
	}
	defer rows.Close()

	announcements := make([]fiber.Map, 0)
	for rows.Next() {
		var id int
		var title, content, priority string
		var createdAt time.Time
		if rows.Scan(&id, &title, &content, &priority, &createdAt) == nil {
			announcements = append(announcements, fiber.Map{
				"id":         id,
				"title":      title,
				"content":    content,
				"priority":   priority,
				"created_at": createdAt,
			})
		}
	}

	return c.JSON(fiber.Map{"announcements": announcements})
}
