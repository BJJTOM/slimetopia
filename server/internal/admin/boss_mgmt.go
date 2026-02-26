package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type BossInfo struct {
	ID        int
	Name      string
	Element   string
	MaxHP     int64
	CurrentHP int64
	Stage     int
	RewardGold int
	RewardGems int
	CreatedAt time.Time
	ExpiresAt time.Time
}

type BossAttackRank struct {
	Rank     int
	Nickname string
	Damage   int64
}

func (h *AdminHandler) WorldBossStatus(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	message := c.Query("msg")

	// Current/recent bosses
	var bosses []BossInfo
	bossRows, err := h.pool.Query(ctx,
		`SELECT id, name, element, max_hp, current_hp, COALESCE(stage, 1), reward_gold, reward_gems, created_at, expires_at
		 FROM world_boss ORDER BY id DESC LIMIT 5`)
	if err == nil {
		defer bossRows.Close()
		for bossRows.Next() {
			var b BossInfo
			if bossRows.Scan(&b.ID, &b.Name, &b.Element, &b.MaxHP, &b.CurrentHP, &b.Stage,
				&b.RewardGold, &b.RewardGems, &b.CreatedAt, &b.ExpiresAt) == nil {
				bosses = append(bosses, b)
			}
		}
	}

	// Top 20 attackers for current boss
	var attackRanking []BossAttackRank
	if len(bosses) > 0 {
		rankRows, err := h.pool.Query(ctx,
			`SELECT u.nickname, SUM(wba.damage) as total_dmg
			 FROM world_boss_attacks wba JOIN users u ON u.id = wba.user_id
			 WHERE wba.boss_id = $1
			 GROUP BY u.nickname ORDER BY total_dmg DESC LIMIT 20`,
			bosses[0].ID,
		)
		if err == nil {
			defer rankRows.Close()
			rank := 1
			for rankRows.Next() {
				var r BossAttackRank
				r.Rank = rank
				if rankRows.Scan(&r.Nickname, &r.Damage) == nil {
					attackRanking = append(attackRanking, r)
					rank++
				}
			}
		}
	}

	return h.render(c, "boss.html", fiber.Map{
		"Title":         "월드보스 관리",
		"Username":      username,
		"Bosses":        bosses,
		"AttackRanking": attackRanking,
		"Message":       message,
	})
}

func (h *AdminHandler) CreateWorldBoss(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)

	name := c.FormValue("name")
	element := c.FormValue("element")
	maxHP, _ := strconv.ParseInt(c.FormValue("max_hp"), 10, 64)
	rewardGold, _ := strconv.Atoi(c.FormValue("reward_gold"))
	rewardGems, _ := strconv.Atoi(c.FormValue("reward_gems"))
	expiresIn := c.FormValue("expires_in") // "24h", "48h", "72h", "custom"
	customExpiry := c.FormValue("custom_expiry")

	if name == "" || element == "" || maxHP <= 0 {
		return c.Redirect("/admin/boss?msg=required")
	}

	var expiresAt time.Time
	switch expiresIn {
	case "24h":
		expiresAt = time.Now().Add(24 * time.Hour)
	case "48h":
		expiresAt = time.Now().Add(48 * time.Hour)
	case "72h":
		expiresAt = time.Now().Add(72 * time.Hour)
	default:
		if customExpiry != "" {
			t, err := time.Parse("2006-01-02T15:04", customExpiry)
			if err == nil {
				expiresAt = t
			} else {
				expiresAt = time.Now().Add(24 * time.Hour)
			}
		} else {
			expiresAt = time.Now().Add(24 * time.Hour)
		}
	}

	var bossID int
	err := h.pool.QueryRow(ctx,
		`INSERT INTO world_boss (name, element, max_hp, current_hp, reward_gold, reward_gems, expires_at)
		 VALUES ($1, $2, $3, $3, $4, $5, $6) RETURNING id`,
		name, element, maxHP, rewardGold, rewardGems, expiresAt,
	).Scan(&bossID)
	if err != nil {
		return c.Redirect("/admin/boss?msg=error")
	}

	detail := fmt.Sprintf("name:%s element:%s hp:%d gold:%d gems:%d", name, element, maxHP, rewardGold, rewardGems)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "create_boss", "world_boss", fmt.Sprintf("%d", bossID), detail)

	return c.Redirect("/admin/boss?msg=created")
}
