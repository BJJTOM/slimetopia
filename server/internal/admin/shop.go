package admin

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/slimetopia/server/internal/repository"
)

func (h *AdminHandler) ShopList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	msg := c.Query("msg")

	items, err := h.gameDataRepo.GetAllShopItemsIncludeInactive(ctx)
	if err != nil {
		return h.render(c, "shop.html", fiber.Map{
			"Title": "상점 관리", "Username": username,
			"Items": []repository.GameShopItem{}, "Message": "DB 오류: " + err.Error(),
		})
	}

	data := fiber.Map{
		"Title": "상점 관리", "Username": username,
		"Items": items, "Total": len(items), "Message": msg,
	}

	if editID := c.Query("edit"); editID != "" {
		id, _ := strconv.Atoi(editID)
		for _, item := range items {
			if item.ID == id {
				data["EditItem"] = item
				break
			}
		}
	}
	if c.Query("create") == "1" {
		data["ShowCreate"] = true
	}

	return h.render(c, "shop.html", data)
}

func (h *AdminHandler) ShopCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.FormValue("id"))
	cg, _ := strconv.ParseInt(c.FormValue("cost_gold"), 10, 64)
	cgems, _ := strconv.Atoi(c.FormValue("cost_gems"))
	qty, _ := strconv.Atoi(c.FormValue("quantity"))
	so, _ := strconv.Atoi(c.FormValue("sort_order"))
	item := &repository.GameShopItem{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Type: c.FormValue("type"), Category: c.FormValue("category"),
		CostGold: cg, CostGems: cgems, Icon: c.FormValue("icon"),
		Description: c.FormValue("description"), Quantity: qty,
		EggType: c.FormValue("egg_type"), IsActive: true, SortOrder: so,
	}
	if err := h.gameDataRepo.CreateShopItem(ctx, item); err != nil {
		return c.Redirect("/admin/shop?msg=error")
	}
	return c.Redirect("/admin/shop?msg=created")
}

func (h *AdminHandler) ShopUpdate(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	cg, _ := strconv.ParseInt(c.FormValue("cost_gold"), 10, 64)
	cgems, _ := strconv.Atoi(c.FormValue("cost_gems"))
	qty, _ := strconv.Atoi(c.FormValue("quantity"))
	so, _ := strconv.Atoi(c.FormValue("sort_order"))
	item := &repository.GameShopItem{
		ID: id, Name: c.FormValue("name"), NameEN: c.FormValue("name_en"),
		Type: c.FormValue("type"), Category: c.FormValue("category"),
		CostGold: cg, CostGems: cgems, Icon: c.FormValue("icon"),
		Description: c.FormValue("description"), Quantity: qty,
		EggType: c.FormValue("egg_type"),
		IsActive: c.FormValue("is_active") == "on", SortOrder: so,
	}
	if err := h.gameDataRepo.UpdateShopItem(ctx, item); err != nil {
		return c.Redirect("/admin/shop?msg=error")
	}
	return c.Redirect("/admin/shop?msg=updated")
}

func (h *AdminHandler) ShopDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	id, _ := strconv.Atoi(c.Params("id"))
	h.gameDataRepo.DeleteShopItem(ctx, id)
	return c.Redirect("/admin/shop?msg=deleted")
}
