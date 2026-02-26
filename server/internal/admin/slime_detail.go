package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type SlimeDetailData struct {
	ID          string
	SpeciesID   int
	SpeciesName string
	Element     string
	Grade       string
	Level       int
	Exp         int
	Personality string
	Affection   int
	Hunger      int
	Condition   int
	IsSick      bool
	OwnerID     string
	OwnerNick   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (h *AdminHandler) SlimeDetail(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	slimeID := c.Params("id")
	message := c.Query("msg")

	var sl SlimeDetailData
	err := h.pool.QueryRow(ctx,
		`SELECT s.id, s.species_id, sp.name, s.element, sp.grade, s.level, s.exp,
		        s.personality, s.affection, s.hunger, s.condition, s.is_sick,
		        s.user_id, COALESCE(u.nickname, 'Unknown'), s.created_at, s.updated_at
		 FROM slimes s
		 JOIN slime_species sp ON sp.id = s.species_id
		 LEFT JOIN users u ON u.id = s.user_id
		 WHERE s.id = $1`, slimeID,
	).Scan(&sl.ID, &sl.SpeciesID, &sl.SpeciesName, &sl.Element, &sl.Grade, &sl.Level, &sl.Exp,
		&sl.Personality, &sl.Affection, &sl.Hunger, &sl.Condition, &sl.IsSick,
		&sl.OwnerID, &sl.OwnerNick, &sl.CreatedAt, &sl.UpdatedAt)
	if err != nil {
		return c.Redirect("/admin/slimes?msg=not_found")
	}

	return h.render(c, "slime_detail.html", fiber.Map{
		"Title":    fmt.Sprintf("슬라임: %s (Lv.%d)", sl.SpeciesName, sl.Level),
		"Username": username,
		"Slime":    sl,
		"Message":  message,
	})
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
		return c.Redirect(fmt.Sprintf("/admin/slimes/%s?msg=error", slimeID))
	}

	detail := fmt.Sprintf("level:%d exp:%d affection:%d hunger:%d condition:%d sick:%v", level, exp, affection, hunger, condition, isSick)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "edit_slime", "slime", slimeID, detail)

	return c.Redirect(fmt.Sprintf("/admin/slimes/%s?msg=edited", slimeID))
}

func (h *AdminHandler) SlimeDelete(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)
	slimeID := c.Params("id")

	// Get slime info before deleting for audit log
	var speciesName, ownerID string
	h.pool.QueryRow(ctx,
		`SELECT sp.name, s.user_id FROM slimes s JOIN slime_species sp ON sp.id = s.species_id WHERE s.id = $1`,
		slimeID,
	).Scan(&speciesName, &ownerID)

	_, err := h.pool.Exec(ctx, `DELETE FROM slimes WHERE id = $1`, slimeID)
	if err != nil {
		return c.Redirect(fmt.Sprintf("/admin/slimes/%s?msg=delete_error", slimeID))
	}

	detail := fmt.Sprintf("species:%s owner:%s", speciesName, ownerID)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "delete_slime", "slime", slimeID, detail)

	return c.Redirect("/admin/slimes?msg=deleted")
}

func (h *AdminHandler) SlimeCreatePage(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	message := c.Query("msg")

	// Get all species for dropdown
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
		return c.Redirect("/admin/slimes/create?msg=required")
	}
	if level < 1 {
		level = 1
	}

	// Get species element
	var element string
	err := h.pool.QueryRow(ctx, `SELECT element FROM slime_species WHERE id = $1`, speciesID).Scan(&element)
	if err != nil {
		return c.Redirect("/admin/slimes/create?msg=invalid_species")
	}

	// Verify user exists
	var exists bool
	h.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists)
	if !exists {
		return c.Redirect("/admin/slimes/create?msg=user_not_found")
	}

	// Create slime
	var slimeID string
	err = h.pool.QueryRow(ctx,
		`INSERT INTO slimes (id, user_id, species_id, element, personality, level, affection, hunger, condition)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 50, 50, 100)
		 RETURNING id`,
		userID, speciesID, element, personality, level,
	).Scan(&slimeID)
	if err != nil {
		return c.Redirect("/admin/slimes/create?msg=error")
	}

	detail := fmt.Sprintf("species:%d personality:%s level:%d user:%s", speciesID, personality, level, userID)
	logAdminAction(h.pool, ctx, adminID, adminUsername, "create_slime", "slime", slimeID, detail)

	return c.Redirect(fmt.Sprintf("/admin/slimes/%s?msg=created", slimeID))
}
