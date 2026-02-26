package admin

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// Simple in-memory session store
var (
	sessions   = make(map[string]sessionData)
	sessionsMu sync.RWMutex
)

type sessionData struct {
	AdminID  int
	Username string
	Role     string
	ExpiresAt time.Time
}

const sessionCookieName = "admin_session"
const sessionDuration = 24 * time.Hour

func generateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *AdminHandler) AuthMiddleware(c *fiber.Ctx) error {
	sessionID := c.Cookies(sessionCookieName)
	if sessionID == "" {
		return c.Redirect("/admin/login")
	}

	sessionsMu.RLock()
	sess, ok := sessions[sessionID]
	sessionsMu.RUnlock()

	if !ok || time.Now().After(sess.ExpiresAt) {
		if ok {
			sessionsMu.Lock()
			delete(sessions, sessionID)
			sessionsMu.Unlock()
		}
		return c.Redirect("/admin/login")
	}

	c.Locals("admin_id", sess.AdminID)
	c.Locals("admin_username", sess.Username)
	c.Locals("admin_role", sess.Role)
	return c.Next()
}

func (h *AdminHandler) LoginPage(c *fiber.Ctx) error {
	return h.render(c, "login.html", fiber.Map{
		"Error": c.Query("error"),
	})
}

func (h *AdminHandler) LoginSubmit(c *fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")

	if username == "" || password == "" {
		return c.Redirect("/admin/login?error=credentials_required")
	}

	ctx := c.Context()
	var adminID int
	var passwordHash string
	var role string

	err := h.pool.QueryRow(ctx,
		`SELECT id, password_hash, role FROM admin_users WHERE username = $1`,
		username,
	).Scan(&adminID, &passwordHash, &role)

	if err != nil {
		return c.Redirect("/admin/login?error=invalid_credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return c.Redirect("/admin/login?error=invalid_credentials")
	}

	// Create session
	sessionID := generateSessionID()
	sessionsMu.Lock()
	sessions[sessionID] = sessionData{
		AdminID:   adminID,
		Username:  username,
		Role:      role,
		ExpiresAt: time.Now().Add(sessionDuration),
	}
	sessionsMu.Unlock()

	c.Cookie(&fiber.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		Path:     "/admin",
		HTTPOnly: true,
		MaxAge:   int(sessionDuration.Seconds()),
		SameSite: "Lax",
	})

	return c.Redirect("/admin/")
}

func (h *AdminHandler) Logout(c *fiber.Ctx) error {
	sessionID := c.Cookies(sessionCookieName)
	if sessionID != "" {
		sessionsMu.Lock()
		delete(sessions, sessionID)
		sessionsMu.Unlock()
	}

	c.Cookie(&fiber.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/admin",
		MaxAge:   -1,
		HTTPOnly: true,
	})

	return c.Redirect("/admin/login")
}
