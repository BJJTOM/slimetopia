package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type GameLogRow struct {
	ID            int64
	Nickname      string
	Action        string
	Category      string
	Detail        string
	GoldDelta     int64
	GemsDelta     int
	StardustDelta int
	CreatedAt     time.Time
}

func (h *AdminHandler) queryGameLogs(c *fiber.Ctx, title string, templateName string, whereClause string, extraArgs ...interface{}) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	search := c.Query("search")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	actionFilter := c.Query("action")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 50
	offset := (page - 1) * limit

	// Build dynamic query
	baseWhere := whereClause
	args := make([]interface{}, len(extraArgs))
	copy(args, extraArgs)
	argIdx := len(args) + 1

	if search != "" {
		baseWhere += fmt.Sprintf(` AND u.nickname ILIKE $%d`, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if dateFrom != "" {
		baseWhere += fmt.Sprintf(` AND gl.created_at >= $%d`, argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		baseWhere += fmt.Sprintf(` AND gl.created_at < ($%d::date + INTERVAL '1 day')`, argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	if actionFilter != "" {
		baseWhere += fmt.Sprintf(` AND gl.action = $%d`, argIdx)
		args = append(args, actionFilter)
		argIdx++
	}

	// Count
	var totalCount int
	countQuery := `SELECT COUNT(*) FROM game_logs gl JOIN users u ON u.id = gl.user_id WHERE ` + baseWhere
	h.pool.QueryRow(ctx, countQuery, args...).Scan(&totalCount)

	// Fetch rows
	query := fmt.Sprintf(`SELECT gl.id, u.nickname, gl.action, gl.category, gl.detail::text, gl.gold_delta, gl.gems_delta, gl.stardust_delta, gl.created_at
		FROM game_logs gl JOIN users u ON u.id = gl.user_id
		WHERE %s ORDER BY gl.created_at DESC LIMIT $%d OFFSET $%d`, baseWhere, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return h.render(c, templateName, fiber.Map{
			"Title": title, "Username": username, "Error": "쿼리 실패: " + err.Error(),
			"Search": search, "DateFrom": dateFrom, "DateTo": dateTo, "Action": actionFilter,
			"TotalCount": 0, "Page": 1, "TotalPages": 1,
			"HasPrev": false, "HasNext": false, "PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	var logs []GameLogRow
	for rows.Next() {
		var l GameLogRow
		if rows.Scan(&l.ID, &l.Nickname, &l.Action, &l.Category, &l.Detail, &l.GoldDelta, &l.GemsDelta, &l.StardustDelta, &l.CreatedAt) == nil {
			logs = append(logs, l)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, templateName, fiber.Map{
		"Title":      title,
		"Username":   username,
		"Logs":       logs,
		"TotalCount": totalCount,
		"Search":     search,
		"DateFrom":   dateFrom,
		"DateTo":     dateTo,
		"Action":     actionFilter,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}

// CurrencyLogs shows all logs with currency changes
func (h *AdminHandler) CurrencyLogs(c *fiber.Ctx) error {
	return h.queryGameLogs(c, "재화 로그", "logs_currency.html",
		`(gl.gold_delta != 0 OR gl.gems_delta != 0 OR gl.stardust_delta != 0)`)
}

// ItemLogs shows item-related logs
func (h *AdminHandler) ItemLogs(c *fiber.Ctx) error {
	return h.queryGameLogs(c, "아이템 로그", "logs_items.html",
		`gl.action IN ('apply_food','craft','merge','buy_food_inv','shop_buy_booster')`)
}

// CollectionLogs shows collection submission logs
func (h *AdminHandler) CollectionLogs(c *fiber.Ctx) error {
	return h.queryGameLogs(c, "기증 로그", "logs_collection.html",
		`gl.action = 'collection_submit'`)
}

// GachaLogs shows gacha pull logs
func (h *AdminHandler) GachaLogs(c *fiber.Ctx) error {
	return h.queryGameLogs(c, "뽑기 로그", "logs_gacha.html",
		`gl.action IN ('gacha_single','gacha_multi')`)
}

// ShopPurchaseLogs shows shop transaction logs
func (h *AdminHandler) ShopPurchaseLogs(c *fiber.Ctx) error {
	return h.queryGameLogs(c, "상점 구매 로그", "logs_shop.html",
		`(gl.action LIKE 'shop_%' OR gl.action IN ('buy_gems','buy_food_inv','capacity_expand','gacha_single','gacha_multi'))`)
}
