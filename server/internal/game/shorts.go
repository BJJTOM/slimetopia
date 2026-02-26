package game

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	maxShortTitle      = 100
	maxShortDesc       = 500
	maxCommentLength   = 200
	maxVideoSize       = 50 * 1024 * 1024 // 50MB
	uploadsDir         = "./uploads/shorts"
	dailyUploadLimit   = 5
	dailyCommentLimit  = 30
	dailyTipGoldLimit  = 1000
	dailyTipGemsLimit  = 10
	shortsFeedLimit    = 10
	commentsPageLimit  = 30
)

// POST /api/shorts/upload
func (h *Handler) UploadShort(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Rate limit: 5 uploads/day
	today := time.Now().Format("2006-01-02")
	key := "shorts_upload:" + userID + ":" + today
	count, _ := h.rdb.Get(ctx, key).Int()
	if count >= dailyUploadLimit {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "daily upload limit reached"})
	}

	title := c.FormValue("title")
	if title == "" || len(title) > maxShortTitle {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title required (max 100 chars)"})
	}

	description := c.FormValue("description")
	if len(description) > maxShortDesc {
		description = description[:maxShortDesc]
	}

	category := c.FormValue("category")
	if category == "" {
		category = "general"
	}

	visibility := c.FormValue("visibility")
	if visibility == "" {
		visibility = "public"
	}
	if visibility != "public" && visibility != "unlisted" && visibility != "private" {
		visibility = "public"
	}

	tagsRaw := c.FormValue("tags")
	var tags []string
	if tagsRaw != "" {
		for _, t := range strings.Split(tagsRaw, ",") {
			t = strings.TrimSpace(t)
			if t != "" && len(tags) < 10 {
				tags = append(tags, t)
			}
		}
	}

	linkedSpeciesID := c.FormValue("linked_species_id")

	// Get video file
	videoFile, err := c.FormFile("video")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "video file required"})
	}
	if videoFile.Size > maxVideoSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "video too large (max 50MB)"})
	}

	// Ensure uploads directory exists
	os.MkdirAll(uploadsDir, 0755)

	// Save video file
	videoID := uuid.New().String()
	ext := filepath.Ext(videoFile.Filename)
	if ext == "" {
		ext = ".mp4"
	}
	videoFilename := videoID + ext
	videoPath := filepath.Join(uploadsDir, videoFilename)
	videoURL := "/uploads/shorts/" + videoFilename

	src, err := videoFile.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to read video"})
	}
	defer src.Close()

	dst, err := os.Create(videoPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save video"})
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to write video"})
	}

	// Handle optional thumbnail
	thumbnailURL := ""
	thumbFile, err := c.FormFile("thumbnail")
	if err == nil && thumbFile != nil {
		thumbFilename := "thumb_" + videoID + ".jpg"
		thumbPath := filepath.Join(uploadsDir, thumbFilename)
		thumbnailURL = "/uploads/shorts/" + thumbFilename

		tsrc, err := thumbFile.Open()
		if err == nil {
			defer tsrc.Close()
			tdst, err := os.Create(thumbPath)
			if err == nil {
				defer tdst.Close()
				io.Copy(tdst, tsrc)
			}
		}
	}

	// Insert into DB
	pool := h.slimeRepo.Pool()
	var shortID string

	linkedQuery := "NULL"
	args := []interface{}{userID, title, description, videoURL, thumbnailURL, tags, category, visibility}
	argIdx := 9

	if linkedSpeciesID != "" {
		linkedQuery = fmt.Sprintf("$%d", argIdx)
		args = append(args, linkedSpeciesID)
	}

	err = pool.QueryRow(c.UserContext(),
		fmt.Sprintf(`INSERT INTO shorts (user_id, title, description, video_url, thumbnail_url, tags, category, visibility, linked_species_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, %s) RETURNING id`, linkedQuery),
		args...,
	).Scan(&shortID)
	if err != nil {
		// Clean up files on error
		os.Remove(videoPath)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create short"})
	}

	h.rdb.Incr(ctx, key)
	h.rdb.ExpireAt(ctx, key, time.Now().Add(24*time.Hour))

	return c.JSON(fiber.Map{"id": shortID, "video_url": videoURL})
}

// GET /api/shorts/feed?cursor=<uuid>&limit=10
func (h *Handler) GetShortsFeed(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	cursor := c.Query("cursor", "")
	limit := c.QueryInt("limit", shortsFeedLimit)
	if limit > 20 {
		limit = 20
	}

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	var shorts []fiber.Map

	if cursor != "" {
		// Get created_at for cursor
		var cursorTime time.Time
		err := pool.QueryRow(ctx, `SELECT created_at FROM shorts WHERE id = $1`, cursor).Scan(&cursorTime)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid cursor"})
		}

		rows, err := pool.Query(ctx,
			`SELECT s.id, s.user_id, u.nickname, s.title, s.description, s.video_url, s.thumbnail_url,
			        s.duration_ms, s.tags, s.category, s.linked_species_id, s.views, s.likes, s.comment_count, s.created_at,
			        EXISTS(SELECT 1 FROM shorts_likes l WHERE l.short_id = s.id AND l.user_id = $1) as liked
			 FROM shorts s
			 JOIN users u ON u.id = s.user_id
			 WHERE s.status = 'active' AND s.visibility = 'public' AND s.created_at < $2
			 ORDER BY s.created_at DESC
			 LIMIT $3`,
			userID, cursorTime, limit,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch feed"})
		}
		defer rows.Close()
		shorts = scanShorts(rows, userID)
	} else {
		rows, err := pool.Query(ctx,
			`SELECT s.id, s.user_id, u.nickname, s.title, s.description, s.video_url, s.thumbnail_url,
			        s.duration_ms, s.tags, s.category, s.linked_species_id, s.views, s.likes, s.comment_count, s.created_at,
			        EXISTS(SELECT 1 FROM shorts_likes l WHERE l.short_id = s.id AND l.user_id = $1) as liked
			 FROM shorts s
			 JOIN users u ON u.id = s.user_id
			 WHERE s.status = 'active' AND s.visibility = 'public'
			 ORDER BY s.created_at DESC
			 LIMIT $2`,
			userID, limit,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch feed"})
		}
		defer rows.Close()
		shorts = scanShorts(rows, userID)
	}

	var nextCursor string
	if len(shorts) == limit {
		nextCursor = shorts[len(shorts)-1]["id"].(string)
	}

	return c.JSON(fiber.Map{"shorts": shorts, "next_cursor": nextCursor})
}

type scannable2 interface {
	Next() bool
	Scan(...interface{}) error
}

func scanShorts(rows scannable2, userID string) []fiber.Map {
	shorts := make([]fiber.Map, 0)
	for rows.Next() {
		var id, uid, nickname, title, description, videoURL, thumbnailURL, category string
		var durationMs, views, likes, commentCount int
		var tags []string
		var linkedSpeciesID *int
		var createdAt time.Time
		var liked bool

		err := rows.Scan(&id, &uid, &nickname, &title, &description, &videoURL, &thumbnailURL,
			&durationMs, &tags, &category, &linkedSpeciesID, &views, &likes, &commentCount, &createdAt, &liked)
		if err != nil {
			continue
		}

		entry := fiber.Map{
			"id":            id,
			"user_id":       uid,
			"nickname":      nickname,
			"title":         title,
			"description":   description,
			"video_url":     videoURL,
			"thumbnail_url": thumbnailURL,
			"duration_ms":   durationMs,
			"tags":          tags,
			"category":      category,
			"views":         views,
			"likes":         likes,
			"comment_count": commentCount,
			"created_at":    createdAt,
			"liked":         liked,
			"is_mine":       uid == userID,
		}
		if linkedSpeciesID != nil {
			entry["linked_species_id"] = *linkedSpeciesID
		}
		shorts = append(shorts, entry)
	}
	return shorts
}

// GET /api/shorts/:id
func (h *Handler) GetShortDetail(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	var id, uid, nickname, title, description, videoURL, thumbnailURL, category, status string
	var durationMs, views, likes, commentCount int
	var tags []string
	var linkedSpeciesID *int
	var createdAt time.Time
	var liked bool

	err := pool.QueryRow(ctx,
		`SELECT s.id, s.user_id, u.nickname, s.title, s.description, s.video_url, s.thumbnail_url,
		        s.duration_ms, s.tags, s.category, s.linked_species_id, s.views, s.likes, s.comment_count, s.status, s.created_at,
		        EXISTS(SELECT 1 FROM shorts_likes l WHERE l.short_id = s.id AND l.user_id = $1) as liked
		 FROM shorts s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.id = $2`,
		userID, shortID,
	).Scan(&id, &uid, &nickname, &title, &description, &videoURL, &thumbnailURL,
		&durationMs, &tags, &category, &linkedSpeciesID, &views, &likes, &commentCount, &status, &createdAt, &liked)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "short not found"})
	}

	if status != "active" && uid != userID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "short not found"})
	}

	// Record view (UPSERT — one view per user)
	pool.Exec(ctx,
		`INSERT INTO shorts_views (short_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		shortID, userID,
	)
	// Update view count
	pool.Exec(ctx,
		`UPDATE shorts SET views = (SELECT COUNT(*) FROM shorts_views WHERE short_id = $1) WHERE id = $1`,
		shortID,
	)

	// Track mission progress
	h.missionRepo.IncrementProgress(c.Context(), userID, "watch_short")

	entry := fiber.Map{
		"id":            id,
		"user_id":       uid,
		"nickname":      nickname,
		"title":         title,
		"description":   description,
		"video_url":     videoURL,
		"thumbnail_url": thumbnailURL,
		"duration_ms":   durationMs,
		"tags":          tags,
		"category":      category,
		"views":         views + 1,
		"likes":         likes,
		"comment_count": commentCount,
		"created_at":    createdAt,
		"liked":         liked,
		"is_mine":       uid == userID,
	}
	if linkedSpeciesID != nil {
		entry["linked_species_id"] = *linkedSpeciesID
	}

	return c.JSON(entry)
}

// POST /api/shorts/:id/like
func (h *Handler) LikeShort(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	_, err := pool.Exec(ctx,
		`INSERT INTO shorts_likes (short_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		shortID, userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to like"})
	}

	pool.Exec(ctx,
		`UPDATE shorts SET likes = (SELECT COUNT(*) FROM shorts_likes WHERE short_id = $1) WHERE id = $1`,
		shortID,
	)

	// Track mission
	h.missionRepo.IncrementProgress(c.Context(), userID, "like_short")

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/shorts/:id/unlike
func (h *Handler) UnlikeShort(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	pool.Exec(ctx, `DELETE FROM shorts_likes WHERE short_id = $1 AND user_id = $2`, shortID, userID)
	pool.Exec(ctx,
		`UPDATE shorts SET likes = (SELECT COUNT(*) FROM shorts_likes WHERE short_id = $1) WHERE id = $1`,
		shortID,
	)

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/shorts/:id/react
func (h *Handler) ReactShort(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	var body struct {
		Emoji string `json:"emoji"`
	}
	if err := c.BodyParser(&body); err != nil || body.Emoji == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "emoji required"})
	}
	if len(body.Emoji) > 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid emoji"})
	}

	pool := h.slimeRepo.Pool()
	pool.Exec(c.UserContext(),
		`INSERT INTO shorts_reactions (short_id, user_id, emoji) VALUES ($1, $2, $3)
		 ON CONFLICT (short_id, user_id) DO UPDATE SET emoji = $3`,
		shortID, userID, body.Emoji,
	)

	return c.JSON(fiber.Map{"success": true, "emoji": body.Emoji})
}

// GET /api/shorts/:id/comments
func (h *Handler) GetShortComments(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT sc.id, sc.user_id, u.nickname, sc.content, sc.likes, sc.created_at,
		        EXISTS(SELECT 1 FROM shorts_comment_likes l WHERE l.comment_id = sc.id AND l.user_id = $1) as liked
		 FROM shorts_comments sc
		 JOIN users u ON u.id = sc.user_id
		 WHERE sc.short_id = $2
		 ORDER BY sc.created_at DESC
		 LIMIT $3`,
		userID, shortID, commentsPageLimit,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch comments"})
	}
	defer rows.Close()

	comments := make([]fiber.Map, 0)
	for rows.Next() {
		var id, uid, nickname, content string
		var likes int
		var createdAt time.Time
		var liked bool
		if err := rows.Scan(&id, &uid, &nickname, &content, &likes, &createdAt, &liked); err != nil {
			continue
		}
		comments = append(comments, fiber.Map{
			"id":         id,
			"user_id":    uid,
			"nickname":   nickname,
			"content":    content,
			"likes":      likes,
			"created_at": createdAt,
			"liked":      liked,
			"is_mine":    uid == userID,
		})
	}

	return c.JSON(fiber.Map{"comments": comments})
}

// POST /api/shorts/:id/comments
func (h *Handler) CreateShortComment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	var body struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&body); err != nil || body.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content required"})
	}
	if len(body.Content) > maxCommentLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "comment too long (max 200)"})
	}

	// Rate limit: 30 comments/day
	ctx := c.Context()
	today := time.Now().Format("2006-01-02")
	key := "shorts_comment:" + userID + ":" + today
	count, _ := h.rdb.Get(ctx, key).Int()
	if count >= dailyCommentLimit {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "daily comment limit reached"})
	}

	pool := h.slimeRepo.Pool()
	var commentID string
	err := pool.QueryRow(c.UserContext(),
		`INSERT INTO shorts_comments (short_id, user_id, content) VALUES ($1, $2, $3) RETURNING id`,
		shortID, userID, body.Content,
	).Scan(&commentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create comment"})
	}

	// Update comment count
	pool.Exec(c.UserContext(),
		`UPDATE shorts SET comment_count = (SELECT COUNT(*) FROM shorts_comments WHERE short_id = $1) WHERE id = $1`,
		shortID,
	)

	h.rdb.Incr(ctx, key)
	h.rdb.ExpireAt(ctx, key, time.Now().Add(24*time.Hour))

	return c.JSON(fiber.Map{"id": commentID})
}

// DELETE /api/shorts/:id
func (h *Handler) DeleteShort(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	shortID := c.Params("id")

	pool := h.slimeRepo.Pool()
	tag, err := pool.Exec(c.UserContext(),
		`UPDATE shorts SET status = 'deleted' WHERE id = $1 AND user_id = $2 AND status = 'active'`,
		shortID, userID,
	)
	if err != nil || tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "cannot delete"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// POST /api/shorts/:id/tip
func (h *Handler) TipShort(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	shortID := c.Params("id")

	var body struct {
		Type    string `json:"type"`
		Amount  int    `json:"amount"`
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}
	if body.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "amount must be positive"})
	}
	if body.Type != "gold" && body.Type != "gems" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "type must be 'gold' or 'gems'"})
	}

	// Find the short's owner
	var receiverID string
	err := pool.QueryRow(c.UserContext(),
		`SELECT user_id FROM shorts WHERE id = $1 AND status = 'active'`,
		shortID,
	).Scan(&receiverID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "short not found"})
	}

	if receiverID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot tip yourself"})
	}

	// Check daily limit
	today := time.Now().Truncate(24 * time.Hour)
	var dailyTotal int
	pool.QueryRow(c.UserContext(),
		`SELECT COALESCE(SUM(amount), 0) FROM shorts_tips
		 WHERE sender_id = $1 AND tip_type = $2 AND created_at >= $3`,
		userID, body.Type, today,
	).Scan(&dailyTotal)

	limit := dailyTipGoldLimit
	if body.Type == "gems" {
		limit = dailyTipGemsLimit
	}

	if dailyTotal+body.Amount > limit {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "daily_limit_exceeded",
			"remaining": limit - dailyTotal,
			"limit":     limit,
		})
	}

	// Deduct from sender, give to receiver
	if body.Type == "gold" {
		if err := h.userRepo.SpendCurrency(ctx, userID, int64(body.Amount), 0, 0); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_funds"})
		}
		h.userRepo.AddCurrency(ctx, receiverID, int64(body.Amount), 0, 0)
	} else {
		if err := h.userRepo.SpendCurrency(ctx, userID, 0, body.Amount, 0); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_funds"})
		}
		h.userRepo.AddCurrency(ctx, receiverID, 0, body.Amount, 0)
	}

	// Log the tip
	msg := body.Message
	if len(msg) > 200 {
		msg = msg[:200]
	}
	pool.Exec(c.UserContext(),
		`INSERT INTO shorts_tips (short_id, sender_id, receiver_id, tip_type, amount, message)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		shortID, userID, receiverID, body.Type, body.Amount, msg,
	)

	// Log shorts tip
	if body.Type == "gold" {
		LogGameAction(pool, userID, "shorts_tip_send", "shorts", -int64(body.Amount), 0, 0, map[string]interface{}{
			"short_id": shortID, "type": body.Type, "amount": body.Amount,
		})
		LogGameAction(pool, receiverID, "shorts_tip_receive", "shorts", int64(body.Amount), 0, 0, map[string]interface{}{
			"short_id": shortID, "type": body.Type, "amount": body.Amount,
		})
	} else {
		LogGameAction(pool, userID, "shorts_tip_send", "shorts", 0, -body.Amount, 0, map[string]interface{}{
			"short_id": shortID, "type": body.Type, "amount": body.Amount,
		})
		LogGameAction(pool, receiverID, "shorts_tip_receive", "shorts", 0, body.Amount, 0, map[string]interface{}{
			"short_id": shortID, "type": body.Type, "amount": body.Amount,
		})
	}

	// Send mailbox notification
	senderUser, _ := h.userRepo.FindByID(ctx, userID)
	senderNick := "???"
	if senderUser != nil {
		senderNick = senderUser.Nickname
	}

	title := senderNick + "님의 쇼츠 선물"
	mailBody := senderNick + "님이 쇼츠에 "
	if body.Type == "gold" {
		mailBody += intToStr(body.Amount) + "G를 보냈습니다!"
	} else {
		mailBody += intToStr(body.Amount) + " 젬을 보냈습니다!"
	}
	if msg != "" {
		mailBody += "\n메시지: " + msg
	}

	pool.Exec(c.UserContext(), `
		INSERT INTO mailbox (user_id, title, body, mail_type, reward_gold, reward_gems)
		VALUES ($1, $2, $3, 'gift', 0, 0)`,
		receiverID, title, mailBody,
	)

	return c.JSON(fiber.Map{"ok": true})
}

// GET /api/shorts/mine
func (h *Handler) GetMyShorts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	pool := h.slimeRepo.Pool()
	rows, err := pool.Query(c.UserContext(),
		`SELECT id, title, video_url, thumbnail_url, views, likes, comment_count, status, created_at
		 FROM shorts
		 WHERE user_id = $1 AND status != 'deleted'
		 ORDER BY created_at DESC
		 LIMIT 50`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch shorts"})
	}
	defer rows.Close()

	shorts := make([]fiber.Map, 0)
	var totalViews, totalLikes int

	for rows.Next() {
		var id, title, videoURL, thumbnailURL, status string
		var views, likes, commentCount int
		var createdAt time.Time
		if err := rows.Scan(&id, &title, &videoURL, &thumbnailURL, &views, &likes, &commentCount, &status, &createdAt); err != nil {
			continue
		}
		totalViews += views
		totalLikes += likes
		shorts = append(shorts, fiber.Map{
			"id":            id,
			"title":         title,
			"video_url":     videoURL,
			"thumbnail_url": thumbnailURL,
			"views":         views,
			"likes":         likes,
			"comment_count": commentCount,
			"status":        status,
			"created_at":    createdAt,
		})
	}

	// Total tips received
	var totalTipsGold, totalTipsGems int
	pool.QueryRow(c.UserContext(),
		`SELECT COALESCE(SUM(CASE WHEN tip_type='gold' THEN amount ELSE 0 END), 0),
		        COALESCE(SUM(CASE WHEN tip_type='gems' THEN amount ELSE 0 END), 0)
		 FROM shorts_tips WHERE receiver_id = $1`,
		userID,
	).Scan(&totalTipsGold, &totalTipsGems)

	return c.JSON(fiber.Map{
		"shorts":          shorts,
		"total_views":     totalViews,
		"total_likes":     totalLikes,
		"total_tips_gold": totalTipsGold,
		"total_tips_gems": totalTipsGems,
	})
}
