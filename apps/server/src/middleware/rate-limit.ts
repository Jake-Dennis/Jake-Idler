import rateLimit from "express-rate-limit";
import type { Request } from "express";

// ─── Factory ──────────────────────────────────────────────────

interface RateLimitOpts {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
  /** Only count requests where this returns true (default: all). */
  skip?: (req: Request) => boolean;
}

export function createRateLimiter(opts: RateLimitOpts) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: opts.skip,
    keyGenerator: (req: Request): string => {
      // Prefer authenticated user key over IP
      if ((req as any).player?.id) {
        return `${opts.keyPrefix}:user:${(req as any).player.id}`;
      }
      return `${opts.keyPrefix}:ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
    },
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
  });
}

// ─── Pre-built limiters ───────────────────────────────────────
// All mutation limiters only count POST requests — GET reads are never rate-limited.

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  keyPrefix: "auth",
  skip: (req) => req.method !== "POST",
});

export const combatStartLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyPrefix: "combat",
  skip: (req) => req.method !== "POST",
});

export const partyCreateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyPrefix: "party",
  skip: (req) => req.method !== "POST",
});

export const lootCraftLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 20,
  keyPrefix: "loot",
  skip: (req) => req.method !== "POST",
});

export const guildCreateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyPrefix: "guild_create",
  skip: (req) => req.method !== "POST",
});

export const heartbeatLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyPrefix: "heartbeat",
  skip: (req) => req.method !== "POST",
});
