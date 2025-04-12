
import express from 'express';
import { storage } from './storage';
import { authenticateAdmin } from './middleware/auth';

const router = express.Router();

// Admin authentication middleware
router.use(authenticateAdmin);

// Get server activity log
router.get('/activity', async (req, res) => {
  const activities = await storage.getActivities();
  res.json(activities);
});

// Ban user
router.post('/ban', async (req, res) => {
  const { userId, reason } = req.body;
  await storage.banUser(userId, reason);
  res.json({ success: true });
});

// Kick user
router.post('/kick', async (req, res) => {
  const { userId, reason } = req.body;
  await storage.kickUser(userId, reason);
  res.json({ success: true });
});

// Start custom spawn event
router.post('/spawn', async (req, res) => {
  const { pokemon, minLevel, maxLevel, channelId, shiny } = req.body;
  await storage.createSpawnEvent({ pokemon, minLevel, maxLevel, channelId, shiny });
  res.json({ success: true });
});

export { router as adminRouter };
