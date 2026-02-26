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

// ── 30 unique Korean nicknames (distinct from botNicknames in bot_seed.go) ──

var actBotNicknames = []string{
	"슬라임요리사", "젤리탐정", "물방울여행가", "불꽃요정", "풀잎마법사",
	"빛나는모험가", "어둠의길잡이", "얼음왕자", "전기도감왕", "독수리눈",
	"대지의힘", "바람길손", "젤리디자이너", "슬라임일기장", "가챠의신",
	"뽑기매니아", "레이스달리기", "마을의장", "컬렉션지기", "낚시명인",
	"합성의달인", "탐험대장", "보스격파왕", "별빛사냥꾼", "무지개슬라임",
	"먹이연구원", "슬라임사육사", "젤리왕국주인", "행운의주사위", "도전정신왕",
}

// ── Community Post templates (110 entries) ──

var actPostContents = []struct {
	Content  string
	PostType string
}{
	// ── general (35) ──
	{"오늘도 열심히 슬라임 키우는 중~ 은근 힐링이에요 ㅎㅎ", "general"},
	{"아침에 일어나서 제일 먼저 출석 찍는 사람 나만 그런가 ㅋㅋ", "general"},
	{"이 게임 시작한 지 한 달 됐는데 아직도 매일 접속함 ㅎ", "general"},
	{"마을 꾸미기에 진심인 사람 손🙋 저도요!!", "general"},
	{"슬라임 이름 뭐로 지었어요? 저는 '떡볶이'로 했어요 ㅋㅋ", "general"},
	{"낚시하다가 전설 재료 나왔는데 뭐에 쓰는 거예요?", "general"},
	{"오늘 접속 보상으로 젬 30개 받았다! 기분 좋아~", "general"},
	{"월드 보스 같이 잡을 사람?? 혼자는 힘드네요", "general"},
	{"슬라임 먹이 주는 거 깜빡해서 배고파하고 있었네 ㅠㅠ 미안 내 슬라임아", "general"},
	{"다들 하루에 몇 시간 정도 하세요? 저는 출퇴근 시간에 틈틈이", "general"},
	{"슬라임 컨디션 관리가 진짜 중요하더라구요", "general"},
	{"오랜만에 들어왔더니 업데이트가 많이 됐네요!", "general"},
	{"친구한테 추천했더니 같이 하고 있어요 ㅋㅋ 재밌다고 하네요", "general"},
	{"슬라임 새끼가 태어났는데 너무 귀여워요 ㅠㅠ", "general"},
	{"오늘 처음으로 탐험 올클리어 했어요!!", "general"},
	{"이번 이벤트 보상 좋은 것 같아요 다들 참여하세요!", "general"},
	{"마을 방문 와주시면 감사해요~ 저도 놀러갈게요!", "general"},
	{"게임 하면서 가장 행복한 순간이 뽑기 성공할 때인 듯 ㅋㅋ", "general"},
	{"슬라임들이 마을에서 뛰어노는 거 보면 힐링돼요", "general"},
	{"다들 좋아하는 슬라임 속성이 뭐예요? 저는 얼음 속성!", "general"},
	{"오늘 하루도 슬라임과 함께 마무리~ 굿나잇!", "general"},
	{"출석 100일 달성! 꾸준히 하니까 보상이 쌓이네요", "general"},
	{"이 게임은 천천히 키우는 맛이 있어요", "general"},
	{"슬라임끼리 놀게 해놓으면 친밀도가 올라가나요?", "general"},
	{"시즌 끝나기 전에 목표 달성해야 하는데 빠듯하다 ㅋㅋ", "general"},
	{"랭킹 올라가니까 은근 경쟁심이 생기네요", "general"},
	{"슬라임이랑 교감하는 게 제일 재밌는 콘텐츠", "general"},
	{"이번에 추가된 신규 슬라임 디자인 진짜 예쁘다", "general"},
	{"게임 브금 틀어놓고 공부하면 집중 잘 돼요 ㅋㅋ", "general"},
	{"이 게임 알게 된 게 올해 최고의 발견인 듯", "general"},
	{"마을 테마 바꿨는데 완전 다른 느낌이에요!", "general"},
	{"슬라임 키우면서 힐링하는 중 ㅎㅎ 오늘도 평화로운 하루", "general"},
	{"드디어 도감 절반 채웠다!! 남은 절반도 파이팅", "general"},
	{"접속한 지 5분 만에 전설 뽑힌 사람 여기 있어요 ㅋㅋ", "general"},
	{"이 게임 진짜 할수록 빠져드는 매력이 있음", "general"},

	// ── question (20) ──
	{"합성할 때 같은 속성끼리 하면 확률이 올라가나요?", "question"},
	{"낚시에서 전설 미끼는 어떻게 구하는 건가요?", "question"},
	{"컬렉션 보상이 어디서 확인할 수 있어요?", "question"},
	{"슬라임 레벨 제한이 있나요? 최대 몇까지 올릴 수 있는지", "question"},
	{"레이스에서 속도 올리려면 뭘 해야 하나요?", "question"},
	{"마을 확장은 레벨 몇부터 가능한가요?", "question"},
	{"월드 보스 보상이 뭐가 나오나요? 아직 안 해봤어요", "question"},
	{"에픽 등급이랑 레어 등급 차이가 큰가요?", "question"},
	{"스타더스트는 어디에 쓰는 건가요?", "question"},
	{"슬라임 성격이 능력치에 영향을 주나요?", "question"},
	{"탐험 보내면 몇 시간이나 걸려요?", "question"},
	{"젬 모으는 제일 빠른 방법이 뭔가요?", "question"},
	{"골드 부족한데 효율적으로 모으는 방법 있어요?", "question"},
	{"슬라임 친밀도 올리는 팁 있나요?", "question"},
	{"합성 실패하면 재료 다 날아가나요?", "question"},
	{"뽑기 확률 어느 정도인지 아시는 분?", "question"},
	{"보스전에서 어떤 속성이 유리한가요?", "question"},
	{"이벤트 슬라임은 이벤트 끝나면 못 구하나요?", "question"},
	{"다른 유저 마을 방문하면 뭐가 좋은 건가요?", "question"},
	{"초보인데 처음에 뭐부터 하면 좋을까요?", "question"},

	// ── tip (25) ──
	{"합성 꿀팁: 같은 등급끼리 합성하면 업그레이드 확률 UP!", "tip"},
	{"낚시는 오후 시간대에 하면 레어 물고기 확률이 높아요!", "tip"},
	{"출석 보상은 연속일수가 중요해요! 30일 연속이면 전설 알 줘요", "tip"},
	{"슬라임 먹이는 고급 먹이가 가성비 최고입니다", "tip"},
	{"레이스 전에 컨디션 100으로 맞추면 성적이 확 올라요", "tip"},
	{"탐험은 8시간이 가장 효율적이에요 (시간당 EXP 120)", "tip"},
	{"보스전에서는 속성 상성이 핵심! 물>불>풀>물 순서예요", "tip"},
	{"마을에 장식 많이 두면 방문자가 늘어나요", "tip"},
	{"컬렉션 완성하면 숨겨진 보상이 있어요!", "tip"},
	{"스타더스트로 한정 아이템 교환 가능해요 아끼세요!", "tip"},
	{"뽑기는 10연차가 확률보정 있어서 유리해요", "tip"},
	{"슬라임 성격별 장단점이 있어요 - 에너지는 레이스, 먹보는 합성", "tip"},
	{"친밀도 80 이상이면 특수 스킬 배울 수 있어요", "tip"},
	{"매일 미션 다 클리어하면 젬 50개 이상 모여요", "tip"},
	{"골드 모으려면 낚시가 제일 효율적이에요!", "tip"},
	{"합성할 때 레벨 높은 슬라임을 베이스로 쓰면 좋아요", "tip"},
	{"월드 보스는 매일 도전 가능하니까 꼭 참여하세요!", "tip"},
	{"에픽 이상 슬라임은 합성으로 얻는 게 빠를 수 있어요", "tip"},
	{"마을 방문 많이 하면 친구 추가 기회도 늘어나요", "tip"},
	{"이벤트 기간에는 드랍률이 올라가니까 몰아서 하세요!", "tip"},
	{"슬라임 컨디션은 매일 회복되니까 너무 걱정 마세요", "tip"},
	{"레벨 10 이후로는 고급 탐험이 열려요 꼭 해보세요!", "tip"},
	{"도감 채우기가 장기적으로 가장 큰 보상을 줘요", "tip"},
	{"젬으로는 뽑기보다 슬롯 확장을 먼저 추천해요", "tip"},
	{"보석은 매주 보스전 보상으로도 모을 수 있어요!", "tip"},

	// ── flex (20) ──
	{"드디어 미신 등급 슬라임 뽑았다!!! 진짜 떨렸어 ㅋㅋ", "flex"},
	{"컬렉션 100% 달성했습니다!! 2달 걸렸어요 ㅎㅎ", "flex"},
	{"레이스 전국 1등 먹었다!!! 내 슬라임 최강!", "flex"},
	{"레벨 30 달성! 만렙 가즈아~", "flex"},
	{"전설 슬라임 3마리 보유 중 ㅎㅎ 자랑 좀 할게요", "flex"},
	{"합성 한 번에 미신 등급 나왔어요!! 확률이 얼마야 이게", "flex"},
	{"마을 방문자 500명 돌파! 감사합니다 여러분", "flex"},
	{"낚시에서 전설급 아이템 2개 연속 겟! 운이 폭발하는 중", "flex"},
	{"무과금으로 에픽 슬라임 5마리 모았어요!", "flex"},
	{"슬라임 도감 80% 돌파~ 목표까지 얼마 안 남았다!", "flex"},
	{"월드 보스 최고 점수 갱신!! 역대 기록 깼어요", "flex"},
	{"접속 200일 달성! 꾸준히 하면 진짜 보상 쌓이네요", "flex"},
	{"골드 10만 돌파!! 부자 됐다 ㅋㅋ", "flex"},
	{"오늘 뽑기 운 역대급이었음... 10연차에 전설 2개", "flex"},
	{"탐험 올클리어 최초 달성! 기분 최고!", "flex"},
	{"슬라임 친밀도 100 달성!! 특수 스킬 배웠어요!", "flex"},
	{"레이스 10연승 중! 내 슬라임 전설인 듯", "flex"},
	{"합성 레시피 50개 달성! 합성의 달인이 되어가는 중", "flex"},
	{"이번 시즌 보상 다 받았어요!! 올클리어!", "flex"},
	{"전설 알에서 미신 나올 줄 몰랐다... 진짜 행복해요", "flex"},

	// ── screenshot (10) ──
	{"우리 마을 야경 한번 보세요 ㅎㅎ 이쁘지 않나요?", "screenshot"},
	{"내 슬라임 컬렉션 자랑! 무지개 슬라임이 최애입니다", "screenshot"},
	{"낚시하다가 찍은 스샷인데 배경이 너무 예뻐서 공유해요", "screenshot"},
	{"마을 꾸미기 완성! 겨울 테마로 꾸며봤어요", "screenshot"},
	{"전설 슬라임 진화 전후 비교샷! 디자인 미쳤다", "screenshot"},
	{"우리 슬라임 가족사진 ㅋㅋ 총 8마리!", "screenshot"},
	{"레이스 1등 순간 캡처! 아슬아슬했어요", "screenshot"},
	{"마을에 벚꽃 테마 깔았는데 분위기 대박이에요", "screenshot"},
	{"합성 성공 순간 스샷! 이 빛이 뜨면 심장 터짐 ㅋㅋ", "screenshot"},
	{"탐험 보상 화면 공유~ 이 정도면 괜찮죠?", "screenshot"},
}

// ── Reply templates by type (85 entries) ──

// 공감형 (20)
var actRepliesEmpathy = []string{
	"ㅋㅋㅋ 진짜요?",
	"와 대박!",
	"ㄹㅇ 인정",
	"진짜 공감 ㅋㅋㅋ",
	"저도 완전 같은 생각이에요",
	"맞아요 맞아요!!",
	"ㅋㅋ 너무 웃겨요",
	"저만 그런 게 아니었군요 ㅋㅋ",
	"와 소름돋는다",
	"실화냐 ㅋㅋ",
	"레전드네요 ㅋㅋ",
	"역시 그렇죠?? 나만 그런 줄 알았어요",
	"와 부럽다... 저도 해보고 싶어요",
	"진짜 이해해요 ㅋㅋ",
	"ㅋㅋ 너무 힐링이다",
	"오오 대단해요!",
	"완전 좋아요!!",
	"ㅎㅎ 귀엽네요",
	"저도 저도!! ㅋㅋ",
	"이거 완전 공감 ㅋㅋㅋㅋ",
}

// 질문 답변형 (20)
var actRepliesAnswer = []string{
	"저도 해봤는데 그렇게 하면 돼요!",
	"레벨 10 이상이면 가능해요",
	"합성은 같은 속성끼리 하면 확률이 올라가요",
	"낚시는 고급 미끼 쓰면 잘 나와요!",
	"마을 확장은 레벨 15부터 가능해요",
	"8시간 탐험이 효율 최고입니다!",
	"컬렉션 보상은 도감 메뉴에서 확인할 수 있어요",
	"먹이는 고급 먹이가 가성비 좋아요",
	"스타더스트는 한정 상점에서 쓸 수 있어요!",
	"월드 보스 보상은 등급에 따라 다른데 꽤 좋아요",
	"뽑기 확률은 전설 1%, 에픽 5% 정도예요",
	"초보시면 먼저 출석 보상부터 챙기세요!",
	"슬라임 성격이 레이스 스탯에 영향 줘요",
	"젬은 매일 미션하면 꽤 모여요!",
	"합성 실패해도 재료 반은 돌아와요",
	"보스전은 상성 맞추면 쉬워요!",
	"친밀도는 매일 교감하면 빨리 올라가요",
	"이벤트 슬라임은 다음 복각때 다시 나올 수 있어요",
	"골드는 낚시로 모으는 게 제일 빨라요",
	"방문하면 서로 친밀도 보상 받을 수 있어요!",
}

// 응원형 (15)
var actRepliesCheer = []string{
	"파이팅!",
	"곧 될 거예요 ㅎㅎ",
	"화이팅!! 응원합니다!",
	"힘내세요~ 곧 성공할 거예요!",
	"저도 처음엔 그랬는데 금방 늘어요 ㅎㅎ",
	"꾸준히 하면 무조건 됩니다!",
	"포기하지 마세요!!",
	"저도 같이 도전할게요!",
	"다음엔 꼭 될 거예요~",
	"응원할게요 ㅎㅎ 화이팅!",
	"오 저도 같이 해보고 싶다!",
	"열심히 하시네요 대단해요!",
	"같이 힘내요~ ㅎㅎ",
	"좋은 결과 있을 거예요!!",
	"멋져요!! 계속 파이팅!",
}

// 감사형 (15)
var actRepliesThanks = []string{
	"오 감사합니다!",
	"꿀팁이네요!",
	"몰랐던 건데 감사해요!",
	"좋은 정보 감사합니다 ㅎㅎ",
	"이거 진짜 도움 됐어요!",
	"와 이런 팁이 있었군요!",
	"메모해놨어요 감사합니다!",
	"오오 정리 감사해요!!",
	"이거 보고 바로 해봤는데 성공했어요!",
	"덕분에 많이 배웠어요 감사합니다~",
	"진짜 유용한 정보네요!",
	"ㅎㅎ 감사합니다 바로 해볼게요",
	"이런 글 좋아요 더 올려주세요!",
	"꿀정보 감사합니다!!",
	"저장해두겠습니다 ㅎㅎ",
}

// 대화형 (15)
var actRepliesConvo = []string{
	"저는 반대로 생각하는데 어떨까요?",
	"그건 좀 다를 수도 있어요~",
	"오 그런 방법도 있군요! 저는 다르게 했는데",
	"저는 불꽃 속성파인데 물 속성도 좋긴 해요",
	"ㅎㅎ 취향 차이인 것 같아요",
	"저는 좀 다르게 해봤는데요~",
	"그것도 좋지만 이 방법도 추천이에요!",
	"아 그래요? 저는 또 다른 경험이었어요",
	"둘 다 좋은데 상황에 따라 다른 것 같아요",
	"맞아요 근데 저는 이 방법이 더 잘 되더라고요",
	"ㅋㅋ 저는 정반대로 했는데도 괜찮았어요",
	"좋은 의견이네요! 저도 한번 시도해볼게요",
	"그건 패치 이후로 바뀌었을 수도 있어요",
	"다들 스타일이 다른 게 재밌는 것 같아요",
	"저도 처음엔 그렇게 생각했는데 달라졌어요!",
}

// ── Additional shorts titles (20 new, beyond seed_shorts.go's 20) ──

var actShortsContents = []struct {
	Title       string
	Description string
	Tags        []string
	Category    string
}{
	{"슬라임 성격별 키우기 방법", "각 성격마다 장단점이 있어요!", []string{"성격", "가이드", "키우기"}, "tip"},
	{"요즘 핫한 합성 조합 TOP5", "효율 좋은 합성 레시피 모음입니다", []string{"합성", "인기", "TOP5"}, "tip"},
	{"초보자 가이드 총정리", "처음 시작하시는 분들을 위한 가이드!", []string{"초보", "가이드", "총정리"}, "tip"},
	{"마을 꾸미기 꿀팁 3가지", "방문자 수 늘리는 비법 공개!", []string{"마을", "꾸미기", "꿀팁"}, "tip"},
	{"슬라임 먹이 효율 완벽 비교", "어떤 먹이가 가장 효율적일까요?", []string{"먹이", "효율", "비교"}, "tip"},
	{"미신 등급 슬라임 리뷰!!", "미신 슬라임의 모든 것을 알려드려요", []string{"미신", "리뷰", "등급"}, "general"},
	{"전설 뽑기 순간 모음집", "역대 뽑기 성공 순간들!", []string{"전설", "뽑기", "순간"}, "general"},
	{"100일 플레이 후기", "100일 동안 느낀 점을 공유해요", []string{"100일", "후기", "플레이"}, "general"},
	{"슬라임 귀여운 순간 모음", "우리 슬라임들 너무 귀엽지 않나요?", []string{"귀여운", "모음", "슬라임"}, "general"},
	{"마을 투어 같이 해요!", "이번에 꾸민 마을 구경 와주세요~", []string{"마을", "투어", "구경"}, "general"},
	{"레이스 우승 비법 공개", "속도를 올리는 핵심 포인트!", []string{"레이스", "우승", "비법"}, "tip"},
	{"탐험 보상 확률 정리", "고급 탐험 보상표를 정리했어요", []string{"탐험", "보상", "확률"}, "tip"},
	{"속성별 상성 완벽 정리", "보스전에서 꼭 알아야 할 상성!", []string{"속성", "상성", "정리"}, "tip"},
	{"신규 이벤트 슬라임 미리보기", "이번 이벤트 슬라임이 너무 예뻐요!", []string{"이벤트", "신규", "슬라임"}, "general"},
	{"낚시 명당자리 공유", "이 자리에서 전설급이 잘 나와요", []string{"낚시", "명당", "자리"}, "tip"},
	{"에픽 vs 전설 비교 분석", "과연 전설이 항상 더 좋을까요?", []string{"에픽", "전설", "비교"}, "question"},
	{"슬라임 교감 숨겨진 기능", "교감할 때 이런 것도 돼요!", []string{"교감", "숨겨진", "기능"}, "tip"},
	{"무과금 30일 챌린지 결과", "무과금으로 한 달 플레이한 결과!", []string{"무과금", "챌린지", "결과"}, "general"},
	{"합성 실패 안 하는 법", "실패 확률을 줄이는 꿀팁!!", []string{"합성", "실패", "꿀팁"}, "tip"},
	{"도감 완성까지 걸리는 기간", "현실적으로 얼마나 걸릴까요?", []string{"도감", "완성", "기간"}, "question"},
}

// ── Shorts comment templates (30) ──

var actShortsComments = []string{
	"와 꿀팁이다!! 감사합니다!",
	"이거 보고 바로 해봤어요 ㅋㅋ",
	"오 몰랐던 건데 감사해요!",
	"진짜 유용한 영상이네요",
	"구독하고 갑니다 ㅎㅎ",
	"저도 이거 해봐야지!",
	"와 대단하시네요 ㅋㅋ",
	"ㅋㅋㅋ 재밌어요!",
	"이런 콘텐츠 더 올려주세요!",
	"오 이게 됐네 ㅋㅋ",
	"저도 도전해볼게요!",
	"꿀팁 감사합니다!!",
	"이거 패치 이후에도 되나요?",
	"와 진짜 미쳤다!",
	"전설 뽑는 거 부럽 ㅠㅠ",
	"ㅎㅎ 귀엽네요~",
	"슬라임 이름 뭐예요? 궁금!",
	"마을 너무 이쁘다!!",
	"저는 아직 초보인데 도움 됐어요",
	"합성 성공률 어떻게 올려요?",
	"레이스 꿀팁 감사합니다!",
	"ㅋㅋ 이거 나만 몰랐나",
	"영상 퀄리티 좋아요!",
	"다음 영상 기대합니다~",
	"이 슬라임 진짜 이쁘네요",
	"저도 마을 이렇게 꾸미고 싶어요",
	"효율 정리 감사해요!!",
	"오 이런 기능이 있었군요",
	"대박이다 ㅋㅋ 저도 해야지",
	"슬라임 최고!! ㅎㅎ",
}

// ── Activity bot tiers (same distribution: 30% newbie, 35% casual, 25% dedicated, 10% veteran) ──
// Overrides minPosts/maxPosts for more activity.

type actBotTier struct {
	botTier
	minPosts int
	maxPosts int
}

var (
	actTierNewbie = actBotTier{
		botTier:  tierNewbie,
		minPosts: 5, maxPosts: 8,
	}
	actTierCasual = actBotTier{
		botTier:  tierCasual,
		minPosts: 7, maxPosts: 12,
	}
	actTierDedicated = actBotTier{
		botTier:  tierDedicated,
		minPosts: 10, maxPosts: 15,
	}
	actTierVeteran = actBotTier{
		botTier:  tierVeteran,
		minPosts: 10, maxPosts: 15,
	}
)

func getActBotTier(index int) actBotTier {
	if index < 9 { // 30% of 30 = 9
		return actTierNewbie
	} else if index < 20 { // 35% → next 11
		return actTierCasual
	} else if index < 27 { // 25% → next 7
		return actTierDedicated
	}
	return actTierVeteran // 10% → remaining 3
}

// ── Helpers ──

// pickRepliesForPostType returns replies appropriate for the post type.
func pickRepliesForPostType(postType string) []string {
	switch postType {
	case "question":
		return actRepliesAnswer
	case "tip":
		return actRepliesThanks
	case "flex", "screenshot":
		return actRepliesEmpathy
	default: // general
		// Mix of empathy + conversation
		mixed := make([]string, 0, len(actRepliesEmpathy)+len(actRepliesConvo))
		mixed = append(mixed, actRepliesEmpathy...)
		mixed = append(mixed, actRepliesConvo...)
		return mixed
	}
}

// pickSecondaryReplies returns follow-up reply pool for nested comments.
func pickSecondaryReplies(postType string) []string {
	switch postType {
	case "question":
		return actRepliesConvo
	case "tip":
		return actRepliesConvo
	default:
		return actRepliesCheer
	}
}

// ── Main handler ──

// SeedActivityBots creates 30 activity bots with rich community activity.
func (h *Handler) SeedActivityBots(c *fiber.Ctx) error {
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	// Idempotency: check if activity bots already exist
	var actBotCount int
	err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE email LIKE 'actbot%@slimetopia.bot'`,
	).Scan(&actBotCount)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check existing activity bots"})
	}
	if actBotCount >= 30 {
		return c.JSON(fiber.Map{
			"message":   "activity bots already seeded",
			"bot_count": actBotCount,
			"skipped":   true,
		})
	}

	// Hash password once
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("actbotpassword"), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	// Load species
	allSpecies, err := h.slimeRepo.GetAllSpecies(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to load species for activity bot seeding")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load species"})
	}
	if len(allSpecies) == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "no species in database"})
	}

	speciesByGrade := map[string][]int{}
	speciesElementMap := map[int]string{}
	for _, sp := range allSpecies {
		speciesByGrade[sp.Grade] = append(speciesByGrade[sp.Grade], sp.ID)
		speciesElementMap[sp.ID] = sp.Element
	}

	// Counters
	createdBots := 0
	totalSlimes := 0
	totalPosts := 0
	totalReplies := 0
	totalNestedReplies := 0
	totalPostLikes := 0
	totalReplyLikes := 0
	totalCollections := 0
	totalRaceResults := 0
	totalShorts := 0
	totalShortsComments := 0
	totalShortsLikes := 0

	// Collect IDs for cross-interactions
	var botUserIDs []string

	type postInfo struct {
		id       string
		postType string
		authorID string
		created  time.Time
	}
	var allPosts []postInfo

	// ════════════════════════════════════════════════════════
	// Phase 1: Create 30 bots + slimes + villages + posts
	// ════════════════════════════════════════════════════════

	for i := 0; i < 30; i++ {
		email := fmt.Sprintf("actbot%d@slimetopia.bot", i+1)
		nickname := actBotNicknames[i]

		// Skip if already exists
		var exists bool
		pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists)
		if exists {
			var uid string
			pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&uid)
			if uid != "" {
				botUserIDs = append(botUserIDs, uid)
			}
			continue
		}

		tier := getActBotTier(i)

		gold := randBetween(tier.minGold, tier.maxGold)
		gems := randBetween(tier.minGems, tier.maxGems)
		level := randBetween(tier.minLevel, tier.maxLevel)
		stardust := randBetween(0, level*10)

		var userID string
		err := pool.QueryRow(ctx,
			`INSERT INTO users (nickname, provider, provider_id, gold, gems, stardust, level, email, password_hash)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING id`,
			nickname, "bot", fmt.Sprintf("actbot_%d", i+1),
			int64(gold), gems, stardust, level, email, string(passwordHash),
		).Scan(&userID)
		if err != nil {
			log.Error().Err(err).Str("nickname", nickname).Msg("Failed to create activity bot user")
			continue
		}
		botUserIDs = append(botUserIDs, userID)
		createdBots++

		// Village
		seedBotVillage(ctx, pool, userID, nickname)

		// Slimes (3-10 based on tier)
		slimeCount := randBetween(tier.minSlimes, tier.maxSlimes)
		var createdSlimeIDs []string
		for j := 0; j < slimeCount; j++ {
			speciesID, element := pickBotSpecies(tier.botTier, speciesByGrade, speciesElementMap)
			personality := allBotPersonalities[rand.Intn(len(allBotPersonalities))]
			slimeLevel := randBetween(1, level)
			if slimeLevel < 1 {
				slimeLevel = 1
			}

			var slimeID string
			err := pool.QueryRow(ctx,
				`INSERT INTO slimes (user_id, species_id, element, personality, level, exp, affection, hunger, condition)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
				 RETURNING id`,
				userID, speciesID, element, personality,
				slimeLevel, rand.Intn(50), randBetween(20, 90), randBetween(30, 100), randBetween(40, 100),
			).Scan(&slimeID)
			if err != nil {
				log.Error().Err(err).Msg("Failed to create activity bot slime")
				continue
			}
			createdSlimeIDs = append(createdSlimeIDs, slimeID)
			totalSlimes++

			pool.Exec(ctx,
				`INSERT INTO codex_entries (user_id, species_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				userID, speciesID,
			)
		}

		// Community posts (5-15 based on tier)
		postCount := randBetween(tier.minPosts, tier.maxPosts)
		for j := 0; j < postCount; j++ {
			post := actPostContents[rand.Intn(len(actPostContents))]
			createdAt := time.Now().Add(-time.Duration(rand.Intn(60*24)) * time.Hour) // 60 days
			likes := randBetween(0, 50)
			viewCount := likes + randBetween(5, 100)

			var postID string
			err := pool.QueryRow(ctx,
				`INSERT INTO community_posts (user_id, content, post_type, likes, view_count, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 RETURNING id`,
				userID, post.Content, post.PostType, likes, viewCount, createdAt,
			).Scan(&postID)
			if err != nil {
				log.Error().Err(err).Msg("Failed to create activity bot post")
				continue
			}
			allPosts = append(allPosts, postInfo{id: postID, postType: post.PostType, authorID: userID, created: createdAt})
			totalPosts++
		}

		// Collection entries
		collectionCount := randBetween(tier.minCollection, tier.maxCollection)
		submittedPairs := make(map[string]bool)
		for j := 0; j < collectionCount; j++ {
			speciesID, _ := pickBotSpecies(tier.botTier, speciesByGrade, speciesElementMap)
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

		// Race results
		if rand.Float64() < 0.6 && len(createdSlimeIDs) > 0 {
			raceCount := randBetween(1, 5)
			for r := 0; r < raceCount; r++ {
				score := randBetween(50, 300+level*10)
				slimeID := createdSlimeIDs[rand.Intn(len(createdSlimeIDs))]
				playedAt := time.Now().Add(-time.Duration(rand.Intn(14*24)) * time.Hour)
				_, err := pool.Exec(ctx,
					`INSERT INTO race_results (user_id, slime_id, score, gold_reward, exp_reward, played_at)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					userID, slimeID, score, randBetween(10, 100), randBetween(5, 30), playedAt,
				)
				if err == nil {
					totalRaceResults++
				}
			}
		}
	}

	// ════════════════════════════════════════════════════════
	// Phase 2: Community replies with conversation threads
	// ════════════════════════════════════════════════════════

	type replyInfo struct {
		id     string
		postID string
		userID string
		time   time.Time
	}
	var allReplies []replyInfo

	if len(botUserIDs) > 1 && len(allPosts) > 0 {
		// For each post, generate 2-8 replies
		for _, post := range allPosts {
			replyCount := randBetween(2, 8)
			pool := pickRepliesForPostType(post.postType)
			usedBots := map[string]bool{post.authorID: true} // prevent self-reply

			for r := 0; r < replyCount; r++ {
				// Pick a bot that hasn't commented on this post yet
				var replyUserID string
				for attempts := 0; attempts < 10; attempts++ {
					candidate := botUserIDs[rand.Intn(len(botUserIDs))]
					if !usedBots[candidate] {
						replyUserID = candidate
						break
					}
				}
				if replyUserID == "" {
					continue // couldn't find unique bot
				}
				usedBots[replyUserID] = true

				content := pool[rand.Intn(len(pool))]
				// Reply time: post time + 1h ~ 48h
				replyAt := post.created.Add(time.Duration(randBetween(1, 48)) * time.Hour)
				if replyAt.After(time.Now()) {
					replyAt = time.Now().Add(-time.Duration(rand.Intn(24)) * time.Hour)
				}

				var replyID string
				err := h.slimeRepo.Pool().QueryRow(ctx,
					`INSERT INTO community_replies (post_id, user_id, content, created_at)
					 VALUES ($1, $2, $3, $4)
					 RETURNING id`,
					post.id, replyUserID, content, replyAt,
				).Scan(&replyID)
				if err == nil {
					allReplies = append(allReplies, replyInfo{id: replyID, postID: post.id, userID: replyUserID, time: replyAt})
					totalReplies++
				}
			}
		}

		// Nested replies (parent_id): ~30% of replies get 1-2 sub-replies
		for _, reply := range allReplies {
			if rand.Float64() > 0.3 {
				continue
			}
			// Find the post type for this reply
			var postType string
			for _, p := range allPosts {
				if p.id == reply.postID {
					postType = p.postType
					break
				}
			}
			secondaryPool := pickSecondaryReplies(postType)
			subCount := randBetween(1, 2)
			for s := 0; s < subCount; s++ {
				subUserID := botUserIDs[rand.Intn(len(botUserIDs))]
				if subUserID == reply.userID {
					continue // avoid self-reply chain
				}
				content := secondaryPool[rand.Intn(len(secondaryPool))]
				subTime := reply.time.Add(time.Duration(randBetween(1, 24)) * time.Hour)
				if subTime.After(time.Now()) {
					subTime = time.Now().Add(-time.Duration(rand.Intn(12)) * time.Hour)
				}

				_, err := h.slimeRepo.Pool().Exec(ctx,
					`INSERT INTO community_replies (post_id, user_id, content, parent_id, created_at)
					 VALUES ($1, $2, $3, $4, $5)`,
					reply.postID, subUserID, content, reply.id, subTime,
				)
				if err == nil {
					totalNestedReplies++
				}
			}
		}

		// Update reply_count on all posts
		for _, post := range allPosts {
			h.slimeRepo.Pool().Exec(ctx,
				`UPDATE community_posts SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE post_id = $1) WHERE id = $1`,
				post.id,
			)
		}

		// Update reply_count on parent replies
		for _, reply := range allReplies {
			h.slimeRepo.Pool().Exec(ctx,
				`UPDATE community_replies SET reply_count = (SELECT COUNT(*) FROM community_replies WHERE parent_id = $1) WHERE id = $1`,
				reply.id,
			)
		}
	}

	// ════════════════════════════════════════════════════════
	// Phase 3: Post likes & Reply likes
	// ════════════════════════════════════════════════════════

	if len(botUserIDs) > 1 {
		// Post likes: each post gets 5-20 likes
		for _, post := range allPosts {
			likeCount := randBetween(5, 20)
			shuffled := make([]string, len(botUserIDs))
			copy(shuffled, botUserIDs)
			rand.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
			if likeCount > len(shuffled) {
				likeCount = len(shuffled)
			}
			for _, likerID := range shuffled[:likeCount] {
				_, err := h.slimeRepo.Pool().Exec(ctx,
					`INSERT INTO community_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					post.id, likerID,
				)
				if err == nil {
					totalPostLikes++
				}
			}
		}

		// Update like counts on posts
		for _, post := range allPosts {
			h.slimeRepo.Pool().Exec(ctx,
				`UPDATE community_posts SET likes = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = $1) WHERE id = $1`,
				post.id,
			)
		}

		// Reply likes: ~50% of replies get 1-10 likes
		for _, reply := range allReplies {
			if rand.Float64() > 0.5 {
				continue
			}
			likeCount := randBetween(1, 10)
			shuffled := make([]string, len(botUserIDs))
			copy(shuffled, botUserIDs)
			rand.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
			if likeCount > len(shuffled) {
				likeCount = len(shuffled)
			}
			for _, likerID := range shuffled[:likeCount] {
				_, err := h.slimeRepo.Pool().Exec(ctx,
					`INSERT INTO community_reply_likes (reply_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					reply.id, likerID,
				)
				if err == nil {
					totalReplyLikes++
				}
			}
			// Update reply likes count
			h.slimeRepo.Pool().Exec(ctx,
				`UPDATE community_replies SET likes = (SELECT COUNT(*) FROM community_reply_likes WHERE reply_id = $1) WHERE id = $1`,
				reply.id,
			)
		}
	}

	// ════════════════════════════════════════════════════════
	// Phase 4: Shorts with comments and likes
	// ════════════════════════════════════════════════════════

	var allShortIDs []string

	if len(botUserIDs) > 0 {
		// Combine existing shortsTitles + new actShortsContents
		allShortsPool := make([]struct {
			Title       string
			Description string
			Tags        []string
			Category    string
		}, 0, len(shortsTitles)+len(actShortsContents))
		for _, s := range shortsTitles {
			allShortsPool = append(allShortsPool, struct {
				Title       string
				Description string
				Tags        []string
				Category    string
			}{s.Title, s.Description, s.Tags, s.Category})
		}
		for _, s := range actShortsContents {
			allShortsPool = append(allShortsPool, struct {
				Title       string
				Description string
				Tags        []string
				Category    string
			}{s.Title, s.Description, s.Tags, s.Category})
		}

		// Each bot creates 1-3 shorts
		shortIdx := 0
		for _, botUID := range botUserIDs {
			shortsCount := randBetween(1, 3)
			for s := 0; s < shortsCount; s++ {
				if shortIdx >= len(allShortsPool) {
					shortIdx = 0 // wrap around
				}
				sc := allShortsPool[shortIdx]
				shortIdx++

				tags := sc.Tags
				if tags == nil {
					tags = []string{}
				}
				createdAt := time.Now().Add(-time.Duration(rand.Intn(30*24)) * time.Hour)
				views := randBetween(10, 500)
				likes := randBetween(1, 50)

				var shortID string
				err := h.slimeRepo.Pool().QueryRow(ctx,
					`INSERT INTO shorts (user_id, title, description, video_url, thumbnail_url, tags, category, visibility, views, likes, comment_count, status, created_at)
					 VALUES ($1, $2, $3, $4, '', $5, $6, 'public', $7, $8, 0, 'active', $9)
					 RETURNING id`,
					botUID, sc.Title, sc.Description, "", tags, sc.Category, views, likes, createdAt,
				).Scan(&shortID)
				if err != nil {
					log.Error().Err(err).Msg("Failed to create activity bot short")
					continue
				}
				allShortIDs = append(allShortIDs, shortID)
				totalShorts++
			}
		}

		// Shorts comments: each short gets 3-10 comments
		for _, shortID := range allShortIDs {
			commentCount := randBetween(3, 10)
			usedBots := map[string]bool{}
			for c := 0; c < commentCount; c++ {
				var commentUserID string
				for attempts := 0; attempts < 10; attempts++ {
					candidate := botUserIDs[rand.Intn(len(botUserIDs))]
					if !usedBots[candidate] {
						commentUserID = candidate
						break
					}
				}
				if commentUserID == "" {
					// Allow duplicate if all bots used
					commentUserID = botUserIDs[rand.Intn(len(botUserIDs))]
				}
				usedBots[commentUserID] = true

				content := actShortsComments[rand.Intn(len(actShortsComments))]
				createdAt := time.Now().Add(-time.Duration(rand.Intn(29*24)) * time.Hour)

				_, err := h.slimeRepo.Pool().Exec(ctx,
					`INSERT INTO shorts_comments (short_id, user_id, content, created_at)
					 VALUES ($1, $2, $3, $4)`,
					shortID, commentUserID, content, createdAt,
				)
				if err == nil {
					totalShortsComments++
				}
			}

			// Update comment_count
			h.slimeRepo.Pool().Exec(ctx,
				`UPDATE shorts SET comment_count = (SELECT COUNT(*) FROM shorts_comments WHERE short_id = $1) WHERE id = $1`,
				shortID,
			)
		}

		// Shorts likes: each short gets 5-20 likes
		for _, shortID := range allShortIDs {
			likeCount := randBetween(5, 20)
			shuffled := make([]string, len(botUserIDs))
			copy(shuffled, botUserIDs)
			rand.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
			if likeCount > len(shuffled) {
				likeCount = len(shuffled)
			}
			for _, likerID := range shuffled[:likeCount] {
				_, err := h.slimeRepo.Pool().Exec(ctx,
					`INSERT INTO shorts_likes (short_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					shortID, likerID,
				)
				if err == nil {
					totalShortsLikes++
				}
			}

			// Update like count
			h.slimeRepo.Pool().Exec(ctx,
				`UPDATE shorts SET likes = (SELECT COUNT(*) FROM shorts_likes WHERE short_id = $1) WHERE id = $1`,
				shortID,
			)
		}
	}

	// Shorts comment likes
	if len(allShortIDs) > 0 && len(botUserIDs) > 1 {
		seedActivityShortCommentLikes(ctx, h.slimeRepo.Pool(), allShortIDs, botUserIDs)
	}

	// ════════════════════════════════════════════════════════
	// Done
	// ════════════════════════════════════════════════════════

	log.Info().
		Int("bots_created", createdBots).
		Int("slimes", totalSlimes).
		Int("posts", totalPosts).
		Int("replies", totalReplies).
		Int("nested_replies", totalNestedReplies).
		Int("post_likes", totalPostLikes).
		Int("reply_likes", totalReplyLikes).
		Int("collections", totalCollections).
		Int("race_results", totalRaceResults).
		Int("shorts", totalShorts).
		Int("shorts_comments", totalShortsComments).
		Int("shorts_likes", totalShortsLikes).
		Msg("Activity bot seeding completed")

	return c.JSON(fiber.Map{
		"message":          "activity bot seeding completed",
		"bots_created":     createdBots,
		"slimes":           totalSlimes,
		"posts":            totalPosts,
		"replies":          totalReplies,
		"nested_replies":   totalNestedReplies,
		"post_likes":       totalPostLikes,
		"reply_likes":      totalReplyLikes,
		"collections":      totalCollections,
		"race_results":     totalRaceResults,
		"shorts":           totalShorts,
		"shorts_comments":  totalShortsComments,
		"shorts_likes":     totalShortsLikes,
	})
}

// DeleteActivityBots removes all activity bot users (actbot*@slimetopia.bot) and cascading data.
func (h *Handler) DeleteActivityBots(c *fiber.Ctx) error {
	ctx := c.Context()
	pool := h.slimeRepo.Pool()

	tag, err := pool.Exec(ctx,
		`DELETE FROM users WHERE email LIKE 'actbot%@slimetopia.bot'`,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete activity bots"})
	}

	deleted := tag.RowsAffected()
	log.Info().Int64("deleted", deleted).Msg("Activity bot users deleted")

	return c.JSON(fiber.Map{
		"message": "activity bots deleted",
		"deleted": deleted,
	})
}

// seedActivityShortCommentLikes adds likes to shorts comments from bots.
func seedActivityShortCommentLikes(ctx context.Context, pool *pgxpool.Pool, shortIDs, botUserIDs []string) int {
	total := 0
	for _, shortID := range shortIDs {
		// Get comments for this short
		rows, err := pool.Query(ctx,
			`SELECT id FROM shorts_comments WHERE short_id = $1`, shortID,
		)
		if err != nil {
			continue
		}

		var commentIDs []string
		for rows.Next() {
			var cid string
			if rows.Scan(&cid) == nil {
				commentIDs = append(commentIDs, cid)
			}
		}
		rows.Close()

		// Like ~50% of comments
		for _, cid := range commentIDs {
			if rand.Float64() > 0.5 {
				continue
			}
			likeCount := randBetween(1, 5)
			shuffled := make([]string, len(botUserIDs))
			copy(shuffled, botUserIDs)
			rand.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
			if likeCount > len(shuffled) {
				likeCount = len(shuffled)
			}
			for _, likerID := range shuffled[:likeCount] {
				_, err := pool.Exec(ctx,
					`INSERT INTO shorts_comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					cid, likerID,
				)
				if err == nil {
					total++
				}
			}
			// Update comment likes count
			pool.Exec(ctx,
				`UPDATE shorts_comments SET likes = (SELECT COUNT(*) FROM shorts_comment_likes WHERE comment_id = $1) WHERE id = $1`,
				cid,
			)
		}
	}
	return total
}
