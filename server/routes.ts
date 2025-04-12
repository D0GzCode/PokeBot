import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { battleService } from "./services/battleService";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get('/api/user', async (req, res) => {
    try {
      // In a real application, this would get data for authenticated user
      // For now, returning mock data for the first user
      const user = await storage.getFirstUser();
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/user/avatar', async (req, res) => {
    try {
      const userId = 1; // For now, using first user
      const avatar = await storage.getUserAvatar(userId);
      res.json(avatar);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch avatar' });
    }
  });

  app.put('/api/user/avatar', async (req, res) => {
    try {
      const userId = 1; // For now, using first user
      const avatarData = req.body;
      await storage.updateUserAvatar(userId, avatarData);
      res.json({ message: 'Avatar updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update avatar' });
    }
  });

  app.get('/api/activity', async (req, res) => {
    try {
      const activities = await storage.getRecentActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/commands', async (req, res) => {
    try {
      const commands = await storage.getCommandSections();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  /**
   * Battle routes
   */
  
  // Start a battle
  app.post("/api/battles/start/:pokemonId", async (req, res) => {
    try {
      const userId = 1; // For now, we're using the first user
      const pokemonId = parseInt(req.params.pokemonId);
      
      if (isNaN(pokemonId)) {
        return res.status(400).json({ message: "Invalid Pokemon ID" });
      }
      
      const battleState = await battleService.startBattle(userId, pokemonId);
      res.json(battleState);
    } catch (error) {
      console.error("Error starting battle:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to start battle" });
    }
  });
  
  // Get battle state
  app.get("/api/battles/:battleId", async (req, res) => {
    try {
      const battleId = req.params.battleId;
      const battleState = battleService.getBattleState(battleId);
      
      if (!battleState) {
        return res.status(404).json({ message: "Battle not found" });
      }
      
      res.json(battleState);
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to fetch battle" });
    }
  });
  
  // Execute a move
  app.post("/api/battles/:battleId/move/:moveIndex", async (req, res) => {
    try {
      const battleId = req.params.battleId;
      const moveIndex = parseInt(req.params.moveIndex);
      
      if (isNaN(moveIndex)) {
        return res.status(400).json({ message: "Invalid move index" });
      }
      
      const battleState = await battleService.executeMove(battleId, moveIndex);
      res.json(battleState);
    } catch (error) {
      console.error("Error executing move:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to execute move" });
    }
  });
  
  // Flee from battle
  app.post("/api/battles/:battleId/flee", async (req, res) => {
    try {
      const battleId = req.params.battleId;
      const battleState = await battleService.flee(battleId);
      res.json(battleState);
    } catch (error) {
      console.error("Error fleeing battle:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to flee battle" });
    }
  });
  
  // End battle (cleanup)
  app.post("/api/battles/:battleId/end", async (req, res) => {
    try {
      const battleId = req.params.battleId;
      battleService.endBattle(battleId);
      res.json({ message: "Battle ended" });
    } catch (error) {
      console.error("Error ending battle:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to end battle" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
