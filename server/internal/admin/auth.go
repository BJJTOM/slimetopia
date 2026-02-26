package admin

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const sessionCookieName = "admin_session"
const sessionDuration = 24 * time.Hour

type adminClaims struct {
	AdminID  int    `json:"admin_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func (h *AdminHandler) createAdminToken(adminID int, username, role string) (string, error) {
	claims := &adminClaims{
		AdminID:  adminID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(sessionDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "slimetopia-admin",
			Subject:   strconv.Itoa(adminID),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(h.jwtSecret)
}

func (h *AdminHandler) validateAdminToken(tokenStr string) (*adminClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &adminClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return h.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*adminClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}

func (h *AdminHandler) AuthMiddleware(c *fiber.Ctx) error {
	tokenStr := c.Cookies(sessionCookieName)
	if tokenStr == "" {
		return c.Redirect("/admin/login")
	}

	claims, err := h.validateAdminToken(tokenStr)
	if err != nil {
		// Clear invalid cookie
		c.Cookie(&fiber.Cookie{
			Name:     sessionCookieName,
			Value:    "",
			Path:     "/admin",
			MaxAge:   -1,
			HTTPOnly: true,
		})
		return c.Redirect("/admin/login")
	}

	c.Locals("admin_id", claims.AdminID)
	c.Locals("admin_username", claims.Username)
	c.Locals("admin_role", claims.Role)
	return c.Next()
}

func (h *AdminHandler) LoginPage(c *fiber.Ctx) error {
	// If already logged in, redirect to dashboard
	if tokenStr := c.Cookies(sessionCookieName); tokenStr != "" {
		if _, err := h.validateAdminToken(tokenStr); err == nil {
			return c.Redirect("/admin/")
		}
	}
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

	// Create JWT token
	tokenStr, err := h.createAdminToken(adminID, username, role)
	if err != nil {
		return c.Redirect("/admin/login?error=server_error")
	}

	c.Cookie(&fiber.Cookie{
		Name:     sessionCookieName,
		Value:    tokenStr,
		Path:     "/admin",
		HTTPOnly: true,
		MaxAge:   int(sessionDuration.Seconds()),
		SameSite: "Lax",
	})

	return c.Redirect("/admin/")
}

func (h *AdminHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/admin",
		MaxAge:   -1,
		HTTPOnly: true,
	})

	return c.Redirect("/admin/login")
}
