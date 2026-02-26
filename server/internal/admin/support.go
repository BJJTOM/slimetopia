package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type SupportTicketRow struct {
	ID         int64
	Nickname   string
	Subject    string
	Category   string
	Status     string
	Priority   string
	AssignedTo string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type SupportReplyRow struct {
	ID         int64
	SenderType string
	SenderName string
	Message    string
	CreatedAt  time.Time
}

// SupportTicketList shows all support tickets
func (h *AdminHandler) SupportTicketList(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	statusFilter := c.Query("status", "open")
	search := c.Query("search")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit := 30
	offset := (page - 1) * limit

	// Build query
	where := `st.status = $1`
	args := []interface{}{statusFilter}
	argIdx := 2

	if search != "" {
		where += fmt.Sprintf(` AND (u.nickname ILIKE $%d OR st.subject ILIKE $%d)`, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	var totalCount int
	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM support_tickets st JOIN users u ON u.id = st.user_id WHERE `+where,
		args...,
	).Scan(&totalCount)

	query := fmt.Sprintf(`SELECT st.id, u.nickname, st.subject, st.category, st.status, st.priority,
		COALESCE(st.assigned_to, ''), st.created_at, st.updated_at
		FROM support_tickets st JOIN users u ON u.id = st.user_id
		WHERE %s ORDER BY st.updated_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return h.render(c, "support_list.html", fiber.Map{
			"Title": "고객센터", "Username": username, "Error": err.Error(),
			"Status": statusFilter, "Search": search, "TotalCount": 0,
			"Page": 1, "TotalPages": 1, "HasPrev": false, "HasNext": false,
			"PrevPage": 0, "NextPage": 0,
		})
	}
	defer rows.Close()

	var tickets []SupportTicketRow
	for rows.Next() {
		var t SupportTicketRow
		if rows.Scan(&t.ID, &t.Nickname, &t.Subject, &t.Category, &t.Status, &t.Priority, &t.AssignedTo, &t.CreatedAt, &t.UpdatedAt) == nil {
			tickets = append(tickets, t)
		}
	}

	totalPages := (totalCount + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return h.render(c, "support_list.html", fiber.Map{
		"Title":      "고객센터",
		"Username":   username,
		"Tickets":    tickets,
		"TotalCount": totalCount,
		"Status":     statusFilter,
		"Search":     search,
		"Page":       page,
		"TotalPages": totalPages,
		"HasPrev":    page > 1,
		"HasNext":    page < totalPages,
		"PrevPage":   page - 1,
		"NextPage":   page + 1,
	})
}

// SupportTicketDetail shows a single ticket with replies
func (h *AdminHandler) SupportTicketDetail(c *fiber.Ctx) error {
	ctx := c.Context()
	username := c.Locals("admin_username").(string)
	ticketID := c.Params("id")
	message := c.Query("msg")

	var ticket SupportTicketRow
	err := h.pool.QueryRow(ctx,
		`SELECT st.id, u.nickname, st.subject, st.category, st.status, st.priority,
		 COALESCE(st.assigned_to, ''), st.created_at, st.updated_at
		 FROM support_tickets st JOIN users u ON u.id = st.user_id WHERE st.id = $1`,
		ticketID,
	).Scan(&ticket.ID, &ticket.Nickname, &ticket.Subject, &ticket.Category, &ticket.Status, &ticket.Priority, &ticket.AssignedTo, &ticket.CreatedAt, &ticket.UpdatedAt)
	if err != nil {
		return c.Redirect("/admin/support?msg=not_found")
	}

	// Fetch replies
	replyRows, err := h.pool.Query(ctx,
		`SELECT sr.id, sr.sender_type, sr.sender_id, sr.message, sr.created_at
		 FROM support_replies sr WHERE sr.ticket_id = $1 ORDER BY sr.created_at ASC`,
		ticketID,
	)
	var replies []SupportReplyRow
	if err == nil {
		defer replyRows.Close()
		for replyRows.Next() {
			var r SupportReplyRow
			var senderID string
			if replyRows.Scan(&r.ID, &r.SenderType, &senderID, &r.Message, &r.CreatedAt) == nil {
				if r.SenderType == "admin" {
					r.SenderName = senderID
				} else {
					r.SenderName = ticket.Nickname
				}
				replies = append(replies, r)
			}
		}
	}

	return h.render(c, "support_detail.html", fiber.Map{
		"Title":    "티켓 #" + ticketID,
		"Username": username,
		"Ticket":   ticket,
		"Replies":  replies,
		"Message":  message,
	})
}

// SupportTicketReply adds an admin reply to a ticket
func (h *AdminHandler) SupportTicketReply(c *fiber.Ctx) error {
	ctx := c.Context()
	adminUsername := c.Locals("admin_username").(string)
	ticketID := c.Params("id")
	msg := c.FormValue("message")

	if msg == "" {
		return c.Redirect("/admin/support/" + ticketID + "?msg=empty")
	}

	h.pool.Exec(ctx,
		`INSERT INTO support_replies (ticket_id, sender_type, sender_id, message) VALUES ($1, 'admin', $2, $3)`,
		ticketID, adminUsername, msg,
	)
	h.pool.Exec(ctx,
		`UPDATE support_tickets SET updated_at = NOW(), status = 'in_progress' WHERE id = $1 AND status = 'open'`,
		ticketID,
	)

	return c.Redirect("/admin/support/" + ticketID + "?msg=replied")
}

// SupportTicketUpdateStatus changes ticket status
func (h *AdminHandler) SupportTicketUpdateStatus(c *fiber.Ctx) error {
	ctx := c.Context()
	ticketID := c.Params("id")
	newStatus := c.FormValue("status")

	if newStatus != "open" && newStatus != "in_progress" && newStatus != "resolved" && newStatus != "closed" {
		return c.Redirect("/admin/support/" + ticketID + "?msg=invalid_status")
	}

	h.pool.Exec(ctx, `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2`, newStatus, ticketID)

	return c.Redirect("/admin/support/" + ticketID + "?msg=status_updated")
}

// SupportTicketAssign assigns a ticket to an admin
func (h *AdminHandler) SupportTicketAssign(c *fiber.Ctx) error {
	ctx := c.Context()
	ticketID := c.Params("id")
	assignTo := c.FormValue("assign_to")

	h.pool.Exec(ctx, `UPDATE support_tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2`, assignTo, ticketID)

	return c.Redirect("/admin/support/" + ticketID + "?msg=assigned")
}
