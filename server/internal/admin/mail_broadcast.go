package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type RecentMail struct {
	ID        string
	Title     string
	MailType  string
	Gold      int64
	Gems      int
	Target    string
	CreatedAt time.Time
}

func (h *AdminHandler) MailBroadcastPage(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	message := c.Query("msg")

	// Recent broadcasts (admin-sent mails)
	var recentMails []RecentMail
	rows, err := h.pool.Query(ctx,
		`SELECT id, title, mail_type, reward_gold, reward_gems,
		        CASE WHEN user_id IS NULL THEN '전체' ELSE user_id::text END,
		        created_at
		 FROM mailbox WHERE mail_type IN ('reward', 'announcement')
		 ORDER BY created_at DESC LIMIT 20`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var m RecentMail
			if rows.Scan(&m.ID, &m.Title, &m.MailType, &m.Gold, &m.Gems, &m.Target, &m.CreatedAt) == nil {
				recentMails = append(recentMails, m)
			}
		}
	}

	return h.render(c, "mail.html", fiber.Map{
		"Title":       "우편 발송",
		"Username":    username,
		"RecentMails": recentMails,
		"Message":     message,
	})
}

func (h *AdminHandler) SendBroadcast(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	adminID := c.Locals("admin_id").(int)

	title := c.FormValue("title")
	body := c.FormValue("body")
	mailType := c.FormValue("mail_type")
	targetType := c.FormValue("target_type") // "all" or "user"
	targetUserID := c.FormValue("target_user_id")
	gold, _ := strconv.ParseInt(c.FormValue("gold"), 10, 64)
	gems, _ := strconv.Atoi(c.FormValue("gems"))

	if title == "" || body == "" {
		return c.Redirect("/admin/mail?msg=required")
	}
	if mailType == "" {
		mailType = "reward"
	}

	if targetType == "user" && targetUserID != "" {
		// Send to specific user
		_, err := h.pool.Exec(ctx,
			`INSERT INTO mailbox (id, user_id, title, body, mail_type, reward_gold, reward_gems)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
			targetUserID, title, body, mailType, gold, gems,
		)
		if err != nil {
			return c.Redirect("/admin/mail?msg=error")
		}
		logAdminAction(h.pool, ctx, adminID, adminUsername, "send_mail_user", "user", targetUserID,
			fmt.Sprintf("title:%s gold:%d gems:%d", title, gold, gems))
	} else {
		// Send to all users (NULL user_id = global broadcast)
		_, err := h.pool.Exec(ctx,
			`INSERT INTO mailbox (id, user_id, title, body, mail_type, reward_gold, reward_gems)
			 VALUES (gen_random_uuid(), NULL, $1, $2, $3, $4, $5)`,
			title, body, mailType, gold, gems,
		)
		if err != nil {
			return c.Redirect("/admin/mail?msg=error")
		}
		logAdminAction(h.pool, ctx, adminID, adminUsername, "send_mail_broadcast", "mail", "",
			fmt.Sprintf("title:%s gold:%d gems:%d", title, gold, gems))
	}

	return c.Redirect("/admin/mail?msg=sent")
}
