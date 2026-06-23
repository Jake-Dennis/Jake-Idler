import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import authRoutes from "./routes/auth.js";
import heroRoutes from "./routes/heroes.js";
import heroPhotoRoutes from "./routes/hero-photo.js";
import combatRoutes from "./routes/combat.js";
import dungeonRoutes from "./routes/dungeon.js";
import lootRoutes from "./routes/loot.js";
import partyRoutes from "./routes/party.js";
import friendRoutes from "./routes/friends.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import webRoutes from "./routes/web.js";
import { GameConfig } from "@jake-idler/game";
import { initSocketIO } from "./socket/index.js";
import { initDatabase } from "./db/connection.js";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Serve uploaded hero photos statically
app.use("/uploads", express.static(path.resolve(import.meta.dirname, "..", "uploads")));

// Routes
// Redirect root to game
app.get("/", (_req, res) => {
  res.redirect("/game");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/heroes", heroRoutes);
app.use("/api/heroes", heroPhotoRoutes);
app.use("/api/heroes", combatRoutes);
app.use("/api/heroes", dungeonRoutes);
app.use("/api/heroes", lootRoutes);
app.use("/api/party", partyRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/game", webRoutes);

// Socket.IO
initSocketIO(server);

server.listen(PORT, () => {
  initDatabase();
  console.log(`Server running on http://localhost:${PORT}`);
  startGameLoop();
});

// ─── Game Loop ──────────────────────────────────────────────────

let tickInterval: ReturnType<typeof setInterval> | null = null;
let leaderboardInterval: ReturnType<typeof setInterval> | null = null;

function startGameLoop(): void {
  if (tickInterval) return;

  console.log(`[GameLoop] Starting tick loop (${GameConfig.TICK_INTERVAL_MS}ms interval)`);

  tickInterval = setInterval(async () => {
    const { combatService } = await import("./services/combat-service.js");
    await combatService.tick();
  }, GameConfig.TICK_INTERVAL_MS);

  leaderboardInterval = setInterval(async () => {
    const { leaderboardService } = await import("./services/leaderboard-service.js");
    await leaderboardService.updateLeaderboard();
  }, 10_000);
}

function stopGameLoop(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (leaderboardInterval) {
    clearInterval(leaderboardInterval);
    leaderboardInterval = null;
  }
  console.log("[GameLoop] Stopped");
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[Server] Shutting down...");
  stopGameLoop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Server] Shutting down...");
  stopGameLoop();
  process.exit(0);
});
