package game

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

const (
	dailyGoldLimit = 1000
	dailyGemsLimit = 10
)

// POST /api/gift/send
func (h *Handler) SendGift(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	var body struct {
		ReceiverNickname string `json:"receiver_nickname"`
		Type             string `json:"type"`     // "gold" or "gems"
		Amount           int    `json:"amount"`
		Message          string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if body.ReceiverNickname == "" || body.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "receiver_nickname, type, and amount required"})
	}
	if body.Type != "gold" && body.Type != "gems" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "type must be 'gold' or 'gems'"})
	}

	// Find receiver by nickname
	var receiverID string
	err := pool.QueryRow(ctx,
		`SELECT id FROM users WHERE nickname = $1`,
		body.ReceiverNickname,
	).Scan(&receiverID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user_not_found"})
	}

	// Cannot send to self
	if receiverID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot_send_to_self"})
	}

	// Check daily limit
	today := time.Now().Truncate(24 * time.Hour)
	var dailyTotal int
	pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount), 0) FROM gift_logs
		 WHERE sender_id = $1 AND gift_type = $2 AND created_at >= $3`,
		userID, body.Type, today,
	).Scan(&dailyTotal)

	limit := dailyGoldLimit
	if body.Type == "gems" {
		limit = dailyGemsLimit
	}

	if dailyTotal+body.Amount > limit {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":     "daily_limit_exceeded",
			"remaining": limit - dailyTotal,
			"limit":     limit,
		})
	}

	// Deduct from sender
	if body.Type == "gold" {
		if err := h.userRepo.SpendCurrency(ctx, userID, int64(body.Amount), 0, 0); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_funds"})
		}
		// Grant to receiver
		h.userRepo.AddCurrency(ctx, receiverID, int64(body.Amount), 0, 0)
	} else {
		if err := h.userRepo.SpendCurrency(ctx, userID, 0, body.Amount, 0); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient_funds"})
		}
		h.userRepo.AddCurrency(ctx, receiverID, 0, body.Amount, 0)
	}

	// Log game action for gift
	if body.Type == "gold" {
		LogGameAction(pool, userID, "gift_send", "gift", -int64(body.Amount), 0, 0, map[string]interface{}{
			"receiver": receiverID, "type": body.Type, "amount": body.Amount,
		})
		LogGameAction(pool, receiverID, "gift_receive", "gift", int64(body.Amount), 0, 0, map[string]interface{}{
			"sender": userID, "type": body.Type, "amount": body.Amount,
		})
	} else {
		LogGameAction(pool, userID, "gift_send", "gift", 0, -body.Amount, 0, map[string]interface{}{
			"receiver": receiverID, "type": body.Type, "amount": body.Amount,
		})
		LogGameAction(pool, receiverID, "gift_receive", "gift", 0, body.Amount, 0, map[string]interface{}{
			"sender": userID, "type": body.Type, "amount": body.Amount,
		})
	}

	// Log the gift
	msg := body.Message
	if len(msg) > 200 {
		msg = msg[:200]
	}
	pool.Exec(ctx,
		`INSERT INTO gift_logs (sender_id, receiver_id, gift_type, amount, message)
		 VALUES ($1, $2, $3, $4, $5)`,
		userID, receiverID, body.Type, body.Amount, msg,
	)

	// Send mailbox notification to receiver
	senderUser, _ := h.userRepo.FindByID(ctx, userID)
	senderNick := "???"
	if senderUser != nil {
		senderNick = senderUser.Nickname
	}

	rewardGold := int64(0)
	rewardGems := 0
	title := ""
	mailBody := ""

	if body.Type == "gold" {
		title = senderNick + "님의 선물"
		mailBody = senderNick + "님이 " + intToStr(body.Amount) + "G를 보냈습니다!"
		if msg != "" {
			mailBody += "\n메시지: " + msg
		}
		rewardGold = int64(body.Amount)
	} else {
		title = senderNick + "님의 선물"
		mailBody = senderNick + "님이 " + intToStr(body.Amount) + " 젬을 보냈습니다!"
		if msg != "" {
			mailBody += "\n메시지: " + msg
		}
		rewardGems = body.Amount
	}

	// We already gave the currency directly, so mailbox is just a notification (reward=0)
	pool.Exec(ctx, `
		INSERT INTO mailbox (user_id, title, body, mail_type, reward_gold, reward_gems)
		VALUES ($1, $2, $3, 'gift', 0, 0)`,
		receiverID, title, mailBody,
	)
	_ = rewardGold
	_ = rewardGems

	return c.JSON(fiber.Map{"ok": true})
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}

// GET /api/gift/history
func (h *Handler) GetGiftHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()
	pool := h.userRepo.Pool()

	rows, err := pool.Query(ctx, `
		SELECT gl.id, su.nickname, ru.nickname, gl.gift_type, gl.amount, COALESCE(gl.message, ''), gl.created_at,
			CASE WHEN gl.sender_id = $1 THEN 'sent' ELSE 'received' END as direction
		FROM gift_logs gl
		JOIN users su ON su.id = gl.sender_id
		JOIN users ru ON ru.id = gl.receiver_id
		WHERE gl.sender_id = $1 OR gl.receiver_id = $1
		ORDER BY gl.created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch gift history"})
	}
	defer rows.Close()

	type GiftEntry struct {
		ID               string `json:"id"`
		SenderNickname   string `json:"sender_nickname"`
		ReceiverNickname string `json:"receiver_nickname"`
		GiftType         string `json:"gift_type"`
		Amount           int    `json:"amount"`
		Message          string `json:"message"`
		CreatedAt        string `json:"created_at"`
		Direction        string `json:"direction"`
	}

	history := make([]GiftEntry, 0)
	for rows.Next() {
		var g GiftEntry
		var createdAt time.Time
		if rows.Scan(&g.ID, &g.SenderNickname, &g.ReceiverNickname, &g.GiftType, &g.Amount, &g.Message, &createdAt, &g.Direction) == nil {
			g.CreatedAt = createdAt.Format(time.RFC3339)
			history = append(history, g)
		}
	}

	return c.JSON(fiber.Map{"history": history})
}
