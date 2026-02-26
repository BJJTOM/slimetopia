package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ShortRow struct {
	ID          string
	Nickname    string
	Title       string
	Category    string
	Status      string
	Views       int
	Likes       int
	TipTotal    int
	CreatedAt   time.Time
}

type ShortDetailRow struct {
	ShortRow
	Description string
	VideoURL    string
}

type ShortCommentRow struct {
	ID        string
	Nickname  string
	Content   string
	CreatedAt time.Time
}

// ShortsModList lists all shorts with filters
func (h *AdminHandler) ShortsModList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	statusFilter := c.Query("status", "active")
	search := c.Query("search")
	message := c.Query("msg")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	where := `s.status = $1`
	args := []interface{}{statusFilter}
	argIdx := 2

	if search != "" {
		where += fmt.Sprintf(` AND (u.nickname ILIKE $%d OR s.title ILIKE $%d)`, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	var totalCount int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM shorts s JOIN users u ON u.id = s.user_id WHERE `+where,
		args...,
	).Scan(&totalCount)

	query := fmt.Sprintf(`SELECT s.id::text, u.nickname, s.title, COALESCE(s.category,'general'), s.status,
		COALESCE(s.views, 0), COALESCE(s.likes, 0),
		COALESCE((SELECT SUM(amount) FROM shorts_tips WHERE short_id = s.id), 0), s.created_at
		FROM shorts s JOIN users u ON u.id = s.user_id
		WHERE %s ORDER BY s.created_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return h.render(c, "shorts_list.html", fiber.Map{
			"Title": "쇼츠 관리", "Username": username, "Error": err.Error(),
			"Status": statusFilter, "Search": search, "TotalCount": 0, "Message": "",
			"Page": 1, "TotalPages": 1, "HasPrev": false, "HasNext": false,
			"PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	var shorts []ShortRow
	for rows.Next() {
		var s ShortRow
		if rows.Scan(&s.ID, &s.Nickname, &s.Title, &s.Category, &s.Status, &s.Views, &s.Likes, &s.TipTotal, &s.CreatedAt) == nil {
			shorts = append(shorts, s)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "shorts_list.html", fiber.Map{
		"Title":      "쇼츠 관리",
		"Username":   username,
		"Shorts":     shorts,
		"TotalCount": totalCount,
		"Status":     statusFilter,
		"Search":     search,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
		"Message":    message,
	})
}

// ShortsModDetail shows a single short with comments
func (h *AdminHandler) ShortsModDetail(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	shortID := c.Params("id")
	message := c.Query("msg")

	var s ShortDetailRow
	err := h.pool.QueryRow(ctx,
		`SELECT s.id::text, u.nickname, s.title, COALESCE(s.category,'general'), s.status,
		 COALESCE(s.views,0), COALESCE(s.likes,0),
		 COALESCE((SELECT SUM(amount) FROM shorts_tips WHERE short_id = s.id), 0), s.created_at,
		 COALESCE(s.description,''), COALESCE(s.video_url,'')
		 FROM shorts s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
		shortID,
	).Scan(&s.ID, &s.Nickname, &s.Title, &s.Category, &s.Status, &s.Views, &s.Likes, &s.TipTotal, &s.CreatedAt, &s.Description, &s.VideoURL)
	if err != nil {
		return c.Redirect("/admin/shorts?msg=not_found")
	}

	// Comments
	comRows, err := h.pool.Query(ctx,
		`SELECT sc.id::text, u.nickname, sc.content, sc.created_at
		 FROM shorts_comments sc JOIN users u ON u.id = sc.user_id
		 WHERE sc.short_id = $1 ORDER BY sc.created_at DESC LIMIT 50`,
		shortID,
	)
	var comments []ShortCommentRow
	if err == nil {
		defer comRows.Close()
		for comRows.Next() {
			var co ShortCommentRow
			if comRows.Scan(&co.ID, &co.Nickname, &co.Content, &co.CreatedAt) == nil {
				comments = append(comments, co)
			}
		}
	}

	return h.render(c, "shorts_detail.html", fiber.Map{
		"Title":    "쇼츠 상세",
		"Username": username,
		"Short":    s,
		"Comments": comments,
		"Message":  message,
	})
}

// ShortsHide hides a short
func (h *AdminHandler) ShortsHide(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	shortID := c.Params("id")

	h.pool.Exec(ctx, `UPDATE shorts SET status = 'hidden' WHERE id = $1`, shortID)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "hide_short", "short", shortID, "")

	return c.Redirect("/admin/shorts/" + shortID + "?msg=hidden")
}

// ShortsDelete deletes a short
func (h *AdminHandler) ShortsDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	shortID := c.Params("id")

	h.pool.Exec(ctx, `DELETE FROM shorts WHERE id = $1`, shortID)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "delete_short", "short", shortID, "")

	return c.Redirect("/admin/shorts?msg=deleted")
}

// ShortsStats shows shorts analytics
func (h *AdminHandler) ShortsStats(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	var totalShorts, totalViews, totalLikes, totalTips int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shorts WHERE status = 'active'`).Scan(&totalShorts)
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(views), 0) FROM shorts`).Scan(&totalViews)
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(likes), 0) FROM shorts`).Scan(&totalLikes)
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0) FROM shorts_tips`).Scan(&totalTips)

	// Top creators
	type Creator struct {
		Nickname string
		Count    int
		Views    int
	}
	var topCreators []Creator
	cRows, err := h.pool.Query(ctx,
		`SELECT u.nickname, COUNT(*), COALESCE(SUM(s.views), 0)
		 FROM shorts s JOIN users u ON u.id = s.user_id
		 WHERE s.status = 'active'
		 GROUP BY u.nickname ORDER BY COUNT(*) DESC LIMIT 10`)
	if err == nil {
		defer cRows.Close()
		for cRows.Next() {
			var cr Creator
			if cRows.Scan(&cr.Nickname, &cr.Count, &cr.Views) == nil {
				topCreators = append(topCreators, cr)
			}
		}
	}

	return h.render(c, "shorts_stats.html", fiber.Map{
		"Title":        "쇼츠 통계",
		"Username":     username,
		"TotalShorts":  totalShorts,
		"TotalViews":   totalViews,
		"TotalLikes":   totalLikes,
		"TotalTips":    totalTips,
		"TopCreators":  topCreators,
	})
}
