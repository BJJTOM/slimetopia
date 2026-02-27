package game

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ===== Boss Definitions =====

// BossDef defines a world boss with fixed identity per stage
type BossDef struct {
	Name    string
	Element string
	BaseHP  int64
}

// 10 unique bosses, one per stage
var stageBosses = []BossDef{
	{Name: "불꽃 드래곤", Element: "fire", BaseHP: 60000},
	{Name: "심해 크라켄", Element: "water", BaseHP: 100000},
	{Name: "얼음 골렘", Element: "ice", BaseHP: 160000},
	{Name: "독안개 히드라", Element: "poison", BaseHP: 300000},
	{Name: "혼돈의 슬라임킹", Element: "dark", BaseHP: 600000},
	{Name: "번개 피닉스", Element: "electric", BaseHP: 1000000},
	{Name: "대지의 타이탄", Element: "earth", BaseHP: 1800000},
	{Name: "질풍 세르펜트", Element: "wind", BaseHP: 3000000},
	{Name: "천체의 수호자", Element: "celestial", BaseHP: 5000000},
	{Name: "공허의 황제", Element: "light", BaseHP: 10000000},
}

const (
	bossMaxAttacksPerDay = 10
	bossDamageBase       = 50
)

// Stage multipliers for rewards
var stageGoldReward = []int{500, 800, 1200, 2000, 5000, 8000, 12000, 20000, 35000, 60000}
var stageGemReward = []int{5, 8, 12, 20, 50, 80, 120, 200, 350, 600}
var stageGoldMult = []float64{1, 1.5, 2, 3, 5, 7, 10, 15, 22, 35}
var stageGemMult = []float64{1, 1.5, 2, 3, 5, 7, 10, 15, 22, 35}

// ===== Handlers =====

// GetWorldBoss returns the current active boss, creating one if none exist
func (h *Handler) GetWorldBoss(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	var bossID int
	var name, element string
	var maxHP, currentHP int64
	var rewardGold, rewardGems, stage int
	var expiresAt time.Time

	err := pool.QueryRow(ctx,
		`SELECT id, name, element, max_hp, current_hp, reward_gold, reward_gems, expires_at, COALESCE(stage, 1)
		 FROM world_boss WHERE expires_at > NOW() ORDER BY id DESC LIMIT 1`,
	).Scan(&bossID, &name, &element, &maxHP, &currentHP, &rewardGold, &rewardGems, &expiresAt, &stage)

	if err != nil {
		// Create a new boss at stage 1
		boss := stageBosses[0]
		hp := boss.BaseHP + int64(rand.Intn(10000))
		expires := time.Now().Add(24 * time.Hour)
		gold := stageGoldReward[0]
		gems := stageGemReward[0]

		err = pool.QueryRow(ctx,
			`INSERT INTO world_boss (name, element, max_hp, current_hp, reward_gold, reward_gems, expires_at, stage)
			 VALUES ($1, $2, $3, $3, $4, $5, $6, 1) RETURNING id`,
			boss.Name, boss.Element, hp, gold, gems, expires,
		).Scan(&bossID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create boss"})
		}
		name = boss.Name
		element = boss.Element
		maxHP = hp
		currentHP = hp
		rewardGold = gold
		rewardGems = gems
		expiresAt = expires
		stage = 1
	}

	// Get user's attack count today
	attackKey := fmt.Sprintf("boss_attacks:%d:%s", bossID, userID)
	attackCount, _ := h.rdb.Get(c.Context(), attackKey).Int()

	// Get user's total damage
	var totalDamage int64
	pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(damage), 0) FROM world_boss_attacks WHERE boss_id = $1 AND user_id = $2`,
		bossID, userID,
	).Scan(&totalDamage)

	// Get top attackers
	rows, _ := pool.Query(ctx,
		`SELECT u.nickname, SUM(a.damage) as total_dmg
		 FROM world_boss_attacks a
		 JOIN users u ON u.id = a.user_id
		 WHERE a.boss_id = $1
		 GROUP BY u.nickname
		 ORDER BY total_dmg DESC
		 LIMIT 10`,
		bossID,
	)
	defer rows.Close()

	type Attacker struct {
		Nickname string `json:"nickname"`
		Damage   int64  `json:"damage"`
	}
	var topAttackers []Attacker
	for rows.Next() {
		var a Attacker
		if rows.Scan(&a.Nickname, &a.Damage) == nil {
			topAttackers = append(topAttackers, a)
		}
	}
	if topAttackers == nil {
		topAttackers = []Attacker{}
	}

	// Get user's rank
	var userRank int
	pool.QueryRow(ctx,
		`SELECT COUNT(*) + 1 FROM (
			SELECT user_id, SUM(damage) as total_dmg FROM world_boss_attacks
			WHERE boss_id = $1 GROUP BY user_id
		) sub WHERE sub.total_dmg > (
			SELECT COALESCE(SUM(damage), 0) FROM world_boss_attacks WHERE boss_id = $1 AND user_id = $2
		)`,
		bossID, userID,
	).Scan(&userRank)

	return c.JSON(fiber.Map{
		"boss": fiber.Map{
			"id":          bossID,
			"name":        name,
			"element":     element,
			"max_hp":      maxHP,
			"current_hp":  currentHP,
			"reward_gold": rewardGold,
			"reward_gems": rewardGems,
			"expires_at":  expiresAt,
			"defeated":    currentHP <= 0,
			"stage":       stage,
		},
		"my_attacks":    attackCount,
		"max_attacks":   bossMaxAttacksPerDay,
		"my_damage":     totalDamage,
		"my_rank":       userRank,
		"top_attackers": topAttackers,
	})
}

// AttackWorldBoss handles attacking the boss with a party of up to 5 slimes
func (h *Handler) AttackWorldBoss(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var body struct {
		SlimeID  string   `json:"slime_id"`
		SlimeIDs []string `json:"slime_ids"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id or slime_ids required"})
	}

	// Support both old and new format
	slimeIDs := body.SlimeIDs
	if len(slimeIDs) == 0 && body.SlimeID != "" {
		slimeIDs = []string{body.SlimeID}
	}
	if len(slimeIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slime_id or slime_ids required"})
	}
	if len(slimeIDs) > 5 {
		slimeIDs = slimeIDs[:5]
	}

	// Deduplicate slime IDs to prevent counting same slime multiple times
	seen := make(map[string]bool)
	uniqueIDs := make([]string, 0, len(slimeIDs))
	for _, sid := range slimeIDs {
		if !seen[sid] {
			seen[sid] = true
			uniqueIDs = append(uniqueIDs, sid)
		}
	}
	slimeIDs = uniqueIDs

	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Get active boss
	var bossID, stage int
	var bossElement string
	var currentHP int64
	err := pool.QueryRow(ctx,
		`SELECT id, element, current_hp, COALESCE(stage, 1) FROM world_boss WHERE expires_at > NOW() AND current_hp > 0 ORDER BY id DESC LIMIT 1`,
	).Scan(&bossID, &bossElement, &currentHP, &stage)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no active boss"})
	}

	// Check daily attack limit
	attackKey := fmt.Sprintf("boss_attacks:%d:%s", bossID, userID)
	attackCount, _ := h.rdb.Get(c.Context(), attackKey).Int()
	if attackCount >= bossMaxAttacksPerDay {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":     "daily attack limit reached",
			"remaining": 0,
		})
	}

	// Calculate combined damage from party
	totalDamage := 0
	type SlimeResult struct {
		ID      string `json:"id"`
		Element string `json:"element"`
		Damage  int    `json:"damage"`
		ExpGain int    `json:"exp_gain"`
		Strong  bool   `json:"strong"`
	}
	var slimeResults []SlimeResult

	for _, sid := range slimeIDs {
		slime, err := h.slimeRepo.FindByID(ctx, sid)
		if err != nil {
			continue
		}
		if uuidToString(slime.UserID) != userID {
			continue
		}

		// Base damage: 50 + level*10 + random variance
		// Higher level slimes deal significantly more damage
		damage := bossDamageBase + slime.Level*10 + rand.Intn(slime.Level*5+20)

		// Level scaling bonus: strong exponential curve at high levels
		if slime.Level >= 20 {
			damage += (slime.Level - 20) * 5
		}
		if slime.Level >= 30 {
			damage += (slime.Level - 30) * 8
		}

		// Element advantage/disadvantage
		strong := isElementStrong(slime.Element, bossElement)
		if strong {
			damage = damage * 3 / 2
		}
		if isElementStrong(bossElement, slime.Element) {
			damage = damage * 7 / 10
		}

		totalDamage += damage

		// Grant slime EXP
		expGain := damage / 5
		if expGain < 5 {
			expGain = 5
		}
		newLevel, newExp, _ := checkLevelUp(slime.Level, slime.Exp+expGain)
		h.slimeRepo.SetLevelAndExp(ctx, sid, newLevel, newExp)

		slimeResults = append(slimeResults, SlimeResult{
			ID:      sid,
			Element: slime.Element,
			Damage:  damage,
			ExpGain: expGain,
			Strong:  strong,
		})
	}

	if totalDamage == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no valid slimes in party"})
	}

	// Combo bonus: more slimes = more damage
	comboMultiplier := 1.0
	switch len(slimeResults) {
	case 2:
		comboMultiplier = 1.1
	case 3:
		comboMultiplier = 1.2
	case 4:
		comboMultiplier = 1.35
	case 5:
		comboMultiplier = 1.5
	}
	totalDamage = int(float64(totalDamage) * comboMultiplier)

	// Record attack
	slimeIDsStr := strings.Join(slimeIDs, ",")
	pool.Exec(ctx,
		`INSERT INTO world_boss_attacks (boss_id, user_id, slime_id, damage, slime_ids) VALUES ($1, $2, $3, $4, $5)`,
		bossID, userID, slimeIDs[0], totalDamage, slimeIDsStr,
	)

	// Update boss HP
	pool.Exec(ctx,
		`UPDATE world_boss SET current_hp = GREATEST(0, current_hp - $1) WHERE id = $2`,
		totalDamage, bossID,
	)

	// Increment attack count with 24h TTL
	h.rdb.Incr(c.Context(), attackKey)
	h.rdb.ExpireAt(c.Context(), attackKey, time.Now().Add(24*time.Hour))

	// Check if boss defeated
	var newHP int64
	pool.QueryRow(ctx, `SELECT current_hp FROM world_boss WHERE id = $1`, bossID).Scan(&newHP)
	defeated := newHP <= 0

	// Stage index for rewards
	stageIdx := stage - 1
	if stageIdx < 0 {
		stageIdx = 0
	}
	if stageIdx > 9 {
		stageIdx = 9
	}

	var bonusGold int64
	var bonusGems int
	if defeated {
		bonusGold = int64(float64(200) * stageGoldMult[stageIdx])
		bonusGems = int(float64(3) * stageGemMult[stageIdx])
		h.userRepo.AddCurrency(ctx, userID, bonusGold, bonusGems, 0)

		// Auto-advance to next stage if not max
		if stage < 10 {
			nextStage := stage + 1
			nextIdx := nextStage - 1
			boss := stageBosses[nextIdx]
			newMaxHP := boss.BaseHP + int64(rand.Intn(20000))
			expires := time.Now().Add(24 * time.Hour)
			newGold := stageGoldReward[nextIdx]
			newGems := stageGemReward[nextIdx]

			pool.Exec(ctx,
				`INSERT INTO world_boss (name, element, max_hp, current_hp, reward_gold, reward_gems, expires_at, stage)
				 VALUES ($1, $2, $3, $3, $4, $5, $6, $7)`,
				boss.Name, boss.Element, newMaxHP, newGold, newGems, expires, nextStage,
			)
		}
	}

	// Participation reward: flat 200 gold
	participationGold := int64(200)
	h.userRepo.AddCurrency(ctx, userID, participationGold, 0, 0)

	// Rank-based gem bonus on boss defeat
	var rankGems int
	if defeated {
		// Query damage ranking for this boss
		var userRank int
		pool.QueryRow(ctx,
			`SELECT COUNT(*) + 1 FROM (
				SELECT user_id, SUM(damage) as total_dmg FROM world_boss_attacks
				WHERE boss_id = $1 GROUP BY user_id
			) sub WHERE sub.total_dmg > (
				SELECT COALESCE(SUM(damage), 0) FROM world_boss_attacks WHERE boss_id = $1 AND user_id = $2
			)`,
			bossID, userID,
		).Scan(&userRank)

		switch userRank {
		case 1:
			rankGems = 10
		case 2:
			rankGems = 5
		case 3:
			rankGems = 3
		}
		if rankGems > 0 {
			h.userRepo.AddCurrency(ctx, userID, 0, rankGems, 0)
		}
	}

	// Log boss reward
	LogGameAction(pool, userID, "boss_reward", "boss", participationGold+bonusGold, bonusGems+rankGems, 0, map[string]interface{}{
		"boss_id": bossID, "damage": totalDamage, "defeated": defeated, "gold": participationGold + bonusGold, "gems": bonusGems + rankGems, "rank_gems": rankGems,
	})

	return c.JSON(fiber.Map{
		"damage":             totalDamage,
		"boss_hp_remaining":  newHP,
		"defeated":           defeated,
		"participation_gold": participationGold,
		"bonus_gold":         bonusGold,
		"bonus_gems":         bonusGems,
		"rank_gems":          rankGems,
		"slime_exp":          totalDamage / 5,
		"slime_results":      slimeResults,
		"combo_multiplier":   comboMultiplier,
		"remaining_attacks":  bossMaxAttacksPerDay - attackCount - 1,
		"next_stage":         defeated && stage < 10,
	})
}

// Simple element advantage chart
func isElementStrong(attacker, defender string) bool {
	advantages := map[string]string{
		"fire":     "grass",
		"water":    "fire",
		"grass":    "earth",
		"earth":    "electric",
		"electric": "water",
		"ice":      "wind",
		"wind":     "poison",
		"poison":   "grass",
		"light":     "dark",
		"dark":      "light",
		"celestial": "dark",
	}
	return advantages[attacker] == defender
}
