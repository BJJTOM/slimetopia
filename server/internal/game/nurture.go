package game

import "time"

// Action types
const (
	ActionFeed     = "feed"
	ActionPet      = "pet"
	ActionPlay     = "play"
	ActionBath     = "bath"
	ActionMedicine = "medicine"
)

// Base stat changes per action
type statDelta struct {
	Affection int
	Hunger    int
	Condition int
	Exp       int
}

var baseStats = map[string]statDelta{
	ActionFeed:     {Affection: 2, Hunger: 30, Condition: 0, Exp: 10},
	ActionPet:      {Affection: 5, Hunger: 0, Condition: 3, Exp: 5},
	ActionPlay:     {Affection: 3, Hunger: 0, Condition: 10, Exp: 15},
	ActionBath:     {Affection: 3, Hunger: 0, Condition: 25, Exp: 8},
	ActionMedicine: {Affection: 5, Hunger: 0, Condition: 15, Exp: 5},
}

// Cooldown durations per action
var cooldowns = map[string]time.Duration{
	ActionFeed:     30 * time.Second,
	ActionPet:      10 * time.Second,
	ActionPlay:     60 * time.Second,
	ActionBath:     45 * time.Second,
	ActionMedicine: 120 * time.Second,
}

// applyPersonalityBonus adjusts stat deltas based on personality and action.
func applyPersonalityBonus(d *statDelta, personality, action string) {
	switch personality {
	case "foodie":
		if action == ActionFeed {
			d.Hunger += 10
		}
	case "energetic":
		if action == ActionPlay {
			d.Condition += 5
		}
	case "tsundere":
		d.Affection -= 2
		d.Exp += 3
	case "gentle":
		if action == ActionPet {
			d.Affection += 3
		}
		if action == ActionMedicine {
			d.Affection += 3
		}
	case "curious":
		d.Exp += 2
	case "chill":
		if action == ActionBath {
			d.Condition += 5
		}
	}
}

// expForLevel returns EXP needed to go from level to level+1.
func expForLevel(level int) int {
	return level * 100
}

const maxLevel = 30

// checkLevelUp checks if the slime leveled up and returns new level, exp, and whether it leveled.
func checkLevelUp(level, exp int) (newLevel int, newExp int, leveledUp bool) {
	newLevel = level
	newExp = exp
	for newLevel < maxLevel {
		required := expForLevel(newLevel)
		if newExp < required {
			break
		}
		newExp -= required
		newLevel++
		leveledUp = true
	}
	// Cap exp at max level
	if newLevel >= maxLevel {
		newExp = 0
	}
	return
}

// applyLazyDecay calculates stat decay based on time since last update.
// Returns new hunger, condition, affection, and whether the slime should become sick.
func applyLazyDecay(hunger, condition, affection int, updatedAt time.Time) (int, int, int, bool) {
	hours := int(time.Since(updatedAt).Hours())
	if hours <= 0 {
		return hunger, condition, affection, false
	}

	shouldSick := false
	for i := 0; i < hours; i++ {
		hunger -= 5 // gentler hunger decay
		if hunger < 0 {
			hunger = 0
		}
		if hunger == 0 {
			condition -= 2  // gentler condition decay when hungry
			affection -= 1  // gentler affection decay when hungry
			if condition < 0 {
				condition = 0
			}
			if affection < 0 {
				affection = 0
			}
		}
		if condition == 0 {
			shouldSick = true
		}
	}
	return hunger, condition, affection, shouldSick
}

// deriveMood returns a mood string based on current stats.
func deriveMood(hunger, condition, affection int, isSick bool) string {
	if isSick {
		return "sick"
	}
	avg := (hunger + condition + affection) / 3
	switch {
	case avg >= 80:
		return "ecstatic"
	case avg >= 60:
		return "happy"
	case avg >= 40:
		return "neutral"
	case avg >= 20:
		return "sad"
	default:
		return "miserable"
	}
}

// Reaction messages: 6 personalities × 5 actions = 30 messages
var reactionMessages = map[string]map[string]string{
	"foodie": {
		ActionFeed:     "맛있다~! 더 줘! 🤤",
		ActionPet:      "밥이 더 좋긴 한데... 고마워 😋",
		ActionPlay:     "놀이도 좋지만 간식은? 🍕",
		ActionBath:     "물에서 간식 냄새가... 아닌가? 🛁",
		ActionMedicine: "약이 맛없어... 사탕도 줘! 💊",
	},
	"energetic": {
		ActionFeed:     "냠냠! 힘이 난다! 💪",
		ActionPet:      "헤헤~ 더 세게! 🌟",
		ActionPlay:     "야호~! 신난다!! 🎉",
		ActionBath:     "물놀이다~! 첨벙첨벙! 🛁",
		ActionMedicine: "약 먹으면 다시 뛸 수 있어?! 💪",
	},
	"tsundere": {
		ActionFeed:     "딱히 맛있어서 먹는 건 아니야... 😤",
		ActionPet:      "만지지 마... 라고 할 뻔 💢",
		ActionPlay:     "심심해서 놀아주는 거야, 착각하지 마 😒",
		ActionBath:     "시, 시키지 않아도 씻어! 😤",
		ActionMedicine: "약 같은 거 필요 없는데... 고마워 💢",
	},
	"gentle": {
		ActionFeed:     "감사합니다~ 맛있어요 🥰",
		ActionPet:      "따뜻해요... 행복해 💕",
		ActionPlay:     "같이 놀 수 있어서 기뻐요 🌸",
		ActionBath:     "깨끗해져서 기분 좋아요~ 🌸",
		ActionMedicine: "걱정해줘서 감동이야... 💕",
	},
	"curious": {
		ActionFeed:     "이건 뭐지? 오, 맛있다! 🔍",
		ActionPet:      "이 감촉은... 흥미로워! 🧐",
		ActionPlay:     "우와, 이건 어떻게 하는 거야?! 💡",
		ActionBath:     "비누 거품은 왜 둥글까? 🧐",
		ActionMedicine: "이 약은 어떤 성분일까? 🔬",
	},
	"chill": {
		ActionFeed:     "냠... 고마워~ 😌",
		ActionPet:      "음... 좋아... zzZ 😴",
		ActionPlay:     "아... 천천히 하자~ 🍃",
		ActionBath:     "따뜻한 물... 졸려... 😌",
		ActionMedicine: "쓰다... 다시 잘래... 😴",
	},
}

// getReaction returns the reaction message for a given personality and action.
func getReaction(personality, action string) string {
	if msgs, ok := reactionMessages[personality]; ok {
		if msg, ok := msgs[action]; ok {
			return msg
		}
	}
	return "...!"
}

// clamp keeps a value within [0, 100].
func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
