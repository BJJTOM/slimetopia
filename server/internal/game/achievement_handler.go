package game

import (
	"encoding/json"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// AchievementDef from shared/achievements.json
type AchievementDef struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	RewardGold  int    `json:"reward_gold"`
	RewardGems  int    `json:"reward_gems"`
}

var achievementDefs []AchievementDef

func init() {
	loadAchievementDefs()
}

func loadAchievementDefs() {
	paths := []string{
		"../shared/achievements.json",
		"shared/achievements.json",
		"/app/shared/achievements.json",
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var wrapper struct {
			Achievements []AchievementDef `json:"achievements"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			log.Error().Err(err).Msg("Failed to parse achievements.json")
			continue
		}
		achievementDefs = wrapper.Achievements
		log.Info().Int("count", len(achievementDefs)).Msg("Loaded achievement definitions")
		return
	}
	log.Warn().Msg("No achievements.json found")
}

// GET /api/achievements — list all achievements with unlock state
func (h *Handler) GetAchievements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Get unlocked achievements from DB
	rows, err := h.slimeRepo.Pool().Query(ctx,
		`SELECT achievement_key, unlocked_at FROM achievements WHERE user_id = (
			SELECT id FROM users WHERE id::text = $1 OR provider_id = $1 LIMIT 1
		)`, userID)

	unlockedMap := make(map[string]string) // key -> unlocked_at
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var key string
			var unlockedAt string
			if err := rows.Scan(&key, &unlockedAt); err == nil {
				unlockedMap[key] = unlockedAt
			}
		}
	}

	result := make([]fiber.Map, 0, len(achievementDefs))
	for _, def := range achievementDefs {
		entry := fiber.Map{
			"key":         def.Key,
			"name":        def.Name,
			"description": def.Description,
			"icon":        def.Icon,
			"reward_gold": def.RewardGold,
			"reward_gems": def.RewardGems,
			"unlocked":    unlockedMap[def.Key] != "",
		}
		if unlockedMap[def.Key] != "" {
			entry["unlocked_at"] = unlockedMap[def.Key]
		}
		result = append(result, entry)
	}

	return c.JSON(fiber.Map{"achievements": result})
}

// POST /api/achievements/check — check and auto-unlock achievements
func (h *Handler) CheckAchievements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	ctx := c.Context()

	// Get user's UUID
	var userUUID string
	err := h.slimeRepo.Pool().QueryRow(ctx,
		`SELECT id::text FROM users WHERE id::text = $1 OR provider_id = $1 LIMIT 1`, userID).Scan(&userUUID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user not found"})
	}

	// Already unlocked
	rows, err := h.slimeRepo.Pool().Query(ctx,
		`SELECT achievement_key FROM achievements WHERE user_id = $1::uuid`, userUUID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check achievements"})
	}
	defer rows.Close()

	unlocked := make(map[string]bool)
	for rows.Next() {
		var key string
		rows.Scan(&key)
		unlocked[key] = true
	}

	newlyUnlocked := []string{}

	// Check each achievement condition
	for _, def := range achievementDefs {
		if unlocked[def.Key] {
			continue
		}

		met := false
		switch def.Key {
		case "first_slime":
			var cnt int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COUNT(*) FROM slimes WHERE user_id::text = $1`, userID).Scan(&cnt)
			met = cnt >= 1

		case "collector_10":
			var cnt int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COUNT(*) FROM codex_entries WHERE user_id::text = $1`, userID).Scan(&cnt)
			met = cnt >= 10

		case "collector_30":
			var cnt int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COUNT(*) FROM codex_entries WHERE user_id::text = $1`, userID).Scan(&cnt)
			met = cnt >= 30

		case "merge_master":
			// Check merge count via mission progress or custom counter
			val, _ := h.rdb.Get(ctx, "merge_count:"+userID).Int()
			met = val >= 10

		case "race_champion":
			var maxScore int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COALESCE(MAX(score), 0) FROM race_results WHERE user_id = $1`, userID).Scan(&maxScore)
			met = maxScore >= 5000

		case "fishing_pro":
			val, _ := h.rdb.Get(ctx, "ach:fishing_pro:"+userID).Result()
			met = val == "1"

		case "max_level":
			var maxLvl int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COALESCE(MAX(level), 0) FROM slimes WHERE user_id::text = $1`, userID).Scan(&maxLvl)
			met = maxLvl >= 30

		case "attendance_28":
			var cnt int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COALESCE(MAX(day_number), 0) FROM attendance WHERE user_id::text = $1`, userID).Scan(&cnt)
			met = cnt >= 28

		case "mythic_owner":
			var cnt int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COUNT(*) FROM slimes s JOIN slime_species sp ON s.species_id = sp.id
				 WHERE s.user_id::text = $1 AND sp.grade = 'mythic'`, userID).Scan(&cnt)
			met = cnt >= 1

		case "social_butterfly":
			val, _ := h.rdb.Get(ctx, "village_visits:"+userID).Int()
			met = val >= 10

		case "rich":
			user, err := h.userRepo.FindByID(ctx, userID)
			if err == nil {
				met = user.Gold >= 10000
			}

		case "explorer":
			var cnt int
			h.slimeRepo.Pool().QueryRow(ctx,
				`SELECT COUNT(*) FROM explorations WHERE user_id::text = $1 AND claimed = true`, userID).Scan(&cnt)
			met = cnt >= 20
		}

		if met {
			// Unlock achievement
			_, err := h.slimeRepo.Pool().Exec(ctx,
				`INSERT INTO achievements (user_id, achievement_key) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING`,
				userUUID, def.Key)
			if err == nil {
				newlyUnlocked = append(newlyUnlocked, def.Key)
				// Grant rewards
				if def.RewardGold > 0 || def.RewardGems > 0 {
					h.userRepo.AddCurrency(ctx, userID, int64(def.RewardGold), def.RewardGems, 0)
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"newly_unlocked": newlyUnlocked,
	})
}
