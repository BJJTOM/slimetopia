package admin

import (
	"context"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// logAdminAction records an admin action to the audit log
func logAdminAction(pool *pgxpool.Pool, ctx context.Context, adminID int, username, action, targetType, targetID, detail string) {
	pool.Exec(ctx,
		`INSERT INTO admin_audit_log (admin_id, username, action, target_type, target_id, detail)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		adminID, username, action, targetType, targetID, detail,
	)
}

type AuditLogEntry struct {
	ID         int
	Username   string
	Action     string
	TargetType string
	TargetID   string
	Detail     string
	CreatedAt  time.Time
}

func (h *AdminHandler) AuditLog(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 50
	offset := (page - 1) * limit

	var totalCount int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM admin_audit_log`).Scan(&totalCount)

	rows, err := h.pool.Query(ctx,
		`SELECT id, username, action, COALESCE(target_type, ''), COALESCE(target_id, ''), COALESCE(detail, ''), created_at
		 FROM admin_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return h.render(c, "audit.html", fiber.Map{
			"Title":    "감사 로그",
			"Username": username,
			"Error":    "Failed to fetch audit log",
		})
	}
	defer rows.Close()

	entries := make([]AuditLogEntry, 0)
	for rows.Next() {
		var e AuditLogEntry
		if rows.Scan(&e.ID, &e.Username, &e.Action, &e.TargetType, &e.TargetID, &e.Detail, &e.CreatedAt) == nil {
			entries = append(entries, e)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "audit.html", fiber.Map{
		"Title":      "감사 로그",
		"Username":   username,
		"Entries":    entries,
		"TotalCount": totalCount,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}
