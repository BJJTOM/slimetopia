package game

import (
	"context"
	"encoding/json"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type EvolutionNode struct {
	ID       int                    `json:"id"`
	Name     string                 `json:"name"`
	Type     string                 `json:"type"`
	Buff     map[string]interface{} `json:"buff"`
	Cost     int                    `json:"cost"`
	Requires []int                  `json:"requires"`
}

type EvolutionTree struct {
	SpeciesName string          `json:"species_name"`
	Nodes       []EvolutionNode `json:"nodes"`
}

var evolutionTrees map[string]EvolutionTree

func init() {
	loadEvolutionTrees()
}

func loadEvolutionTrees() {
	paths := []string{
		"../shared/evolution-tree.json",
		"shared/evolution-tree.json",
		"/app/shared/evolution-tree.json",
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var wrapper struct {
			Trees map[string]EvolutionTree `json:"trees"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			log.Error().Err(err).Msg("Failed to parse evolution-tree.json")
			continue
		}
		evolutionTrees = wrapper.Trees
		log.Info().Int("count", len(evolutionTrees)).Msg("Loaded evolution trees")
		return
	}
	log.Warn().Msg("No evolution-tree.json found")
}

// GET /api/evolution/:species_id
func (h *Handler) GetEvolutionTree(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	speciesID := c.Params("species_id")

	tree, ok := evolutionTrees[speciesID]
	if !ok {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no evolution tree for this species"})
	}

	sid, _ := strconv.Atoi(speciesID)
	unlockedNodes, err := h.getUnlockedEvolutionNodes(c.UserContext(), userID, sid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch unlocks"})
	}

	unlockedSet := make(map[int]bool)
	for _, nid := range unlockedNodes {
		unlockedSet[nid] = true
	}

	nodes := make([]fiber.Map, 0, len(tree.Nodes))
	for _, node := range tree.Nodes {
		canUnlock := true
		for _, req := range node.Requires {
			if !unlockedSet[req] {
				canUnlock = false
				break
			}
		}
		nodes = append(nodes, fiber.Map{
			"id":         node.ID,
			"name":       node.Name,
			"type":       node.Type,
			"buff":       node.Buff,
			"cost":       node.Cost,
			"requires":   node.Requires,
			"unlocked":   unlockedSet[node.ID],
			"can_unlock": canUnlock && !unlockedSet[node.ID],
		})
	}

	return c.JSON(fiber.Map{
		"species_name": tree.SpeciesName,
		"nodes":        nodes,
	})
}

// POST /api/evolution/:species_id/unlock
func (h *Handler) UnlockEvolutionNode(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	speciesID := c.Params("species_id")

	var body struct {
		NodeID int `json:"node_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "node_id required"})
	}

	sid, _ := strconv.Atoi(speciesID)
	tree, ok := evolutionTrees[speciesID]
	if !ok {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no evolution tree"})
	}

	var targetNode *EvolutionNode
	for _, n := range tree.Nodes {
		if n.ID == body.NodeID {
			nn := n
			targetNode = &nn
			break
		}
	}
	if targetNode == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "node not found"})
	}

	ctx := c.UserContext()
	unlockedNodes, _ := h.getUnlockedEvolutionNodes(ctx, userID, sid)
	unlockedSet := make(map[int]bool)
	for _, nid := range unlockedNodes {
		unlockedSet[nid] = true
	}
	if unlockedSet[body.NodeID] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "already unlocked"})
	}
	for _, req := range targetNode.Requires {
		if !unlockedSet[req] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "requirements not met"})
		}
	}

	if err := h.userRepo.SpendCurrency(ctx, userID, 0, 0, targetNode.Cost); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient stardust"})
	}

	_, err := h.slimeRepo.Pool().Exec(ctx,
		`INSERT INTO evolution_unlocks (user_id, species_id, node_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		userID, sid, body.NodeID,
	)
	if err != nil {
		h.userRepo.AddCurrency(ctx, userID, 0, 0, targetNode.Cost)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to unlock"})
	}

	user, _ := h.userRepo.FindByID(ctx, userID)
	return c.JSON(fiber.Map{
		"unlocked": true,
		"node_id":  body.NodeID,
		"user": fiber.Map{
			"stardust": user.Stardust,
		},
	})
}

func (h *Handler) getUnlockedEvolutionNodes(ctx context.Context, userID string, speciesID int) ([]int, error) {
	rows, err := h.slimeRepo.Pool().Query(ctx,
		`SELECT node_id FROM evolution_unlocks WHERE user_id = $1 AND species_id = $2`,
		userID, speciesID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []int
	for rows.Next() {
		var nid int
		if err := rows.Scan(&nid); err != nil {
			return nil, err
		}
		nodes = append(nodes, nid)
	}
	return nodes, nil
}
