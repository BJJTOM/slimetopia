package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrExplorationNotFound = errors.New("exploration not found")

type Exploration struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	DestinationID int       `json:"destination_id"`
	SlimeIDs      []string  `json:"slime_ids"`
	StartedAt     time.Time `json:"started_at"`
	EndsAt        time.Time `json:"ends_at"`
	Claimed       bool      `json:"claimed"`
}

type ExplorationRepository struct {
	pool *pgxpool.Pool
}

func NewExplorationRepository(pool *pgxpool.Pool) *ExplorationRepository {
	return &ExplorationRepository{pool: pool}
}

func (r *ExplorationRepository) Create(ctx context.Context, userID string, destID int, slimeIDs []string, endsAt time.Time) (*Exploration, error) {
	var e Exploration
	err := r.pool.QueryRow(ctx,
		`INSERT INTO explorations (user_id, destination_id, slime_ids, ends_at)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, destination_id, slime_ids, started_at, ends_at, claimed`,
		userID, destID, slimeIDs, endsAt,
	).Scan(&e.ID, &e.UserID, &e.DestinationID, &e.SlimeIDs, &e.StartedAt, &e.EndsAt, &e.Claimed)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *ExplorationRepository) FindActiveByUser(ctx context.Context, userID string) ([]Exploration, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, destination_id, slime_ids, started_at, ends_at, claimed
		 FROM explorations
		 WHERE user_id = $1 AND claimed = FALSE
		 ORDER BY started_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var explorations []Exploration
	for rows.Next() {
		var e Exploration
		if err := rows.Scan(&e.ID, &e.UserID, &e.DestinationID, &e.SlimeIDs, &e.StartedAt, &e.EndsAt, &e.Claimed); err != nil {
			return nil, err
		}
		explorations = append(explorations, e)
	}
	return explorations, nil
}

func (r *ExplorationRepository) FindByID(ctx context.Context, id string) (*Exploration, error) {
	var e Exploration
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, destination_id, slime_ids, started_at, ends_at, claimed
		 FROM explorations WHERE id = $1`,
		id,
	).Scan(&e.ID, &e.UserID, &e.DestinationID, &e.SlimeIDs, &e.StartedAt, &e.EndsAt, &e.Claimed)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrExplorationNotFound
		}
		return nil, err
	}
	return &e, nil
}

func (r *ExplorationRepository) MarkClaimed(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE explorations SET claimed = TRUE WHERE id = $1`,
		id,
	)
	return err
}

// IsSlimeOnExploration checks if any of the given slime IDs are currently on an unclaimed exploration
func (r *ExplorationRepository) IsSlimeOnExploration(ctx context.Context, userID string, slimeIDs []string) (bool, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM explorations
		 WHERE user_id = $1 AND claimed = FALSE AND slime_ids && $2`,
		userID, slimeIDs,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
