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
import guildRoutes from "./routes/guilds.js";
import chatRoutes from "./routes/chat.js";
import { initDatabase } from "./db/connection.js";
import { config } from "./config/index.js";
import { setUpPinoHttp } from "./observability/logger.js";
import { authLimiter, lootCraftLimiter } from "./middleware/rate-limit.js";
import { presenceService } from "./services/presence-service.js";
import { balancingService } from "./services/balancing-service.js";
import { applyConfigOverrides } from "@jake-idler/game";

// Boot-time safety checks
if (process.env.NODE_ENV === "production") {
  const secret = process.env.JWT_SECRET || "";
  if (!secret || secret === "dev-secret-change-in-production") {
    console.error("[FATAL] JWT_SECRET must be set to a non-default value in production");
    process.exit(1);
  }
}

const app = express();
const server = createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Global error handlers to prevent crashes from unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
setUpPinoHttp(app);

// Rate limiting on mutation endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/guest", authLimiter);
app.use("/api/auth/register", authLimiter);
// partyCreateLimiter applied inline on POST /api/party/create in routes/party.ts
app.use("/api/heroes", lootCraftLimiter);     // POST /:id/loot/craft

// Serve uploaded hero photos statically
app.use("/uploads", express.static(path.resolve(import.meta.dirname, "..", "uploads")));

// Serve static CSS/JS files
app.use("/static", express.static(path.resolve(import.meta.dirname, "..", "static")));

// Serve extracted client SPA files
app.use("/client", express.static(path.resolve(import.meta.dirname, "..", "..", "client")));

// Serve game assets
app.use("/assets", express.static(path.resolve(import.meta.dirname, "..", "..", "..", "Jake-Assets")));

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
app.use("/api/guilds", guildRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/party", partyRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/game", webRoutes);

server.listen(PORT, () => {
  initDatabase();
  presenceService.startSweeper();

  // Apply runtime config from balancing.json to the game engine
  const balancing = balancingService.load();
  if (Object.keys(balancing).length > 0) {
    applyConfigOverrides(balancing);
    console.log("[Config] Applied runtime overrides from balancing.json");
  }

  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[Server] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Server] Shutting down...");
  process.exit(0);
});
