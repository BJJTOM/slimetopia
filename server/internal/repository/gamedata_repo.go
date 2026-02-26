package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ===== Data Structures =====

type GameRecipe struct {
	ID         int    `json:"id"`
	InputA     int    `json:"input_a"`
	InputB     int    `json:"input_b"`
	Output     int    `json:"output"`
	OutputName string `json:"output_name"`
	Type       string `json:"type"`
	Hint       string `json:"hint"`
	Hidden     bool   `json:"hidden"`
	IsActive   bool   `json:"is_active"`
}

type GameShopItem struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	NameEN      string `json:"name_en"`
	Type        string `json:"type"`
	Category    string `json:"category"`
	CostGold    int64  `json:"cost_gold"`
	CostGems    int    `json:"cost_gems"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	Quantity    int    `json:"quantity"`
	EggType     string `json:"egg_type"`
	IsActive    bool   `json:"is_active"`
	SortOrder   int    `json:"sort_order"`
}

type GameMaterial struct {
	ID          int             `json:"id"`
	Name        string          `json:"name"`
	NameEN      string          `json:"name_en"`
	Type        string          `json:"type"`
	Rarity      string          `json:"rarity"`
	Icon        string          `json:"icon"`
	Description string          `json:"description"`
	Effects     json.RawMessage `json:"effects"`
	IsActive    bool            `json:"is_active"`
}

type GameExploration struct {
	ID                 int             `json:"id"`
	Name               string          `json:"name"`
	DurationMinutes    int             `json:"duration_minutes"`
	RecommendedElement string          `json:"recommended_element"`
	Rewards            json.RawMessage `json:"rewards"`
	UnlockType         string          `json:"unlock_type"`
	UnlockValue        int             `json:"unlock_value"`
	MaterialDrops      json.RawMessage `json:"material_drops"`
	IsActive           bool            `json:"is_active"`
	SortOrder          int             `json:"sort_order"`
}

type GameAchievement struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	RewardGold  int    `json:"reward_gold"`
	RewardGems  int    `json:"reward_gems"`
	IsActive    bool   `json:"is_active"`
	SortOrder   int    `json:"sort_order"`
}

type GameAccessory struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	NameEN     string `json:"name_en"`
	Slot       string `json:"slot"`
	Icon       string `json:"icon"`
	CostGold   int    `json:"cost_gold"`
	CostGems   int    `json:"cost_gems"`
	SvgOverlay string `json:"svg_overlay"`
	IsActive   bool   `json:"is_active"`
}

type GameMission struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Action      string `json:"action"`
	Target      int    `json:"target"`
	RewardGold  int64  `json:"reward_gold"`
	RewardGems  int    `json:"reward_gems"`
	IsActive    bool   `json:"is_active"`
}

type GameAttendanceReward struct {
	Day  int   `json:"day"`
	Gold int64 `json:"gold"`
	Gems int   `json:"gems"`
}

type GameEvolutionNode struct {
	SpeciesID int             `json:"species_id"`
	NodeID    int             `json:"node_id"`
	Name      string          `json:"name"`
	Type      string          `json:"type"`
	Buff      json.RawMessage `json:"buff"`
	Cost      int             `json:"cost"`
	Requires  []int           `json:"requires"`
}

type GameSeason struct {
	ID               int             `json:"id"`
	Name             string          `json:"name"`
	NameEN           string          `json:"name_en"`
	StartDate        string          `json:"start_date"`
	EndDate          string          `json:"end_date"`
	LimitedSpecies   []int           `json:"limited_species"`
	SpecialShopItems json.RawMessage `json:"special_shop_items"`
	BannerColor      string          `json:"banner_color"`
	Description      string          `json:"description"`
	Buffs            json.RawMessage `json:"buffs"`
	IsActive         bool            `json:"is_active"`
}

type GameSlimeSet struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	NameEN      string `json:"name_en"`
	Description string `json:"description"`
	SpeciesIDs  []int  `json:"species_ids"`
	BonusScore  int    `json:"bonus_score"`
	BuffType    string `json:"buff_type"`
	BuffValue   float64 `json:"buff_value"`
	BuffLabel   string `json:"buff_label"`
	IsActive    bool   `json:"is_active"`
}

type GameMutationRecipe struct {
	ID                 int    `json:"id"`
	RequiredElementA   string `json:"required_element_a"`
	RequiredElementB   string `json:"required_element_b"`
	RequiredMaterial   int    `json:"required_material"`
	ResultSpeciesID    int    `json:"result_species_id"`
	MinCollectionScore int    `json:"min_collection_score"`
	IsActive           bool   `json:"is_active"`
}

// ===== Repository =====

type GameDataRepository struct {
	pool *pgxpool.Pool
}

func NewGameDataRepository(pool *pgxpool.Pool) *GameDataRepository {
	return &GameDataRepository{pool: pool}
}

// ===== Recipes =====

func (r *GameDataRepository) GetAllRecipes(ctx context.Context) ([]GameRecipe, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, input_a, input_b, output, output_name, type, hint, hidden, is_active
		 FROM game_recipes WHERE is_active = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameRecipe, error) {
		var rec GameRecipe
		err := row.Scan(&rec.ID, &rec.InputA, &rec.InputB, &rec.Output, &rec.OutputName, &rec.Type, &rec.Hint, &rec.Hidden, &rec.IsActive)
		return rec, err
	})
}

func (r *GameDataRepository) GetAllRecipesIncludeInactive(ctx context.Context) ([]GameRecipe, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, input_a, input_b, output, output_name, type, hint, hidden, is_active
		 FROM game_recipes ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameRecipe, error) {
		var rec GameRecipe
		err := row.Scan(&rec.ID, &rec.InputA, &rec.InputB, &rec.Output, &rec.OutputName, &rec.Type, &rec.Hint, &rec.Hidden, &rec.IsActive)
		return rec, err
	})
}

func (r *GameDataRepository) FindRecipe(ctx context.Context, speciesA, speciesB int) (*GameRecipe, error) {
	var rec GameRecipe
	err := r.pool.QueryRow(ctx,
		`SELECT id, input_a, input_b, output, output_name, type, hint, hidden, is_active
		 FROM game_recipes
		 WHERE is_active = true AND ((input_a = $1 AND input_b = $2) OR (input_a = $2 AND input_b = $1))
		 LIMIT 1`, speciesA, speciesB).Scan(
		&rec.ID, &rec.InputA, &rec.InputB, &rec.Output, &rec.OutputName, &rec.Type, &rec.Hint, &rec.Hidden, &rec.IsActive)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *GameDataRepository) GetRecipeByID(ctx context.Context, id int) (*GameRecipe, error) {
	var rec GameRecipe
	err := r.pool.QueryRow(ctx,
		`SELECT id, input_a, input_b, output, output_name, type, hint, hidden, is_active
		 FROM game_recipes WHERE id = $1`, id).Scan(
		&rec.ID, &rec.InputA, &rec.InputB, &rec.Output, &rec.OutputName, &rec.Type, &rec.Hint, &rec.Hidden, &rec.IsActive)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *GameDataRepository) CreateRecipe(ctx context.Context, rec *GameRecipe) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_recipes (id, input_a, input_b, output, output_name, type, hint, hidden, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		rec.ID, rec.InputA, rec.InputB, rec.Output, rec.OutputName, rec.Type, rec.Hint, rec.Hidden, rec.IsActive)
	return err
}

func (r *GameDataRepository) UpdateRecipe(ctx context.Context, rec *GameRecipe) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_recipes SET input_a=$2, input_b=$3, output=$4, output_name=$5, type=$6, hint=$7, hidden=$8, is_active=$9, updated_at=NOW()
		 WHERE id=$1`,
		rec.ID, rec.InputA, rec.InputB, rec.Output, rec.OutputName, rec.Type, rec.Hint, rec.Hidden, rec.IsActive)
	return err
}

func (r *GameDataRepository) DeleteRecipe(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_recipes WHERE id=$1`, id)
	return err
}

// ===== Shop Items =====

func (r *GameDataRepository) GetAllShopItems(ctx context.Context) ([]GameShopItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, type, category, cost_gold, cost_gems, icon, description, quantity, egg_type, is_active, sort_order
		 FROM game_shop_items WHERE is_active = true ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameShopItem, error) {
		var item GameShopItem
		err := row.Scan(&item.ID, &item.Name, &item.NameEN, &item.Type, &item.Category, &item.CostGold, &item.CostGems, &item.Icon, &item.Description, &item.Quantity, &item.EggType, &item.IsActive, &item.SortOrder)
		return item, err
	})
}

func (r *GameDataRepository) GetAllShopItemsIncludeInactive(ctx context.Context) ([]GameShopItem, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, type, category, cost_gold, cost_gems, icon, description, quantity, egg_type, is_active, sort_order
		 FROM game_shop_items ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameShopItem, error) {
		var item GameShopItem
		err := row.Scan(&item.ID, &item.Name, &item.NameEN, &item.Type, &item.Category, &item.CostGold, &item.CostGems, &item.Icon, &item.Description, &item.Quantity, &item.EggType, &item.IsActive, &item.SortOrder)
		return item, err
	})
}

func (r *GameDataRepository) GetShopItemByID(ctx context.Context, id int) (*GameShopItem, error) {
	var item GameShopItem
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, name_en, type, category, cost_gold, cost_gems, icon, description, quantity, egg_type, is_active, sort_order
		 FROM game_shop_items WHERE id = $1`, id).Scan(
		&item.ID, &item.Name, &item.NameEN, &item.Type, &item.Category, &item.CostGold, &item.CostGems, &item.Icon, &item.Description, &item.Quantity, &item.EggType, &item.IsActive, &item.SortOrder)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *GameDataRepository) CreateShopItem(ctx context.Context, item *GameShopItem) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_shop_items (id, name, name_en, type, category, cost_gold, cost_gems, icon, description, quantity, egg_type, is_active, sort_order)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		item.ID, item.Name, item.NameEN, item.Type, item.Category, item.CostGold, item.CostGems, item.Icon, item.Description, item.Quantity, item.EggType, item.IsActive, item.SortOrder)
	return err
}

func (r *GameDataRepository) UpdateShopItem(ctx context.Context, item *GameShopItem) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_shop_items SET name=$2, name_en=$3, type=$4, category=$5, cost_gold=$6, cost_gems=$7, icon=$8, description=$9, quantity=$10, egg_type=$11, is_active=$12, sort_order=$13
		 WHERE id=$1`,
		item.ID, item.Name, item.NameEN, item.Type, item.Category, item.CostGold, item.CostGems, item.Icon, item.Description, item.Quantity, item.EggType, item.IsActive, item.SortOrder)
	return err
}

func (r *GameDataRepository) DeleteShopItem(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_shop_items WHERE id=$1`, id)
	return err
}

// ===== Materials =====

func (r *GameDataRepository) GetAllMaterials(ctx context.Context) ([]GameMaterial, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, type, rarity, icon, description, effects, is_active
		 FROM game_materials WHERE is_active = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameMaterial, error) {
		var m GameMaterial
		err := row.Scan(&m.ID, &m.Name, &m.NameEN, &m.Type, &m.Rarity, &m.Icon, &m.Description, &m.Effects, &m.IsActive)
		return m, err
	})
}

func (r *GameDataRepository) GetAllMaterialsIncludeInactive(ctx context.Context) ([]GameMaterial, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, type, rarity, icon, description, effects, is_active
		 FROM game_materials ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameMaterial, error) {
		var m GameMaterial
		err := row.Scan(&m.ID, &m.Name, &m.NameEN, &m.Type, &m.Rarity, &m.Icon, &m.Description, &m.Effects, &m.IsActive)
		return m, err
	})
}

func (r *GameDataRepository) GetMaterialByID(ctx context.Context, id int) (*GameMaterial, error) {
	var m GameMaterial
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, name_en, type, rarity, icon, description, effects, is_active
		 FROM game_materials WHERE id = $1`, id).Scan(
		&m.ID, &m.Name, &m.NameEN, &m.Type, &m.Rarity, &m.Icon, &m.Description, &m.Effects, &m.IsActive)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *GameDataRepository) CreateMaterial(ctx context.Context, m *GameMaterial) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_materials (id, name, name_en, type, rarity, icon, description, effects, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		m.ID, m.Name, m.NameEN, m.Type, m.Rarity, m.Icon, m.Description, m.Effects, m.IsActive)
	return err
}

func (r *GameDataRepository) UpdateMaterial(ctx context.Context, m *GameMaterial) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_materials SET name=$2, name_en=$3, type=$4, rarity=$5, icon=$6, description=$7, effects=$8, is_active=$9
		 WHERE id=$1`,
		m.ID, m.Name, m.NameEN, m.Type, m.Rarity, m.Icon, m.Description, m.Effects, m.IsActive)
	return err
}

func (r *GameDataRepository) DeleteMaterial(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_materials WHERE id=$1`, id)
	return err
}

// ===== Explorations =====

func (r *GameDataRepository) GetAllDestinations(ctx context.Context) ([]GameExploration, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, duration_minutes, recommended_element, rewards, unlock_type, unlock_value, material_drops, is_active, sort_order
		 FROM game_explorations WHERE is_active = true ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameExploration, error) {
		var e GameExploration
		err := row.Scan(&e.ID, &e.Name, &e.DurationMinutes, &e.RecommendedElement, &e.Rewards, &e.UnlockType, &e.UnlockValue, &e.MaterialDrops, &e.IsActive, &e.SortOrder)
		return e, err
	})
}

func (r *GameDataRepository) GetAllDestinationsIncludeInactive(ctx context.Context) ([]GameExploration, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, duration_minutes, recommended_element, rewards, unlock_type, unlock_value, material_drops, is_active, sort_order
		 FROM game_explorations ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameExploration, error) {
		var e GameExploration
		err := row.Scan(&e.ID, &e.Name, &e.DurationMinutes, &e.RecommendedElement, &e.Rewards, &e.UnlockType, &e.UnlockValue, &e.MaterialDrops, &e.IsActive, &e.SortOrder)
		return e, err
	})
}

func (r *GameDataRepository) GetDestinationByID(ctx context.Context, id int) (*GameExploration, error) {
	var e GameExploration
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, duration_minutes, recommended_element, rewards, unlock_type, unlock_value, material_drops, is_active, sort_order
		 FROM game_explorations WHERE id = $1`, id).Scan(
		&e.ID, &e.Name, &e.DurationMinutes, &e.RecommendedElement, &e.Rewards, &e.UnlockType, &e.UnlockValue, &e.MaterialDrops, &e.IsActive, &e.SortOrder)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *GameDataRepository) CreateExploration(ctx context.Context, e *GameExploration) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_explorations (id, name, duration_minutes, recommended_element, rewards, unlock_type, unlock_value, material_drops, is_active, sort_order)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		e.ID, e.Name, e.DurationMinutes, e.RecommendedElement, e.Rewards, e.UnlockType, e.UnlockValue, e.MaterialDrops, e.IsActive, e.SortOrder)
	return err
}

func (r *GameDataRepository) UpdateExploration(ctx context.Context, e *GameExploration) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_explorations SET name=$2, duration_minutes=$3, recommended_element=$4, rewards=$5, unlock_type=$6, unlock_value=$7, material_drops=$8, is_active=$9, sort_order=$10
		 WHERE id=$1`,
		e.ID, e.Name, e.DurationMinutes, e.RecommendedElement, e.Rewards, e.UnlockType, e.UnlockValue, e.MaterialDrops, e.IsActive, e.SortOrder)
	return err
}

func (r *GameDataRepository) DeleteExploration(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_explorations WHERE id=$1`, id)
	return err
}

// ===== Achievements =====

func (r *GameDataRepository) GetAllAchievements(ctx context.Context) ([]GameAchievement, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT key, name, description, icon, reward_gold, reward_gems, is_active, sort_order
		 FROM game_achievements WHERE is_active = true ORDER BY sort_order`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameAchievement, error) {
		var a GameAchievement
		err := row.Scan(&a.Key, &a.Name, &a.Description, &a.Icon, &a.RewardGold, &a.RewardGems, &a.IsActive, &a.SortOrder)
		return a, err
	})
}

func (r *GameDataRepository) GetAllAchievementsIncludeInactive(ctx context.Context) ([]GameAchievement, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT key, name, description, icon, reward_gold, reward_gems, is_active, sort_order
		 FROM game_achievements ORDER BY sort_order`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameAchievement, error) {
		var a GameAchievement
		err := row.Scan(&a.Key, &a.Name, &a.Description, &a.Icon, &a.RewardGold, &a.RewardGems, &a.IsActive, &a.SortOrder)
		return a, err
	})
}

func (r *GameDataRepository) CreateAchievement(ctx context.Context, a *GameAchievement) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_achievements (key, name, description, icon, reward_gold, reward_gems, is_active, sort_order)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		a.Key, a.Name, a.Description, a.Icon, a.RewardGold, a.RewardGems, a.IsActive, a.SortOrder)
	return err
}

func (r *GameDataRepository) UpdateAchievement(ctx context.Context, a *GameAchievement) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_achievements SET name=$2, description=$3, icon=$4, reward_gold=$5, reward_gems=$6, is_active=$7, sort_order=$8
		 WHERE key=$1`,
		a.Key, a.Name, a.Description, a.Icon, a.RewardGold, a.RewardGems, a.IsActive, a.SortOrder)
	return err
}

func (r *GameDataRepository) DeleteAchievement(ctx context.Context, key string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_achievements WHERE key=$1`, key)
	return err
}

// ===== Accessories =====

func (r *GameDataRepository) GetAllAccessories(ctx context.Context) ([]GameAccessory, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, slot, icon, cost_gold, cost_gems, svg_overlay, is_active
		 FROM game_accessories WHERE is_active = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameAccessory, error) {
		var a GameAccessory
		err := row.Scan(&a.ID, &a.Name, &a.NameEN, &a.Slot, &a.Icon, &a.CostGold, &a.CostGems, &a.SvgOverlay, &a.IsActive)
		return a, err
	})
}

func (r *GameDataRepository) GetAllAccessoriesIncludeInactive(ctx context.Context) ([]GameAccessory, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, slot, icon, cost_gold, cost_gems, svg_overlay, is_active
		 FROM game_accessories ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameAccessory, error) {
		var a GameAccessory
		err := row.Scan(&a.ID, &a.Name, &a.NameEN, &a.Slot, &a.Icon, &a.CostGold, &a.CostGems, &a.SvgOverlay, &a.IsActive)
		return a, err
	})
}

func (r *GameDataRepository) GetAccessoryByID(ctx context.Context, id int) (*GameAccessory, error) {
	var a GameAccessory
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, name_en, slot, icon, cost_gold, cost_gems, svg_overlay, is_active
		 FROM game_accessories WHERE id = $1`, id).Scan(
		&a.ID, &a.Name, &a.NameEN, &a.Slot, &a.Icon, &a.CostGold, &a.CostGems, &a.SvgOverlay, &a.IsActive)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *GameDataRepository) CreateAccessory(ctx context.Context, a *GameAccessory) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_accessories (id, name, name_en, slot, icon, cost_gold, cost_gems, svg_overlay, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		a.ID, a.Name, a.NameEN, a.Slot, a.Icon, a.CostGold, a.CostGems, a.SvgOverlay, a.IsActive)
	return err
}

func (r *GameDataRepository) UpdateAccessory(ctx context.Context, a *GameAccessory) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_accessories SET name=$2, name_en=$3, slot=$4, icon=$5, cost_gold=$6, cost_gems=$7, svg_overlay=$8, is_active=$9
		 WHERE id=$1`,
		a.ID, a.Name, a.NameEN, a.Slot, a.Icon, a.CostGold, a.CostGems, a.SvgOverlay, a.IsActive)
	return err
}

func (r *GameDataRepository) DeleteAccessory(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_accessories WHERE id=$1`, id)
	return err
}

// ===== Missions =====

func (r *GameDataRepository) GetAllMissions(ctx context.Context) ([]GameMission, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, description, action, target, reward_gold, reward_gems, is_active
		 FROM game_missions WHERE is_active = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameMission, error) {
		var m GameMission
		err := row.Scan(&m.ID, &m.Name, &m.Description, &m.Action, &m.Target, &m.RewardGold, &m.RewardGems, &m.IsActive)
		return m, err
	})
}

func (r *GameDataRepository) GetAllMissionsIncludeInactive(ctx context.Context) ([]GameMission, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, description, action, target, reward_gold, reward_gems, is_active
		 FROM game_missions ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameMission, error) {
		var m GameMission
		err := row.Scan(&m.ID, &m.Name, &m.Description, &m.Action, &m.Target, &m.RewardGold, &m.RewardGems, &m.IsActive)
		return m, err
	})
}

func (r *GameDataRepository) CreateMission(ctx context.Context, m *GameMission) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_missions (id, name, description, action, target, reward_gold, reward_gems, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		m.ID, m.Name, m.Description, m.Action, m.Target, m.RewardGold, m.RewardGems, m.IsActive)
	return err
}

func (r *GameDataRepository) UpdateMission(ctx context.Context, m *GameMission) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_missions SET name=$2, description=$3, action=$4, target=$5, reward_gold=$6, reward_gems=$7, is_active=$8
		 WHERE id=$1`,
		m.ID, m.Name, m.Description, m.Action, m.Target, m.RewardGold, m.RewardGems, m.IsActive)
	return err
}

func (r *GameDataRepository) DeleteMission(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_missions WHERE id=$1`, id)
	return err
}

// ===== Attendance Rewards =====

func (r *GameDataRepository) GetAttendanceRewards(ctx context.Context) ([]GameAttendanceReward, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT day, gold, gems FROM game_attendance_rewards ORDER BY day`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameAttendanceReward, error) {
		var a GameAttendanceReward
		err := row.Scan(&a.Day, &a.Gold, &a.Gems)
		return a, err
	})
}

func (r *GameDataRepository) UpsertAttendanceReward(ctx context.Context, a *GameAttendanceReward) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_attendance_rewards (day, gold, gems) VALUES ($1,$2,$3)
		 ON CONFLICT (day) DO UPDATE SET gold=$2, gems=$3`,
		a.Day, a.Gold, a.Gems)
	return err
}

// ===== Evolution Trees =====

func (r *GameDataRepository) GetEvolutionTree(ctx context.Context, speciesID int) ([]GameEvolutionNode, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT species_id, node_id, name, type, buff, cost, requires
		 FROM game_evolution_trees WHERE species_id = $1 ORDER BY node_id`, speciesID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameEvolutionNode, error) {
		var n GameEvolutionNode
		err := row.Scan(&n.SpeciesID, &n.NodeID, &n.Name, &n.Type, &n.Buff, &n.Cost, &n.Requires)
		return n, err
	})
}

func (r *GameDataRepository) GetAllEvolutionSpecies(ctx context.Context) ([]int, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT species_id FROM game_evolution_trees ORDER BY species_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (int, error) {
		var id int
		err := row.Scan(&id)
		return id, err
	})
}

func (r *GameDataRepository) UpsertEvolutionNode(ctx context.Context, n *GameEvolutionNode) error {
	reqStr := intSliceToPostgresArray(n.Requires)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_evolution_trees (species_id, node_id, name, type, buff, cost, requires)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 ON CONFLICT (species_id, node_id) DO UPDATE SET name=$3, type=$4, buff=$5, cost=$6, requires=$7`,
		n.SpeciesID, n.NodeID, n.Name, n.Type, n.Buff, n.Cost, reqStr)
	return err
}

func (r *GameDataRepository) DeleteEvolutionNode(ctx context.Context, speciesID, nodeID int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_evolution_trees WHERE species_id=$1 AND node_id=$2`, speciesID, nodeID)
	return err
}

// ===== Seasons =====

func (r *GameDataRepository) GetAllSeasons(ctx context.Context) ([]GameSeason, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, start_date::text, end_date::text, limited_species, special_shop_items, banner_color, description, buffs, is_active
		 FROM game_seasons ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameSeason, error) {
		var s GameSeason
		err := row.Scan(&s.ID, &s.Name, &s.NameEN, &s.StartDate, &s.EndDate, &s.LimitedSpecies, &s.SpecialShopItems, &s.BannerColor, &s.Description, &s.Buffs, &s.IsActive)
		return s, err
	})
}

func (r *GameDataRepository) GetActiveSeason(ctx context.Context) (*GameSeason, error) {
	var s GameSeason
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, name_en, start_date::text, end_date::text, limited_species, special_shop_items, banner_color, description, buffs, is_active
		 FROM game_seasons
		 WHERE is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
		 LIMIT 1`).Scan(
		&s.ID, &s.Name, &s.NameEN, &s.StartDate, &s.EndDate, &s.LimitedSpecies, &s.SpecialShopItems, &s.BannerColor, &s.Description, &s.Buffs, &s.IsActive)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *GameDataRepository) GetSeasonByID(ctx context.Context, id int) (*GameSeason, error) {
	var s GameSeason
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, name_en, start_date::text, end_date::text, limited_species, special_shop_items, banner_color, description, buffs, is_active
		 FROM game_seasons WHERE id = $1`, id).Scan(
		&s.ID, &s.Name, &s.NameEN, &s.StartDate, &s.EndDate, &s.LimitedSpecies, &s.SpecialShopItems, &s.BannerColor, &s.Description, &s.Buffs, &s.IsActive)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *GameDataRepository) CreateSeason(ctx context.Context, s *GameSeason) error {
	lsStr := intSliceToPostgresArray(s.LimitedSpecies)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_seasons (id, name, name_en, start_date, end_date, limited_species, special_shop_items, banner_color, description, buffs, is_active)
		 VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,$10,$11)`,
		s.ID, s.Name, s.NameEN, s.StartDate, s.EndDate, lsStr, s.SpecialShopItems, s.BannerColor, s.Description, s.Buffs, s.IsActive)
	return err
}

func (r *GameDataRepository) UpdateSeason(ctx context.Context, s *GameSeason) error {
	lsStr := intSliceToPostgresArray(s.LimitedSpecies)
	_, err := r.pool.Exec(ctx,
		`UPDATE game_seasons SET name=$2, name_en=$3, start_date=$4::date, end_date=$5::date, limited_species=$6, special_shop_items=$7, banner_color=$8, description=$9, buffs=$10, is_active=$11
		 WHERE id=$1`,
		s.ID, s.Name, s.NameEN, s.StartDate, s.EndDate, lsStr, s.SpecialShopItems, s.BannerColor, s.Description, s.Buffs, s.IsActive)
	return err
}

func (r *GameDataRepository) DeleteSeason(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_seasons WHERE id=$1`, id)
	return err
}

// ===== Slime Sets =====

func (r *GameDataRepository) GetAllSets(ctx context.Context) ([]GameSlimeSet, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, description, species_ids, bonus_score, buff_type, buff_value, buff_label, is_active
		 FROM game_slime_sets WHERE is_active = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameSlimeSet, error) {
		var s GameSlimeSet
		err := row.Scan(&s.ID, &s.Name, &s.NameEN, &s.Description, &s.SpeciesIDs, &s.BonusScore, &s.BuffType, &s.BuffValue, &s.BuffLabel, &s.IsActive)
		return s, err
	})
}

func (r *GameDataRepository) GetAllSetsIncludeInactive(ctx context.Context) ([]GameSlimeSet, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, name_en, description, species_ids, bonus_score, buff_type, buff_value, buff_label, is_active
		 FROM game_slime_sets ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameSlimeSet, error) {
		var s GameSlimeSet
		err := row.Scan(&s.ID, &s.Name, &s.NameEN, &s.Description, &s.SpeciesIDs, &s.BonusScore, &s.BuffType, &s.BuffValue, &s.BuffLabel, &s.IsActive)
		return s, err
	})
}

func (r *GameDataRepository) CreateSet(ctx context.Context, s *GameSlimeSet) error {
	sids := intSliceToPostgresArray(s.SpeciesIDs)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_slime_sets (id, name, name_en, description, species_ids, bonus_score, buff_type, buff_value, buff_label, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		s.ID, s.Name, s.NameEN, s.Description, sids, s.BonusScore, s.BuffType, s.BuffValue, s.BuffLabel, s.IsActive)
	return err
}

func (r *GameDataRepository) UpdateSet(ctx context.Context, s *GameSlimeSet) error {
	sids := intSliceToPostgresArray(s.SpeciesIDs)
	_, err := r.pool.Exec(ctx,
		`UPDATE game_slime_sets SET name=$2, name_en=$3, description=$4, species_ids=$5, bonus_score=$6, buff_type=$7, buff_value=$8, buff_label=$9, is_active=$10
		 WHERE id=$1`,
		s.ID, s.Name, s.NameEN, s.Description, sids, s.BonusScore, s.BuffType, s.BuffValue, s.BuffLabel, s.IsActive)
	return err
}

func (r *GameDataRepository) DeleteSet(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_slime_sets WHERE id=$1`, id)
	return err
}

// ===== Mutation Recipes =====

func (r *GameDataRepository) GetAllMutationRecipes(ctx context.Context) ([]GameMutationRecipe, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, required_element_a, required_element_b, required_material, result_species_id, min_collection_score, is_active
		 FROM game_mutation_recipes WHERE is_active = true ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameMutationRecipe, error) {
		var m GameMutationRecipe
		err := row.Scan(&m.ID, &m.RequiredElementA, &m.RequiredElementB, &m.RequiredMaterial, &m.ResultSpeciesID, &m.MinCollectionScore, &m.IsActive)
		return m, err
	})
}

func (r *GameDataRepository) GetAllMutationRecipesIncludeInactive(ctx context.Context) ([]GameMutationRecipe, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, required_element_a, required_element_b, required_material, result_species_id, min_collection_score, is_active
		 FROM game_mutation_recipes ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (GameMutationRecipe, error) {
		var m GameMutationRecipe
		err := row.Scan(&m.ID, &m.RequiredElementA, &m.RequiredElementB, &m.RequiredMaterial, &m.ResultSpeciesID, &m.MinCollectionScore, &m.IsActive)
		return m, err
	})
}

func (r *GameDataRepository) CreateMutationRecipe(ctx context.Context, m *GameMutationRecipe) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO game_mutation_recipes (required_element_a, required_element_b, required_material, result_species_id, min_collection_score, is_active)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		m.RequiredElementA, m.RequiredElementB, m.RequiredMaterial, m.ResultSpeciesID, m.MinCollectionScore, m.IsActive)
	return err
}

func (r *GameDataRepository) UpdateMutationRecipe(ctx context.Context, m *GameMutationRecipe) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE game_mutation_recipes SET required_element_a=$2, required_element_b=$3, required_material=$4, result_species_id=$5, min_collection_score=$6, is_active=$7
		 WHERE id=$1`,
		m.ID, m.RequiredElementA, m.RequiredElementB, m.RequiredMaterial, m.ResultSpeciesID, m.MinCollectionScore, m.IsActive)
	return err
}

func (r *GameDataRepository) DeleteMutationRecipe(ctx context.Context, id int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM game_mutation_recipes WHERE id=$1`, id)
	return err
}

// ===== Helpers =====

func intSliceToPostgresArray(ids []int) string {
	if len(ids) == 0 {
		return "{}"
	}
	parts := make([]string, len(ids))
	for i, id := range ids {
		parts[i] = strconv.Itoa(id)
	}
	return fmt.Sprintf("{%s}", strings.Join(parts, ","))
}
