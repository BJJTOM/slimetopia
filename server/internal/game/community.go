package game

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

var validEmojis = map[string]bool{
	"❤️": true, "😂": true, "😮": true, "😢": true, "🔥": true, "👏": true,
}

// GET /api/community/posts?type=general&page=0&sort=new&q=search
func (h *Handler) GetCommunityPosts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postType := c.Query("type", "")
	page := c.QueryInt("page", 0)
	offset := page * postsPerPage
	searchQuery := c.Query("q", "")

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

	if searchQuery != "" {
		// Hybrid search: tsvector + ILIKE
		r, e := pool.Query(ctx,
			`SELECT p.id, p.user_id, u.nickname, p.content, p.post_type, p.likes, p.reply_count, p.created_at,
			        p.image_urls, p.view_count,
			        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked,
			        COALESCE(u.profile_image_url, ''),
			        p.reaction_counts, p.bookmark_count,
			        EXISTS(SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = $1) as bookmarked,
			        (SELECT emoji FROM community_post_reactions WHERE post_id = p.id AND user_id = $1) as my_reaction
			 FROM community_posts p
			 JOIN users u ON u.id = p.user_id
			 WHERE (p.search_vector @@ plainto_tsquery('simple', $2) OR p.content ILIKE '%' || $2 || '%')
			   AND p.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = $1::uuid)
			 ORDER BY p.created_at DESC
			 LIMIT $3 OFFSET $4`,
			userID, searchQuery, postsPerPage, offset,
		)
		if e != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to search posts"})
		}
		rows = r
	} else if postType != "" {
		r, e := pool.Query(ctx,
			`SELECT p.id, p.user_id, u.nickname, p.content, p.post_type, p.likes, p.reply_count, p.created_at,
			        p.image_urls, p.view_count,
			        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked,
			        COALESCE(u.profile_image_url, ''),
			        p.reaction_counts, p.bookmark_count,
			        EXISTS(SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = $1) as bookmarked,
			        (SELECT emoji FROM community_post_reactions WHERE post_id = p.id AND user_id = $1) as my_reaction
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
			        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked,
			        COALESCE(u.profile_image_url, ''),
			        p.reaction_counts, p.bookmark_count,
			        EXISTS(SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = $1) as bookmarked,
			        (SELECT emoji FROM community_post_reactions WHERE post_id = p.id AND user_id = $1) as my_reaction
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
		var likes, replyCount, viewCount, bookmarkCount int
		var createdAt time.Time
		var liked, bookmarked bool
		var imageURLs []string
		var profileImageURL string
		var reactionCountsJSON []byte
		var myReaction *string
		if err := rows.Scan(&id, &uid, &nickname, &content, &ptype, &likes, &replyCount, &createdAt, &imageURLs, &viewCount, &liked, &profileImageURL, &reactionCountsJSON, &bookmarkCount, &bookmarked, &myReaction); err != nil {
			continue
		}
		if imageURLs == nil {
			imageURLs = []string{}
		}
		var reactionCounts map[string]int
		json.Unmarshal(reactionCountsJSON, &reactionCounts)
		if reactionCounts == nil {
			reactionCounts = map[string]int{}
		}
		post := fiber.Map{
			"id":                id,
			"user_id":           uid,
			"nickname":          nickname,
			"content":           content,
			"post_type":         ptype,
			"likes":             likes,
			"reply_count":       replyCount,
			"view_count":        viewCount,
			"image_urls":        imageURLs,
			"created_at":        createdAt,
			"liked":             liked,
			"is_mine":           uid == userID,
			"profile_image_url": profileImageURL,
			"reaction_counts":   reactionCounts,
			"bookmark_count":    bookmarkCount,
			"bookmarked":        bookmarked,
		}
		if myReaction != nil {
			post["my_reaction"] = *myReaction
		}
		posts = append(posts, post)
	}

	return c.JSON(fiber.Map{"posts": posts, "page": page})
}

// POST /api/community/posts (multipart/form-data for images)
func (h *Handler) CreateCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	content := c.FormValue("content", "")
	postType := c.FormValue("post_type", "general")
	pollOptionsRaw := c.FormValue("poll_options", "")

	// Fallback to JSON body if not multipart
	if content == "" {
		var body struct {
			Content     string   `json:"content"`
			PostType    string   `json:"post_type"`
			PollOptions []string `json:"poll_options"`
		}
		if err := c.BodyParser(&body); err == nil && body.Content != "" {
			content = body.Content
			if body.PostType != "" {
				postType = body.PostType
			}
			if len(body.PollOptions) > 0 {
				raw, _ := json.Marshal(body.PollOptions)
				pollOptionsRaw = string(raw)
			}
		}
	}

	if content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content required"})
	}
	// Bug fix #2: Use utf8.RuneCountInString instead of len()
	if utf8.RuneCountInString(content) > maxPostLength {
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

	// Create poll if options provided
	if pollOptionsRaw != "" {
		var pollOptions []string
		if err := json.Unmarshal([]byte(pollOptionsRaw), &pollOptions); err == nil && len(pollOptions) >= 2 && len(pollOptions) <= 4 {
			expiresAt := time.Now().Add(24 * time.Hour)
			optionsJSON, _ := json.Marshal(pollOptions)
			pool.Exec(c.UserContext(),
				`INSERT INTO community_polls (post_id, options, expires_at) VALUES ($1, $2, $3)`,
				postID, optionsJSON, expiresAt,
			)
		}
	}

	h.rdb.Incr(ctx, key)
	h.rdb.ExpireAt(ctx, key, time.Now().Add(24*time.Hour))

	// Track mission
	h.missionRepo.IncrementProgress(ctx, userID, "community")

	return c.JSON(fiber.Map{"id": postID, "image_urls": imageURLs})
}

// POST /api/community/posts/:id/like — Bug fix #1: transaction + atomic + return new count
func (h *Handler) LikeCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like"})
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`INSERT INTO community_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		postID, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like"})
	}

	var newLikes int
	err = tx.QueryRow(ctx,
		`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1 RETURNING likes`,
		postID,
	).Scan(&newLikes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like"})
	}

	return c.JSON(fiber.Map{"success": true, "likes": newLikes})
}

// POST /api/community/posts/:id/unlike — Bug fix #1: transaction + atomic + return new count
func (h *Handler) UnlikeCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unlike"})
	}
	defer tx.Rollback(ctx)

	tx.Exec(ctx, `DELETE FROM community_post_likes WHERE post_id = $1 AND user_id = $2`, postID, userID)

	var newLikes int
	err = tx.QueryRow(ctx,
		`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1 RETURNING likes`,
		postID,
	).Scan(&newLikes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unlike"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unlike"})
	}

	return c.JSON(fiber.Map{"success": true, "likes": newLikes})
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
		        EXISTS(SELECT 1 FROM community_reply_likes l WHERE l.reply_id = r.id AND l.user_id = $1) as liked,
		        COALESCE(u.profile_image_url, '')
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
		var profileImageURL string
		if err := rows.Scan(&id, &uid, &nickname, &content, &likes, &createdAt, &parentID, &replyCount, &liked, &profileImageURL); err != nil {
			continue
		}
		reply := fiber.Map{
			"id":                id,
			"user_id":           uid,
			"nickname":          nickname,
			"content":           content,
			"likes":             likes,
			"reply_count":       replyCount,
			"created_at":        createdAt,
			"liked":             liked,
			"is_mine":           uid == userID,
			"profile_image_url": profileImageURL,
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
	// Bug fix #2: Use utf8.RuneCountInString instead of len()
	if utf8.RuneCountInString(body.Content) > maxReplyLength {
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

// Bug fix #4: DELETE /api/community/replies/:id
func (h *Handler) DeleteCommunityReply(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	replyID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Get post_id + parent_id before delete
	var postID string
	var parentID *string
	err := pool.QueryRow(ctx,
		`SELECT post_id, parent_id FROM community_replies WHERE id = $1 AND user_id = $2`,
		replyID, userID,
	).Scan(&postID, &parentID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "cannot delete"})
	}

	tag, err := pool.Exec(ctx,
		`DELETE FROM community_replies WHERE id = $1 AND user_id = $2`,
		replyID, userID,
	)
	if err != nil || tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "cannot delete"})
	}

	// Update parent reply_count if nested
	if parentID != nil {
		pool.Exec(ctx,
			`UPDATE community_replies SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE parent_id = $1) WHERE id = $1`,
			*parentID,
		)
	}

	// Update post reply count
	pool.Exec(ctx,
		`UPDATE community_posts SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

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
	if utf8.RuneCountInString(body.Detail) > maxReportDetail {
		runes := []rune(body.Detail)
		body.Detail = string(runes[:maxReportDetail])
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

// ===== NEW: Emoji Reactions =====

// POST /api/community/posts/:id/react
func (h *Handler) ReactCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	var body struct {
		Emoji string `json:"emoji"`
	}
	if err := c.BodyParser(&body); err != nil || body.Emoji == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "emoji required"})
	}
	if !validEmojis[body.Emoji] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid emoji"})
	}

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to react"})
	}
	defer tx.Rollback(ctx)

	// Upsert reaction (change if already exists)
	_, err = tx.Exec(ctx,
		`INSERT INTO community_post_reactions (post_id, user_id, emoji)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (post_id, user_id)
		 DO UPDATE SET emoji = $3`,
		postID, userID, body.Emoji,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to react"})
	}

	// Rebuild reaction_counts
	var countsJSON []byte
	err = tx.QueryRow(ctx,
		`UPDATE community_posts SET reaction_counts = (
			SELECT COALESCE(jsonb_object_agg(emoji, cnt), '{}')
			FROM (SELECT emoji, COUNT(*)::int as cnt FROM community_post_reactions WHERE post_id = $1 GROUP BY emoji) sub
		 ) WHERE id = $1 RETURNING reaction_counts`,
		postID,
	).Scan(&countsJSON)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to react"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to react"})
	}

	var counts map[string]int
	json.Unmarshal(countsJSON, &counts)

	return c.JSON(fiber.Map{"success": true, "reaction_counts": counts, "my_reaction": body.Emoji})
}

// DELETE /api/community/posts/:id/react
func (h *Handler) UnreactCommunityPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unreact"})
	}
	defer tx.Rollback(ctx)

	tx.Exec(ctx, `DELETE FROM community_post_reactions WHERE post_id = $1 AND user_id = $2`, postID, userID)

	// Rebuild reaction_counts
	var countsJSON []byte
	err = tx.QueryRow(ctx,
		`UPDATE community_posts SET reaction_counts = (
			SELECT COALESCE(jsonb_object_agg(emoji, cnt), '{}')
			FROM (SELECT emoji, COUNT(*)::int as cnt FROM community_post_reactions WHERE post_id = $1 GROUP BY emoji) sub
		 ) WHERE id = $1 RETURNING reaction_counts`,
		postID,
	).Scan(&countsJSON)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unreact"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unreact"})
	}

	var counts map[string]int
	json.Unmarshal(countsJSON, &counts)

	return c.JSON(fiber.Map{"success": true, "reaction_counts": counts})
}

// ===== NEW: Bookmarks =====

// POST /api/community/posts/:id/bookmark
func (h *Handler) BookmarkPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	_, err := pool.Exec(ctx,
		`INSERT INTO community_bookmarks (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		postID, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to bookmark"})
	}

	pool.Exec(ctx,
		`UPDATE community_posts SET bookmark_count = (SELECT COUNT(*) FROM community_bookmarks WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// DELETE /api/community/posts/:id/bookmark
func (h *Handler) UnbookmarkPost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	pool.Exec(ctx, `DELETE FROM community_bookmarks WHERE post_id = $1 AND user_id = $2`, postID, userID)
	pool.Exec(ctx,
		`UPDATE community_posts SET bookmark_count = (SELECT COUNT(*) FROM community_bookmarks WHERE post_id = $1) WHERE id = $1`,
		postID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// GET /api/community/bookmarks
func (h *Handler) GetBookmarks(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	page := c.QueryInt("page", 0)
	offset := page * postsPerPage

	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT p.id, p.user_id, u.nickname, p.content, p.post_type, p.likes, p.reply_count, p.created_at,
		        p.image_urls, p.view_count,
		        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked,
		        COALESCE(u.profile_image_url, ''),
		        p.reaction_counts, p.bookmark_count, true as bookmarked,
		        (SELECT emoji FROM community_post_reactions WHERE post_id = p.id AND user_id = $1) as my_reaction
		 FROM community_bookmarks bm
		 JOIN community_posts p ON p.id = bm.post_id
		 JOIN users u ON u.id = p.user_id
		 WHERE bm.user_id = $1
		 ORDER BY bm.created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, postsPerPage, offset,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch bookmarks"})
	}
	defer rows.Close()

	posts := make([]fiber.Map, 0)
	for rows.Next() {
		var id, uid, nickname, content, ptype string
		var likes, replyCount, viewCount, bookmarkCount int
		var createdAt time.Time
		var liked, bookmarked bool
		var imageURLs []string
		var profileImageURL string
		var reactionCountsJSON []byte
		var myReaction *string
		if err := rows.Scan(&id, &uid, &nickname, &content, &ptype, &likes, &replyCount, &createdAt, &imageURLs, &viewCount, &liked, &profileImageURL, &reactionCountsJSON, &bookmarkCount, &bookmarked, &myReaction); err != nil {
			continue
		}
		if imageURLs == nil {
			imageURLs = []string{}
		}
		var reactionCounts map[string]int
		json.Unmarshal(reactionCountsJSON, &reactionCounts)
		if reactionCounts == nil {
			reactionCounts = map[string]int{}
		}
		post := fiber.Map{
			"id": id, "user_id": uid, "nickname": nickname, "content": content,
			"post_type": ptype, "likes": likes, "reply_count": replyCount,
			"view_count": viewCount, "image_urls": imageURLs, "created_at": createdAt,
			"liked": liked, "is_mine": uid == userID, "profile_image_url": profileImageURL,
			"reaction_counts": reactionCounts, "bookmark_count": bookmarkCount, "bookmarked": bookmarked,
		}
		if myReaction != nil {
			post["my_reaction"] = *myReaction
		}
		posts = append(posts, post)
	}

	return c.JSON(fiber.Map{"posts": posts, "page": page})
}

// ===== NEW: Trending Posts =====

// GET /api/community/posts/trending?period=week&limit=3
func (h *Handler) GetTrendingPosts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	limit := c.QueryInt("limit", 3)
	if limit > 10 {
		limit = 10
	}

	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT p.id, p.user_id, u.nickname, p.content, p.post_type, p.likes, p.reply_count, p.created_at,
		        p.image_urls, p.view_count,
		        EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) as liked,
		        COALESCE(u.profile_image_url, ''),
		        p.reaction_counts, p.bookmark_count,
		        EXISTS(SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = $1) as bookmarked,
		        (SELECT emoji FROM community_post_reactions WHERE post_id = p.id AND user_id = $1) as my_reaction,
		        (
		          (SELECT COALESCE(COUNT(*), 0) FROM community_post_reactions WHERE post_id = p.id) * 3
		          + p.reply_count * 2
		          + p.view_count * 0.5
		          + p.bookmark_count * 2
		        ) / SQRT(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2) AS score
		 FROM community_posts p
		 JOIN users u ON u.id = p.user_id
		 WHERE p.created_at > now() - INTERVAL '7 days'
		   AND p.user_id NOT IN (SELECT blocked_id FROM community_blocks WHERE blocker_id = $1::uuid)
		 ORDER BY score DESC
		 LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch trending"})
	}
	defer rows.Close()

	posts := make([]fiber.Map, 0)
	rank := 1
	for rows.Next() {
		var id, uid, nickname, content, ptype string
		var likes, replyCount, viewCount, bookmarkCount int
		var createdAt time.Time
		var liked, bookmarked bool
		var imageURLs []string
		var profileImageURL string
		var reactionCountsJSON []byte
		var myReaction *string
		var score float64
		if err := rows.Scan(&id, &uid, &nickname, &content, &ptype, &likes, &replyCount, &createdAt, &imageURLs, &viewCount, &liked, &profileImageURL, &reactionCountsJSON, &bookmarkCount, &bookmarked, &myReaction, &score); err != nil {
			continue
		}
		if imageURLs == nil {
			imageURLs = []string{}
		}
		var reactionCounts map[string]int
		json.Unmarshal(reactionCountsJSON, &reactionCounts)
		if reactionCounts == nil {
			reactionCounts = map[string]int{}
		}
		post := fiber.Map{
			"id": id, "user_id": uid, "nickname": nickname, "content": content,
			"post_type": ptype, "likes": likes, "reply_count": replyCount,
			"view_count": viewCount, "image_urls": imageURLs, "created_at": createdAt,
			"liked": liked, "is_mine": uid == userID, "profile_image_url": profileImageURL,
			"reaction_counts": reactionCounts, "bookmark_count": bookmarkCount,
			"bookmarked": bookmarked, "rank": rank, "score": math.Round(score*10) / 10,
		}
		if myReaction != nil {
			post["my_reaction"] = *myReaction
		}
		posts = append(posts, post)
		rank++
	}

	return c.JSON(fiber.Map{"posts": posts})
}

// ===== NEW: Search Hashtags =====

// GET /api/community/tags/trending
func (h *Handler) GetTrendingTags(c *fiber.Ctx) error {
	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT tag, COUNT(*) as cnt FROM (
		   SELECT DISTINCT unnest(regexp_matches(content, '#([^\s#]+)', 'g')) as tag, id
		   FROM community_posts
		   WHERE created_at > now() - INTERVAL '7 days'
		 ) sub
		 GROUP BY tag ORDER BY cnt DESC LIMIT 10`,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch tags"})
	}
	defer rows.Close()

	tags := make([]fiber.Map, 0)
	for rows.Next() {
		var tag string
		var cnt int
		if err := rows.Scan(&tag, &cnt); err != nil {
			continue
		}
		tags = append(tags, fiber.Map{"tag": tag, "count": cnt})
	}

	return c.JSON(fiber.Map{"tags": tags})
}

// ===== NEW: Polls =====

// GET /api/community/posts/:id/poll
func (h *Handler) GetPoll(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	var pollID string
	var optionsJSON []byte
	var expiresAt time.Time
	err := pool.QueryRow(ctx,
		`SELECT id, options, expires_at FROM community_polls WHERE post_id = $1`,
		postID,
	).Scan(&pollID, &optionsJSON, &expiresAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return c.JSON(fiber.Map{"poll": nil})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch poll"})
	}

	var options []string
	json.Unmarshal(optionsJSON, &options)

	// Get vote counts per option
	voteRows, err := pool.Query(ctx,
		`SELECT option_index, COUNT(*) FROM community_poll_votes WHERE poll_id = $1 GROUP BY option_index`,
		pollID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch votes"})
	}
	defer voteRows.Close()

	voteCounts := make(map[int]int)
	totalVotes := 0
	for voteRows.Next() {
		var idx, cnt int
		if err := voteRows.Scan(&idx, &cnt); err == nil {
			voteCounts[idx] = cnt
			totalVotes += cnt
		}
	}

	// Get user's vote
	var myVote *int
	var optIdx int
	err = pool.QueryRow(ctx,
		`SELECT option_index FROM community_poll_votes WHERE poll_id = $1 AND user_id = $2`,
		pollID, userID,
	).Scan(&optIdx)
	if err == nil {
		myVote = &optIdx
	}

	// Build results
	results := make([]fiber.Map, len(options))
	for i, opt := range options {
		cnt := voteCounts[i]
		pct := 0.0
		if totalVotes > 0 {
			pct = math.Round(float64(cnt)/float64(totalVotes)*1000) / 10
		}
		results[i] = fiber.Map{
			"option":  opt,
			"votes":   cnt,
			"percent": pct,
		}
	}

	return c.JSON(fiber.Map{
		"poll": fiber.Map{
			"id":          pollID,
			"options":     results,
			"total_votes": totalVotes,
			"my_vote":     myVote,
			"expires_at":  expiresAt,
			"expired":     time.Now().After(expiresAt),
		},
	})
}

// POST /api/community/posts/:id/vote
func (h *Handler) VotePoll(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	postID := c.Params("id")

	var body struct {
		OptionIndex int `json:"option_index"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "option_index required"})
	}

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Get poll
	var pollID string
	var optionsJSON []byte
	var expiresAt time.Time
	err := pool.QueryRow(ctx,
		`SELECT id, options, expires_at FROM community_polls WHERE post_id = $1`,
		postID,
	).Scan(&pollID, &optionsJSON, &expiresAt)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "poll not found"})
	}

	// Check expiry
	if time.Now().After(expiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "poll expired"})
	}

	var options []string
	json.Unmarshal(optionsJSON, &options)
	if body.OptionIndex < 0 || body.OptionIndex >= len(options) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid option"})
	}

	// Upsert vote (allows changing vote)
	_, err = pool.Exec(ctx,
		`INSERT INTO community_poll_votes (poll_id, user_id, option_index)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (poll_id, user_id)
		 DO UPDATE SET option_index = $3`,
		pollID, userID, body.OptionIndex,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to vote"})
	}

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
