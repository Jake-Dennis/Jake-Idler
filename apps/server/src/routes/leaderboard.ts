import { Router } from "express";
import { leaderboardService } from "../services/leaderboard-service.js";

const router = Router();

// GET /api/leaderboard — get top 100 players
router.get("/", async (_req, res) => {
  try {
    const topPlayers = await leaderboardService.getTopPlayers(100);
    res.json({ leaderboard: topPlayers });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch leaderboard" });
  }
});

export default router;
