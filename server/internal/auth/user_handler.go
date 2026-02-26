package auth

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/slimetopia/server/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

const nicknameCostGold = 500

type UserHandler struct {
	userRepo *repository.UserRepository
}

func NewUserHandler(userRepo *repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func RegisterUserRoutes(router fiber.Router, handler *UserHandler) {
	user := router.Group("/user")
	user.Get("/me", handler.GetMe)
	user.Patch("/me/nickname", handler.UpdateNickname)
	user.Patch("/me/password", handler.ChangePassword)
	user.Get("/me/community-stats", handler.GetCommunityStats)
}

func (h *UserHandler) GetMe(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	user, err := h.userRepo.FindByID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	// Mask email for privacy
	maskedEmail := ""
	if user.Email != "" {
		parts := strings.SplitN(user.Email, "@", 2)
		if len(parts) == 2 {
			local := parts[0]
			if len(local) > 2 {
				local = local[:2]
			}
			maskedEmail = local + "***@" + parts[1]
		}
	}

	return c.JSON(fiber.Map{
		"id":                uuidToString(user.ID),
		"nickname":          user.Nickname,
		"gold":              user.Gold,
		"gems":              user.Gems,
		"stardust":          user.Stardust,
		"level":             user.Level,
		"email":             maskedEmail,
		"profile_image_url": user.ProfileImageURL,
	})
}

func (h *UserHandler) UpdateNickname(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		Nickname string `json:"nickname"`
	}
	if err := c.BodyParser(&body); err != nil || body.Nickname == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "nickname required (1-20 characters)",
		})
	}
	if len(body.Nickname) > 20 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "nickname too long (max 20)",
		})
	}

	if err := h.userRepo.UpdateNicknameWithCost(c.Context(), userID, body.Nickname, nicknameCostGold); err != nil {
		if errors.Is(err, repository.ErrInsufficientFunds) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "insufficient gold",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update nickname",
		})
	}

	// Return updated gold
	user, _ := h.userRepo.FindByID(c.Context(), userID)
	gold := int64(0)
	if user != nil {
		gold = user.Gold
	}

	return c.JSON(fiber.Map{"nickname": body.Nickname, "gold": gold})
}

func (h *UserHandler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BodyParser(&body); err != nil || body.CurrentPassword == "" || body.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "current_password and new_password required",
		})
	}
	if len(body.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "password too short (min 6)",
		})
	}

	// Get current password hash
	currentHash, err := h.userRepo.GetPasswordHash(c.Context(), userID)
	if err != nil || currentHash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "no password set for this account",
		})
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(body.CurrentPassword)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "incorrect password",
		})
	}

	// Hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to hash password",
		})
	}

	if err := h.userRepo.ChangePassword(c.Context(), userID, string(newHash)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to change password",
		})
	}

	return c.JSON(fiber.Map{"ok": true})
}

func (h *UserHandler) GetCommunityStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	stats, err := h.userRepo.GetCommunityStats(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get community stats",
		})
	}

	return c.JSON(stats)
}
