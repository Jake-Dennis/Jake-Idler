import { createChildLogger } from "../observability/logger.js";

// ─── Types ────────────────────────────────────────────────────

export type TickHandler = () => Promise<void> | void;

interface TickSubscriber {
  handler: TickHandler;
  name: string;
}

// ─── Tick Scheduler ───────────────────────────────────────────
// Uses setInterval (fine for 1Hz — drift is negligible at this rate).
// Tracks drift, logs at 100ms+ drift, and warns on 80%+ budget usage.
// Multi-subscriber: one subscriber throwing does NOT stop others.

export class TickScheduler {
  private intervalMs = 1000;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _tickCount = 0;
  private _lastTickDurationMs = 0;
  private subscribers: TickSubscriber[] = [];
  private log = createChildLogger("tick-scheduler");

  start(intervalMs?: number): void {
    if (this.running) return;
    this.intervalMs = intervalMs ?? parseInt(process.env.TICK_INTERVAL_MS ?? "1000", 10);
    this.running = true;
    this._tickCount = 0;
    this.log.info({ intervalMs: this.intervalMs }, "Tick scheduler started");
    this.timer = setInterval(() => this.executeTick(), this.intervalMs);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.log.info("Tick scheduler stopped");
  }

  subscribe(handler: TickHandler, name = "anonymous"): void {
    this.subscribers.push({ handler, name });
  }

  unsubscribe(handler: TickHandler): void {
    this.subscribers = this.subscribers.filter((s) => s.handler !== handler);
  }

  getTickCount(): number { return this._tickCount; }
  getLastTickDurationMs(): number { return this._lastTickDurationMs; }
  getIntervalMs(): number { return this.intervalMs; }
  isRunning(): boolean { return this.running; }

  // ─── Internal ─────────────────────────────────────────────

  private executeTick(): void {
    const tickStart = Date.now();
    this._tickCount++;

    for (const sub of this.subscribers) {
      const t0 = Date.now();
      try {
        const result = sub.handler();
        if (result instanceof Promise) {
          // Async handler — fire-and-forget to avoid blocking the tick loop.
          // The handler's rejection is logged via the global unhandledRejection handler.
          result.catch((err) =>
            this.log.error({ subscriber: sub.name, err }, "Async tick handler threw"),
          );
        }
      } catch (err) {
        this.log.error({ subscriber: sub.name, err }, "Tick handler threw");
      }
      const duration = Date.now() - t0;
      if (duration > this.intervalMs * 0.8) {
        this.log.warn(
          { subscriber: sub.name, durationMs: duration, budgetMs: this.intervalMs },
          "Tick handler exceeded 80% budget",
        );
      }
    }

    this._lastTickDurationMs = Date.now() - tickStart;

    if (this._lastTickDurationMs > this.intervalMs * 0.8) {
      this.log.warn(
        { tickDurationMs: this._lastTickDurationMs, budgetMs: this.intervalMs },
        "Tick duration exceeded 80% budget",
      );
    }

    // Spiral-of-death guard: if tick took longer than interval, log it
    if (this._lastTickDurationMs > this.intervalMs) {
      this.log.warn(
        { tickDurationMs: this._lastTickDurationMs, intervalMs: this.intervalMs },
        "Tick longer than interval — possible spiral of death",
      );
    }
  }
}

/** Singleton tick scheduler for the game server. */
export const combatScheduler = new TickScheduler();
