import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { guildService, GuildError } from "../services/guild-service.js";
import { presenceService } from "../services/presence-service.js";
import { guildCreateLimiter, heartbeatLimiter } from "../middleware/rate-limit.js";

const router = Router();

// ─── Schemas ───────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const kickSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
});

// ─── GET / — public directory (open guilds) ────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const result = guildService.listOpenGuilds(offset, limit);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /mine — current player's guild + roster ───────────────

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = guildService.getMyGuild(req.player!.id);
    if (!result) {
      res.status(404).json({ error: "You are not in a guild" });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST / — create guild ─────────────────────────────────────

router.post("/", guildCreateLimiter, requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const guild = guildService.create(req.player!.id, parsed.data.name, parsed.data.description);
    res.status(201).json({ guild });
  } catch (err: any) {
    const status = err instanceof GuildError ? err.statusCode : 400;
    res.status(status).json({ error: err.message });
  }
});

// ─── POST /:id/join — join a guild ─────────────────────────────

router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const guildId = req.params.id as string;
    const guild = guildService.join(req.player!.id, guildId);
    res.json({ guild });
  } catch (err: any) {
    const status = err instanceof GuildError ? err.statusCode : 400;
    res.status(status).json({ error: err.message });
  }
});

// ─── POST /:id/leave — leave a guild ───────────────────────────

router.post("/:id/leave", requireAuth, async (req, res) => {
  try {
    const guildId = req.params.id as string;
    guildService.leave(req.player!.id, guildId);
    res.status(204).send();
  } catch (err: any) {
    const status = err instanceof GuildError ? err.statusCode : 400;
    res.status(status).json({ error: err.message });
  }
});

// ─── POST /:id/kick — leader kicks a member ────────────────────

router.post("/:id/kick", requireAuth, async (req, res) => {
  try {
    const parsed = kickSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    guildService.kick(req.player!.id, parsed.data.playerId);
    res.status(204).send();
  } catch (err: any) {
    const status = err instanceof GuildError ? err.statusCode : 400;
    res.status(status).json({ error: err.message });
  }
});

// ─── DELETE /:id — disband guild (leader only) ─────────────────

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const guildId = req.params.id as string;
    guildService.disband(req.player!.id, guildId);
    res.status(204).send();
  } catch (err: any) {
    const status = err instanceof GuildError ? err.statusCode : 400;
    res.status(status).json({ error: err.message });
  }
});

// ─── POST /heartbeat — presence ping ───────────────────────────

router.post("/heartbeat", heartbeatLimiter, requireAuth, async (_req, res) => {
  // Heartbeat is called even if not in a guild — still updates onlinePlayers
  presenceService.heartbeat(_req.player!.id);
  res.status(204).send();
});

export default router;
