package game

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// POST /api/support/tickets — create a support ticket
func (h *Handler) CreateSupportTicket(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		Subject  string `json:"subject"`
		Category string `json:"category"`
		Message  string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil || body.Subject == "" || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subject and message required"})
	}
	if body.Category == "" {
		body.Category = "general"
	}
	if len([]rune(body.Subject)) > 200 {
		body.Subject = string([]rune(body.Subject)[:200])
	}
	if len([]rune(body.Message)) > 2000 {
		body.Message = string([]rune(body.Message)[:2000])
	}

	pool := h.slimeRepo.Pool()
	ctx := c.Context()

	var ticketID int64
	err := pool.QueryRow(ctx,
		`INSERT INTO support_tickets (user_id, subject, category) VALUES ($1, $2, $3) RETURNING id`,
		userID, body.Subject, body.Category,
	).Scan(&ticketID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create ticket"})
	}

	// Add the initial message as a reply
	_, err = pool.Exec(ctx,
		`INSERT INTO support_replies (ticket_id, sender_type, sender_id, message) VALUES ($1, 'user', $2, $3)`,
		ticketID, userID, body.Message,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "ticket created but failed to save message"})
	}

	return c.JSON(fiber.Map{"ticket_id": ticketID})
}

// GET /api/support/tickets — list my tickets
func (h *Handler) ListSupportTickets(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()
	ctx := c.Context()

	rows, err := pool.Query(ctx,
		`SELECT id, subject, category, status, priority, created_at, updated_at
		 FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list tickets"})
	}
	defer rows.Close()

	type Ticket struct {
		ID        int64  `json:"id"`
		Subject   string `json:"subject"`
		Category  string `json:"category"`
		Status    string `json:"status"`
		Priority  string `json:"priority"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	}

	tickets := make([]Ticket, 0)
	for rows.Next() {
		var t Ticket
		var ca, ua time.Time
		if rows.Scan(&t.ID, &t.Subject, &t.Category, &t.Status, &t.Priority, &ca, &ua) == nil {
			t.CreatedAt = ca.Format(time.RFC3339)
			t.UpdatedAt = ua.Format(time.RFC3339)
			tickets = append(tickets, t)
		}
	}

	return c.JSON(fiber.Map{"tickets": tickets})
}

// GET /api/support/tickets/:id — ticket detail with replies
func (h *Handler) GetSupportTicketDetail(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ticketID := c.Params("id")
	pool := h.slimeRepo.Pool()
	ctx := c.Context()

	// Verify ownership
	var ownerID string
	err := pool.QueryRow(ctx, `SELECT user_id FROM support_tickets WHERE id = $1`, ticketID).Scan(&ownerID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ticket not found"})
	}
	if ownerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your ticket"})
	}

	// Get replies
	rows, err := pool.Query(ctx,
		`SELECT sender_type, message, created_at FROM support_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
		ticketID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch replies"})
	}
	defer rows.Close()

	type Reply struct {
		SenderType string `json:"sender_type"`
		Message    string `json:"message"`
		CreatedAt  string `json:"created_at"`
	}

	replies := make([]Reply, 0)
	for rows.Next() {
		var r Reply
		var ca time.Time
		if rows.Scan(&r.SenderType, &r.Message, &ca) == nil {
			r.CreatedAt = ca.Format(time.RFC3339)
			replies = append(replies, r)
		}
	}

	return c.JSON(fiber.Map{"replies": replies})
}

// POST /api/support/tickets/:id/reply — user reply on ticket
func (h *Handler) ReplySupportTicket(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ticketID := c.Params("id")
	pool := h.slimeRepo.Pool()
	ctx := c.Context()

	var body struct {
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message required"})
	}
	if len([]rune(body.Message)) > 2000 {
		body.Message = string([]rune(body.Message)[:2000])
	}

	// Verify ownership
	var ownerID string
	err := pool.QueryRow(ctx, `SELECT user_id FROM support_tickets WHERE id = $1`, ticketID).Scan(&ownerID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ticket not found"})
	}
	if ownerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your ticket"})
	}

	_, err = pool.Exec(ctx,
		`INSERT INTO support_replies (ticket_id, sender_type, sender_id, message) VALUES ($1, 'user', $2, $3)`,
		ticketID, userID, body.Message,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save reply"})
	}
	pool.Exec(ctx,
		`UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
		ticketID,
	)

	return c.JSON(fiber.Map{"ok": true})
}
