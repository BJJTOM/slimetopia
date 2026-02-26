package game

import (
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
)

var shortsTitles = []struct {
	Title       string
	Description string
	Tags        []string
	Category    string
}{
	{"드디어 전설 슬라임 뽑았다!!", "1000번은 돌린 것 같아요... 눈물이 납니다 ㅠㅠ", []string{"전설", "뽑기", "행운"}, "general"},
	{"초보 합성 꿀팁 모음", "합성할 때 같은 종끼리 하면 등급 업그레이드 확률이 올라가요!", []string{"합성", "꿀팁", "초보"}, "tip"},
	{"불꽃 슬라임 키우기 가이드", "불꽃 슬라임은 물 속성에 약하니까 조심하세요", []string{"불꽃", "가이드", "속성"}, "tip"},
	{"컬렉션 50% 달성! 🎉", "드디어 반을 넘었네요! 목표는 100%입니다", []string{"컬렉션", "달성", "목표"}, "general"},
	{"이 게임 낚시가 은근 재밌네요 ㅋㅋ", "낚시에서 전설 재료 나올 줄 몰랐어요", []string{"낚시", "미니게임", "재밌다"}, "general"},
	{"오늘 출석 보상 대박!", "젬 50개 나왔어요! 역대급이에요", []string{"출석", "보상", "젬"}, "general"},
	{"물방울 + 불꽃 합성 결과는?", "과연 무엇이 나올까요? 결과가 궁금하시죠?", []string{"합성", "물방울", "불꽃"}, "question"},
	{"월드 보스 솔로 클리어 ⚔️", "5스테이지 보스를 혼자서 잡았습니다!", []string{"월드보스", "솔로", "클리어"}, "general"},
	{"슬라임 훈련장 효율 정리", "8시간 기준 960 EXP, 시간당 120 EXP입니다", []string{"훈련", "효율", "EXP"}, "tip"},
	{"신비한 돌연변이 슬라임 발견!", "합성하다가 우연히 나왔어요!", []string{"돌연변이", "희귀", "발견"}, "general"},
	{"탐험에서 레어 재료 겟!", "고급 탐험 돌리면 확률적으로 나와요", []string{"탐험", "재료", "레어"}, "tip"},
	{"슬라임 이름 추천 받아요", "귀여운 이름 뭐가 좋을까요?", []string{"이름", "추천", "귀여운"}, "question"},
	{"10연차 결과 공유합니다", "프리미엄 알 10개 열어봤어요!", []string{"뽑기", "10연차", "결과"}, "general"},
	{"보석 모으기 꿀팁", "월드 보스 참여만 해도 보석을 받을 수 있어요", []string{"보석", "꿀팁", "월드보스"}, "tip"},
	{"어둠 속성 슬라임 강한 이유", "빛 속성에 강하고 전체적으로 밸런스가 좋아요", []string{"어둠", "속성", "강함"}, "tip"},
	{"레벨 30 달성 기념 스샷!", "드디어 만렙!! 오래 걸렸네요", []string{"레벨", "만렙", "달성"}, "general"},
	{"합성 레시피 총정리", "자주 쓰는 합성 조합 정리했어요", []string{"합성", "레시피", "정리"}, "tip"},
	{"슬라임 먹이 효율 비교", "고급 먹이가 가성비 최고입니다", []string{"먹이", "효율", "비교"}, "tip"},
	{"첫 미신 슬라임 획득!", "감격스럽네요... 진짜 예쁘다", []string{"미신", "획득", "감격"}, "general"},
	{"이번 시즌 보상 어떤가요?", "다들 어디까지 진행했나요?", []string{"시즌", "보상", "진행"}, "question"},
}

// SeedShorts creates 20 dummy shorts for testing the shorts feed
func (h *Handler) SeedShorts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	pool := h.slimeRepo.Pool()
	ctx := c.UserContext()

	// Check if shorts already exist
	var count int
	pool.QueryRow(ctx, `SELECT COUNT(*) FROM shorts WHERE status = 'active'`).Scan(&count)
	if count >= 10 {
		return c.JSON(fiber.Map{"message": "shorts already seeded", "count": count})
	}

	created := 0
	for i, s := range shortsTitles {
		// Alternate between current user and mock
		tags := s.Tags
		if tags == nil {
			tags = []string{}
		}

		// Create with varying timestamps (spread over last 7 days)
		hoursAgo := i * 8
		createdAt := time.Now().Add(-time.Duration(hoursAgo) * time.Hour)

		_, err := pool.Exec(ctx,
			`INSERT INTO shorts (user_id, title, description, video_url, thumbnail_url, tags, category, visibility, views, likes, comment_count, status, created_at)
			 VALUES ($1, $2, $3, $4, '', $5, $6, 'public', $7, $8, $9, 'active', $10)`,
			userID,
			s.Title,
			s.Description,
			"", // empty video_url - handled by client as card
			tags,
			s.Category,
			rand.Intn(500)+10,       // views
			rand.Intn(50)+1,         // likes
			rand.Intn(10),           // comment_count
			createdAt,
		)
		if err != nil {
			continue
		}
		created++
	}

	return c.JSON(fiber.Map{"created": created, "total": len(shortsTitles)})
}
