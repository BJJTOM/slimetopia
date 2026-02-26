package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/slimetopia/server/internal/models"
)

var ErrSlimeNotFound = errors.New("slime not found")

type SlimeRepository struct {
	pool *pgxpool.Pool
}

func NewSlimeRepository(pool *pgxpool.Pool) *SlimeRepository {
	return &SlimeRepository{pool: pool}
}

func (r *SlimeRepository) Pool() *pgxpool.Pool {
	return r.pool
}

func (r *SlimeRepository) FindByUser(ctx context.Context, userID string) ([]models.Slime, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, species_id, name, level, exp, element, personality,
		        affection, hunger, condition, position_x, position_y, accessories, is_sick, created_at, updated_at
		 FROM slimes WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slimes []models.Slime
	for rows.Next() {
		var s models.Slime
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.SpeciesID, &s.Name, &s.Level, &s.Exp,
			&s.Element, &s.Personality, &s.Affection, &s.Hunger, &s.Condition,
			&s.PositionX, &s.PositionY, &s.Accessories, &s.IsSick, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		slimes = append(slimes, s)
	}
	return slimes, nil
}

func (r *SlimeRepository) FindByID(ctx context.Context, id string) (*models.Slime, error) {
	s := &models.Slime{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, species_id, name, level, exp, element, personality,
		        affection, hunger, condition, position_x, position_y, accessories, is_sick, created_at, updated_at
		 FROM slimes WHERE id = $1`,
		id,
	).Scan(
		&s.ID, &s.UserID, &s.SpeciesID, &s.Name, &s.Level, &s.Exp,
		&s.Element, &s.Personality, &s.Affection, &s.Hunger, &s.Condition,
		&s.PositionX, &s.PositionY, &s.Accessories, &s.IsSick, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSlimeNotFound
		}
		return nil, err
	}
	return s, nil
}

func (r *SlimeRepository) Create(ctx context.Context, userID string, speciesID int, element, personality string) (*models.Slime, error) {
	s := &models.Slime{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO slimes (user_id, species_id, element, personality)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, species_id, name, level, exp, element, personality,
		           affection, hunger, condition, position_x, position_y, accessories, is_sick, created_at, updated_at`,
		userID, speciesID, element, personality,
	).Scan(
		&s.ID, &s.UserID, &s.SpeciesID, &s.Name, &s.Level, &s.Exp,
		&s.Element, &s.Personality, &s.Affection, &s.Hunger, &s.Condition,
		&s.PositionX, &s.PositionY, &s.Accessories, &s.IsSick, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SlimeRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM slimes WHERE id = $1`, id)
	return err
}

func (r *SlimeRepository) UpdateName(ctx context.Context, id, name string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE slimes SET name = $1, updated_at = NOW() WHERE id = $2`,
		name, id,
	)
	return err
}

func (r *SlimeRepository) UpdateStats(ctx context.Context, id string, affection, hunger, condition int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE slimes SET affection = $1, hunger = $2, condition = $3, updated_at = NOW() WHERE id = $4`,
		affection, hunger, condition, id,
	)
	return err
}

func (r *SlimeRepository) UpdateSick(ctx context.Context, id string, isSick bool) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE slimes SET is_sick = $1, updated_at = NOW() WHERE id = $2`, isSick, id)
	return err
}

func (r *SlimeRepository) UpdatePersonality(ctx context.Context, id, personality string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE slimes SET personality = $1, updated_at = NOW() WHERE id = $2`,
		personality, id,
	)
	return err
}

func (r *SlimeRepository) AddExp(ctx context.Context, id string, exp int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE slimes SET exp = exp + $1, updated_at = NOW() WHERE id = $2`,
		exp, id,
	)
	return err
}

func (r *SlimeRepository) SetLevelAndExp(ctx context.Context, id string, level, exp int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE slimes SET level = $1, exp = $2, updated_at = NOW() WHERE id = $3`,
		level, exp, id,
	)
	return err
}

func (r *SlimeRepository) GetSpecies(ctx context.Context, speciesID int) (*models.SlimeSpecies, error) {
	sp := &models.SlimeSpecies{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, name_en, element, grade, description FROM slime_species WHERE id = $1`,
		speciesID,
	).Scan(&sp.ID, &sp.Name, &sp.NameEN, &sp.Element, &sp.Grade, &sp.Description)
	if err != nil {
		return nil, err
	}
	return sp, nil
}

func (r *SlimeRepository) GetAllSpecies(ctx context.Context) ([]models.SlimeSpecies, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, element, grade, description FROM slime_species ORDER BY id`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var species []models.SlimeSpecies
	for rows.Next() {
		var sp models.SlimeSpecies
		if err := rows.Scan(&sp.ID, &sp.Name, &sp.NameEN, &sp.Element, &sp.Grade, &sp.Description); err != nil {
			return nil, err
		}
		species = append(species, sp)
	}
	return species, nil
}

func (r *SlimeRepository) AddCodexEntry(ctx context.Context, userID string, speciesID int) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO codex_entries (user_id, species_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, speciesID,
	)
	return err
}

func (r *SlimeRepository) GetCodex(ctx context.Context, userID string) ([]int, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT species_id FROM codex_entries WHERE user_id = $1 ORDER BY species_id`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// ===== Recipe Discovery =====

func (r *SlimeRepository) AddRecipeDiscovery(ctx context.Context, userID string, recipeID int) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO recipe_discoveries (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, recipeID,
	)
	return err
}

func (r *SlimeRepository) GetDiscoveredRecipes(ctx context.Context, userID string) ([]int, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT recipe_id FROM recipe_discoveries WHERE user_id = $1 ORDER BY recipe_id`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *SlimeRepository) CountByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM slimes WHERE user_id = $1`,
		userID,
	).Scan(&count)
	return count, err
}
