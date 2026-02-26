export type TimeOfDay = "dawn" | "morning" | "afternoon" | "dusk" | "night";
export type Weather = "clear" | "rain" | "snow" | "fog" | "storm";

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

// Deterministic weather based on date (same weather for all users on same day)
export function getWeather(): Weather {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const hash = (seed * 2654435761) >>> 0;
  const roll = (hash % 100);
  if (roll < 50) return "clear";
  if (roll < 75) return "rain";
  if (roll < 85) return "snow";
  if (roll < 95) return "fog";
  return "storm";
}

export function getWeatherBuffs(weather: Weather): Record<string, number> {
  switch (weather) {
    case "rain":
      return { water: 1.3, fire: 0.8, grass: 1.1, light: 0.9, dark: 1.0, ice: 1.1, electric: 1.2, poison: 1.0, earth: 0.8, wind: 1.1, celestial: 1.0 };
    case "snow":
      return { water: 1.2, fire: 0.7, grass: 0.8, light: 1.2, dark: 1.0, ice: 1.4, electric: 0.9, poison: 0.9, earth: 0.8, wind: 1.1, celestial: 1.1 };
    case "fog":
      return { water: 1.0, fire: 0.9, grass: 1.0, light: 0.8, dark: 1.3, ice: 1.0, electric: 0.9, poison: 1.3, earth: 1.0, wind: 1.1, celestial: 0.9 };
    case "storm":
      return { water: 1.4, fire: 0.6, grass: 0.9, light: 1.1, dark: 1.2, ice: 1.1, electric: 1.4, poison: 1.0, earth: 0.9, wind: 1.3, celestial: 1.1 };
    default: // clear
      return { water: 1.0, fire: 1.1, grass: 1.1, light: 1.2, dark: 0.9, ice: 0.9, electric: 1.0, poison: 0.9, earth: 1.1, wind: 1.0, celestial: 1.2 };
  }
}

export function getSkyColors(time: TimeOfDay): { top: number; bottom: number } {
  switch (time) {
    case "dawn":
      return { top: 0x1a1040, bottom: 0x4a2040 };
    case "morning":
      return { top: 0x1a3060, bottom: 0x2a5080 };
    case "afternoon":
      return { top: 0x1a4080, bottom: 0x2a6090 };
    case "dusk":
      return { top: 0x2a1040, bottom: 0x4a2030 };
    case "night":
      return { top: 0x080816, bottom: 0x0a1020 };
  }
}

export function getWeatherIcon(weather: Weather): string {
  switch (weather) {
    case "rain": return "🌧️";
    case "snow": return "🌨️";
    case "fog": return "🌫️";
    case "storm": return "⛈️";
    default: return "☀️";
  }
}

export function getWeatherName(weather: Weather): string {
  switch (weather) {
    case "rain": return "비";
    case "snow": return "눈";
    case "fog": return "안개";
    case "storm": return "폭풍";
    default: return "맑음";
  }
}

export type Season = "spring" | "summer" | "autumn" | "winter";

export function getSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
