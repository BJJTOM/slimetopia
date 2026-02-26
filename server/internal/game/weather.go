package game

import "time"

// Server-side weather calculation (matches client-side WeatherSystem.ts)
type WeatherType string

const (
	WeatherClear WeatherType = "clear"
	WeatherRain  WeatherType = "rain"
	WeatherSnow  WeatherType = "snow"
	WeatherFog   WeatherType = "fog"
	WeatherStorm WeatherType = "storm"
)

func getCurrentWeather() WeatherType {
	now := time.Now()
	seed := uint32(now.Year()*10000 + int(now.Month())*100 + now.Day())
	hash := seed * 2654435761 // Knuth multiplicative hash
	roll := hash % 100

	switch {
	case roll < 50:
		return WeatherClear
	case roll < 75:
		return WeatherRain
	case roll < 85:
		return WeatherSnow
	case roll < 95:
		return WeatherFog
	default:
		return WeatherStorm
	}
}

var weatherBuffs = map[WeatherType]map[string]float64{
	WeatherClear: {"water": 1.0, "fire": 1.1, "grass": 1.1, "light": 1.2, "dark": 0.9},
	WeatherRain:  {"water": 1.3, "fire": 0.8, "grass": 1.1, "light": 0.9, "dark": 1.0},
	WeatherSnow:  {"water": 1.2, "fire": 0.7, "grass": 0.8, "light": 1.2, "dark": 1.0},
	WeatherFog:   {"water": 1.0, "fire": 0.9, "grass": 1.0, "light": 0.8, "dark": 1.3},
	WeatherStorm: {"water": 1.4, "fire": 0.6, "grass": 0.9, "light": 1.1, "dark": 1.2},
}

func getWeatherBuff(element string) float64 {
	weather := getCurrentWeather()
	if buffs, ok := weatherBuffs[weather]; ok {
		if buff, ok := buffs[element]; ok {
			return buff
		}
	}
	return 1.0
}
