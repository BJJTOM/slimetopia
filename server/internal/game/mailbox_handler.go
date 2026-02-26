package game

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MailItem represents a mail entry returned to clients
type MailItem struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Body       string  `json:"body"`
	MailType   string  `json:"mail_type"`
	RewardGold int64   `json:"reward_gold"`
	RewardGems int     `json:"reward_gems"`
	Read       bool    `json:"read"`
	Claimed    bool    `json:"claimed"`
	CreatedAt  string  `json:"created_at"`
	ExpiresAt  *string `json:"expires_at,omitempty"`
}

// GetMailbox returns user's personal + global announcement mails
func (h *Handler) GetMailbox(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	rows, err := pool.Query(ctx, `
		(SELECT m.id::text, m.title, m.body, m.mail_type, m.reward_gold, m.reward_gems,
			COALESCE(mc.read_at IS NOT NULL, m.read) as is_read,
			COALESCE(mc.claimed, m.claimed) as is_claimed,
			m.created_at, m.expires_at
		FROM mailbox m
		LEFT JOIN mailbox_claims mc ON mc.mail_id = m.id AND mc.user_id = $1
		WHERE (m.user_id = $1 OR m.user_id IS NULL)
			AND (m.expires_at IS NULL OR m.expires_at > NOW()))
		UNION ALL
		(SELECT 'ann_' || a.id::text as id, a.title, a.content as body,
			'announcement' as mail_type, 0::bigint as reward_gold, 0 as reward_gems,
			COALESCE(mc.read_at IS NOT NULL, false) as is_read,
			true as is_claimed,
			a.created_at, a.expires_at
		FROM announcements a
		LEFT JOIN mailbox_claims mc ON mc.mail_id = 'ann_' || a.id::text AND mc.user_id = $1
		WHERE a.active = true
			AND (a.expires_at IS NULL OR a.expires_at > NOW()))
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch mailbox"})
	}
	defer rows.Close()

	mails := make([]MailItem, 0)
	unreadCount := 0
	for rows.Next() {
		var m MailItem
		var createdAt time.Time
		var expiresAt *time.Time
		if err := rows.Scan(&m.ID, &m.Title, &m.Body, &m.MailType, &m.RewardGold, &m.RewardGems,
			&m.Read, &m.Claimed, &createdAt, &expiresAt); err != nil {
			continue
		}
		m.CreatedAt = createdAt.Format(time.RFC3339)
		if expiresAt != nil {
			s := expiresAt.Format(time.RFC3339)
			m.ExpiresAt = &s
		}
		if !m.Read {
			unreadCount++
		}
		mails = append(mails, m)
	}

	return c.JSON(fiber.Map{
		"mails":        mails,
		"unread_count": unreadCount,
	})
}

// ReadMail marks a mail as read
func (h *Handler) ReadMail(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	mailID := c.Params("id")
	ctx := c.Context()
	pool := h.userRepo.Pool()

	// For personal mails, update directly
	pool.Exec(ctx, `UPDATE mailbox SET read = true WHERE id = $1 AND user_id = $2`, mailID, userID)

	// Upsert into claims for global mails
	pool.Exec(ctx, `
		INSERT INTO mailbox_claims (mail_id, user_id, read_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (mail_id, user_id) DO UPDATE SET read_at = NOW()
	`, mailID, userID)

	return c.JSON(fiber.Map{"ok": true})
}

// ClaimMail claims rewards from a mail
func (h *Handler) ClaimMail(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	mailID := c.Params("id")
	ctx := c.Context()
	pool := h.userRepo.Pool()

	// Check if already claimed (personal or via claims table)
	var alreadyClaimed bool
	err := pool.QueryRow(ctx, `
		SELECT COALESCE(
			(SELECT claimed FROM mailbox_claims WHERE mail_id = $1 AND user_id = $2),
			(SELECT claimed FROM mailbox WHERE id = $1 AND user_id = $2),
			false
		)
	`, mailID, userID).Scan(&alreadyClaimed)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "mail not found"})
	}
	if alreadyClaimed {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already claimed"})
	}

	// Get mail info
	var rewardGold int64
	var rewardGems int
	err = pool.QueryRow(ctx, `SELECT reward_gold, reward_gems FROM mailbox WHERE id = $1`, mailID).Scan(&rewardGold, &rewardGems)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "mail not found"})
	}

	if rewardGold == 0 && rewardGems == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no rewards to claim"})
	}

	// Grant rewards
	if err := h.userRepo.AddCurrency(ctx, userID, rewardGold, rewardGems, 0); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to grant rewards"})
	}

	// Mark claimed (personal mail)
	pool.Exec(ctx, `UPDATE mailbox SET claimed = true, read = true WHERE id = $1 AND user_id = $2`, mailID, userID)

	// Upsert claims for global mails
	pool.Exec(ctx, `
		INSERT INTO mailbox_claims (mail_id, user_id, read_at, claimed)
		VALUES ($1, $2, NOW(), true)
		ON CONFLICT (mail_id, user_id) DO UPDATE SET claimed = true
	`, mailID, userID)

	user, _ := h.userRepo.FindByID(ctx, userID)

	return c.JSON(fiber.Map{
		"ok":          true,
		"reward_gold": rewardGold,
		"reward_gems": rewardGems,
		"user": fiber.Map{
			"gold": user.Gold,
			"gems": user.Gems,
		},
	})
}

// GetCollectionCount returns the number of unique (species, personality) combinations
func (h *Handler) GetCollectionCount(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	var count int
	err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM collection_entries WHERE user_id = $1`, userID).Scan(&count)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to count collection"})
	}

	return c.JSON(fiber.Map{"count": count})
}

// UpsertCollectionEntry inserts a new collection entry if not exists
func UpsertCollectionEntry(ctx context.Context, pool *pgxpool.Pool, userID string, speciesID int, personality string) {
	pool.Exec(ctx, `INSERT INTO collection_entries (user_id, species_id, personality)
		VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, userID, speciesID, personality)
}
