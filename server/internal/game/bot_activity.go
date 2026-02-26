package game

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// BotActivityManager runs periodic background tasks that simulate real player behavior.
// It selects random bot accounts and performs community and gameplay actions.
type BotActivityManager struct {
	pool     *pgxpool.Pool
	interval time.Duration
	stopCh   chan struct{}
}

// NewBotActivityManager creates a new manager with the given DB pool and tick interval.
func NewBotActivityManager(pool *pgxpool.Pool, interval time.Duration) *BotActivityManager {
	return &BotActivityManager{
		pool:     pool,
		interval: interval,
		stopCh:   make(chan struct{}),
	}
}

// Start launches the background goroutine. Call Stop() to terminate it.
func (m *BotActivityManager) Start() {
	go m.run()
	log.Info().Dur("interval", m.interval).Msg("BotActivityManager started")
}

// Stop signals the background goroutine to stop.
func (m *BotActivityManager) Stop() {
	close(m.stopCh)
	log.Info().Msg("BotActivityManager stopped")
}

func (m *BotActivityManager) run() {
	// Run once shortly after boot so the community feels alive quickly.
	time.Sleep(30 * time.Second)
	m.tick()

	ticker := time.NewTicker(m.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.tick()
		case <-m.stopCh:
			return
		}
	}
}

// tick is the main loop body executed every interval.
func (m *BotActivityManager) tick() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Load all bot user IDs.
	botUsers, err := m.loadBotUsers(ctx)
	if err != nil || len(botUsers) == 0 {
		log.Warn().Err(err).Msg("[BotActivity] no bot users found, skipping tick")
		return
	}

	// Select 5-15 active bots for this tick.
	activeCount := randBetween(5, 15)
	if activeCount > len(botUsers) {
		activeCount = len(botUsers)
	}
	rand.Shuffle(len(botUsers), func(i, j int) { botUsers[i], botUsers[j] = botUsers[j], botUsers[i] })
	activeBots := botUsers[:activeCount]

	totalPosts := 0
	totalReplies := 0
	totalLikes := 0
	totalGameplay := 0

	for _, bot := range activeBots {
		// Each bot does 1-3 random actions.
		actions := randBetween(1, 3)
		for a := 0; a < actions; a++ {
			roll := rand.Intn(100)
			switch {
			case roll < 25:
				// 25% — write a community post
				if m.botWritePost(ctx, bot.ID) {
					totalPosts++
				}
			case roll < 55:
				// 30% — write a comment on an existing post
				if m.botWriteReply(ctx, bot.ID) {
					totalReplies++
				}
			case roll < 80:
				// 25% — like a random post
				if m.botLikePost(ctx, bot.ID) {
					totalLikes++
				}
			default:
				// 20% — simulate gameplay (gold, gems, level, slime updates)
				if m.botSimulateGameplay(ctx, bot.ID) {
					totalGameplay++
				}
			}
		}
	}

	log.Info().
		Int("active_bots", len(activeBots)).
		Int("posts", totalPosts).
		Int("replies", totalReplies).
		Int("likes", totalLikes).
		Int("gameplay", totalGameplay).
		Msg("[BotActivity] tick completed")
}

// --- data helpers ---

type botUser struct {
	ID string
}

func (m *BotActivityManager) loadBotUsers(ctx context.Context) ([]botUser, error) {
	rows, err := m.pool.Query(ctx, `SELECT id FROM users WHERE email LIKE '%@slimetopia.bot'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []botUser
	for rows.Next() {
		var u botUser
		if err := rows.Scan(&u.ID); err != nil {
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

// --- community actions ---

func (m *BotActivityManager) botWritePost(ctx context.Context, userID string) bool {
	post := activityPostTemplates[rand.Intn(len(activityPostTemplates))]
	_, err := m.pool.Exec(ctx,
		`INSERT INTO community_posts (user_id, content, post_type, image_urls)
		 VALUES ($1, $2, $3, '{}')`,
		userID, post.Content, post.PostType,
	)
	if err != nil {
		log.Debug().Err(err).Str("user", userID).Msg("[BotActivity] failed to write post")
		return false
	}
	return true
}

func (m *BotActivityManager) botWriteReply(ctx context.Context, userID string) bool {
	// Pick a random recent post (last 7 days).
	var postID string
	err := m.pool.QueryRow(ctx,
		`SELECT id FROM community_posts
		 WHERE created_at > NOW() - INTERVAL '7 days'
		 ORDER BY RANDOM() LIMIT 1`,
	).Scan(&postID)
	if err != nil {
		return false
	}

	reply := activityReplyTemplates[rand.Intn(len(activityReplyTemplates))]
	_, err = m.pool.Exec(ctx,
		`INSERT INTO community_replies (post_id, user_id, content)
		 VALUES ($1, $2, $3)`,
		postID, userID, reply,
	)
	if err != nil {
		return false
	}

	// Update reply count on the post.
	m.pool.Exec(ctx,
		`UPDATE community_posts SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE post_id = $1) WHERE id = $1`,
		postID,
	)
	return true
}

func (m *BotActivityManager) botLikePost(ctx context.Context, userID string) bool {
	var postID string
	err := m.pool.QueryRow(ctx,
		`SELECT id FROM community_posts
		 WHERE created_at > NOW() - INTERVAL '7 days'
		 ORDER BY RANDOM() LIMIT 1`,
	).Scan(&postID)
	if err != nil {
		return false
	}

	_, err = m.pool.Exec(ctx,
		`INSERT INTO community_post_likes (post_id, user_id)
		 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		postID, userID,
	)
	if err != nil {
		return false
	}

	m.pool.Exec(ctx,
		`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1`,
		postID,
	)
	return true
}

// --- gameplay simulation ---

func (m *BotActivityManager) botSimulateGameplay(ctx context.Context, userID string) bool {
	roll := rand.Intn(100)
	switch {
	case roll < 40:
		// 40% — gain some gold and gems
		goldGain := int64(randBetween(50, 500))
		gemGain := randBetween(0, 5)
		_, err := m.pool.Exec(ctx,
			`UPDATE users SET gold = gold + $1, gems = gems + $2 WHERE id = $3`,
			goldGain, gemGain, userID,
		)
		return err == nil

	case roll < 65:
		// 25% — level up a random slime by 1
		var slimeID string
		err := m.pool.QueryRow(ctx,
			`SELECT id FROM slimes WHERE user_id = $1 ORDER BY RANDOM() LIMIT 1`,
			userID,
		).Scan(&slimeID)
		if err != nil {
			return false
		}
		_, err = m.pool.Exec(ctx,
			`UPDATE slimes SET level = LEAST(level + 1, 50), exp = 0, updated_at = NOW() WHERE id = $1`,
			slimeID,
		)
		return err == nil

	case roll < 85:
		// 20% — gain user level (small bump)
		_, err := m.pool.Exec(ctx,
			`UPDATE users SET level = LEAST(level + 1, 50), stardust = stardust + $1 WHERE id = $2`,
			randBetween(5, 30), userID,
		)
		return err == nil

	default:
		// 15% — get a new slime (if under 10 slimes)
		return m.botGetNewSlime(ctx, userID)
	}
}

func (m *BotActivityManager) botGetNewSlime(ctx context.Context, userID string) bool {
	// Check slime count.
	var count int
	m.pool.QueryRow(ctx, `SELECT COUNT(*) FROM slimes WHERE user_id = $1`, userID).Scan(&count)
	if count >= 10 {
		return false
	}

	element := allBotElements[rand.Intn(len(allBotElements))]
	personality := allBotPersonalities[rand.Intn(len(allBotPersonalities))]

	// Pick a species matching the element, falling back to ID 1.
	var speciesID int
	err := m.pool.QueryRow(ctx,
		`SELECT id FROM species WHERE element = $1 ORDER BY RANDOM() LIMIT 1`,
		element,
	).Scan(&speciesID)
	if err != nil {
		speciesID = 1
	}

	level := randBetween(1, 10)
	_, err = m.pool.Exec(ctx,
		`INSERT INTO slimes (user_id, species_id, element, personality, level, exp, affection, hunger, condition)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		userID, speciesID, element, personality, level, 0,
		randBetween(30, 80), randBetween(40, 100), randBetween(50, 100),
	)
	if err != nil {
		return false
	}

	// Also add to codex.
	m.pool.Exec(ctx,
		`INSERT INTO codex_entries (user_id, species_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, speciesID,
	)
	return true
}

// =====================================================================
// Post & reply content templates — designed to sound like real Korean
// gamers chatting in a community. 60+ posts and 60+ replies.
// =====================================================================

var activityPostTemplates = []struct {
	Content  string
	PostType string
}{
	// --- questions ---
	{"합성할 때 같은 등급끼리 하면 확률이 더 높나요?", "question"},
	{"탐험 보상 중에 재료 드롭 확률 아시는 분?", "question"},
	{"에픽 슬라임 제일 효율 좋은 육성법 좀요", "question"},
	{"월드보스 공격력 올리려면 뭘 해야 되나요?", "question"},
	{"신화 등급 뽑는 꿀팁 있나요? 100연 돌렸는데 안 나옴 ㅠ", "question"},
	{"낚시 하다가 금덩어리 나온 사람 진짜 있어요?", "question"},
	{"레이스에서 속도 올리는 방법이 뭐에요?", "question"},
	{"합성 재료 어디서 모으나요? 무지개 젤 못 구하겠어요", "question"},
	{"도감 1200개 다 채운 사람 있어요? 가능한가", "question"},
	{"츤데레 슬라임 애정도 올리는 게 왜 이렇게 어려워요", "question"},
	{"바람 속성 슬라임이 탐험에서 진짜 좋은가요?", "question"},
	{"마을 좋아요 많이 받으면 뭐가 좋아요?", "question"},
	{"전기 슬라임 어디서 구할 수 있어요? 알 종류가 뭐가 있지", "question"},
	{"히든 슬라임 3종 어떻게 만드나요? 힌트만이라도 ㅠ", "question"},
	{"시즌 보상 언제 리셋돼요?", "question"},
	{"주간 미션 다 깨려면 하루에 얼마나 해야 돼요?", "question"},
	{"독 속성 슬라임 보스전에서 쓸만해요?", "question"},

	// --- tips ---
	{"꿀팁) 매일 출석 + 낚시 + 탐험 3종 세트 하면 골드 미침", "tip"},
	{fmt.Sprintf("탐험 꿀팁: 추천 속성 맞추면 보상 %d%% 추가에요!", 50), "tip"},
	{"합성할 때 촉매 재료 넣으면 히든 레시피 열려요", "tip"},
	{"슬라임 목욕시키면 컨디션 회복 + 애정도 올라감!", "tip"},
	{"보스전에서 earth 슬라임이 탱커 역할 함 ㄹㅇ 필수", "tip"},
	{"프리미엄 알에서 에픽 이상 확률 체감 높아요", "tip"},
	{"레벨 올리려면 훈련장 반복이 제일 빠릅니다", "tip"},
	{"낚시 연속 성공하면 보너스 보상 있어요 아시나요?", "tip"},
	{"마을 방문할 때마다 스타더스트 조금씩 줌", "tip"},
	{"천상 속성은 빛 + 어둠 합성에서 나옵니다", "tip"},
	{"골드 모으는 팁: 탐험 + 낚시 + 일퀘 루틴 돌리기", "tip"},
	{"슬라임 아프면 약 먹여야 경험치 받아요! 아픈 채로 놔두지 마세요", "tip"},
	{"식빵 먹이면 포만감 + 애정도 동시에 오름 ㅎㅎ", "tip"},
	{"레이스 팁: 레벨 높은 슬라임 + 에너지 성격 조합이 최강", "tip"},
	{"방명록 남기면 상대방한테 골드 보상 가요!", "tip"},

	// --- flex ---
	{"ㅋㅋㅋ 드디어 전설 슬라임 뽑았다!!!! 200연만에ㅠㅠ", "flex"},
	{"도감 500개 돌파!! 반이다 반!", "flex"},
	{"신화 슬라임 2마리째 ㅎㅎ 운 좋은 듯", "flex"},
	{"월드보스 솔로 클리어함 ㄷㄷ 내 슬라임들 최고", "flex"},
	{"레이스 10연승 달성!! 기분 좋아~", "flex"},
	{"골드 10만 모았다! 뭐에 쓰지...", "flex"},
	{"에픽 3연속 뽑기 성공 ㅋㅋ 오늘 운 다 쓴 듯", "flex"},
	{"히든 슬라임 Joy Boy 만들었어요!!! 대박", "flex"},
	{"컬렉션 제출 100개 완료~ 도감 마스터 가즈아", "flex"},
	{"레벨 30 찍었다!! 최고 레벨 목표!", "flex"},
	{"합성으로 천상 속성 슬라임 나왔어요 ㄹㅇ 떨림", "flex"},
	{"마을 좋아요 100개 넘었네요 ㅎㅎ 감사합니다", "flex"},

	// --- general / casual chat ---
	{"오늘도 슬라임과 함께 힐링 중~ 다들 좋은 하루!", "general"},
	{"이 게임 시작한 지 한 달 됐는데 완전 빠짐", "general"},
	{"ㅋㅋ 슬라임 이름 '떡볶이'로 지었는데 너무 웃김", "general"},
	{"다크 슬라임 비주얼 실화임? 간지 미쳤다", "general"},
	{"배고픈 슬라임 표정 보면 너무 귀여워서 밥 줄 수밖에 없음", "general"},
	{"게임 BGM 틀어놓고 공부하면 집중 잘 됨 ㅎㅎ", "general"},
	{"내 슬라임 이름 추천 좀! 물 속성인데", "general"},
	{"불꽃 슬라임 색감 진짜 예쁘다", "general"},
	{"이 게임 하면서 힐링됩니다 ㅎㅎ 추천", "general"},
	{"오늘 접속하자마자 출석 보상 대박이었어", "general"},
	{"ㅋㅋ 슬라임한테 놀아주기 연타하는 나...", "general"},
	{"누가 내 마을 방문하고 방명록 남겨줬는데 감동 ㅠㅠ", "general"},
	{"얼음 슬라임 겨울에 더 귀여운 것 같아요", "general"},
	{"새 시즌 언제 시작하나요? 기대됨", "general"},
	{"게임 업데이트 자주 해줘서 좋아요 개발자 화이팅", "general"},
	{"식빵 슬라임 만들어줘요 개발자님!! ㅋㅋ", "general"},
	{"친구한테 이 게임 추천했더니 같이 빠졌음 ㅎ", "general"},
}

var activityReplyTemplates = []string{
	// --- agreements / reactions ---
	"ㅋㅋㅋ 인정",
	"ㄹㅇ 공감",
	"맞아요 진짜",
	"ㅎㅎ 그죠~",
	"아 저도요!",
	"대박이네",
	"와 진짜?!",
	"오오 좋은 정보",
	"ㄷㄷ 대단하다",
	"부럽다 ㅠㅠ",
	"저도 해봐야겠다!",
	"ㅋㅋ 웃기네",
	"힘내세요~!",
	"화이팅!",
	"감사합니다 ㅎㅎ",
	"아 이거 진짜 궁금했는데",
	"ㅇㅇ 맞아 나도 그랬음",
	"크으 축하해요!",
	"나도 뽑고 싶다 ㅠ",
	"좋은 하루 보내세요~",

	// --- questions / follow-ups ---
	"혹시 그거 어떻게 하셨어요?",
	"이거 레벨 몇부터 되나요?",
	"합성 레시피 공유 좀 ㅎㅎ",
	"저만 안 되는 건가... ㅠ",
	"이 속성 슬라임 어디서 구해요?",
	"탐험 어디로 보내야 돼요?",
	"골드 모으는 팁 좀 더요!",
	"보스전 같이 하실 분~?",
	"저도 시도해볼게요!",
	"이게 효율 좋다고요?? 몰랐어요",

	// --- congratulatory ---
	"축하드려요!! ㅎㅎ",
	"오 대박 부럽다",
	"ㅋㅋ 역시 고수",
	"나도 빨리 그렇게 되고 싶다",
	"멋있어요!",
	"와 어떻게 했어요??",
	"운 미쳤다 ㄷㄷ",
	"갓겜 갓유저",
	"실화냐 ㄷㄷㄷ",
	"ㄹㅇ 레전드",

	// --- tips in replies ---
	"그거 추천 속성 맞추면 훨씬 나와요!",
	"저는 매일 낚시 루틴 돌려요 ㅎㅎ",
	"합성은 같은 등급끼리가 확률 좋아요",
	"훈련장이 레벨업 젤 빨라요!",
	"골드 아끼고 프리미엄 알 사세요",
	"마을 꾸미기 하면 방문자 많이 와요",
	"목욕 시키면 컨디션 확 올라감!",
	"에너지 성격이 레이스 최강임",
	"보스전은 earth 슬라임이 필수에요",
	"아 저도 그렇게 했더니 됐어요!",

	// --- emoji-heavy / short reactions ---
	"ㅎㅎㅎㅎ",
	"ㅋㅋㅋㅋㅋ",
	"ㅠㅠ 부러워",
	"ㄷㄷㄷ",
	"오오오오",
	"!!!!!",
	"굿굿",
	"최고다!",
	"ㅎㅇ~",
	"좋아요 누르고 갑니다~",
}
