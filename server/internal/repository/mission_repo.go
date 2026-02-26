package repository

import (
	"context"
	"encoding/json"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type MissionDef struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Action      string `json:"action"`
	Target      int    `json:"target"`
	Reward      struct {
		Gold int64 `json:"gold"`
		Gems int   `json:"gems"`
	} `json:"reward"`
}

type AttendanceReward struct {
	Day  int   `json:"day"`
	Gold int64 `json:"gold"`
	Gems int   `json:"gems"`
}

type DailyMission struct {
	ID        string    `json:"id"`
	MissionID int       `json:"mission_id"`
	Name      string    `json:"name"`
	Desc      string    `json:"description"`
	Action    string    `json:"action"`
	Progress  int       `json:"progress"`
	Target    int       `json:"target"`
	Completed bool      `json:"completed"`
	Claimed   bool      `json:"claimed"`
	Gold      int64     `json:"reward_gold"`
	Gems      int       `json:"reward_gems"`
	Date      time.Time `json:"date"`
}

type AttendanceInfo struct {
	DayNumber     int  `json:"day_number"`
	RewardClaimed bool `json:"reward_claimed"`
	TodayChecked  bool `json:"today_checked"`
}

type MissionRepository struct {
	pool               *pgxpool.Pool
	missionDefs        []MissionDef
	attendanceRewards  []AttendanceReward
}

func NewMissionRepository(pool *pgxpool.Pool) *MissionRepository {
	r := &MissionRepository{pool: pool}
	r.loadMissions()
	return r
}

func (r *MissionRepository) loadMissions() {
	paths := []string{
		"../shared/missions.json",
		"shared/missions.json",
		"/app/shared/missions.json",
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var wrapper struct {
			Missions          []MissionDef       `json:"missions"`
			AttendanceRewards []AttendanceReward  `json:"attendance_rewards"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			log.Error().Err(err).Msg("Failed to parse missions.json")
			continue
		}
		r.missionDefs = wrapper.Missions
		r.attendanceRewards = wrapper.AttendanceRewards
		log.Info().Int("missions", len(r.missionDefs)).Int("attendance", len(r.attendanceRewards)).Msg("Loaded mission data")
		return
	}
	log.Warn().Msg("No missions.json found")
}

// GetOrCreateDaily returns today's daily missions for a user, creating them if needed.
func (r *MissionRepository) GetOrCreateDaily(ctx context.Context, userID string) ([]DailyMission, error) {
	today := time.Now().Format("2006-01-02")

	// Check if missions exist for today
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM daily_missions WHERE user_id = $1 AND date = $2`,
		userID, today,
	).Scan(&count)
	if err != nil {
		return nil, err
	}

	if count == 0 {
		// Create 4 random missions from the 6 available
		if len(r.missionDefs) == 0 {
			return nil, nil
		}
		perm := rand.Perm(len(r.missionDefs))
		n := 4
		if n > len(r.missionDefs) {
			n = len(r.missionDefs)
		}
		for i := 0; i < n; i++ {
			m := r.missionDefs[perm[i]]
			_, err := r.pool.Exec(ctx,
				`INSERT INTO daily_missions (user_id, mission_id, target, date) VALUES ($1, $2, $3, $4)
				 ON CONFLICT DO NOTHING`,
				userID, m.ID, m.Target, today,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	// Fetch today's missions
	rows, err := r.pool.Query(ctx,
		`SELECT id, mission_id, progress, target, completed, claimed, date FROM daily_missions
		 WHERE user_id = $1 AND date = $2 ORDER BY mission_id`,
		userID, today,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var missions []DailyMission
	for rows.Next() {
		var dm DailyMission
		if err := rows.Scan(&dm.ID, &dm.MissionID, &dm.Progress, &dm.Target, &dm.Completed, &dm.Claimed, &dm.Date); err != nil {
			return nil, err
		}
		// Enrich with definition data
		for _, def := range r.missionDefs {
			if def.ID == dm.MissionID {
				dm.Name = def.Name
				dm.Desc = def.Description
				dm.Action = def.Action
				dm.Gold = def.Reward.Gold
				dm.Gems = def.Reward.Gems
				break
			}
		}
		missions = append(missions, dm)
	}
	return missions, nil
}

// IncrementProgress increments progress for missions matching the action.
func (r *MissionRepository) IncrementProgress(ctx context.Context, userID, action string) {
	today := time.Now().Format("2006-01-02")

	// Find mission IDs matching this action
	var missionIDs []int
	for _, def := range r.missionDefs {
		if def.Action == action {
			missionIDs = append(missionIDs, def.ID)
		}
	}
	if len(missionIDs) == 0 {
		return
	}

	for _, mid := range missionIDs {
		// Increment progress and auto-complete
		r.pool.Exec(ctx,
			`UPDATE daily_missions
			 SET progress = LEAST(progress + 1, target),
			     completed = (LEAST(progress + 1, target) >= target)
			 WHERE user_id = $1 AND mission_id = $2 AND date = $3 AND NOT claimed`,
			userID, mid, today,
		)
	}
}

// ClaimReward claims a daily mission reward.
func (r *MissionRepository) ClaimReward(ctx context.Context, userID, missionDBID string) (gold int64, gems int, err error) {
	var missionID int
	var completed, claimed bool
	err = r.pool.QueryRow(ctx,
		`SELECT mission_id, completed, claimed FROM daily_missions WHERE id = $1 AND user_id = $2`,
		missionDBID, userID,
	).Scan(&missionID, &completed, &claimed)
	if err != nil {
		return 0, 0, err
	}
	if !completed {
		return 0, 0, ErrNotCompleted
	}
	if claimed {
		return 0, 0, ErrAlreadyClaimed
	}

	// Find reward
	for _, def := range r.missionDefs {
		if def.ID == missionID {
			gold = def.Reward.Gold
			gems = def.Reward.Gems
			break
		}
	}

	_, err = r.pool.Exec(ctx,
		`UPDATE daily_missions SET claimed = true WHERE id = $1`,
		missionDBID,
	)
	return gold, gems, err
}

// CheckAttendance gets attendance info for user.
func (r *MissionRepository) CheckAttendance(ctx context.Context, userID string) (*AttendanceInfo, error) {
	today := time.Now().Format("2006-01-02")

	var dayNum int
	var claimed bool
	err := r.pool.QueryRow(ctx,
		`SELECT day_number, reward_claimed FROM attendance WHERE user_id = $1 AND date = $2`,
		userID, today,
	).Scan(&dayNum, &claimed)
	if err != nil {
		// Not checked in today — find consecutive streak
		yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		var prevDay int
		err2 := r.pool.QueryRow(ctx,
			`SELECT day_number FROM attendance WHERE user_id = $1 AND date = $2`,
			userID, yesterday,
		).Scan(&prevDay)
		if err2 != nil {
			prevDay = 0
		}
		newDay := (prevDay % 28) + 1

		return &AttendanceInfo{
			DayNumber:     newDay,
			RewardClaimed: false,
			TodayChecked:  false,
		}, nil
	}

	return &AttendanceInfo{
		DayNumber:     dayNum,
		RewardClaimed: claimed,
		TodayChecked:  true,
	}, nil
}

// ClaimAttendance checks in and claims attendance reward.
func (r *MissionRepository) ClaimAttendance(ctx context.Context, userID string) (gold int64, gems int, dayNum int, err error) {
	info, err := r.CheckAttendance(ctx, userID)
	if err != nil {
		return 0, 0, 0, err
	}
	if info.RewardClaimed {
		return 0, 0, info.DayNumber, ErrAlreadyClaimed
	}

	today := time.Now().Format("2006-01-02")
	dayNum = info.DayNumber

	if !info.TodayChecked {
		_, err = r.pool.Exec(ctx,
			`INSERT INTO attendance (user_id, date, day_number, reward_claimed)
			 VALUES ($1, $2, $3, true)
			 ON CONFLICT (user_id, date) DO UPDATE SET reward_claimed = true`,
			userID, today, dayNum,
		)
	} else {
		_, err = r.pool.Exec(ctx,
			`UPDATE attendance SET reward_claimed = true WHERE user_id = $1 AND date = $2`,
			userID, today,
		)
	}
	if err != nil {
		return 0, 0, dayNum, err
	}

	// Find reward for this day
	for _, ar := range r.attendanceRewards {
		if ar.Day == dayNum {
			gold = ar.Gold
			gems = ar.Gems
			break
		}
	}

	return gold, gems, dayNum, nil
}

// GetAttendanceRewards returns the attendance reward schedule.
func (r *MissionRepository) GetAttendanceRewards() []AttendanceReward {
	return r.attendanceRewards
}

var (
	ErrNotCompleted  = ErrInsufficientFunds // reuse: mission not completed
	ErrAlreadyClaimed = ErrSlimeNotFound     // reuse: already claimed
)
