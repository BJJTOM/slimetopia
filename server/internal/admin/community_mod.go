package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ReportRow struct {
	ID           string
	ReporterNick string
	TargetType   string
	TargetID     string
	Reason       string
	Detail       string
	Status       string
	CreatedAt    time.Time
}

type CommunityPostRow struct {
	ID         string
	AuthorNick string
	Content    string
	PostType   string
	Likes      int
	ReplyCount int
	CreatedAt  time.Time
}

func (h *AdminHandler) CommunityReports(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	statusFilter := c.Query("status", "pending")
	message := c.Query("msg")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	var totalCount int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM community_reports WHERE status = $1`, statusFilter,
	).Scan(&totalCount)

	rows, err := h.pool.Query(ctx,
		`SELECT cr.id::text, COALESCE(u.nickname, 'Unknown'), cr.target_type, cr.target_id::text,
		        cr.reason, COALESCE(cr.detail, ''), cr.status, cr.created_at
		 FROM community_reports cr
		 LEFT JOIN users u ON u.id = cr.reporter_id
		 WHERE cr.status = $1
		 ORDER BY cr.created_at DESC LIMIT $2 OFFSET $3`,
		statusFilter, limit, offset,
	)
	if err != nil {
		return h.render(c, "reports.html", fiber.Map{
			"Title": "신고 관리", "Username": username, "Error": "Failed to fetch reports",
			"Status": statusFilter, "TotalCount": 0, "Message": "",
			"Page": 1, "TotalPages": 1, "HasPrev": false, "HasNext": false,
			"PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	var reports []ReportRow
	for rows.Next() {
		var r ReportRow
		if rows.Scan(&r.ID, &r.ReporterNick, &r.TargetType, &r.TargetID, &r.Reason, &r.Detail, &r.Status, &r.CreatedAt) == nil {
			reports = append(reports, r)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "reports.html", fiber.Map{
		"Title":      "신고 관리",
		"Username":   username,
		"Reports":    reports,
		"TotalCount": totalCount,
		"Status":     statusFilter,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
		"Message":    message,
	})
}

func (h *AdminHandler) ProcessReport(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	reportID := c.Params("id")
	action := c.FormValue("action") // "reviewed" or "dismissed"

	if action != "reviewed" && action != "dismissed" {
		return c.Redirect("/admin/moderation/reports?msg=invalid_action")
	}

	_, err := h.pool.Exec(ctx,
		`UPDATE community_reports SET status = $1 WHERE id = $2`,
		action, reportID,
	)
	if err != nil {
		return c.Redirect("/admin/moderation/reports?msg=error")
	}

	logAdminAction(h.pool, ctx, adminID, adminUsername, "process_report", "report", reportID, action)

	return c.Redirect("/admin/moderation/reports?msg=processed")
}

func (h *AdminHandler) CommunityPostList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	search := c.Query("search")
	message := c.Query("msg")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	var totalCount int
	query := `SELECT cp.id, u.nickname, cp.content, cp.post_type, cp.likes, cp.reply_count, cp.created_at
		 FROM community_posts cp JOIN users u ON u.id = cp.user_id`
	countQuery := `SELECT COUNT(*) FROM community_posts cp JOIN users u ON u.id = cp.user_id`
	var args []interface{}

	if search != "" {
		query += ` WHERE cp.content ILIKE $1 OR u.nickname ILIKE $1`
		countQuery += ` WHERE cp.content ILIKE $1 OR u.nickname ILIKE $1`
		query += fmt.Sprintf(` ORDER BY cp.created_at DESC LIMIT $2 OFFSET $3`)
		args = append(args, "%"+search+"%", limit, offset)
		h.pool.QueryRow(ctx, countQuery, "%"+search+"%").Scan(&totalCount)
	} else {
		query += fmt.Sprintf(` ORDER BY cp.created_at DESC LIMIT $1 OFFSET $2`)
		args = append(args, limit, offset)
		h.pool.QueryRow(ctx, countQuery).Scan(&totalCount)
	}

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return h.render(c, "moderation_posts.html", fiber.Map{
			"Title": "게시물 관리", "Username": username, "Error": "Failed to fetch posts",
			"Search": search, "TotalCount": 0, "Message": "",
			"Page": 1, "TotalPages": 1, "HasPrev": false, "HasNext": false,
			"PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	var posts []CommunityPostRow
	for rows.Next() {
		var p CommunityPostRow
		if rows.Scan(&p.ID, &p.AuthorNick, &p.Content, &p.PostType, &p.Likes, &p.ReplyCount, &p.CreatedAt) == nil {
			posts = append(posts, p)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "moderation_posts.html", fiber.Map{
		"Title":      "게시물 관리",
		"Username":   username,
		"Posts":      posts,
		"TotalCount": totalCount,
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

func (h *AdminHandler) DeleteCommunityPost(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	postID := c.Params("id")

	_, err := h.pool.Exec(ctx, `DELETE FROM community_posts WHERE id = $1`, postID)
	if err != nil {
		return c.Redirect("/admin/moderation/posts?msg=error")
	}

	logAdminAction(h.pool, ctx, adminID, adminUsername, "delete_post", "post", postID, "")

	return c.Redirect("/admin/moderation/posts?msg=deleted")
}

// BulkProcessReports processes multiple reports at once
func (h *AdminHandler) BulkProcessReports(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	action := c.FormValue("action") // "reviewed" or "dismissed"
	ids := c.FormValue("ids")       // comma-separated

	if action != "reviewed" && action != "dismissed" {
		return c.Redirect("/admin/moderation/reports?msg=invalid_action")
	}
	if ids == "" {
		return c.Redirect("/admin/moderation/reports?msg=no_ids")
	}

	_, err := h.pool.Exec(ctx,
		`UPDATE community_reports SET status = $1 WHERE id = ANY(string_to_array($2, ',')::uuid[])`,
		action, ids,
	)
	if err != nil {
		return c.Redirect("/admin/moderation/reports?msg=error")
	}

	logAdminAction(h.pool, ctx, adminID, adminUsername, "bulk_process_reports", "report", ids, action)

	return c.Redirect("/admin/moderation/reports?msg=bulk_processed")
}

func (h *AdminHandler) DeleteCommunityReply(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	replyID := c.Params("id")

	_, err := h.pool.Exec(ctx, `DELETE FROM community_replies WHERE id = $1`, replyID)
	if err != nil {
		return c.Redirect("/admin/moderation/posts?msg=error")
	}

	logAdminAction(h.pool, ctx, adminID, adminUsername, "delete_reply", "reply", replyID, "")

	return c.Redirect("/admin/moderation/posts?msg=reply_deleted")
}
