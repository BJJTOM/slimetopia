package auth

import (
	"fmt"
	"math/rand"
)

// Modifiers — adjectives / descriptors (50)
var modifiers = []string{
	"용감한", "반짝이는", "졸린", "신비로운", "뽀짝한",
	"날쌘", "배고픈", "행복한", "쪼꼬만", "거대한",
	"화난", "느긋한", "말랑한", "몽글몽글", "사나운",
	"귀여운", "수줍은", "씩씩한", "장난꾸러기", "빛나는",
	"무적의", "꼬마", "전설의", "떠돌이", "잠꾸러기",
	"뚝딱이는", "통통한", "날렵한", "겁없는", "꿈꾸는",
	"활발한", "미스터리", "조용한", "열정적인", "우아한",
	"소심한", "불꽃", "얼음", "천둥", "바람의",
	"달빛", "별똥별", "무지개", "황금", "은빛",
	"새벽녘", "노을빛", "안개속", "폭풍", "초원의",
}

// Creatures — nouns (50)
var creatures = []string{
	"슬라임", "토끼", "고양이", "강아지", "여우",
	"곰돌이", "펭귄", "부엉이", "다람쥐", "햄스터",
	"해달", "수달", "판다", "코알라", "알파카",
	"사슴", "나비", "벌새", "돌고래", "해파리",
	"불사조", "유니콘", "드래곤", "용사", "마법사",
	"요정", "닌자", "해적", "탐험가", "연금술사",
	"젤리", "사탕", "구름", "별님", "달님",
	"도토리", "솜사탕", "떡볶이", "붕어빵", "호빵",
	"문어", "거북이", "고래", "조개", "불가사리",
	"선인장", "버섯", "민들레", "도깨비", "정령",
}

// GenerateRandomNickname creates a modifier+creature nickname
func GenerateRandomNickname() string {
	mod := modifiers[rand.Intn(len(modifiers))]
	crt := creatures[rand.Intn(len(creatures))]
	suffix := rand.Intn(100)
	return fmt.Sprintf("%s%s%02d", mod, crt, suffix)
}
