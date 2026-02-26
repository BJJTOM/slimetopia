package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/slimetopia/server/internal/auth"
)

func AuthRequired(jwtManager *auth.JWTManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization header",
			})
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid authorization format",
			})
		}

		claims, err := jwtManager.ValidateToken(parts[1])
		if err != nil {
			status := fiber.StatusUnauthorized
			msg := "invalid token"
			if err == auth.ErrExpiredToken {
				msg = "token expired"
			}
			return c.Status(status).JSON(fiber.Map{"error": msg})
		}

		// Store user info in context
		c.Locals("user_id", claims.UserID)
		c.Locals("nickname", claims.Nickname)

		return c.Next()
	}
}
