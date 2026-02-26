package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/slimetopia/server/internal/admin"
	"github.com/slimetopia/server/internal/auth"
	"github.com/slimetopia/server/internal/game"
	"github.com/slimetopia/server/internal/middleware"
	"github.com/slimetopia/server/internal/repository"
	"github.com/slimetopia/server/pkg/config"
)

func main() {
	// Logger setup
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	cfg := config.Load()

	// PostgreSQL connection
	ctx := context.Background()
	pool, err := connectDB(ctx, cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}
	defer pool.Close()
	log.Info().Msg("Connected to PostgreSQL")

	// Auto-run migrations
	if err := runMigrations(ctx, pool); err != nil {
		log.Warn().Err(err).Msg("Migration warning (may be already applied)")
	}

	// Redis connection
	var rdb *redis.Client
	if cfg.RedisURL != "" {
		opts, err := redis.ParseURL(cfg.RedisURL)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to parse REDIS_URL")
		}
		rdb = redis.NewClient(opts)
	} else {
		rdb = redis.NewClient(&redis.Options{
			Addr: cfg.RedisAddr,
		})
	}
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer rdb.Close()
	log.Info().Msg("Connected to Redis")

	// Repositories
	userRepo := repository.NewUserRepository(pool)
	slimeRepo := repository.NewSlimeRepository(pool)
	explorationRepo := repository.NewExplorationRepository(pool)
	missionRepo := repository.NewMissionRepository(pool)
	villageRepo := repository.NewVillageRepository(pool)
	gameDataRepo := repository.NewGameDataRepository(pool)

	// Auth
	jwtManager := auth.NewJWTManager(cfg.JWTSecret)
	authHandler := auth.NewHandler(userRepo, slimeRepo, jwtManager, rdb)

	// Register OAuth providers (only if credentials are configured)
	if cfg.GoogleClientID != "" {
		authHandler.RegisterProvider(auth.NewGoogleProvider(
			cfg.GoogleClientID, cfg.GoogleSecret,
			cfg.OAuthRedirectBase+"/api/auth/callback/google",
		))
	}
	if cfg.KakaoClientID != "" {
		authHandler.RegisterProvider(auth.NewKakaoProvider(
			cfg.KakaoClientID, cfg.KakaoSecret,
			cfg.OAuthRedirectBase+"/api/auth/callback/kakao",
		))
	}

	userHandler := auth.NewUserHandler(userRepo)
	gameHandler := game.NewHandler(slimeRepo, userRepo, explorationRepo, missionRepo, villageRepo, gameDataRepo, rdb)
	adminHandler := admin.NewAdminHandler(pool, cfg.JWTSecret, gameDataRepo)

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "SlimeTopia API",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		BodyLimit:    50 * 1024 * 1024, // 50MB for video uploads
	})

	// Middleware
	app.Use(logger.New())
	corsOrigins := "http://localhost:3000, http://localhost:3001, https://localhost, capacitor://localhost"
	if cfg.AllowedOrigins != "" {
		corsOrigins = corsOrigins + ", " + cfg.AllowedOrigins
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Admin panel (server-rendered HTML)
	admin.RegisterAdminRoutes(app, adminHandler)

	// Static file serving for uploads (video, thumbnails)
	app.Static("/uploads", "./uploads", fiber.Static{
		Compress: true,
		MaxAge:   86400,
	})

	// Health check (public)
	app.Get("/api/health", func(c *fiber.Ctx) error {
		if err := pool.Ping(ctx); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "error",
				"error":  "database unavailable",
			})
		}
		if err := rdb.Ping(ctx).Err(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "error",
				"error":  "redis unavailable",
			})
		}
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "slimetopia-api",
			"version": "0.1.0",
		})
	})

	// Public routes
	api := app.Group("/api")
	auth.RegisterRoutes(api, authHandler)

	// Protected routes
	protected := api.Use(middleware.AuthRequired(jwtManager))
	auth.RegisterUserRoutes(protected, userHandler)
	game.RegisterRoutes(protected, gameHandler)

	// Start bot activity background goroutine (runs every 5 minutes)
	botActivityMgr := game.NewBotActivityManager(pool, 5*time.Minute)
	botActivityMgr.Start()

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	log.Info().Str("port", cfg.Port).Msg("SlimeTopia API server started")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")
	botActivityMgr.Stop()
	if err := app.Shutdown(); err != nil {
		log.Error().Err(err).Msg("Server shutdown error")
	}
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	// Create migration tracking table
	_, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`)
	if err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}

	// Find migration files
	migrationPaths := []string{"migrations", "server/migrations", "/app/migrations"}
	var files []string
	for _, dir := range migrationPaths {
		matches, _ := filepath.Glob(filepath.Join(dir, "*.up.sql"))
		if len(matches) > 0 {
			files = matches
			break
		}
	}
	if len(files) == 0 {
		log.Info().Msg("No migration files found, skipping")
		return nil
	}
	sort.Strings(files)

	applied := 0
	for _, f := range files {
		version := filepath.Base(f)
		// Check if already applied
		var exists bool
		err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)", version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists {
			continue
		}

		// Read and execute migration
		sql, err := os.ReadFile(f)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("apply migration %s: %w", version, err)
		}
		// Record as applied
		if _, err := pool.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			return fmt.Errorf("record migration %s: %w", version, err)
		}
		applied++
		log.Info().Str("file", version).Msg("Applied migration")
	}
	if applied > 0 {
		log.Info().Int("count", applied).Msg("Migrations completed")
	} else {
		log.Info().Msg("All migrations already applied")
	}
	return nil
}

func connectDB(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	dbURL := cfg.DatabaseURL()

	poolConfig, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	poolConfig.MaxConns = 20
	poolConfig.MinConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}

	return pool, nil
}
