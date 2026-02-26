package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/slimetopia/server/internal/models"
)

var ErrUserNotFound = errors.New("user not found")

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Pool() *pgxpool.Pool {
	return r.pool
}

func (r *UserRepository) FindByProviderID(ctx context.Context, provider, providerID string) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, nickname, provider, provider_id, gold, gems, stardust, level, created_at, updated_at
		 FROM users WHERE provider = $1 AND provider_id = $2`,
		provider, providerID,
	).Scan(
		&user.ID, &user.Nickname, &user.Provider, &user.ProviderID,
		&user.Gold, &user.Gems, &user.Stardust, &user.Level,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, nickname, provider, provider_id, gold, gems, stardust, level, created_at, updated_at
		 FROM users WHERE id = $1`,
		id,
	).Scan(
		&user.ID, &user.Nickname, &user.Provider, &user.ProviderID,
		&user.Gold, &user.Gems, &user.Stardust, &user.Level,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) Create(ctx context.Context, nickname, provider, providerID string) (*models.User, error) {
	user := &models.User{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (nickname, provider, provider_id)
		 VALUES ($1, $2, $3)
		 RETURNING id, nickname, provider, provider_id, gold, gems, stardust, level, created_at, updated_at`,
		nickname, provider, providerID,
	).Scan(
		&user.ID, &user.Nickname, &user.Provider, &user.ProviderID,
		&user.Gold, &user.Gems, &user.Stardust, &user.Level,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) UpdateNickname(ctx context.Context, id, nickname string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET nickname = $1, updated_at = NOW() WHERE id = $2`,
		nickname, id,
	)
	return err
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	var emailVal, pwVal *string
	err := r.pool.QueryRow(ctx,
		`SELECT id, nickname, provider, provider_id, gold, gems, stardust, level, email, password_hash, created_at, updated_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(
		&user.ID, &user.Nickname, &user.Provider, &user.ProviderID,
		&user.Gold, &user.Gems, &user.Stardust, &user.Level,
		&emailVal, &pwVal,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	if emailVal != nil {
		user.Email = *emailVal
	}
	if pwVal != nil {
		user.PasswordHash = *pwVal
	}
	return user, nil
}

func (r *UserRepository) SetEmailPassword(ctx context.Context, userID, email, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET email = $1, password_hash = $2, updated_at = NOW() WHERE id = $3`,
		email, passwordHash, userID,
	)
	return err
}

var ErrInsufficientFunds = errors.New("insufficient funds")

func (r *UserRepository) AddCurrency(ctx context.Context, userID string, gold int64, gems, stardust int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET gold = gold + $1, gems = gems + $2, stardust = stardust + $3, updated_at = NOW() WHERE id = $4`,
		gold, gems, stardust, userID,
	)
	return err
}

func (r *UserRepository) GetCommunityStats(ctx context.Context, userID string) (map[string]int, error) {
	var postCount, commentCount int

	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM community_posts WHERE user_id = $1`, userID,
	).Scan(&postCount)
	if err != nil {
		return nil, err
	}

	err = r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM community_replies WHERE user_id = $1`, userID,
	).Scan(&commentCount)
	if err != nil {
		return nil, err
	}

	return map[string]int{
		"post_count":    postCount,
		"comment_count": commentCount,
	}, nil
}

func (r *UserRepository) UpdateNicknameWithCost(ctx context.Context, userID, nickname string, goldCost int64) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET nickname = $1, gold = gold - $2, updated_at = NOW()
		 WHERE id = $3 AND gold >= $2`,
		nickname, goldCost, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInsufficientFunds
	}
	return nil
}

func (r *UserRepository) GetPasswordHash(ctx context.Context, userID string) (string, error) {
	var hash *string
	err := r.pool.QueryRow(ctx,
		`SELECT password_hash FROM users WHERE id = $1`, userID,
	).Scan(&hash)
	if err != nil {
		return "", err
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

func (r *UserRepository) ChangePassword(ctx context.Context, userID, newHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		newHash, userID,
	)
	return err
}

func (r *UserRepository) SpendCurrency(ctx context.Context, userID string, gold int64, gems, stardust int) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET gold = gold - $1, gems = gems - $2, stardust = stardust - $3, updated_at = NOW()
		 WHERE id = $4 AND gold >= $1 AND gems >= $2 AND stardust >= $3`,
		gold, gems, stardust, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInsufficientFunds
	}
	return nil
}
