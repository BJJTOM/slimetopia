package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/slimetopia/server/internal/game"
	"github.com/slimetopia/server/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	userRepo   *repository.UserRepository
	slimeRepo  *repository.SlimeRepository
	jwtManager *JWTManager
	rdb        *redis.Client
	providers  map[string]*OAuthProvider
}

func NewHandler(userRepo *repository.UserRepository, slimeRepo *repository.SlimeRepository, jwtManager *JWTManager, rdb *redis.Client) *Handler {
	return &Handler{
		userRepo:   userRepo,
		slimeRepo:  slimeRepo,
		jwtManager: jwtManager,
		rdb:        rdb,
		providers:  make(map[string]*OAuthProvider),
	}
}

func (h *Handler) RegisterProvider(provider *OAuthProvider) {
	h.providers[provider.Name] = provider
}

func RegisterRoutes(router fiber.Router, handler *Handler) {
	auth := router.Group("/auth")
	auth.Get("/login/:provider", handler.Login)
	auth.Get("/callback/:provider", handler.Callback)
	auth.Post("/refresh", handler.Refresh)
	auth.Post("/dev-login", handler.DevLogin) // Development only
	auth.Post("/guest-login", handler.GuestLogin)
	auth.Post("/register", handler.Register)
	auth.Post("/email-login", handler.EmailLogin)
}

// Login redirects to OAuth provider
func (h *Handler) Login(c *fiber.Ctx) error {
	providerName := c.Params("provider")
	provider, ok := h.providers[providerName]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "unsupported provider",
		})
	}

	state := generateState()
	// Store state in Redis (5 min expiry)
	ctx := c.Context()
	h.rdb.Set(ctx, "oauth_state:"+state, providerName, 5*time.Minute)

	return c.Redirect(provider.GetAuthURL(state))
}

// Callback handles OAuth callback
func (h *Handler) Callback(c *fiber.Ctx) error {
	providerName := c.Params("provider")
	code := c.Query("code")
	state := c.Query("state")

	if code == "" || state == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "missing code or state",
		})
	}

	// Verify state
	ctx := c.Context()
	storedProvider, err := h.rdb.GetDel(ctx, "oauth_state:"+state).Result()
	if err != nil || storedProvider != providerName {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid state",
		})
	}

	provider, ok := h.providers[providerName]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "unsupported provider",
		})
	}

	// Exchange code for token
	token, err := provider.ExchangeCode(ctx, code)
	if err != nil {
		log.Error().Err(err).Msg("OAuth token exchange failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "authentication failed",
		})
	}

	// Get user info
	userInfo, err := provider.GetUserInfo(ctx, token.AccessToken)
	if err != nil {
		log.Error().Err(err).Msg("OAuth user info fetch failed")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get user info",
		})
	}

	// Find or create user
	user, err := h.userRepo.FindByProviderID(ctx, providerName, userInfo.ID)
	if err != nil {
		if !errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "database error",
			})
		}
		// Create new user
		nickname := userInfo.Nickname
		if nickname == "" {
			nickname = fmt.Sprintf("Slimer_%s", userInfo.ID[:6])
		}
		user, err = h.userRepo.Create(ctx, nickname, providerName, userInfo.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create user",
			})
		}
		log.Info().Str("nickname", nickname).Msg("New user created via OAuth")

		// Grant starter pack
		game.GrantStarterPack(ctx, h.slimeRepo, uuidToString(user.ID))
	}

	// Generate JWT
	userIDStr := uuidToString(user.ID)
	tokenPair, err := h.jwtManager.GenerateTokenPair(userIDStr, user.Nickname)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate token",
		})
	}

	// Redirect to frontend with token
	frontendBase := os.Getenv("FRONTEND_CALLBACK_URL")
	if frontendBase == "" {
		frontendBase = "http://localhost:3000"
	}
	redirectURL := fmt.Sprintf("%s/auth/callback?access_token=%s&refresh_token=%s",
		frontendBase, tokenPair.AccessToken, tokenPair.RefreshToken)

	return c.Redirect(redirectURL)
}

// Refresh exchanges a refresh token for a new token pair
func (h *Handler) Refresh(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&body); err != nil || body.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "refresh_token required",
		})
	}

	claims, err := h.jwtManager.ValidateToken(body.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid refresh token",
		})
	}

	// Verify user still exists
	ctx := c.Context()
	user, err := h.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	userIDStr := uuidToString(user.ID)
	tokenPair, err := h.jwtManager.GenerateTokenPair(userIDStr, user.Nickname)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate token",
		})
	}

	return c.JSON(tokenPair)
}

// DevLogin creates or finds a test user (development only)
func (h *Handler) DevLogin(c *fiber.Ctx) error {
	var body struct {
		Nickname string `json:"nickname"`
	}
	if err := c.BodyParser(&body); err != nil || body.Nickname == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "nickname required",
		})
	}

	ctx := c.Context()
	devProviderID := "dev_" + body.Nickname

	user, err := h.userRepo.FindByProviderID(ctx, "dev", devProviderID)
	if err != nil {
		if !errors.Is(err, repository.ErrUserNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "database error",
			})
		}
		user, err = h.userRepo.Create(ctx, body.Nickname, "dev", devProviderID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to create user",
			})
		}

		// Grant starter pack for new dev user
		game.GrantStarterPack(ctx, h.slimeRepo, uuidToString(user.ID))
	}

	userIDStr := uuidToString(user.ID)
	tokenPair, err := h.jwtManager.GenerateTokenPair(userIDStr, user.Nickname)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate token",
		})
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":       userIDStr,
			"nickname": user.Nickname,
			"gold":     user.Gold,
			"gems":     user.Gems,
			"stardust": user.Stardust,
			"level":    user.Level,
		},
		"tokens": tokenPair,
	})
}

// GuestLogin creates an anonymous guest account with a random nickname
func (h *Handler) GuestLogin(c *fiber.Ctx) error {
	ctx := c.Context()

	// Generate random guest ID
	guestBytes := make([]byte, 8)
	rand.Read(guestBytes)
	guestID := hex.EncodeToString(guestBytes)
	nickname := GenerateRandomNickname()
	providerID := "guest_" + guestID

	user, err := h.userRepo.Create(ctx, nickname, "guest", providerID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create guest user")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create guest user",
		})
	}

	log.Info().Str("nickname", nickname).Msg("New guest user created")

	userIDStr := uuidToString(user.ID)

	// Grant starter pack
	game.GrantStarterPack(ctx, h.slimeRepo, userIDStr)

	tokenPair, err := h.jwtManager.GenerateTokenPair(userIDStr, user.Nickname)
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate tokens for guest")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate token",
		})
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":       userIDStr,
			"nickname": user.Nickname,
			"gold":     user.Gold,
			"gems":     user.Gems,
			"stardust": user.Stardust,
			"level":    user.Level,
		},
		"tokens": tokenPair,
	})
}

// Register creates a new account with email/password
func (h *Handler) Register(c *fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || !strings.Contains(body.Email, "@") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "valid email required"})
	}
	if len(body.Password) < 4 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 4 characters"})
	}

	ctx := c.Context()

	// Check if email already exists
	existing, _ := h.userRepo.FindByEmail(ctx, body.Email)
	if existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email_taken"})
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	nickname := GenerateRandomNickname()
	providerID := "email_" + body.Email

	user, err := h.userRepo.Create(ctx, nickname, "email", providerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create user"})
	}

	userIDStr := uuidToString(user.ID)

	// Save email and password hash
	if err := h.userRepo.SetEmailPassword(ctx, userIDStr, body.Email, string(hash)); err != nil {
		log.Error().Err(err).Msg("Failed to set email/password")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save credentials"})
	}

	// Grant starter pack
	game.GrantStarterPack(ctx, h.slimeRepo, userIDStr)

	log.Info().Str("email", body.Email).Str("nickname", nickname).Msg("New user registered via email")

	tokenPair, err := h.jwtManager.GenerateTokenPair(userIDStr, user.Nickname)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":       userIDStr,
			"nickname": nickname,
			"gold":     user.Gold,
			"gems":     user.Gems,
			"stardust": user.Stardust,
			"level":    user.Level,
		},
		"tokens": tokenPair,
	})
}

// EmailLogin authenticates with email/password
func (h *Handler) EmailLogin(c *fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
	}

	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email and password required"})
	}

	ctx := c.Context()

	user, err := h.userRepo.FindByEmail(ctx, body.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}

	// Compare password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_credentials"})
	}

	userIDStr := uuidToString(user.ID)
	tokenPair, err := h.jwtManager.GenerateTokenPair(userIDStr, user.Nickname)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":       userIDStr,
			"nickname": user.Nickname,
			"gold":     user.Gold,
			"gems":     user.Gems,
			"stardust": user.Stardust,
			"level":    user.Level,
		},
		"tokens": tokenPair,
	})
}

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func uuidToString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	b := id.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
