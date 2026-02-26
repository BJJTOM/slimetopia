package game

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

// botNicknames — 100 unique Korean slime-themed nicknames
var botNicknames = []string{
	"초보슬라이머", "뽑기의달인", "젤리마스터", "탐험왕", "합성장인",
	"물방울조련사", "불꽃사냥꾼", "풀잎수집가", "빛의여행자", "그림자기사",
	"얼음공주", "번개소년", "독버섯연구원", "대지의수호자", "바람의노래",
	"슬라임마스터42", "젤리킹", "초보탐험가", "뽑기장인", "합성의신",
	"컬렉션왕", "낚시고수", "레이스챔피언", "마을건축가", "보스사냥꾼",
	"별빛수집가", "해적슬라임팬", "밀짚모자팬", "그랜드라인탐험", "천공섬주민",
	"불꽃의의지", "물의심판", "풀의축복", "빛의계시", "어둠의속삭임",
	"서리마법사", "천둥벼락", "독안개유령", "대지진동", "태풍의눈",
	"슬라임덕후", "가챠중독자", "무과금전사", "소과금유저", "럭키가이",
	"운빨망겜", "레전드헌터", "미식슬라임", "에너지충전", "쿨가이슬라임",
	"호기심대마왕", "츤데레매니아", "상냥한주인", "젤리떡", "슬라임빵",
	"푸딩마스터", "묵찌빠왕", "슬라임농장", "몬스터수집가", "원피스팬",
	"해적왕꿈나무", "동해의모험가", "위대한항로", "사이퍼폴요원", "칠무해지망생",
	"최악의세대", "해군장교", "사황부하", "로기아능력자", "파라미시아연구",
	"조안사육사", "혁명군전사", "천룡인시종", "조이보이팬", "원피스탐구자",
	"슬라임박사", "젤리연금술사", "합성레시피북", "탐험일지작성자", "도감마스터",
	"골드러시", "젬부자", "스타더스트왕", "경험치사냥꾼", "레벨업중독",
	"매일출석러", "미션클리어왕", "업적수집광", "낚시꾼77", "레이서99",
	"마을꾸미기왕", "방문자환영", "방명록요정", "커뮤니티활동가", "좋아요요정",
	"댓글부대장", "인기글작성자", "슬라임사진작가", "게임팁제공자", "뉴비도우미",
}

// botPostContents — Korean community post contents (50 entries)
var botPostContents = []struct {
	Content  string
	PostType string
}{
	{"드디어 전설 슬라임 뽑았다!! ㄹㅇ 1000번은 돌린듯", "flex"},
	{"초보인데 합성 꿀팁 좀 알려주세요 ㅠㅠ", "question"},
	{"이 게임 낚시가 은근 재밌네요 ㅋㅋ", "general"},
	{"컬렉션 50% 달성! 목표는 100%", "flex"},
	{"불꽃 슬라임 + 물방울 슬라임 합성하면 뭐 나오나요?", "question"},
	{"오늘 출석 보상 대박이었어요", "general"},
	{"레이스에서 1등 했다!! 내 슬라임 최고", "flex"},
	{"마을 꾸미기 어떻게 하면 이쁘게 되나요?", "question"},
	{"뽑기 100연차인데 아직도 전설 안 나옴... 천장 있나요?", "question"},
	{"합성 레시피 전부 공개해주실 분?", "question"},
	{"오늘 처음 시작했는데 이 게임 뭐해요?", "question"},
	{"내 물방울 슬라임 레벨 30 달성 ㅎㅎ", "flex"},
	{"슬라임한테 밥 안 주면 아프다는 거 처음 알았어요", "tip"},
	{"츤데레 성격 슬라임 너무 귀여움 ㅋㅋㅋ", "general"},
	{"낚시로 골드 모으는 게 제일 효율 좋은 듯", "tip"},
	{"탐험 보내놓고 기다리는 중... 빨리 돌아와라", "general"},
	{"보스전 같이 할 사람?? 혼자서는 못 잡겠어요", "general"},
	{"오늘 가챠 운 미쳤다 에픽 3개 연속", "flex"},
	{"슬라임 이름 뭘로 지었어요? 추천 좀", "question"},
	{"에너지 성격 슬라임이 놀아주기 좋아하네요", "tip"},
	{"얼음 슬라임 어디서 구하나요?", "question"},
	{"매일 출석만 해도 보상이 이렇게 좋다니", "general"},
	{"합성 성공률 올리는 방법 있나요?", "question"},
	{"드디어 신화 등급 슬라임 보유자 됐습니다!", "flex"},
	{"이 게임 BGM 너무 좋아요 힐링됨", "general"},
	{"마을 방문하면 경험치 준다는 거 알고 계셨나요?", "tip"},
	{"슬라임 목욕시키면 컨디션 올라가요!", "tip"},
	{"전설 뽑으려면 프리미엄 알이 좋나요?", "question"},
	{"레벨업 할 때마다 보상이 점점 좋아져요", "tip"},
	{"독 슬라임 + 풀 슬라임 = ???", "question"},
	{"주간 미션 다 깨면 젬 50개 줌 ㅎㅎ", "tip"},
	{"다크 슬라임 분위기 ㄹㅇ 간지남", "general"},
	{"바람 속성이 탐험에서 제일 좋은 것 같아요", "tip"},
	{"골드 5만 모았다! 뭐에 쓰지?", "general"},
	{"슬라임 레이스 꿀팁: 레벨 높은 슬라임이 유리해요", "tip"},
	{"방명록에 인사 남겨주세요~", "general"},
	{"전기 슬라임 번개처럼 빠르네 ㅋㅋ", "general"},
	{"컬렉션 제출할 때 성격별로 다 모아야 하나요?", "question"},
	{"세계 보스 데미지 랭킹 1등 찍었다!!", "flex"},
	{"오늘의 행운 뽑기 결과: 젬 20개!", "general"},
	{"식빵 슬라임 나왔으면 좋겠다 ㅋㅋ", "general"},
	{"게임 시작한 지 일주일째, 완전 빠졌어요", "general"},
	{"천상 속성 슬라임 실화? 너무 이쁘다", "flex"},
	{"초보 꿀팁: 매일 출석 + 미션 + 낚시 = 골드 부자", "tip"},
	{"합성으로 히든 슬라임 나온 사람 있나요?", "question"},
	{"슬라임 키우는 재미가 이렇게 클 줄이야", "general"},
	{"earth 슬라임 방어력 미쳤음 보스전 필수", "tip"},
	{"훈련장에서 슬라임 경험치 꿀빨기", "tip"},
	{"오늘 하루도 슬라임과 함께 힐링~", "general"},
	{"뉴비 가이드: 일단 물/불/풀 3마리 키우세요!", "tip"},
}

// botReplyContents — Korean reply contents for community posts
var botReplyContents = []string{
	"오 축하해요! ㅎㅎ",
	"저도 이거 궁금했는데!",
	"ㅋㅋㅋ 공감",
	"대박이네요",
	"저도 해봐야겠다",
	"좋은 정보 감사합니다!",
	"부럽다... 저는 아직 ㅠ",
	"화이팅!",
	"ㅎㅎ 재밌죠?",
	"저도요~ 같이 해요",
	"꿀팁 감사!",
	"와 진짜?",
	"맞아요 저도 그렇게 느꼈어요",
	"ㄹㅇ 인정",
	"저도 도전해봐야지",
}

// allBotElements and allBotPersonalities used for random slime generation
var allBotElements = []string{"water", "fire", "grass", "light", "dark", "ice", "electric", "poison", "earth", "wind"}
var allBotPersonalities = []string{"energetic", "chill", "foodie", "curious", "tsundere", "gentle"}
var allBotGrades = []string{"common", "uncommon", "rare", "epic", "legendary", "mythic"}

// SeedBots creates 100 bot users with slimes, community posts, and collection entries.
// It is idempotent: if bot users already exist, it skips creation.
func (h *Handler) SeedBots(c *fiber.Ctx) error {
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Check if bots already exist
	var botCount int
	err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE email LIKE '%@slimetopia.bot'`,
	).Scan(&botCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check existing bots"})
	}
	if botCount >= 100 {
		return c.JSON(fiber.Map{
			"message":   "bots already seeded",
			"bot_count": botCount,
			"skipped":   true,
		})
	}

	// Pre-hash the bot password once (all bots share the same password)
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("botpassword"), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	// Load all species for random slime assignment
	allSpecies, err := h.slimeRepo.GetAllSpecies(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to load species for bot seeding")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load species"})
	}
	if len(allSpecies) == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "no species in database"})
	}

	// Build grade-to-species map
	speciesByGrade := map[string][]int{}
	speciesElementMap := map[int]string{}
	for _, sp := range allSpecies {
		speciesByGrade[sp.Grade] = append(speciesByGrade[sp.Grade], sp.ID)
		speciesElementMap[sp.ID] = sp.Element
	}

	createdBots := 0
	totalSlimes := 0
	totalPosts := 0
	totalReplies := 0
	totalCollections := 0
	totalRaceResults := 0

	// Collect created bot user IDs for cross-interaction later
	var botUserIDs []string
	var botPostIDs []string

	for i := 0; i < 100; i++ {
		email := fmt.Sprintf("bot%d@slimetopia.bot", i+1)
		nickname := botNicknames[i]

		// Check if this specific bot already exists
		var exists bool
		pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists)
		if exists {
			// Still get the user ID for cross-interactions
			var uid string
			pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&uid)
			if uid != "" {
				botUserIDs = append(botUserIDs, uid)
			}
			continue
		}

		// Determine bot tier for realistic variety
		tier := getBotTier(i)

		gold := randBetween(tier.minGold, tier.maxGold)
		gems := randBetween(tier.minGems, tier.maxGems)
		level := randBetween(tier.minLevel, tier.maxLevel)
		stardust := randBetween(0, level*10)

		// Create user
		var userID string
		err := pool.QueryRow(ctx,
			`INSERT INTO users (nickname, provider, provider_id, gold, gems, stardust, level, email, password_hash)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING id`,
			nickname, "bot", fmt.Sprintf("bot_%d", i+1),
			int64(gold), gems, stardust, level, email, string(passwordHash),
		).Scan(&userID)
		if err != nil {
			log.Error().Err(err).Str("nickname", nickname).Msg("Failed to create bot user")
			continue
		}
		botUserIDs = append(botUserIDs, userID)
		createdBots++

		// Create village for the bot
		seedBotVillage(ctx, pool, userID, nickname)

		// Create slimes (3-10 based on tier)
		slimeCount := randBetween(tier.minSlimes, tier.maxSlimes)
		var createdSlimeIDs []string
		for j := 0; j < slimeCount; j++ {
			speciesID, element := pickBotSpecies(tier, speciesByGrade, speciesElementMap)
			personality := allBotPersonalities[rand.Intn(len(allBotPersonalities))]
			slimeLevel := randBetween(1, level)
			if slimeLevel < 1 {
				slimeLevel = 1
			}
			slimeExp := rand.Intn(50)
			affection := randBetween(20, 90)
			hunger := randBetween(30, 100)
			condition := randBetween(40, 100)

			var slimeID string
			err := pool.QueryRow(ctx,
				`INSERT INTO slimes (user_id, species_id, element, personality, level, exp, affection, hunger, condition)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
				 RETURNING id`,
				userID, speciesID, element, personality,
				slimeLevel, slimeExp, affection, hunger, condition,
			).Scan(&slimeID)
			if err != nil {
				log.Error().Err(err).Msg("Failed to create bot slime")
				continue
			}
			createdSlimeIDs = append(createdSlimeIDs, slimeID)
			totalSlimes++

			// Add to codex
			pool.Exec(ctx,
				`INSERT INTO codex_entries (user_id, species_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				userID, speciesID,
			)
		}

		// Create community posts (0-5 based on tier)
		postCount := randBetween(tier.minPosts, tier.maxPosts)
		for j := 0; j < postCount; j++ {
			post := botPostContents[rand.Intn(len(botPostContents))]
			// Randomize creation time within last 30 days
			createdAt := time.Now().Add(-time.Duration(rand.Intn(30*24)) * time.Hour)
			likes := randBetween(0, 20)
			viewCount := likes + randBetween(0, 50)

			var postID string
			err := pool.QueryRow(ctx,
				`INSERT INTO community_posts (user_id, content, post_type, likes, view_count, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 RETURNING id`,
				userID, post.Content, post.PostType, likes, viewCount, createdAt,
			).Scan(&postID)
			if err != nil {
				log.Error().Err(err).Msg("Failed to create bot community post")
				continue
			}
			botPostIDs = append(botPostIDs, postID)
			totalPosts++
		}

		// Create collection entries (0-5 based on tier)
		collectionCount := randBetween(tier.minCollection, tier.maxCollection)
		submittedPairs := make(map[string]bool)
		for j := 0; j < collectionCount; j++ {
			speciesID, _ := pickBotSpecies(tier, speciesByGrade, speciesElementMap)
			personality := allBotPersonalities[rand.Intn(len(allBotPersonalities))]
			pairKey := fmt.Sprintf("%d_%s", speciesID, personality)
			if submittedPairs[pairKey] {
				continue
			}
			submittedPairs[pairKey] = true

			_, err := pool.Exec(ctx,
				`INSERT INTO collection_entries (user_id, species_id, personality) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
				userID, speciesID, personality,
			)
			if err == nil {
				totalCollections++
			}
		}

		// Create race results for some bots (adds to leaderboard)
		if rand.Float64() < 0.6 && len(createdSlimeIDs) > 0 {
			raceCount := randBetween(1, 5)
			for r := 0; r < raceCount; r++ {
				score := randBetween(50, 300+level*10)
				goldReward := randBetween(10, 100)
				expReward := randBetween(5, 30)
				slimeID := createdSlimeIDs[rand.Intn(len(createdSlimeIDs))]
				playedAt := time.Now().Add(-time.Duration(rand.Intn(14*24)) * time.Hour)

				_, err := pool.Exec(ctx,
					`INSERT INTO race_results (user_id, slime_id, score, gold_reward, exp_reward, played_at)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					userID, slimeID, score, goldReward, expReward, playedAt,
				)
				if err == nil {
					totalRaceResults++
				}
			}
		}
	}

	// Phase 2: Create cross-interactions (replies, likes)
	totalLikes := 0
	if len(botUserIDs) > 1 && len(botPostIDs) > 0 {
		// Add replies from random bots to random posts
		maxReplies := len(botPostIDs) * 2
		if maxReplies > 200 {
			maxReplies = 200
		}
		for i := 0; i < maxReplies; i++ {
			postID := botPostIDs[rand.Intn(len(botPostIDs))]
			replyUserID := botUserIDs[rand.Intn(len(botUserIDs))]
			replyContent := botReplyContents[rand.Intn(len(botReplyContents))]
			createdAt := time.Now().Add(-time.Duration(rand.Intn(29*24)) * time.Hour)

			var replyID string
			err := pool.QueryRow(ctx,
				`INSERT INTO community_replies (post_id, user_id, content, created_at)
				 VALUES ($1, $2, $3, $4)
				 RETURNING id`,
				postID, replyUserID, replyContent, createdAt,
			).Scan(&replyID)
			if err == nil {
				totalReplies++
			}
		}

		// Update reply counts on posts
		for _, postID := range botPostIDs {
			pool.Exec(ctx,
				`UPDATE community_posts SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE post_id = $1) WHERE id = $1`,
				postID,
			)
		}

		// Add likes from bots to posts
		maxLikes := len(botPostIDs) * 3
		if maxLikes > 300 {
			maxLikes = 300
		}
		for i := 0; i < maxLikes; i++ {
			postID := botPostIDs[rand.Intn(len(botPostIDs))]
			likerID := botUserIDs[rand.Intn(len(botUserIDs))]

			_, err := pool.Exec(ctx,
				`INSERT INTO community_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				postID, likerID,
			)
			if err == nil {
				totalLikes++
			}
		}

		// Update like counts on posts
		for _, postID := range botPostIDs {
			pool.Exec(ctx,
				`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1`,
				postID,
			)
		}
	}

	log.Info().
		Int("bots_created", createdBots).
		Int("slimes", totalSlimes).
		Int("posts", totalPosts).
		Int("replies", totalReplies).
		Int("likes", totalLikes).
		Int("collections", totalCollections).
		Int("race_results", totalRaceResults).
		Msg("Bot seeding completed")

	return c.JSON(fiber.Map{
		"message":      "bot seeding completed",
		"bots_created": createdBots,
		"slimes":       totalSlimes,
		"posts":        totalPosts,
		"replies":      totalReplies,
		"likes":        totalLikes,
		"collections":  totalCollections,
		"race_results": totalRaceResults,
	})
}

// DeleteBots removes all bot users and their associated data (cascading)
func (h *Handler) DeleteBots(c *fiber.Ctx) error {
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	tag, err := pool.Exec(ctx,
		`DELETE FROM users WHERE email LIKE '%@slimetopia.bot'`,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete bots"})
	}

	deleted := tag.RowsAffected()
	log.Info().Int64("deleted", deleted).Msg("Bot users deleted")

	return c.JSON(fiber.Map{
		"message": "bots deleted",
		"deleted": deleted,
	})
}

// --- Bot tier system for realistic variety ---

type botTier struct {
	minGold       int
	maxGold       int
	minGems       int
	maxGems       int
	minLevel      int
	maxLevel      int
	minSlimes     int
	maxSlimes     int
	minPosts      int
	maxPosts      int
	minCollection int
	maxCollection int
	// Grade weights: common, uncommon, rare, epic, legendary, mythic
	gradeWeights []int
}

var (
	tierNewbie = botTier{
		minGold: 100, maxGold: 3000,
		minGems: 5, maxGems: 50,
		minLevel: 1, maxLevel: 5,
		minSlimes: 3, maxSlimes: 4,
		minPosts: 0, maxPosts: 2,
		minCollection: 0, maxCollection: 1,
		gradeWeights: []int{70, 25, 5, 0, 0, 0}, // mostly common
	}
	tierCasual = botTier{
		minGold: 2000, maxGold: 15000,
		minGems: 30, maxGems: 150,
		minLevel: 5, maxLevel: 12,
		minSlimes: 4, maxSlimes: 6,
		minPosts: 1, maxPosts: 3,
		minCollection: 0, maxCollection: 2,
		gradeWeights: []int{40, 35, 20, 5, 0, 0},
	}
	tierDedicated = botTier{
		minGold: 10000, maxGold: 35000,
		minGems: 100, maxGems: 300,
		minLevel: 10, maxLevel: 20,
		minSlimes: 5, maxSlimes: 8,
		minPosts: 2, maxPosts: 4,
		minCollection: 1, maxCollection: 3,
		gradeWeights: []int{20, 25, 30, 20, 5, 0},
	}
	tierVeteran = botTier{
		minGold: 25000, maxGold: 50000,
		minGems: 200, maxGems: 500,
		minLevel: 18, maxLevel: 30,
		minSlimes: 6, maxSlimes: 10,
		minPosts: 3, maxPosts: 5,
		minCollection: 2, maxCollection: 5,
		gradeWeights: []int{10, 15, 25, 25, 20, 5},
	}
)

// getBotTier determines bot difficulty distribution:
// 30% newbie, 35% casual, 25% dedicated, 10% veteran
func getBotTier(index int) botTier {
	if index < 30 {
		return tierNewbie
	} else if index < 65 {
		return tierCasual
	} else if index < 90 {
		return tierDedicated
	}
	return tierVeteran
}

// pickBotSpecies selects a random species based on tier grade weights
func pickBotSpecies(tier botTier, speciesByGrade map[string][]int, speciesElementMap map[int]string) (int, string) {
	// Weighted random grade selection
	totalWeight := 0
	for _, w := range tier.gradeWeights {
		totalWeight += w
	}
	r := rand.Intn(totalWeight)

	cumulative := 0
	selectedGrade := "common"
	for gi, w := range tier.gradeWeights {
		cumulative += w
		if r < cumulative {
			selectedGrade = allBotGrades[gi]
			break
		}
	}

	species := speciesByGrade[selectedGrade]
	if len(species) == 0 {
		// Fallback to common
		species = speciesByGrade["common"]
	}
	if len(species) == 0 {
		return 1, "water"
	}

	speciesID := species[rand.Intn(len(species))]
	element := speciesElementMap[speciesID]
	if element == "" {
		element = "water"
	}
	return speciesID, element
}

func randBetween(lo, hi int) int {
	if lo >= hi {
		return lo
	}
	return lo + rand.Intn(hi-lo+1)
}

func seedBotVillage(ctx context.Context, pool *pgxpool.Pool, userID, nickname string) {
	terrains := []string{"grass", "sand", "snow", "lava"}
	terrain := terrains[rand.Intn(len(terrains))]
	villageName := nickname + "의 마을"
	// Truncate if too long (max 30 chars)
	nameRunes := []rune(villageName)
	if len(nameRunes) > 30 {
		villageName = "슬라임 마을"
	}
	visitCount := rand.Intn(50)
	likes := rand.Intn(20)

	pool.Exec(ctx,
		`INSERT INTO villages (user_id, name, terrain, visit_count, likes)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (user_id) DO NOTHING`,
		userID, villageName, terrain, visitCount, likes,
	)
}
