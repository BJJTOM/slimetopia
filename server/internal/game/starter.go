package game

import (
	"context"
	"math/rand"

	"github.com/rs/zerolog/log"
	"github.com/slimetopia/server/internal/models"
	"github.com/slimetopia/server/internal/repository"
)

// StarterSlimes are the initial slimes given to new users
var starterSlimes = []struct {
	SpeciesID int
	Element   string
}{
	{1, models.ElementWater}, // 물방울 해적 슬라임
	{2, models.ElementFire},  // 불씨 해적 슬라임
	{3, models.ElementGrass}, // 풀잎 해적 슬라임
}

var personalities = []string{
	models.PersonalityGentle,
	models.PersonalityEnergetic,
	models.PersonalityCurious,
}

// GrantStarterPack gives a new user their first slimes, currency, and food
func GrantStarterPack(ctx context.Context, slimeRepo *repository.SlimeRepository, userRepo *repository.UserRepository, userID string) {
	// Check if user already has slimes
	count, err := slimeRepo.CountByUser(ctx, userID)
	if err != nil || count > 0 {
		return
	}

	for i, starter := range starterSlimes {
		personality := personalities[i%len(personalities)]
		slime, err := slimeRepo.Create(ctx, userID, starter.SpeciesID, starter.Element, personality)
		if err != nil {
			log.Error().Err(err).Int("species", starter.SpeciesID).Msg("Failed to grant starter slime")
			continue
		}
		_ = slime

		// Add to codex
		slimeRepo.AddCodexEntry(ctx, userID, starter.SpeciesID)
	}

	// Grant starting currency: 3000 gold + 50 gems
	if err := userRepo.AddCurrency(ctx, userID, 3000, 50, 0); err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to grant starter currency")
	}

	// Grant 10x Tasty Food (food_id=3)
	_, err = slimeRepo.Pool().Exec(ctx,
		"INSERT INTO food_inventory (user_id, food_id, quantity) VALUES ($1, 3, 10) ON CONFLICT (user_id, food_id) DO UPDATE SET quantity = food_inventory.quantity + 10",
		userID,
	)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to grant starter food")
	}

	log.Info().Str("user_id", userID).Msg("Starter pack granted: 3 slimes + 3000 gold + 50 gems + 10 food")
}

// GrantRandomSlime gives a random common slime (for testing)
func GrantRandomSlime(ctx context.Context, slimeRepo *repository.SlimeRepository, userID string) (*models.Slime, error) {
	starter := starterSlimes[rand.Intn(len(starterSlimes))]
	personality := personalities[rand.Intn(len(personalities))]

	slime, err := slimeRepo.Create(ctx, userID, starter.SpeciesID, starter.Element, personality)
	if err != nil {
		return nil, err
	}

	slimeRepo.AddCodexEntry(ctx, userID, starter.SpeciesID)
	return slime, nil
}
