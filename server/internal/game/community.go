package game

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	maxPostLength    = 500
	maxReplyLength   = 300
	maxReportDetail  = 500
	postsPerPage     = 20
	maxImagesPerPost = 3
	maxImageSize     = 5 * 1024 * 1024 // 5MB per image
)

var validReportReasons = map[string]bool{
	"spam":          true,
	"abuse":         true,
	"inappropriate": true,
	"other":         true,
}

// GET /api/community/posts?type=general&page=0&sort=new
func (h *Handler) GetCommunityPosts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postType := c.Query("type", "")
	page := c.QueryInt("page", 0)
	offset := page * postsPerPage

	ctx := c.UserContext()
	pool := h.slimeRepo.Pool()

	// Get blocked user IDs for filtering
	blockedIDs := h.getBlockedUserIDs(c, userID)

	type scannable interface {
		Close()
		Next() bool
		Scan(...interface{}) error
	}

	var rows scannable
	var err error

	if postType != "" {
		r, e := pool.Query(ctx,
			`SELECT p.id, p.user_id, u.nickname, p.content, p.post_type, p.likes, p.reply_count, p.created_at,
			        p.image_urls, p.view_count,
			        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked
			 FROM community_posts p
			 JOIN users u ON u.id = p.user_id
			 WHERE p.post_type = $2
			   AND p.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = $1::uuid)
			 ORDER BY p.created_at DESC
			 LIMIT $3 OFFSET $4`,
			userID, postType, postsPerPage, offset,
		)
		if e != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch posts"})
		}
		rows = r
	} else {
		r, e := pool.Query(ctx,
			`SELECT p.id, p.user_id, u.nickname, p.content, p.post_type, p.likes, p.reply_count, p.created_at,
			        p.image_urls, p.view_count,
			        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked
			 FROM community_posts p
			 JOIN users u ON u.id = p.user_id
			 WHERE p.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = $1::uuid)
			 ORDER BY p.created_at DESC
			 LIMIT $2 OFFSET $3`,
			userID, postsPerPage, offset,
		)
		if e != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch posts"})
		}
		rows = r
	}
	_ = err
	_ = blockedIDs

	defer rows.Close()

	posts := make([]fiber.Map, 0)
	for rows.Next() {
		var id, uid, nickname, content, ptype string
		var likes, replyCount, viewCount int
		var createdAt time.Time
		var liked bool
		var imageURLs []string
		if err := rows.Scan(&id, &uid, &nickname, &content, &ptype, &likes, &replyCount, &createdAt, &imageURLs, &viewCount, &liked); err != nil {
			continue
		}
		if imageURLs == nil {
			imageURLs = []string{}
		}
		posts = append(posts, fiber.Map{
			"id":          id,
			"user_id":     uid,
			"nickname":    nickname,
			"content":     content,
			"post_type":   ptype,
			"likes":       likes,
			"reply_count": replyCount,
			"view_count":  viewCount,
			"image_urls":  imageURLs,
			"created_at":  createdAt,
			"liked":       liked,
			"is_mine":     uid == userID,
		})
	}

	return c.JSON(fiber.Map{"posts": posts, "page": page})
}

// POST /api/community/posts (multipart/form-data for images)
func (h *Handler) CreateCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	content := c.FormValue("content", "")
	postType := c.FormValue("post_type", "general")

	// Fallback to JSON body if not multipart
	if content == "" {
		var body struct {
			Content  string `json:"content"`
			PostType string `json:"post_type"`
		}
		if err := c.BodyParser(&body); err == nil && body.Content != "" {
			content = body.Content
			if body.PostType != "" {
				postType = body.PostType
			}
		}
	}

	if content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content required"})
	}
	if len(content) > maxPostLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content too long"})
	}

	// Rate limit: max 10 posts per day
	ctx := c.Context()
	today := time.Now().Format("2006-01-02")
	key := "community_posts:" + userID + ":" + today
	count, _ := h.rdb.Get(ctx, key).Int()
	if count >= 10 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "daily post limit reached"})
	}

	// Handle image uploads (up to 3)
	imageURLs := []string{}
	form, err := c.MultipartForm()
	if err == nil && form != nil && form.File != nil {
		files := form.File["images"]
		if len(files) > maxImagesPerPost {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("max %d images allowed", maxImagesPerPost)})
		}

		uploadDir := "./uploads/community"
		os.MkdirAll(uploadDir, 0755)

		for _, file := range files {
			if file.Size > maxImageSize {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "image too large (max 5MB)"})
			}

			ext := filepath.Ext(file.Filename)
			if ext == "" {
				ext = ".jpg"
			}
			filename := uuid.New().String() + ext
			savePath := filepath.Join(uploadDir, filename)

			if err := c.SaveFile(file, savePath); err != nil {
				continue
			}
			imageURLs = append(imageURLs, "/uploads/community/"+filename)
		}
	}

	pool := h.slimeRepo.Pool()
	var postID string
	err = pool.QueryRow(c.UserContext(),
		`INSERT INTO community_posts (user_id, content, post_type, image_urls) VALUES ($1, $2, $3, $4) RETURNING id`,
		userID, content, postType, imageURLs,
	).Scan(&postID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create post"})
	}

	h.rdb.Incr(ctx, key)
	h.rdb.ExpireAt(ctx, key, time.Now().Add(24*time.Hour))

	// Track mission
	h.missionRepo.IncrementProgress(ctx, userID, "community")

	return c.JSON(fiber.Map{"id": postID, "image_urls": imageURLs})
}

// POST /api/community/posts/:id/like
func (h *Handler) LikeCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	_, err := pool.Exec(ctx,
		`INSERT INTO community_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		postID, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like"})
	}

	pool.Exec(ctx,
		`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/community/posts/:id/unlike
func (h *Handler) UnlikeCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	pool.Exec(ctx, `DELETE FROM community_post_likes WHERE post_id = $1 AND user_id = $2`, postID, userID)
	pool.Exec(ctx,
		`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/community/posts/:id/view
func (h *Handler) ViewCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Upsert view (unique per user)
	_, err := pool.Exec(ctx,
		`INSERT INTO community_post_views (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		postID, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to record view"})
	}

	// Update view count
	pool.Exec(ctx,
		`UPDATE community_posts SET view_count = (SELECT COUNT(*) FROM community_post_views WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// GET /api/community/posts/:id/replies — supports hierarchical (parent_id filter)
func (h *Handler) GetCommunityReplies(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT r.id, r.user_id, u.nickname, r.content, r.likes, r.created_at, r.parent_id, r.reply_count,
		        EXISTS(SELECT 1 FROM community_reply_likes l WHERE l.reply_id = r.id AND l.user_id = $1) as liked
		 FROM community_replies r
		 JOIN users u ON u.id = r.user_id
		 WHERE r.post_id = $2
		   AND r.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = $1::uuid)
		 ORDER BY r.created_at ASC
		 LIMIT 200`,
		userID, postID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch replies"})
	}
	defer rows.Close()

	replies := make([]fiber.Map, 0)
	for rows.Next() {
		var id, uid, nickname, content string
		var likes, replyCount int
		var createdAt time.Time
		var liked bool
		var parentID *string
		if err := rows.Scan(&id, &uid, &nickname, &content, &likes, &createdAt, &parentID, &replyCount, &liked); err != nil {
			continue
		}
		reply := fiber.Map{
			"id":          id,
			"user_id":     uid,
			"nickname":    nickname,
			"content":     content,
			"likes":       likes,
			"reply_count": replyCount,
			"created_at":  createdAt,
			"liked":       liked,
			"is_mine":     uid == userID,
		}
		if parentID != nil {
			reply["parent_id"] = *parentID
		}
		replies = append(replies, reply)
	}

	return c.JSON(fiber.Map{"replies": replies})
}

// POST /api/community/posts/:id/replies — supports parent_id for nested replies
func (h *Handler) CreateCommunityReply(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	var body struct {
		Content  string  `json:"content"`
		ParentID *string `json:"parent_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content required"})
	}
	if len(body.Content) > maxReplyLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reply too long"})
	}

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	var replyID string
	if body.ParentID != nil && *body.ParentID != "" {
		// Nested reply (1-level only — validate parent has no parent)
		var parentParentID *string
		err := pool.QueryRow(ctx,
			`SELECT parent_id FROM community_replies WHERE id = $1 AND post_id = $2`,
			*body.ParentID, postID,
		).Scan(&parentParentID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "parent reply not found"})
		}
		if parentParentID != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot nest replies deeper than 1 level"})
		}

		err = pool.QueryRow(ctx,
			`INSERT INTO community_replies (post_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING id`,
			postID, userID, body.Content, *body.ParentID,
		).Scan(&replyID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create reply"})
		}

		// Update parent reply_count
		pool.Exec(ctx,
			`UPDATE community_replies SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE parent_id = $1) WHERE id = $1`,
			*body.ParentID,
		)
	} else {
		err := pool.QueryRow(ctx,
			`INSERT INTO community_replies (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id`,
			postID, userID, body.Content,
		).Scan(&replyID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create reply"})
		}
	}

	// Update post reply count
	pool.Exec(ctx,
		`UPDATE community_posts SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

	return c.JSON(fiber.Map{"id": replyID})
}

// DELETE /api/community/posts/:id
func (h *Handler) DeleteCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	tag, err := pool.Exec(c.UserContext(),
		`DELETE FROM community_posts WHERE id = $1 AND user_id = $2`,
		postID, userID,
	)
	if err != nil || tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "cannot delete"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/community/posts/:id/report
func (h *Handler) ReportCommunityPost(c *fiber.Ctx) error {
	return h.handleReport(c, "post", c.Params("id"))
}

// POST /api/community/replies/:id/report
func (h *Handler) ReportCommunityReply(c *fiber.Ctx) error {
	return h.handleReport(c, "reply", c.Params("id"))
}

// POST /api/community/users/:id/report
func (h *Handler) ReportCommunityUser(c *fiber.Ctx) error {
	return h.handleReport(c, "user", c.Params("id"))
}

func (h *Handler) handleReport(c *fiber.Ctx, targetType, targetID string) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		Reason string `json:"reason"`
		Detail string `json:"detail"`
	}
	if err := c.BodyParser(&body); err != nil || body.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reason required"})
	}
	if !validReportReasons[body.Reason] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid reason"})
	}
	if len(body.Detail) > maxReportDetail {
		body.Detail = body.Detail[:maxReportDetail]
	}

	pool := h.slimeRepo.Pool()

	// Prevent duplicate reports
	var exists bool
	pool.QueryRow(c.UserContext(),
		`SELECT EXISTS(SELECT 1 FROM community_reports WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3)`,
		userID, targetType, targetID,
	).Scan(&exists)
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "already reported"})
	}

	_, err := pool.Exec(c.UserContext(),
		`INSERT INTO community_reports (reporter_id, target_type, target_id, reason, detail) VALUES ($1, $2, $3, $4, $5)`,
		userID, targetType, targetID, body.Reason, body.Detail,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to report"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/community/users/:id/block
func (h *Handler) BlockUser(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	blockedID := c.Params("id")

	if userID == blockedID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot block yourself"})
	}

	pool := h.slimeRepo.Pool()
	_, err := pool.Exec(c.UserContext(),
		`INSERT INTO community_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, blockedID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to block"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// DELETE /api/community/users/:id/block
func (h *Handler) UnblockUser(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	blockedID := c.Params("id")

	pool := h.slimeRepo.Pool()
	pool.Exec(c.UserContext(),
		`DELETE FROM community_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
		userID, blockedID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// GET /api/community/blocks
func (h *Handler) GetBlockedUsers(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT b.blocked_id, u.nickname FROM community_blocks b
		 JOIN users u ON u.id = b.blocked_id
		 WHERE b.blocker_id = $1
		 ORDER BY b.created_at DESC`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch blocked users"})
	}
	defer rows.Close()

	blocks := make([]fiber.Map, 0)
	for rows.Next() {
		var blockedID, nickname string
		if err := rows.Scan(&blockedID, &nickname); err != nil {
			continue
		}
		blocks = append(blocks, fiber.Map{
			"user_id":  blockedID,
			"nickname": nickname,
		})
	}

	return c.JSON(fiber.Map{"blocks": blocks})
}

// POST /api/community/replies/:id/like
func (h *Handler) LikeCommunityReply(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	replyID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	_, err := pool.Exec(ctx,
		`INSERT INTO community_reply_likes (reply_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		replyID, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like reply"})
	}

	pool.Exec(ctx,
		`UPDATE community_replies SET likes = (SELECT COUNT(*) FROM community_reply_likes WHERE reply_id = $1) WHERE id = $1`,
		replyID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/community/replies/:id/unlike
func (h *Handler) UnlikeCommunityReply(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	replyID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	pool.Exec(ctx, `DELETE FROM community_reply_likes WHERE reply_id = $1 AND user_id = $2`, replyID, userID)
	pool.Exec(ctx,
		`UPDATE community_replies SET likes = (SELECT COUNT(*) FROM community_reply_likes WHERE reply_id = $1) WHERE id = $1`,
		replyID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// Helper: get list of blocked user IDs
func (h *Handler) getBlockedUserIDs(c *fiber.Ctx, userID string) []string {
	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT blocked_id FROM community_blocks WHERE blocker_id = $1`,
		userID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}
