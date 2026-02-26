package config

import "os"

type Config struct {
	Port      string
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	RedisAddr string

	JWTSecret         string
	GoogleClientID    string
	GoogleSecret      string
	KakaoClientID     string
	KakaoSecret       string
	OAuthRedirectBase string
}

func Load() *Config {
	return &Config{
		Port:      getEnv("PORT", "8080"),
		DBHost:    getEnv("DB_HOST", "localhost"),
		DBPort:    getEnv("DB_PORT", "5432"),
		DBUser:    getEnv("DB_USER", "slime"),
		DBPass:    getEnv("DB_PASSWORD", "slime_secret"),
		DBName:    getEnv("DB_NAME", "slimetopia"),
		RedisAddr: getEnv("REDIS_ADDR", "localhost:6379"),

		JWTSecret:         getEnv("JWT_SECRET", "slimetopia-dev-secret-change-in-production"),
		GoogleClientID:    getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleSecret:      getEnv("GOOGLE_CLIENT_SECRET", ""),
		KakaoClientID:     getEnv("KAKAO_CLIENT_ID", ""),
		KakaoSecret:       getEnv("KAKAO_CLIENT_SECRET", ""),
		OAuthRedirectBase: getEnv("OAUTH_REDIRECT_BASE", "http://localhost:8080"),
	}
}

func (c *Config) DatabaseURL() string {
	return "postgres://" + c.DBUser + ":" + c.DBPass + "@" + c.DBHost + ":" + c.DBPort + "/" + c.DBName + "?sslmode=disable"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
