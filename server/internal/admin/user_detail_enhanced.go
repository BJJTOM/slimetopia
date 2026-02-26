package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type UserDetailSlime struct {
	ID          string
	SpeciesName string
	Element     string
	Grade       string
	Level       int
	Personality string
	Affection   int
	Hunger      int
	Condition   int
	IsSick      bool
}

type UserDetailFull struct {
	ID              string
	Nickname        string
	Provider        string
	Gold            int64
	Gems            int
	Stardust        int
	Level           int
	Banned          bool
	BannedAt        *time.Time
	BannedReason    string
	BannedBy        string
	BanExpiresAt    *time.Time
	CreatedAt       time.Time
	SlimeCount      int
	CollectionCount int
	MaterialCount   int
	AttendanceDays  int
	AchievementCount int
	ActiveExplores  int
	Slimes          []UserDetailSlime
}

func (h *AdminHandler) UserDetailEnhanced(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	userID := c.Params("id")
	message := c.Query("msg")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	slimeLimit := 20
	slimeOffset := (page - 1) * slimeLimit

	// Fetch user basic info
	var user UserDetailFull
	var bannedAt, banExpiresAt *time.Time
	var bannedReason, bannedBy *string
	err := h.pool.QueryRow(ctx,
		`SELECT id, nickname, COALESCE(provider, 'email'), gold, gems, stardust, level,
		        banned, banned_at, COALESCE(banned_reason, ''), COALESCE(banned_by, ''), ban_expires_at, created_at
		 FROM users WHERE id = $1`, userID,
	).Scan(&user.ID, &user.Nickname, &user.Provider, &user.Gold, &user.Gems, &user.Stardust, &user.Level,
		&user.Banned, &bannedAt, &bannedReason, &bannedBy, &banExpiresAt, &user.CreatedAt)
	if err != nil {
		return c.Redirect("/admin/users?msg=not_found")
	}
	user.BannedAt = bannedAt
	user.BanExpiresAt = banExpiresAt
	if bannedReason != nil {
		user.BannedReason = *bannedReason
	}
	if bannedBy != nil {
		user.BannedBy = *bannedBy
	}

	// Slime count
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM slimes WHERE user_id = $1`, userID).Scan(&user.SlimeCount)

	// Collection count
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM collection_entries WHERE user_id = $1`, userID).Scan(&user.CollectionCount)

	// Material count
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(quantity), 0) FROM user_materials WHERE user_id = $1`, userID).Scan(&user.MaterialCount)

	// Attendance days (this month)
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM attendance WHERE user_id = $1 AND date >= date_trunc('month', CURRENT_DATE)`,
		userID,
	).Scan(&user.AttendanceDays)

	// Achievement count
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM achievements WHERE user_id = $1`, userID).Scan(&user.AchievementCount)

	// Active explorations
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM explorations WHERE user_id = $1 AND claimed = FALSE AND ends_at > NOW()`,
		userID,
	).Scan(&user.ActiveExplores)

	// Paginated slimes
	rows, err := h.pool.Query(ctx,
		`SELECT s.id, sp.name, s.element, sp.grade, s.level, s.personality, s.affection, s.hunger, s.condition, s.is_sick
		 FROM slimes s JOIN slime_species sp ON sp.id = s.species_id
		 WHERE s.user_id = $1 ORDER BY s.level DESC LIMIT $2 OFFSET $3`,
		userID, slimeLimit, slimeOffset,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var sl UserDetailSlime
			if rows.Scan(&sl.ID, &sl.SpeciesName, &sl.Element, &sl.Grade, &sl.Level,
				&sl.Personality, &sl.Affection, &sl.Hunger, &sl.Condition, &sl.IsSick) == nil {
				user.Slimes = append(user.Slimes, sl)
			}
		}
	}

	totalSlimePages := (user.SlimeCount + slimeLimit - 1) / slimeLimit
	if totalSlimePages < 1 {
		totalSlimePages = 1
	}

	// Gacha pity
	type PityEntry struct {
		EggType   string
		PullCount int
	}
	var pityEntries []PityEntry
	pityRows, err := h.pool.Query(ctx,
		`SELECT egg_type, pull_count FROM gacha_pity WHERE user_id = $1 ORDER BY egg_type`, userID,
	)
	if err == nil {
		defer pityRows.Close()
		for pityRows.Next() {
			var p PityEntry
			if pityRows.Scan(&p.EggType, &p.PullCount) == nil {
				pityEntries = append(pityEntries, p)
			}
		}
	}

	return h.render(c, "user_detail_enhanced.html", fiber.Map{
		"Title":           fmt.Sprintf("유저: %s", user.Nickname),
		"Username":        username,
		"User":            user,
		"Message":         message,
		"Pity":            pityEntries,
		"SlimePage":       page,
		"SlimeTotalPages": totalSlimePages,
		"SlimeHasPrev":    page > 1,
		"SlimeHasNext":    page < totalSlimePages,
		"SlimePrevPage":   page - 1,
		"SlimeNextPage":   page + 1,
	})
}

func (h *AdminHandler) EditUser(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	userID := c.Params("id")

	gold, _ := strconv.ParseInt(c.FormValue("gold"), 10, 64)
	gems, _ := strconv.Atoi(c.FormValue("gems"))
	stardust, _ := strconv.Atoi(c.FormValue("stardust"))
	level, _ := strconv.Atoi(c.FormValue("level"))

	if gold == 0 && gems == 0 && stardust == 0 && level == 0 {
		return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=no_change", userID))
	}

	if level > 0 {
		_, err := h.pool.Exec(ctx,
			`UPDATE users SET gold = gold + $1, gems = gems + $2, stardust = stardust + $3, level = $4, updated_at = NOW() WHERE id = $5`,
			gold, gems, stardust, level, userID,
		)
		if err != nil {
			return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=error", userID))
		}
	} else {
		_, err := h.pool.Exec(ctx,
			`UPDATE users SET gold = gold + $1, gems = gems + $2, stardust = stardust + $3, updated_at = NOW() WHERE id = $4`,
			gold, gems, stardust, userID,
		)
		if err != nil {
			return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=error", userID))
		}
	}

	detail := fmt.Sprintf("gold:%+d gems:%+d stardust:%+d level:%d", gold, gems, stardust, level)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "edit_user", "user", userID, detail)

	return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=edited", userID))
}

func (h *AdminHandler) BanUser(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	userID := c.Params("id")

	reason := c.FormValue("reason")
	duration := c.FormValue("duration") // "permanent", "7d", "30d", "custom"
	customExpiry := c.FormValue("custom_expiry")

	var expiresAt *time.Time
	switch duration {
	case "7d":
		t := time.Now().Add(7 * 24 * time.Hour)
		expiresAt = &t
	case "30d":
		t := time.Now().Add(30 * 24 * time.Hour)
		expiresAt = &t
	case "custom":
		if customExpiry != "" {
			t, err := time.Parse("2006-01-02", customExpiry)
			if err == nil {
				expiresAt = &t
			}
		}
	}

	_, err := h.pool.Exec(ctx,
		`UPDATE users SET banned = TRUE, banned_at = NOW(), banned_reason = $1, banned_by = $2, ban_expires_at = $3, updated_at = NOW()
		 WHERE id = $4`,
		reason, adminUsername, expiresAt, userID,
	)
	if err != nil {
		return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=ban_error", userID))
	}

	detail := fmt.Sprintf("reason:%s duration:%s", reason, duration)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "ban_user", "user", userID, detail)

	return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=banned", userID))
}

func (h *AdminHandler) UnbanUser(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	userID := c.Params("id")

	_, err := h.pool.Exec(ctx,
		`UPDATE users SET banned = FALSE, banned_at = NULL, banned_reason = NULL, banned_by = NULL, ban_expires_at = NULL, updated_at = NOW()
		 WHERE id = $1`,
		userID,
	)
	if err != nil {
		return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=unban_error", userID))
	}

	logAdminAction(h.pool, ctx, adminID, adminUsername, "unban_user", "user", userID, "")

	return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=unbanned", userID))
}
