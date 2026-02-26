package admin

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

type LogEntry struct {
	Nickname  string
	Action    string
	Detail    string
	CreatedAt time.Time
}

func (h *AdminHandler) LogsPage(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	// Recent signups
	var recentSignups []LogEntry
	rows, err := h.pool.Query(ctx,
		`SELECT nickname, provider, created_at FROM users ORDER BY created_at DESC LIMIT 20`,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var nickname, provider string
			var createdAt time.Time
			if rows.Scan(&nickname, &provider, &createdAt) == nil {
				recentSignups = append(recentSignups, LogEntry{
					Nickname:  nickname,
					Action:    "가입",
					Detail:    "via " + provider,
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Recent community posts
	var recentPosts []LogEntry
	rows2, err := h.pool.Query(ctx,
		`SELECT u.nickname, p.post_type, LEFT(p.content, 50), p.created_at
		 FROM community_posts p JOIN users u ON u.id = p.user_id
		 ORDER BY p.created_at DESC LIMIT 20`,
	)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var nickname, postType, content string
			var createdAt time.Time
			if rows2.Scan(&nickname, &postType, &content, &createdAt) == nil {
				recentPosts = append(recentPosts, LogEntry{
					Nickname:  nickname,
					Action:    "게시글 [" + postType + "]",
					Detail:    content,
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Recent world boss attacks
	var recentBossAttacks []LogEntry
	rows3, err := h.pool.Query(ctx,
		`SELECT u.nickname, a.damage, a.created_at
		 FROM world_boss_attacks a JOIN users u ON u.id = a.user_id
		 ORDER BY a.created_at DESC LIMIT 20`,
	)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var nickname string
			var damage int
			var createdAt time.Time
			if rows3.Scan(&nickname, &damage, &createdAt) == nil {
				recentBossAttacks = append(recentBossAttacks, LogEntry{
					Nickname:  nickname,
					Action:    "보스 공격",
					Detail:    fmt.Sprintf("%d dmg", damage),
					CreatedAt: createdAt,
				})
			}
		}
	}

	// Game stats
	var totalCommunityPosts int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM community_posts`).Scan(&totalCommunityPosts)

	var totalBossAttacks int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM world_boss_attacks`).Scan(&totalBossAttacks)

	var totalGiftsSent int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM gift_logs`).Scan(&totalGiftsSent)

	return h.render(c, "logs.html", fiber.Map{
		"Title":               "활동 로그",
		"Username":            username,
		"RecentSignups":       recentSignups,
		"RecentPosts":         recentPosts,
		"RecentBossAttacks":   recentBossAttacks,
		"TotalCommunityPosts": totalCommunityPosts,
		"TotalBossAttacks":    totalBossAttacks,
		"TotalGiftsSent":      totalGiftsSent,
	})
}
