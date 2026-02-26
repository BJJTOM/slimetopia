package admin

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type ShopItemRow struct {
	ID          int
	Name        string
	Type        string
	CostGold    int64
	CostGems    int
	Description string
}

func (h *AdminHandler) ShopList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	message := c.Query("msg")

	rows, err := h.pool.Query(ctx,
		`SELECT id, name, type, cost_gold, cost_gems, description FROM shop_items ORDER BY id`)
	if err != nil {
		// shop_items table might not exist, show empty
		return h.render(c, "shop.html", fiber.Map{
			"Title":    "상점 관리",
			"Username": username,
			"Items":    []ShopItemRow{},
			"Message":  "상점 데이터를 불러올 수 없습니다 (JSON 기반 상점)",
		})
	}
	defer rows.Close()

	items := make([]ShopItemRow, 0)
	for rows.Next() {
		var item ShopItemRow
		if rows.Scan(&item.ID, &item.Name, &item.Type, &item.CostGold, &item.CostGems, &item.Description) == nil {
			items = append(items, item)
		}
	}

	return h.render(c, "shop.html", fiber.Map{
		"Title":    "상점 관리",
		"Username": username,
		"Items":    items,
		"Message":  message,
	})
}

func (h *AdminHandler) ShopUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	itemID := c.Params("id")
	goldStr := c.FormValue("cost_gold")
	gemsStr := c.FormValue("cost_gems")

	gold, _ := strconv.ParseInt(goldStr, 10, 64)
	gems, _ := strconv.Atoi(gemsStr)

	_, err := h.pool.Exec(ctx,
		`UPDATE shop_items SET cost_gold = $1, cost_gems = $2 WHERE id = $3`,
		gold, gems, itemID,
	)
	if err != nil {
		return c.Redirect("/admin/shop?msg=error")
	}

	return c.Redirect("/admin/shop?msg=updated")
}
