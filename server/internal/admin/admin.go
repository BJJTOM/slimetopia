package admin

import (
	"encoding/json"
	"fmt"
	"html/template"
	"math"
	"path/filepath"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"github.com/slimetopia/server/internal/repository"
)

type AdminHandler struct {
	pool         *pgxpool.Pool
	jwtSecret    []byte
	templates    map[string]*template.Template
	gameDataRepo *repository.GameDataRepository
}

func NewAdminHandler(pool *pgxpool.Pool, jwtSecret string, gameDataRepo *repository.GameDataRepository) *AdminHandler {
	h := &AdminHandler{pool: pool, jwtSecret: []byte(jwtSecret), gameDataRepo: gameDataRepo}
	h.loadTemplates()
	return h
}

func adminFuncMap() template.FuncMap {
	return template.FuncMap{
		"add": func(a, b int) int { return a + b },
		"sub": func(a, b int) int { return a - b },
		"percentage": func(current, max int64) string {
			if max == 0 {
				return "0"
			}
			return fmt.Sprintf("%d", current*100/max)
		},
		"mul100": func(f float64) string {
			return fmt.Sprintf("%.0f", f*100)
		},
		"truncate": func(s string, maxLen int) string {
			runes := []rune(s)
			if len(runes) <= maxLen {
				return s
			}
			return string(runes[:maxLen]) + "..."
		},
		"abs": func(n int64) int64 {
			return int64(math.Abs(float64(n)))
		},
		"jsonPretty": func(v interface{}) string {
			var data []byte
			switch val := v.(type) {
			case string:
				data = []byte(val)
			case json.RawMessage:
				data = []byte(val)
			case []byte:
				data = val
			default:
				b, err := json.Marshal(val)
				if err != nil {
					return fmt.Sprintf("%v", val)
				}
				data = b
			}
			var parsed interface{}
			if err := json.Unmarshal(data, &parsed); err != nil {
				return string(data)
			}
			b, err := json.MarshalIndent(parsed, "", "  ")
			if err != nil {
				return string(data)
			}
			return string(b)
		},
		"formatDate": func(t time.Time) string {
			return t.Format("01/02 15:04")
		},
		"jsonStr": func(v interface{}) string {
			switch val := v.(type) {
			case json.RawMessage:
				if val == nil {
					return "{}"
				}
				return string(val)
			case []byte:
				if val == nil {
					return "{}"
				}
				return string(val)
			case string:
				return val
			default:
				return "{}"
			}
		},
		"intSliceStr": func(ids []int) string {
			if len(ids) == 0 {
				return ""
			}
			s := ""
			for i, id := range ids {
				if i > 0 {
					s += ","
				}
				s += fmt.Sprintf("%d", id)
			}
			return s
		},
	}
}

func (h *AdminHandler) loadTemplates() {
	// Find templates directory relative to this file
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	templatesDir := filepath.Join(dir, "templates")

	// Try to find layout.html
	layoutPath := filepath.Join(templatesDir, "layout.html")
	pages, err := filepath.Glob(filepath.Join(templatesDir, "*.html"))
	if err != nil || len(pages) == 0 {
		log.Warn().Str("dir", templatesDir).Msg("Failed to find templates, trying fallback paths")
		fallbacks := []string{
			"server/internal/admin/templates",
			"internal/admin/templates",
			"../server/internal/admin/templates",
		}
		for _, fb := range fallbacks {
			layoutPath = filepath.Join(fb, "layout.html")
			pages, err = filepath.Glob(filepath.Join(fb, "*.html"))
			if err == nil && len(pages) > 0 {
				break
			}
		}
		if len(pages) == 0 {
			log.Error().Msg("Failed to load admin templates from any path")
			return
		}
	}

	// Parse each page template individually with layout.html
	// This avoids {{define "content"}} collisions between pages
	h.templates = make(map[string]*template.Template)
	for _, page := range pages {
		name := filepath.Base(page)
		if name == "layout.html" {
			continue
		}
		tmpl, err := template.New("").Funcs(adminFuncMap()).ParseFiles(layoutPath, page)
		if err != nil {
			log.Warn().Err(err).Str("page", name).Msg("Failed to parse admin template")
			continue
		}
		h.templates[name] = tmpl
	}
	log.Info().Int("count", len(h.templates)).Msg("Admin templates loaded")
}

func (h *AdminHandler) render(c *fiber.Ctx, name string, data fiber.Map) error {
	if h.templates == nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Templates not loaded")
	}
	tmpl, ok := h.templates[name]
	if !ok {
		return c.Status(fiber.StatusInternalServerError).SendString("Template not found: " + name)
	}
	c.Set("Content-Type", "text/html; charset=utf-8")
	return tmpl.ExecuteTemplate(c.Response().BodyWriter(), name, data)
}

func RegisterAdminRoutes(app *fiber.App, h *AdminHandler) {
	admin := app.Group("/admin")

	// Public routes (no auth)
	admin.Get("/login", h.LoginPage)
	admin.Post("/login", h.LoginSubmit)

	// Protected routes
	protected := admin.Use(h.AuthMiddleware)
	protected.Post("/logout", h.Logout)

	// Dashboard
	protected.Get("/", h.Dashboard)

	// User management
	protected.Get("/users", h.UserList)
	protected.Get("/users/:id", h.UserDetailEnhanced)
	protected.Post("/users/:id/edit", h.EditUser)
	protected.Post("/users/:id/give", h.GiveUserCurrency)
	protected.Post("/users/:id/ban", h.BanUser)
	protected.Post("/users/:id/unban", h.UnbanUser)

	// Slime species data
	protected.Get("/slimes", h.SlimeList)
	protected.Get("/slime-icon/:id", h.SlimeIcon)
	protected.Get("/slimes/:id", h.SlimeDetail)

	// Slime instance management (admin give/edit)
	protected.Get("/slime-instances/create", h.SlimeCreatePage)
	protected.Post("/slime-instances/create", h.SlimeCreate)
	protected.Post("/slime-instances/:id/edit", h.SlimeEdit)
	protected.Post("/slime-instances/:id/delete", h.SlimeDelete)

	// Game data viewers + CRUD
	protected.Get("/gamedata/species", h.SpeciesViewer)
	protected.Get("/gamedata/gacha", h.GachaRateViewer)

	// Recipes CRUD
	protected.Get("/gamedata/recipes", h.RecipeViewer)
	protected.Post("/gamedata/recipes/create", h.RecipeCreate)
	protected.Post("/gamedata/recipes/:id/update", h.RecipeUpdate)
	protected.Post("/gamedata/recipes/:id/delete", h.RecipeDelete)

	// Materials CRUD
	protected.Get("/gamedata/materials", h.MaterialViewer)
	protected.Post("/gamedata/materials/create", h.MaterialCreate)
	protected.Post("/gamedata/materials/:id/update", h.MaterialUpdate)
	protected.Post("/gamedata/materials/:id/delete", h.MaterialDelete)

	// Explorations CRUD
	protected.Get("/gamedata/explorations", h.ExplorationViewer)
	protected.Post("/gamedata/explorations/create", h.ExplorationCreate)
	protected.Post("/gamedata/explorations/:id/update", h.ExplorationUpdate)
	protected.Post("/gamedata/explorations/:id/delete", h.ExplorationDelete)

	// Achievements CRUD
	protected.Get("/gamedata/achievements", h.AchievementViewer)
	protected.Post("/gamedata/achievements/create", h.AchievementCreate)
	protected.Post("/gamedata/achievements/:id/update", h.AchievementUpdate)
	protected.Post("/gamedata/achievements/:id/delete", h.AchievementDelete)

	// Accessories CRUD
	protected.Get("/gamedata/accessories", h.AccessoryViewer)
	protected.Post("/gamedata/accessories/create", h.AccessoryCreate)
	protected.Post("/gamedata/accessories/:id/update", h.AccessoryUpdate)
	protected.Post("/gamedata/accessories/:id/delete", h.AccessoryDelete)

	// Missions CRUD
	protected.Get("/gamedata/missions", h.MissionViewer)
	protected.Post("/gamedata/missions/create", h.MissionCreate)
	protected.Post("/gamedata/missions/:id/update", h.MissionUpdate)
	protected.Post("/gamedata/missions/:id/delete", h.MissionDelete)

	// Seasons CRUD
	protected.Get("/gamedata/seasons", h.SeasonViewer)
	protected.Post("/gamedata/seasons/create", h.SeasonCreate)
	protected.Post("/gamedata/seasons/:id/update", h.SeasonUpdate)
	protected.Post("/gamedata/seasons/:id/delete", h.SeasonDelete)

	// Sets CRUD
	protected.Get("/gamedata/sets", h.SetViewer)
	protected.Post("/gamedata/sets/create", h.SetCreate)
	protected.Post("/gamedata/sets/:id/update", h.SetUpdate)
	protected.Post("/gamedata/sets/:id/delete", h.SetDelete)

	// Mutations CRUD
	protected.Get("/gamedata/mutations", h.MutationViewer)
	protected.Post("/gamedata/mutations/create", h.MutationCreate)
	protected.Post("/gamedata/mutations/:id/update", h.MutationUpdate)
	protected.Post("/gamedata/mutations/:id/delete", h.MutationDelete)

	// Evolutions CRUD
	protected.Get("/gamedata/evolutions", h.EvolutionViewer)
	protected.Get("/gamedata/evolutions/:species_id", h.EvolutionDetail)
	protected.Post("/gamedata/evolutions/:species_id/node", h.EvolutionNodeUpsert)
	protected.Post("/gamedata/evolutions/:species_id/node/:node_id/delete", h.EvolutionNodeDelete)

	// Shop CRUD
	protected.Get("/shop", h.ShopList)
	protected.Post("/shop/create", h.ShopCreate)
	protected.Post("/shop/:id/update", h.ShopUpdate)
	protected.Post("/shop/:id/delete", h.ShopDelete)

	// Announcements
	protected.Get("/announcements", h.AnnouncementList)
	protected.Post("/announcements", h.CreateAnnouncement)
	protected.Post("/announcements/:id/toggle", h.ToggleAnnouncement)
	protected.Post("/announcements/:id/delete", h.DeleteAnnouncement)

	// Mail broadcast
	protected.Get("/mail", h.MailBroadcastPage)
	protected.Post("/mail/send", h.SendBroadcast)

	// World boss
	protected.Get("/boss", h.WorldBossStatus)
	protected.Post("/boss/create", h.CreateWorldBoss)

	// Community moderation
	protected.Get("/moderation/reports", h.CommunityReports)
	protected.Post("/moderation/reports/:id/process", h.ProcessReport)
	protected.Get("/moderation/posts", h.CommunityPostList)
	protected.Post("/moderation/posts/:id/delete", h.DeleteCommunityPost)
	protected.Post("/moderation/replies/:id/delete", h.DeleteCommunityReply)

	// Log viewers
	protected.Get("/logs/currency", h.CurrencyLogs)
	protected.Get("/logs/items", h.ItemLogs)
	protected.Get("/logs/collection", h.CollectionLogs)
	protected.Get("/logs/gacha", h.GachaLogs)
	protected.Get("/logs/shop", h.ShopPurchaseLogs)
	protected.Get("/logs/community", h.CommunityLogs)
	protected.Get("/logs/users", h.UserLogs)

	// Support / Customer service
	protected.Get("/support", h.SupportTicketList)
	protected.Get("/support/:id", h.SupportTicketDetail)
	protected.Post("/support/:id/reply", h.SupportTicketReply)
	protected.Post("/support/:id/status", h.SupportTicketUpdateStatus)
	protected.Post("/support/:id/assign", h.SupportTicketAssign)

	// Revenue
	protected.Get("/revenue", h.RevenueDashboard)

	// Shorts moderation
	protected.Get("/shorts", h.ShortsModList)
	protected.Get("/shorts/stats", h.ShortsStats)
	protected.Get("/shorts/:id", h.ShortsModDetail)
	protected.Post("/shorts/:id/hide", h.ShortsHide)
	protected.Post("/shorts/:id/delete", h.ShortsDelete)

	// Bulk report processing
	protected.Post("/moderation/reports/bulk", h.BulkProcessReports)

	// System / logs (legacy)
	protected.Get("/logs", h.LogsPage)
	protected.Get("/audit", h.AuditLog)
}
