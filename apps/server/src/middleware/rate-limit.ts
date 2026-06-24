import rateLimit from "express-rate-limit";
import type { Request } from "express";

// ─── Factory ──────────────────────────────────────────────────

interface RateLimitOpts {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}

export function createRateLimiter(opts: RateLimitOpts) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
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
    ...(opts.message ? {} : {}),
  });
}

// ─── Pre-built limiters ───────────────────────────────────────

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  keyPrefix: "auth",
});

export const combatStartLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  keyPrefix: "combat",
});

export const partyCreateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyPrefix: "party",
});

export const lootCraftLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 20,
  keyPrefix: "loot",
});
