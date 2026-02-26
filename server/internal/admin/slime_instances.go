package admin

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

func (h *AdminHandler) SlimeCreatePage(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	message := c.Query("msg")

	type SpeciesOption struct {
		ID      int
		Name    string
		Element string
		Grade   string
	}
	var species []SpeciesOption
	rows, err := h.pool.Query(ctx,
		`SELECT id, name, element, grade FROM slime_species ORDER BY id`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var s SpeciesOption
			if rows.Scan(&s.ID, &s.Name, &s.Element, &s.Grade) == nil {
				species = append(species, s)
			}
		}
	}

	return h.render(c, "slime_create.html", fiber.Map{
		"Title":    "슬라임 지급",
		"Username": username,
		"Species":  species,
		"Message":  message,
	})
}

func (h *AdminHandler) SlimeCreate(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)

	userID := c.FormValue("user_id")
	speciesID, _ := strconv.Atoi(c.FormValue("species_id"))
	personality := c.FormValue("personality")
	level, _ := strconv.Atoi(c.FormValue("level"))

	if userID == "" || speciesID == 0 || personality == "" {
		return c.Redirect("/admin/slime-instances/create?msg=required")
	}
	if level < 1 {
		level = 1
	}

	var element string
	err := h.pool.QueryRow(ctx, `SELECT element FROM slime_species WHERE id = $1`, speciesID).Scan(&element)
	if err != nil {
		return c.Redirect("/admin/slime-instances/create?msg=invalid_species")
	}

	var exists bool
	h.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists)
	if !exists {
		return c.Redirect("/admin/slime-instances/create?msg=user_not_found")
	}

	var slimeID string
	err = h.pool.QueryRow(ctx,
		`INSERT INTO slimes (id, user_id, species_id, element, personality, level, affection, hunger, condition)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 50, 50, 100)
		 RETURNING id`,
		userID, speciesID, element, personality, level,
	).Scan(&slimeID)
	if err != nil {
		return c.Redirect("/admin/slime-instances/create?msg=error")
	}

	detail := fmt.Sprintf("species:%d personality:%s level:%d user:%s", speciesID, personality, level, userID)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "create_slime", "slime", slimeID, detail)

	return c.Redirect(fmt.Sprintf("/admin/users/%s?msg=slime_created", userID))
}

func (h *AdminHandler) SlimeEdit(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	slimeID := c.Params("id")

	level, _ := strconv.Atoi(c.FormValue("level"))
	exp, _ := strconv.Atoi(c.FormValue("exp"))
	affection, _ := strconv.Atoi(c.FormValue("affection"))
	hunger, _ := strconv.Atoi(c.FormValue("hunger"))
	condition, _ := strconv.Atoi(c.FormValue("condition"))
	isSick := c.FormValue("is_sick") == "true"

	_, err := h.pool.Exec(ctx,
		`UPDATE slimes SET level = $1, exp = $2, affection = $3, hunger = $4, condition = $5, is_sick = $6, updated_at = NOW()
		 WHERE id = $7`,
		level, exp, affection, hunger, condition, isSick, slimeID,
	)
	if err != nil {
		return c.Redirect("/admin/slimes?msg=error")
	}

	detail := fmt.Sprintf("level:%d exp:%d affection:%d hunger:%d condition:%d sick:%v", level, exp, affection, hunger, condition, isSick)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "edit_slime", "slime", slimeID, detail)

	return c.Redirect("/admin/slimes?msg=edited")
}

func (h *AdminHandler) SlimeDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	slimeID := c.Params("id")

	var speciesName, ownerID string
	h.pool.QueryRow(ctx,
		`SELECT sp.name, s.user_id FROM slimes s JOIN slime_species sp ON sp.id = s.species_id WHERE s.id = $1`,
		slimeID,
	).Scan(&speciesName, &ownerID)

	_, err := h.pool.Exec(ctx, `DELETE FROM slimes WHERE id = $1`, slimeID)
	if err != nil {
		return c.Redirect("/admin/slimes?msg=delete_error")
	}

	detail := fmt.Sprintf("species:%s owner:%s", speciesName, ownerID)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "delete_slime", "slime", slimeID, detail)

	return c.Redirect("/admin/slimes?msg=deleted")
}
