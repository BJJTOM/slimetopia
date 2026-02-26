package game

import (
	"io"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	profileUploadDir  = "./uploads/profiles"
	maxProfileImgSize = 5 * 1024 * 1024 // 5MB
)

// POST /api/profile/image
func (h *Handler) UploadProfileImage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "image file required"})
	}
	if file.Size > maxProfileImgSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "image too large (max 5MB)"})
	}

	os.MkdirAll(profileUploadDir, 0755)

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	filename := uuid.New().String() + ext
	savePath := filepath.Join(profileUploadDir, filename)
	imageURL := "/uploads/profiles/" + filename

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to read image"})
	}
	defer src.Close()

	dst, err := os.Create(savePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save image"})
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to write image"})
	}

	// Update user's profile_image_url
	pool := h.slimeRepo.Pool()
	_, err = pool.Exec(c.UserContext(),
		`UPDATE users SET profile_image_url = $1 WHERE id = $2`,
		imageURL, userID,
	)
	if err != nil {
		os.Remove(savePath)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update profile"})
	}

	return c.JSON(fiber.Map{"profile_image_url": imageURL})
}

// DELETE /api/profile/image
func (h *Handler) DeleteProfileImage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	pool := h.slimeRepo.Pool()

	// Get current image URL to delete the file
	var imageURL string
	err := pool.QueryRow(c.UserContext(),
		`SELECT COALESCE(profile_image_url, '') FROM users WHERE id = $1`,
		userID,
	).Scan(&imageURL)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	// Clear profile_image_url in DB
	_, err = pool.Exec(c.UserContext(),
		`UPDATE users SET profile_image_url = '' WHERE id = $1`,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete profile image"})
	}

	// Delete file from filesystem if it exists
	if imageURL != "" {
		filePath := "." + imageURL // e.g. "./uploads/profiles/xxx.jpg"
		os.Remove(filePath)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// GET /api/profile/image
func (h *Handler) GetProfileImage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	pool := h.slimeRepo.Pool()
	var imageURL string
	err := pool.QueryRow(c.UserContext(),
		`SELECT COALESCE(profile_image_url, '') FROM users WHERE id = $1`,
		userID,
	).Scan(&imageURL)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	return c.JSON(fiber.Map{"profile_image_url": imageURL})
}
