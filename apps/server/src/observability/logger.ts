import pino from "pino";
import type { Express } from "express";
import pinoHttp from "pino-http";

// ─── Root Logger ──────────────────────────────────────────────

const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? "warn",
  redact: {
    paths: ["req.headers.authorization", "*.passwordHash", "*.password", "*.token"],
    censor: "[Redacted]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// ─── Child Logger Factory ─────────────────────────────────────

export function createChildLogger(service: string): pino.Logger {
  return rootLogger.child({ service });
}

// ─── Express Middleware ───────────────────────────────────────

export function setUpPinoHttp(app: Express): void {
  app.use(
    pinoHttp({
      logger: rootLogger,
      autoLogging: {
        ignore: (req) => (req.url ?? "").startsWith("/api/health") || (req.url ?? "") === "/api/guilds/heartbeat",
      },
    }),
  );
}

// ─── Root export ──────────────────────────────────────────────

export default rootLogger;
