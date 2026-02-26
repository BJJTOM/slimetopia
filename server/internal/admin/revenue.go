package admin

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

type RevenueDay struct {
	Date  string
	Count int
	Gold  int64
	Gems  int64
}

type RevenueItem struct {
	Action string
	Count  int
	Gold   int64
	Gems   int64
}

// RevenueDashboard shows shop/purchase analytics
func (h *AdminHandler) RevenueDashboard(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)

	// Today's totals (sum of absolute values of negative deltas to get correct spending totals)
	var todayCount int
	var todayGold, todayGems int64
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(ABS(LEAST(gold_delta, 0))), 0), COALESCE(SUM(ABS(LEAST(gems_delta, 0))), 0)
		 FROM game_logs WHERE created_at >= CURRENT_DATE AND category IN ('shop','gacha')`,
	).Scan(&todayCount, &todayGold, &todayGems)

	// This week
	var weekCount int
	var weekGold, weekGems int64
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(ABS(LEAST(gold_delta, 0))), 0), COALESCE(SUM(ABS(LEAST(gems_delta, 0))), 0)
		 FROM game_logs WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND category IN ('shop','gacha')`,
	).Scan(&weekCount, &weekGold, &weekGems)

	// This month
	var monthCount int
	var monthGold, monthGems int64
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(ABS(LEAST(gold_delta, 0))), 0), COALESCE(SUM(ABS(LEAST(gems_delta, 0))), 0)
		 FROM game_logs WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND category IN ('shop','gacha')`,
	).Scan(&monthCount, &monthGold, &monthGems)

	// Daily trend (14 days)
	var dailyTrend []RevenueDay
	dRows, err := h.pool.Query(ctx,
		`SELECT TO_CHAR(created_at::date, 'MM/DD'), COUNT(*), COALESCE(SUM(ABS(LEAST(gold_delta, 0))), 0), COALESCE(SUM(ABS(LEAST(gems_delta, 0))), 0)
		 FROM game_logs WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND category IN ('shop','gacha')
		 GROUP BY created_at::date ORDER BY created_at::date`)
	if err == nil {
		defer dRows.Close()
		for dRows.Next() {
			var d RevenueDay
			if dRows.Scan(&d.Date, &d.Count, &d.Gold, &d.Gems) == nil {
				dailyTrend = append(dailyTrend, d)
			}
		}
	}

	// By item type
	var byItem []RevenueItem
	iRows, err := h.pool.Query(ctx,
		`SELECT action, COUNT(*), COALESCE(SUM(ABS(LEAST(gold_delta, 0))), 0), COALESCE(SUM(ABS(LEAST(gems_delta, 0))), 0)
		 FROM game_logs WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND category IN ('shop','gacha')
		 GROUP BY action ORDER BY COUNT(*) DESC`)
	if err == nil {
		defer iRows.Close()
		for iRows.Next() {
			var i RevenueItem
			if iRows.Scan(&i.Action, &i.Count, &i.Gold, &i.Gems) == nil {
				byItem = append(byItem, i)
			}
		}
	}

	return h.render(c, "revenue.html", fiber.Map{
		"Title":      "매출 내역",
		"Username":   username,
		"TodayCount": todayCount,
		"TodayGold":  todayGold,
		"TodayGems":  todayGems,
		"WeekCount":  weekCount,
		"WeekGold":   weekGold,
		"WeekGems":   weekGems,
		"MonthCount": monthCount,
		"MonthGold":  monthGold,
		"MonthGems":  monthGems,
		"DailyTrend": dailyTrend,
		"ByItem":     byItem,
		"Now":        time.Now().Format("2006-01-02 15:04"),
	})
}
