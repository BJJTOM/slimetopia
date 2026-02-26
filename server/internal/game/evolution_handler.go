package game

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/gofiber/fiber/v2"
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

// GET /api/evolution/:species_id
func (h *Handler) GetEvolutionTree(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	speciesID := c.Params("species_id")

	sid, _ := strconv.Atoi(speciesID)

	// Load evolution tree from DB
	gameNodes, err := h.gameDataRepo.GetEvolutionTree(c.Context(), sid)
	if err != nil || len(gameNodes) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no evolution tree for this species"})
	}

	// Convert GameEvolutionNode to EvolutionNode
	nodes := make([]EvolutionNode, len(gameNodes))
	for i, gn := range gameNodes {
		var buff map[string]interface{}
		if len(gn.Buff) > 0 {
			json.Unmarshal(gn.Buff, &buff)
		}
		nodes[i] = EvolutionNode{
			ID:       gn.NodeID,
			Name:     gn.Name,
			Type:     gn.Type,
			Buff:     buff,
			Cost:     gn.Cost,
			Requires: gn.Requires,
		}
	}

	unlockedNodes, err := h.getUnlockedEvolutionNodes(c.UserContext(), userID, sid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch unlocks"})
	}

	unlockedSet := make(map[int]bool)
	for _, nid := range unlockedNodes {
		unlockedSet[nid] = true
	}

	result := make([]fiber.Map, 0, len(nodes))
	for _, node := range nodes {
		canUnlock := true
		for _, req := range node.Requires {
			if !unlockedSet[req] {
				canUnlock = false
				break
			}
		}
		result = append(result, fiber.Map{
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
		"species_name": "", // species name not stored in evolution tree DB table
		"nodes":        result,
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

	// Load evolution tree from DB
	gameNodes, err := h.gameDataRepo.GetEvolutionTree(c.Context(), sid)
	if err != nil || len(gameNodes) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no evolution tree"})
	}

	// Find target node
	var targetNode *EvolutionNode
	for _, gn := range gameNodes {
		if gn.NodeID == body.NodeID {
			var buff map[string]interface{}
			if len(gn.Buff) > 0 {
				json.Unmarshal(gn.Buff, &buff)
			}
			targetNode = &EvolutionNode{
				ID:       gn.NodeID,
				Name:     gn.Name,
				Type:     gn.Type,
				Buff:     buff,
				Cost:     gn.Cost,
				Requires: gn.Requires,
			}
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

	_, err = h.slimeRepo.Pool().Exec(ctx,
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
