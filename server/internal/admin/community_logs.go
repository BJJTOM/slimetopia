package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CommunityLogRow struct {
	ID        string
	Nickname  string
	Content   string
	Type      string // "post" or "reply"
	Likes     int
	CreatedAt time.Time
}

// CommunityLogs shows community posts and replies
func (h *AdminHandler) CommunityLogs(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	tab := c.Query("tab", "posts")
	search := c.Query("search")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 50
	offset := (page - 1) * limit

	var logs []CommunityLogRow
	var totalCount int

	if tab == "replies" {
		countQuery := `SELECT COUNT(*) FROM community_replies cr JOIN users u ON u.id = cr.user_id`
		query := `SELECT cr.id::text, u.nickname, cr.content, 'reply', COALESCE(cr.likes, 0), cr.created_at
			FROM community_replies cr JOIN users u ON u.id = cr.user_id`
		var args []interface{}

		if search != "" {
			countQuery += ` WHERE cr.content ILIKE $1 OR u.nickname ILIKE $1`
			query += ` WHERE cr.content ILIKE $1 OR u.nickname ILIKE $1`
			query += fmt.Sprintf(` ORDER BY cr.created_at DESC LIMIT $2 OFFSET $3`)
			args = append(args, "%"+search+"%", limit, offset)
			h.pool.QueryRow(ctx, countQuery, "%"+search+"%").Scan(&totalCount)
		} else {
			query += ` ORDER BY cr.created_at DESC LIMIT $1 OFFSET $2`
			args = append(args, limit, offset)
			h.pool.QueryRow(ctx, countQuery).Scan(&totalCount)
		}

		rows, err := h.pool.Query(ctx, query, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var l CommunityLogRow
				if rows.Scan(&l.ID, &l.Nickname, &l.Content, &l.Type, &l.Likes, &l.CreatedAt) == nil {
					logs = append(logs, l)
				}
			}
		}
	} else {
		countQuery := `SELECT COUNT(*) FROM community_posts cp JOIN users u ON u.id = cp.user_id`
		query := `SELECT cp.id::text, u.nickname, cp.content, cp.post_type, cp.likes, cp.created_at
			FROM community_posts cp JOIN users u ON u.id = cp.user_id`
		var args []interface{}

		if search != "" {
			countQuery += ` WHERE cp.content ILIKE $1 OR u.nickname ILIKE $1`
			query += ` WHERE cp.content ILIKE $1 OR u.nickname ILIKE $1`
			query += fmt.Sprintf(` ORDER BY cp.created_at DESC LIMIT $2 OFFSET $3`)
			args = append(args, "%"+search+"%", limit, offset)
			h.pool.QueryRow(ctx, countQuery, "%"+search+"%").Scan(&totalCount)
		} else {
			query += ` ORDER BY cp.created_at DESC LIMIT $1 OFFSET $2`
			args = append(args, limit, offset)
			h.pool.QueryRow(ctx, countQuery).Scan(&totalCount)
		}

		rows, err := h.pool.Query(ctx, query, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var l CommunityLogRow
				if rows.Scan(&l.ID, &l.Nickname, &l.Content, &l.Type, &l.Likes, &l.CreatedAt) == nil {
					logs = append(logs, l)
				}
			}
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "logs_community.html", fiber.Map{
		"Title":      "커뮤니티 로그",
		"Username":   username,
		"Logs":       logs,
		"Tab":        tab,
		"TotalCount": totalCount,
		"Search":     search,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}
