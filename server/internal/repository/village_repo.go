package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/slimetopia/server/internal/models"
)

var ErrVillageNotFound = errors.New("village not found")

type GuestbookEntry struct {
	ID             pgtype.UUID `json:"id"`
	VillageID      pgtype.UUID `json:"village_id"`
	AuthorID       pgtype.UUID `json:"author_id"`
	AuthorNickname string      `json:"author_nickname"`
	Message        string      `json:"message"`
	CreatedAt      time.Time   `json:"created_at"`
}

type VillageRepository struct {
	pool *pgxpool.Pool
}

func NewVillageRepository(pool *pgxpool.Pool) *VillageRepository {
	return &VillageRepository{pool: pool}
}

func (r *VillageRepository) GetOrCreate(ctx context.Context, userID string) (*models.Village, error) {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO villages (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
		userID,
	)
	if err != nil {
		return nil, err
	}

	v := &models.Village{}
	err = r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, grid_size, terrain, layout, visit_count, likes, created_at, updated_at
		 FROM villages WHERE user_id = $1`,
		userID,
	).Scan(
		&v.ID, &v.UserID, &v.Name, &v.GridSize, &v.Terrain,
		&v.Layout, &v.VisitCount, &v.Likes, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return v, nil
}

func (r *VillageRepository) GetByID(ctx context.Context, id string) (*models.Village, error) {
	v := &models.Village{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, grid_size, terrain, layout, visit_count, likes, created_at, updated_at
		 FROM villages WHERE id = $1`,
		id,
	).Scan(
		&v.ID, &v.UserID, &v.Name, &v.GridSize, &v.Terrain,
		&v.Layout, &v.VisitCount, &v.Likes, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVillageNotFound
		}
		return nil, err
	}
	return v, nil
}

func (r *VillageRepository) GetRandom(ctx context.Context, excludeUserID string, limit int) ([]models.Village, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, name, grid_size, terrain, layout, visit_count, likes, created_at, updated_at
		 FROM villages WHERE user_id != $1
		 ORDER BY random()
		 LIMIT $2`,
		excludeUserID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var villages []models.Village
	for rows.Next() {
		var v models.Village
		if err := rows.Scan(
			&v.ID, &v.UserID, &v.Name, &v.GridSize, &v.Terrain,
			&v.Layout, &v.VisitCount, &v.Likes, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, err
		}
		villages = append(villages, v)
	}
	return villages, nil
}

func (r *VillageRepository) IncrementVisit(ctx context.Context, villageID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE villages SET visit_count = visit_count + 1, updated_at = NOW() WHERE id = $1`,
		villageID,
	)
	return err
}

func (r *VillageRepository) AddLike(ctx context.Context, villageID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE villages SET likes = likes + 1, updated_at = NOW() WHERE id = $1`,
		villageID,
	)
	return err
}

func (r *VillageRepository) GetGuestbook(ctx context.Context, villageID string, limit int) ([]GuestbookEntry, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT g.id, g.village_id, g.author_id, u.nickname, g.message, g.created_at
		 FROM guestbook_entries g
		 JOIN users u ON u.id = g.author_id
		 WHERE g.village_id = $1
		 ORDER BY g.created_at DESC
		 LIMIT $2`,
		villageID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []GuestbookEntry
	for rows.Next() {
		var e GuestbookEntry
		if err := rows.Scan(
			&e.ID, &e.VillageID, &e.AuthorID, &e.AuthorNickname, &e.Message, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (r *VillageRepository) AddGuestbookEntry(ctx context.Context, villageID, authorID, message string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO guestbook_entries (village_id, author_id, message) VALUES ($1, $2, $3)`,
		villageID, authorID, message,
	)
	return err
}
