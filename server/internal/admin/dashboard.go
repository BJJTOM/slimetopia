package admin

import (
	"github.com/gofiber/fiber/v2"
)

type SignupTrend struct {
	Date  string
	Count int
}

type TopUser struct {
	Nickname string
	Value    int64
}

type GradeDistribution struct {
	Grade string
	Count int
}

type ElementPopularity struct {
	Element string
	Count   int
}

type DAUTrend struct {
	Date  string
	Count int
}

type ActionCount struct {
	Action string
	Count  int
}

func (h *AdminHandler) Dashboard(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	// Basic stats
	var totalUsers, totalSlimes, todayActive int
	var totalGold, totalGems int64
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&totalUsers)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM slimes`).Scan(&totalSlimes)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE updated_at >= CURRENT_DATE`).Scan(&todayActive)
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(gold), 0) FROM users`).Scan(&totalGold)
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(gems), 0) FROM users`).Scan(&totalGems)

	// MAU (30 days)
	var mau int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE updated_at >= CURRENT_DATE - INTERVAL '30 days'`).Scan(&mau)

	// Average economy
	var avgGold, avgGems float64
	if totalUsers > 0 {
		avgGold = float64(totalGold) / float64(totalUsers)
		avgGems = float64(totalGems) / float64(totalUsers)
	}

	// Signup trend (last 7 days)
	var signupTrend []SignupTrend
	trendRows, err := h.pool.Query(ctx,
		`SELECT TO_CHAR(created_at::date, 'MM/DD') as d, COUNT(*)
		 FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
		 GROUP BY created_at::date ORDER BY created_at::date`)
	if err == nil {
		defer trendRows.Close()
		for trendRows.Next() {
			var t SignupTrend
			if trendRows.Scan(&t.Date, &t.Count) == nil {
				signupTrend = append(signupTrend, t)
			}
		}
	}

	// Grade distribution
	var gradeDistribution []GradeDistribution
	gradeRows, err := h.pool.Query(ctx,
		`SELECT sp.grade, COUNT(*) FROM slimes s JOIN slime_species sp ON sp.id = s.species_id
		 GROUP BY sp.grade ORDER BY COUNT(*) DESC`)
	if err == nil {
		defer gradeRows.Close()
		for gradeRows.Next() {
			var g GradeDistribution
			if gradeRows.Scan(&g.Grade, &g.Count) == nil {
				gradeDistribution = append(gradeDistribution, g)
			}
		}
	}

	// Element popularity
	var elementPopularity []ElementPopularity
	elemRows, err := h.pool.Query(ctx,
		`SELECT element, COUNT(*) FROM slimes GROUP BY element ORDER BY COUNT(*) DESC`)
	if err == nil {
		defer elemRows.Close()
		for elemRows.Next() {
			var e ElementPopularity
			if elemRows.Scan(&e.Element, &e.Count) == nil {
				elementPopularity = append(elementPopularity, e)
			}
		}
	}

	// Top 10 by collection
	var topCollection []TopUser
	tcRows, err := h.pool.Query(ctx,
		`SELECT u.nickname, COUNT(*) as cnt FROM collection_entries ce
		 JOIN users u ON u.id = ce.user_id GROUP BY u.nickname ORDER BY cnt DESC LIMIT 10`)
	if err == nil {
		defer tcRows.Close()
		for tcRows.Next() {
			var t TopUser
			if tcRows.Scan(&t.Nickname, &t.Value) == nil {
				topCollection = append(topCollection, t)
			}
		}
	}

	// Top 10 by gold
	var topGold []TopUser
	tgRows, err := h.pool.Query(ctx,
		`SELECT nickname, gold FROM users ORDER BY gold DESC LIMIT 10`)
	if err == nil {
		defer tgRows.Close()
		for tgRows.Next() {
			var t TopUser
			if tgRows.Scan(&t.Nickname, &t.Value) == nil {
				topGold = append(topGold, t)
			}
		}
	}

	// Top 10 by level
	var topLevel []TopUser
	tlRows, err := h.pool.Query(ctx,
		`SELECT nickname, level FROM users ORDER BY level DESC LIMIT 10`)
	if err == nil {
		defer tlRows.Close()
		for tlRows.Next() {
			var t TopUser
			if tlRows.Scan(&t.Nickname, &t.Value) == nil {
				topLevel = append(topLevel, t)
			}
		}
	}

	// Active explorations
	var activeExplores int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM explorations WHERE claimed = FALSE AND ends_at > NOW()`).Scan(&activeExplores)

	// Today's community stats
	var todayPosts, todayReplies int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM community_posts WHERE created_at >= CURRENT_DATE`).Scan(&todayPosts)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM community_replies WHERE created_at >= CURRENT_DATE`).Scan(&todayReplies)

	// World boss status
	var bossName string
	var bossCurrentHP, bossMaxHP int64
	h.pool.QueryRow(ctx,
		`SELECT name, current_hp, max_hp FROM world_boss WHERE expires_at > NOW() ORDER BY id DESC LIMIT 1`,
	).Scan(&bossName, &bossCurrentHP, &bossMaxHP)

	// Pending reports
	var pendingReports int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM community_reports WHERE status = 'pending'`).Scan(&pendingReports)

	// ─── game_logs-based analytics ───

	// DAU trend (14 days) from game_logs
	var dauTrend []DAUTrend
	dauRows, err := h.pool.Query(ctx,
		`SELECT TO_CHAR(created_at::date, 'MM/DD'), COUNT(DISTINCT user_id)
		 FROM game_logs WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
		 GROUP BY created_at::date ORDER BY created_at::date`)
	if err == nil {
		defer dauRows.Close()
		for dauRows.Next() {
			var d DAUTrend
			if dauRows.Scan(&d.Date, &d.Count) == nil {
				dauTrend = append(dauTrend, d)
			}
		}
	}

	// Retention: D1, D7, D30 (as percentage rates)
	var retD1, retD7, retD30 int
	// D1: of users who signed up yesterday, how many came back today?
	h.pool.QueryRow(ctx,
		`SELECT CASE WHEN cohort = 0 THEN 0 ELSE retained * 100 / cohort END FROM (
			SELECT COUNT(*) AS cohort,
			       COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE) AS retained
			FROM users WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'
		) sub`).Scan(&retD1)
	// D7: of users who signed up 7 days ago, how many were active in last 2 days?
	h.pool.QueryRow(ctx,
		`SELECT CASE WHEN cohort = 0 THEN 0 ELSE retained * 100 / cohort END FROM (
			SELECT COUNT(*) AS cohort,
			       COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '1 day') AS retained
			FROM users WHERE created_at::date = CURRENT_DATE - INTERVAL '7 days'
		) sub`).Scan(&retD7)
	// D30: of users who signed up 30 days ago, how many were active in last 2 days?
	h.pool.QueryRow(ctx,
		`SELECT CASE WHEN cohort = 0 THEN 0 ELSE retained * 100 / cohort END FROM (
			SELECT COUNT(*) AS cohort,
			       COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '1 day') AS retained
			FROM users WHERE created_at::date = CURRENT_DATE - INTERVAL '30 days'
		) sub`).Scan(&retD30)

	// Economy health: today's gold/gems in/out
	var goldIn, goldOut, gemsIn, gemsOut int64
	h.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(gold_delta), 0) FROM game_logs WHERE created_at >= CURRENT_DATE AND gold_delta > 0`).Scan(&goldIn)
	h.pool.QueryRow(ctx,
		`SELECT COALESCE(ABS(SUM(gold_delta)), 0) FROM game_logs WHERE created_at >= CURRENT_DATE AND gold_delta < 0`).Scan(&goldOut)
	h.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(gems_delta), 0) FROM game_logs WHERE created_at >= CURRENT_DATE AND gems_delta > 0`).Scan(&gemsIn)
	h.pool.QueryRow(ctx,
		`SELECT COALESCE(ABS(SUM(gems_delta)), 0) FROM game_logs WHERE created_at >= CURRENT_DATE AND gems_delta < 0`).Scan(&gemsOut)

	// Action distribution: today's top 10
	var actionDist []ActionCount
	actRows, err := h.pool.Query(ctx,
		`SELECT action, COUNT(*) FROM game_logs WHERE created_at >= CURRENT_DATE
		 GROUP BY action ORDER BY COUNT(*) DESC LIMIT 10`)
	if err == nil {
		defer actRows.Close()
		for actRows.Next() {
			var a ActionCount
			if actRows.Scan(&a.Action, &a.Count) == nil {
				actionDist = append(actionDist, a)
			}
		}
	}

	// Gacha stats today
	var todayGacha int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM game_logs WHERE created_at >= CURRENT_DATE AND action IN ('gacha_single','gacha_multi')`).Scan(&todayGacha)

	// Open support tickets
	var openTickets int
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM support_tickets WHERE status = 'open'`).Scan(&openTickets)

	return h.render(c, "dashboard.html", fiber.Map{
		"Title":             "대시보드",
		"Username":          username,
		"TotalUsers":        totalUsers,
		"TotalSlimes":       totalSlimes,
		"TodayActive":       todayActive,
		"MAU":               mau,
		"TotalGold":         totalGold,
		"TotalGems":         totalGems,
		"AvgGold":           int64(avgGold),
		"AvgGems":           int64(avgGems),
		"SignupTrend":       signupTrend,
		"GradeDistribution": gradeDistribution,
		"ElementPopularity": elementPopularity,
		"TopCollection":     topCollection,
		"TopGold":           topGold,
		"TopLevel":          topLevel,
		"ActiveExplores":    activeExplores,
		"TodayPosts":        todayPosts,
		"TodayReplies":      todayReplies,
		"BossName":          bossName,
		"BossCurrentHP":     bossCurrentHP,
		"BossMaxHP":         bossMaxHP,
		"PendingReports":    pendingReports,
		"DAUTrend":          dauTrend,
		"RetD1":             retD1,
		"RetD7":             retD7,
		"RetD30":            retD30,
		"GoldIn":            goldIn,
		"GoldOut":           goldOut,
		"GemsIn":            gemsIn,
		"GemsOut":           gemsOut,
		"ActionDist":        actionDist,
		"TodayGacha":        todayGacha,
		"OpenTickets":       openTickets,
	})
}
