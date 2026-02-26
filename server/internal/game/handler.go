package game

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/slimetopia/server/internal/models"
	"github.com/slimetopia/server/internal/repository"
)

// MaterialDrop defines a possible material drop from exploration
type MaterialDrop struct {
	MaterialID int     `json:"material_id"`
	Chance     float64 `json:"chance"`
	MinQty     int     `json:"min_qty"`
	MaxQty     int     `json:"max_qty"`
}

// ExplorationDestination loaded from shared/explorations.json
type ExplorationDestination struct {
	ID                 int                    `json:"id"`
	Name               string                 `json:"name"`
	DurationMinutes    int                    `json:"duration_minutes"`
	RecommendedElement string                 `json:"recommended_element"`
	Rewards            map[string]interface{} `json:"rewards"`
	Unlock             map[string]interface{} `json:"unlock"`
	MaterialDrops      []MaterialDrop         `json:"material_drops"`
}

type Handler struct {
	slimeRepo       *repository.SlimeRepository
	userRepo        *repository.UserRepository
	explorationRepo *repository.ExplorationRepository
	missionRepo     *repository.MissionRepository
	villageRepo     *repository.VillageRepository
	gameDataRepo    *repository.GameDataRepository
	rdb             *redis.Client
	destinations    []ExplorationDestination
}

func NewHandler(slimeRepo *repository.SlimeRepository, userRepo *repository.UserRepository, explorationRepo *repository.ExplorationRepository, missionRepo *repository.MissionRepository, villageRepo *repository.VillageRepository, gameDataRepo *repository.GameDataRepository, rdb *redis.Client) *Handler {
	h := &Handler{
		slimeRepo:       slimeRepo,
		userRepo:        userRepo,
		explorationRepo: explorationRepo,
		missionRepo:     missionRepo,
		villageRepo:     villageRepo,
		gameDataRepo:    gameDataRepo,
		rdb:             rdb,
	}
	h.loadDestinationsFromDB()
	return h
}

func (h *Handler) loadDestinationsFromDB() {
	ctx := context.Background()
	dbDests, err := h.gameDataRepo.GetAllDestinations(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to load explorations from DB, destinations empty")
		return
	}
	for _, d := range dbDests {
		var rewards map[string]interface{}
		json.Unmarshal(d.Rewards, &rewards)
		unlock := map[string]interface{}{"type": d.UnlockType}
		if d.UnlockValue > 0 {
			unlock["value"] = float64(d.UnlockValue)
		}
		var drops []MaterialDrop
		json.Unmarshal(d.MaterialDrops, &drops)
		h.destinations = append(h.destinations, ExplorationDestination{
			ID:                 d.ID,
			Name:               d.Name,
			DurationMinutes:    d.DurationMinutes,
			RecommendedElement: d.RecommendedElement,
			Rewards:            rewards,
			Unlock:             unlock,
			MaterialDrops:      drops,
		})
	}
	log.Info().Int("count", len(h.destinations)).Msg("Loaded exploration destinations from DB")
}

func RegisterRoutes(router fiber.Router, h *Handler) {
	slimes := router.Group("/slimes")
	slimes.Get("/", h.ListSlimes)
	slimes.Post("/merge", h.MergeSlimes)
	slimes.Post("/:id/feed", h.FeedSlime)
	slimes.Post("/:id/pet", h.PetSlime)
	slimes.Post("/:id/play", h.PlaySlime)
	slimes.Post("/:id/bath", h.BathSlime)
	slimes.Post("/:id/medicine", h.MedicineSlime)
	slimes.Patch("/:id/name", h.RenameSlime)

	codex := router.Group("/codex")
	codex.Get("/", h.GetCodex)
	codex.Get("/species", h.GetAllSpecies)

	explorations := router.Group("/explorations")
	explorations.Get("/", h.ListExplorations)
	explorations.Get("/destinations", h.ListDestinations)
	explorations.Post("/start", h.StartExploration)
	explorations.Post("/:id/claim", h.ClaimExploration)

	shop := router.Group("/shop")
	shop.Get("/items", h.GetShopItems)
	shop.Post("/buy", h.BuyItem)
	shop.Get("/capacity", h.GetCapacityInfo)
	shop.Post("/expand-capacity", h.ExpandCapacity)
	shop.Get("/gems", h.GetGemPackages)
	shop.Post("/buy-gems", h.BuyGems)
	shop.Post("/buy-food", h.BuyFoodToInventory)

	router.Get("/recipes", h.GetRecipes)

	evolution := router.Group("/evolution")
	evolution.Get("/:species_id", h.GetEvolutionTree)
	evolution.Post("/:species_id/unlock", h.UnlockEvolutionNode)

	race := router.Group("/race")
	race.Post("/start", h.StartRace)
	race.Post("/finish", h.FinishRace)
	race.Get("/history", h.GetRaceHistory)

	missions := router.Group("/missions")
	missions.Get("/daily", h.GetDailyMissions)
	missions.Post("/:id/claim", h.ClaimMission)

	attendance := router.Group("/attendance")
	attendance.Get("/", h.GetAttendance)
	attendance.Post("/claim", h.ClaimAttendance)

	village := router.Group("/village")
	village.Get("/", h.GetMyVillage)
	village.Get("/visit", h.GetRandomVillages)
	village.Get("/:id", h.VisitVillage)
	village.Post("/:id/like", h.LikeVillage)
	village.Get("/:id/guestbook", h.GetGuestbook)
	village.Post("/:id/guestbook", h.PostGuestbook)

	seasons := router.Group("/seasons")
	seasons.Get("/active", h.GetActiveSeason)

	// Phase 3: Fishing
	fishing := router.Group("/fishing")
	fishing.Post("/start", h.StartFishing)
	fishing.Post("/catch", h.CatchFish)

	// Phase 3: Achievements
	achievements := router.Group("/achievements")
	achievements.Get("/", h.GetAchievements)
	achievements.Post("/check", h.CheckAchievements)

	// Phase 3: Interactive objects
	interact := router.Group("/interact")
	interact.Post("/tree", h.InteractTree)
	interact.Post("/bench", h.InteractBench)

	// Revenue: Daily wheel
	wheel := router.Group("/wheel")
	wheel.Get("/", h.GetWheel)
	wheel.Post("/spin", h.SpinWheel)

	// Revenue: Boosters
	router.Get("/boosters", h.GetActiveBoosters)

	// Revenue: Leaderboard
	leaderboard := router.Group("/leaderboard")
	leaderboard.Get("/", h.GetLeaderboard)
	leaderboard.Get("/my-rank", h.GetMyRank)

	// Accessories / Cosmetics
	accessories := router.Group("/accessories")
	accessories.Get("/", h.GetAccessories)
	accessories.Get("/all-equipped", h.GetAllEquippedAccessories)
	accessories.Post("/buy", h.BuyAccessory)
	accessories.Post("/equip", h.EquipAccessory)
	slimes.Get("/:id/accessories", h.GetSlimeAccessories)

	// Mailbox
	mailbox := router.Group("/mailbox")
	mailbox.Get("/", h.GetMailbox)
	mailbox.Post("/:id/read", h.ReadMail)
	mailbox.Post("/:id/claim", h.ClaimMail)

	// Collection
	router.Get("/collection/count", h.GetCollectionCount)
	router.Get("/collection/entries", h.GetCollectionEntries)
	router.Get("/collection/requirements", h.GetCollectionRequirements)
	router.Post("/collection/submit", h.SubmitToCollection)

	// Idle/Offline rewards
	idle := router.Group("/idle")
	idle.Get("/status", h.GetIdleStatus)
	idle.Post("/collect", h.CollectIdleReward)

	// Crafting
	crafting := router.Group("/crafting")
	crafting.Get("/recipes", h.GetCraftingRecipes)
	crafting.Post("/craft", h.CraftItem)

	// Gifting
	gift := router.Group("/gift")
	gift.Post("/send", h.SendGift)
	gift.Get("/history", h.GetGiftHistory)

	// Materials & Synthesis
	materials := router.Group("/materials")
	materials.Get("/", h.GetMaterials)
	materials.Get("/inventory", h.GetMaterialInventory)

	// Codex extensions (score, sets, first discoveries)
	codex.Get("/score", h.GetCollectionScore)
	codex.Get("/sets", h.GetCodexSets)
	codex.Get("/first-discoveries", h.GetFirstDiscoveries)

	// Announcements (public)
	router.Get("/announcements", h.GetAnnouncements)

	// Food Inventory
	food := router.Group("/food")
	food.Get("/inventory", h.GetFoodInventory)
	food.Post("/apply", h.ApplyFood)

	// World Boss
	boss := router.Group("/boss")
	boss.Get("/", h.GetWorldBoss)
	boss.Post("/attack", h.AttackWorldBoss)

	// Training Grounds
	training := router.Group("/training")
	training.Get("/", h.GetTrainingSlots)
	training.Post("/start", h.StartTraining)
	training.Post("/:id/collect", h.CollectTraining)

	// Pity status
	shop.Get("/pity", h.GetPityStatus)

	// Community
	community := router.Group("/community")
	community.Get("/posts", h.GetCommunityPosts)
	community.Post("/posts", h.CreateCommunityPost)
	community.Post("/posts/:id/like", h.LikeCommunityPost)
	community.Post("/posts/:id/unlike", h.UnlikeCommunityPost)
	community.Post("/posts/:id/view", h.ViewCommunityPost)
	community.Get("/posts/:id/replies", h.GetCommunityReplies)
	community.Post("/posts/:id/replies", h.CreateCommunityReply)
	community.Delete("/posts/:id", h.DeleteCommunityPost)
	community.Post("/posts/:id/report", h.ReportCommunityPost)
	community.Post("/replies/:id/report", h.ReportCommunityReply)
	community.Post("/replies/:id/like", h.LikeCommunityReply)
	community.Post("/replies/:id/unlike", h.UnlikeCommunityReply)
	community.Post("/users/:id/report", h.ReportCommunityUser)
	community.Post("/users/:id/block", h.BlockUser)
	community.Delete("/users/:id/block", h.UnblockUser)
	community.Get("/blocks", h.GetBlockedUsers)

	// Shorts
	shorts := router.Group("/shorts")
	shorts.Post("/upload", h.UploadShort)
	shorts.Get("/feed", h.GetShortsFeed)
	shorts.Get("/mine", h.GetMyShorts)
	shorts.Get("/:id", h.GetShortDetail)
	shorts.Delete("/:id", h.DeleteShort)
	shorts.Post("/:id/like", h.LikeShort)
	shorts.Post("/:id/unlike", h.UnlikeShort)
	shorts.Post("/:id/react", h.ReactShort)
	shorts.Get("/:id/comments", h.GetShortComments)
	shorts.Post("/:id/comments", h.CreateShortComment)
	shorts.Post("/:id/tip", h.TipShort)
	shorts.Post("/seed", h.SeedShorts)

	// Profile
	profile := router.Group("/profile")
	profile.Post("/image", h.UploadProfileImage)
	profile.Get("/image", h.GetProfileImage)
	profile.Delete("/image", h.DeleteProfileImage)

	// Support tickets (user-facing)
	support := router.Group("/support")
	support.Post("/tickets", h.CreateSupportTicket)
	support.Get("/tickets", h.ListSupportTickets)
	support.Get("/tickets/:id", h.GetSupportTicketDetail)
	support.Post("/tickets/:id/reply", h.ReplySupportTicket)

	// Admin: Bot seeding
	bots := router.Group("/admin/bots")
	bots.Post("/seed", h.SeedBots)
	bots.Delete("/", h.DeleteBots)
}

func (h *Handler) ListSlimes(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	slimes, err := h.slimeRepo.FindByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch slimes",
		})
	}

	result := make([]fiber.Map, 0, len(slimes))
	for _, s := range slimes {
		// Apply lazy decay
		newHunger, newCondition, newAffection, shouldSick := applyLazyDecay(s.Hunger, s.Condition, s.Affection, s.UpdatedAt)
		if newHunger != s.Hunger || newCondition != s.Condition || newAffection != s.Affection {
			_ = h.slimeRepo.UpdateStats(c.Context(), uuidToString(s.ID), newAffection, newHunger, newCondition)
			s.Hunger = newHunger
			s.Condition = newCondition
			s.Affection = newAffection
		}
		if shouldSick && !s.IsSick {
			_ = h.slimeRepo.UpdateSick(c.Context(), uuidToString(s.ID), true)
			s.IsSick = true
		}
		result = append(result, slimeToMap(s))
	}

	return c.JSON(fiber.Map{"slimes": result})
}

// handleNurtureAction is the shared handler for feed, pet, and play actions.
func (h *Handler) handleNurtureAction(c *fiber.Ctx, action string) error {
	userID := c.Locals("user_id").(string)
	slimeID := c.Params("id")

	// 1. Check cooldown
	cooldownKey := fmt.Sprintf("cooldown:%s:%s:%s", userID, slimeID, action)
	ttl, err := h.rdb.TTL(c.Context(), cooldownKey).Result()
	if err == nil && ttl > 0 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":             "cooldown active",
			"remaining_seconds": int(ttl.Seconds()) + 1,
		})
	}

	// 2. Find slime + ownership check
	slime, err := h.slimeRepo.FindByID(c.Context(), slimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}
	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	// 3. Apply lazy decay
	newHunger, newCondition, decayedAffection, shouldSick := applyLazyDecay(slime.Hunger, slime.Condition, slime.Affection, slime.UpdatedAt)
	slime.Hunger = newHunger
	slime.Condition = newCondition
	slime.Affection = decayedAffection
	if shouldSick && !slime.IsSick {
		_ = h.slimeRepo.UpdateSick(c.Context(), slimeID, true)
		slime.IsSick = true
	}

	// 4. Calculate stat changes with personality bonus
	delta := baseStats[action]
	applyPersonalityBonus(&delta, slime.Personality, action)

	newAffection := clamp(slime.Affection+delta.Affection, 0, 100)
	finalHunger := clamp(slime.Hunger+delta.Hunger, 0, 100)
	finalCondition := clamp(slime.Condition+delta.Condition, 0, 100)

	// 5. Update stats
	if err := h.slimeRepo.UpdateStats(c.Context(), slimeID, newAffection, finalHunger, finalCondition); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update stats"})
	}

	// 5.1. Medicine cures sickness
	isSick := slime.IsSick
	if action == ActionMedicine && slime.IsSick {
		_ = h.slimeRepo.UpdateSick(c.Context(), slimeID, false)
		isSick = false
	}

	// 5.5. Apply weather buff to EXP (sick slimes get 0 EXP)
	buffedExp := 0
	if !isSick {
		weatherBuff := getWeatherBuff(slime.Element)
		buffedExp = int(float64(delta.Exp) * weatherBuff)
		// Apply EXP booster if active
		if h.IsBoosterActive(userID, BoosterExp) {
			buffedExp *= 2
		}
		if buffedExp < 1 {
			buffedExp = 1
		}
	}

	// 6. Level up check
	totalExp := slime.Exp + buffedExp
	newLevel, newExp, leveledUp := checkLevelUp(slime.Level, totalExp)
	if err := h.slimeRepo.SetLevelAndExp(c.Context(), slimeID, newLevel, newExp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update exp"})
	}

	// 7. Set cooldown
	cd := cooldowns[action]
	h.rdb.Set(c.Context(), cooldownKey, "1", cd)

	// 8. Track mission progress
	h.missionRepo.IncrementProgress(c.Context(), userID, action)

	// 9. Return response
	mood := deriveMood(finalHunger, finalCondition, newAffection, isSick)
	return c.JSON(fiber.Map{
		"affection":  newAffection,
		"hunger":     finalHunger,
		"condition":  finalCondition,
		"exp_gained": buffedExp,
		"new_exp":    newExp,
		"new_level":  newLevel,
		"level_up":   leveledUp,
		"reaction":   getReaction(slime.Personality, action),
		"is_sick":    isSick,
		"mood":       mood,
	})
}

func (h *Handler) FeedSlime(c *fiber.Ctx) error {
	return h.handleNurtureAction(c, ActionFeed)
}

func (h *Handler) PetSlime(c *fiber.Ctx) error {
	return h.handleNurtureAction(c, ActionPet)
}

func (h *Handler) PlaySlime(c *fiber.Ctx) error {
	return h.handleNurtureAction(c, ActionPlay)
}

func (h *Handler) BathSlime(c *fiber.Ctx) error {
	return h.handleNurtureAction(c, ActionBath)
}

func (h *Handler) MedicineSlime(c *fiber.Ctx) error {
	return h.handleNurtureAction(c, ActionMedicine)
}

func (h *Handler) RenameSlime(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	slimeID := c.Params("id")

	var body struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name required"})
	}
	if len(body.Name) > 20 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name too long (max 20)"})
	}

	slime, err := h.slimeRepo.FindByID(c.Context(), slimeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found"})
	}

	if uuidToString(slime.UserID) != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
	}

	if err := h.slimeRepo.UpdateName(c.Context(), slimeID, body.Name); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to rename"})
	}

	return c.JSON(fiber.Map{"name": body.Name})
}

func (h *Handler) GetCodex(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	discovered, err := h.slimeRepo.GetCodex(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch codex"})
	}

	allSpecies, err := h.slimeRepo.GetAllSpecies(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch species"})
	}

	discoveredSet := make(map[int]bool)
	for _, id := range discovered {
		discoveredSet[id] = true
	}

	entries := make([]fiber.Map, 0, len(allSpecies))
	for _, sp := range allSpecies {
		entry := fiber.Map{
			"species_id": sp.ID,
			"discovered": discoveredSet[sp.ID],
		}
		if discoveredSet[sp.ID] {
			entry["name"] = sp.Name
			entry["name_en"] = sp.NameEN
			entry["element"] = sp.Element
			entry["grade"] = sp.Grade
			entry["description"] = sp.Description
		}
		entries = append(entries, entry)
	}

	return c.JSON(fiber.Map{
		"total":      len(allSpecies),
		"discovered": len(discovered),
		"entries":    entries,
	})
}

func (h *Handler) GetAllSpecies(c *fiber.Ctx) error {
	species, err := h.slimeRepo.GetAllSpecies(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch species"})
	}
	return c.JSON(fiber.Map{"species": species})
}

func uuidToString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	b := id.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// ===== Exploration Handlers =====

func (h *Handler) findDestination(id int) *ExplorationDestination {
	for _, d := range h.destinations {
		if d.ID == id {
			return &d
		}
	}
	return nil
}

func (h *Handler) ListDestinations(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"destinations": h.destinations})
}

func (h *Handler) ListExplorations(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	exps, err := h.explorationRepo.FindActiveByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch explorations"})
	}
	if exps == nil {
		exps = []repository.Exploration{}
	}
	return c.JSON(fiber.Map{"explorations": exps})
}

func (h *Handler) StartExploration(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		DestinationID int      `json:"destination_id"`
		SlimeIDs      []string `json:"slime_ids"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "destination_id and slime_ids required"})
	}

	if len(body.SlimeIDs) == 0 || len(body.SlimeIDs) > 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "select 1~3 slimes"})
	}

	// Find destination
	dest := h.findDestination(body.DestinationID)
	if dest == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "destination not found"})
	}

	ctx := c.Context()

	// Check unlock condition
	if unlockType, ok := dest.Unlock["type"].(string); ok && unlockType == "level" {
		if unlockVal, ok := dest.Unlock["value"].(float64); ok {
			// Check max level of selected slimes
			maxLevel := 0
			for _, sid := range body.SlimeIDs {
				slime, err := h.slimeRepo.FindByID(ctx, sid)
				if err != nil {
					return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found: " + sid})
				}
				if uuidToString(slime.UserID) != userID {
					return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
				}
				if slime.Level > maxLevel {
					maxLevel = slime.Level
				}
			}
			if maxLevel < int(unlockVal) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("need at least level %d slime", int(unlockVal)),
				})
			}
		}
	} else {
		// Still validate ownership for default destinations
		for _, sid := range body.SlimeIDs {
			slime, err := h.slimeRepo.FindByID(ctx, sid)
			if err != nil {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "slime not found: " + sid})
			}
			if uuidToString(slime.UserID) != userID {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your slime"})
			}
		}
	}

	// Check if slimes already on exploration
	onExp, err := h.explorationRepo.IsSlimeOnExploration(ctx, userID, body.SlimeIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check exploration status"})
	}
	if onExp {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "one or more slimes already on exploration"})
	}

	endsAt := time.Now().Add(time.Duration(dest.DurationMinutes) * time.Minute)

	exploration, err := h.explorationRepo.Create(ctx, userID, body.DestinationID, body.SlimeIDs, endsAt)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start exploration"})
	}

	// Track mission progress
	h.missionRepo.IncrementProgress(ctx, userID, "explore")

	return c.JSON(fiber.Map{"exploration": exploration})
}

func (h *Handler) ClaimExploration(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	explorationID := c.Params("id")

	ctx := c.Context()

	exp, err := h.explorationRepo.FindByID(ctx, explorationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "exploration not found"})
	}
	if exp.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not your exploration"})
	}
	if exp.Claimed {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already claimed"})
	}
	if time.Now().Before(exp.EndsAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exploration not finished yet"})
	}

	dest := h.findDestination(exp.DestinationID)
	if dest == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "destination data missing"})
	}

	// Calculate rewards
	var goldReward int64
	var gemsReward int

	if goldData, ok := dest.Rewards["gold"].(map[string]interface{}); ok {
		minG := int64(goldData["min"].(float64))
		maxG := int64(goldData["max"].(float64))
		goldReward = minG + int64(rand.Intn(int(maxG-minG+1)))
	}

	if gemsData, ok := dest.Rewards["gems"].(map[string]interface{}); ok {
		minG := int(gemsData["min"].(float64))
		maxG := int(gemsData["max"].(float64))
		gemsReward = minG + rand.Intn(maxG-minG+1)
	}

	// Check recommended element bonus (+50%)
	hasRecommended := false
	for _, sid := range exp.SlimeIDs {
		slime, err := h.slimeRepo.FindByID(ctx, sid)
		if err == nil && slime.Element == dest.RecommendedElement {
			hasRecommended = true
			break
		}
	}
	if hasRecommended {
		goldReward = goldReward * 3 / 2
		gemsReward = gemsReward * 3 / 2
	}

	// Apply gold booster if active
	if h.IsBoosterActive(userID, BoosterGold) {
		goldReward *= 2
	}

	// Grant rewards
	if err := h.userRepo.AddCurrency(ctx, userID, goldReward, gemsReward, 0); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to grant rewards"})
	}

	// Grant EXP to exploration slimes
	expGain := dest.DurationMinutes / 3 // 1 EXP per 3 min
	if expGain < 5 {
		expGain = 5
	}
	for _, sid := range exp.SlimeIDs {
		slime, err := h.slimeRepo.FindByID(ctx, sid)
		if err != nil {
			continue
		}
		newLevel, newExp, _ := checkLevelUp(slime.Level, slime.Exp+expGain)
		h.slimeRepo.SetLevelAndExp(ctx, sid, newLevel, newExp)
	}

	// Roll for material drops
	type DroppedMaterial struct {
		MaterialID int    `json:"material_id"`
		Quantity   int    `json:"quantity"`
		Name       string `json:"name"`
		Icon       string `json:"icon"`
	}
	var droppedMaterials []DroppedMaterial
	pool := h.slimeRepo.Pool()

	if len(dest.MaterialDrops) > 0 {
		dropMultiplier := 1.0
		if hasRecommended {
			dropMultiplier = 1.5 // Element bonus also boosts material drops
		}
		for _, md := range dest.MaterialDrops {
			adjustedChance := md.Chance * dropMultiplier
			if rand.Float64() < adjustedChance {
				qty := md.MinQty
				if md.MaxQty > md.MinQty {
					qty += rand.Intn(md.MaxQty - md.MinQty + 1)
				}
				AddMaterial(ctx, pool, userID, md.MaterialID, qty)
				mat := h.FindMaterial(md.MaterialID)
				name := ""
				icon := ""
				if mat != nil {
					name = mat.Name
					icon = mat.Icon
				}
				droppedMaterials = append(droppedMaterials, DroppedMaterial{
					MaterialID: md.MaterialID,
					Quantity:   qty,
					Name:       name,
					Icon:       icon,
				})
			}
		}
	}

	// Mark claimed
	if err := h.explorationRepo.MarkClaimed(ctx, explorationID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to claim"})
	}

	// Log exploration claim
	matIDs := make([]int, 0, len(droppedMaterials))
	for _, dm := range droppedMaterials {
		matIDs = append(matIDs, dm.MaterialID)
	}
	LogGameAction(pool, userID, "exploration_claim", "explore", goldReward, gemsReward, 0, map[string]interface{}{
		"destination_id": exp.DestinationID, "gold": goldReward, "gems": gemsReward, "materials": matIDs,
	})

	user, _ := h.userRepo.FindByID(ctx, userID)

	return c.JSON(fiber.Map{
		"gold_reward":        goldReward,
		"gems_reward":        gemsReward,
		"exp_gain":           expGain,
		"element_bonus":      hasRecommended,
		"material_drops":     droppedMaterials,
		"user": fiber.Map{
			"gold": user.Gold,
			"gems": user.Gems,
		},
	})
}

// GET /api/recipes — returns recipes with hidden ones masked
func (h *Handler) GetRecipes(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	discovered, err := h.slimeRepo.GetDiscoveredRecipes(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch recipes"})
	}
	discoveredSet := make(map[int]bool)
	for _, id := range discovered {
		discoveredSet[id] = true
	}

	dbRecipes, err := h.gameDataRepo.GetAllRecipes(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch recipes"})
	}

	result := make([]fiber.Map, 0, len(dbRecipes))
	for _, r := range dbRecipes {
		entry := fiber.Map{
			"id":         r.ID,
			"hidden":     r.Hidden,
			"discovered": discoveredSet[r.ID],
		}
		if !r.Hidden || discoveredSet[r.ID] {
			entry["input_a"] = r.InputA
			entry["input_b"] = r.InputB
			entry["output"] = r.Output
			entry["output_name"] = r.OutputName
		} else {
			entry["hint"] = r.Hint
		}
		result = append(result, entry)
	}

	return c.JSON(fiber.Map{"recipes": result})
}

func slimeToMap(s models.Slime) fiber.Map {
	mood := deriveMood(s.Hunger, s.Condition, s.Affection, s.IsSick)
	m := fiber.Map{
		"id":          uuidToString(s.ID),
		"species_id":  s.SpeciesID,
		"level":       s.Level,
		"exp":         s.Exp,
		"element":     s.Element,
		"personality": s.Personality,
		"affection":   s.Affection,
		"hunger":      s.Hunger,
		"condition":   s.Condition,
		"is_sick":     s.IsSick,
		"mood":        mood,
		"created_at":  s.CreatedAt,
		"updated_at":  s.UpdatedAt,
	}
	if s.Name != nil {
		m["name"] = *s.Name
	}
	if s.PositionX != nil {
		m["position_x"] = *s.PositionX
	}
	if s.PositionY != nil {
		m["position_y"] = *s.PositionY
	}
	return m
}
