import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  const httpServer = createServer(app);

  return httpServer;
}
