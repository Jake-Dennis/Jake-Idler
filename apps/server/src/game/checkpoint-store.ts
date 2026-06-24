import { createChildLogger } from "../observability/logger.js";
import type { PartyFloorRunState } from "./session-manager.js";

// ─── Types ────────────────────────────────────────────────────

interface Checkpoint {
  runId: string;
  state: PartyFloorRunState;
}

// ─── Checkpoint Store ─────────────────────────────────────────

export class CheckpointStore {
  private queue: Checkpoint[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private log = createChildLogger("checkpoint-store");
  private flushIntervalMs = 100;

  enqueue(runId: string, state: PartyFloorRunState): void {
    this.queue.push({ runId, state });
    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  start(flushIntervalMs?: number): void {
    if (this.timer !== null) return;
    this.flushIntervalMs = flushIntervalMs ?? 100;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.log.info({ flushIntervalMs: this.flushIntervalMs }, "Checkpoint store started");
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
    this.log.info("Checkpoint store stopped");
  }

  private flush(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    for (const checkpoint of batch) {
      this.log.info(
        { runId: checkpoint.runId, tickCount: checkpoint.state.tickCount, queueSize: batch.length },
        "Checkpoint flushed",
      );
    }
  }
}

/** Singleton checkpoint store for the game server. */
export const checkpointStore = new CheckpointStore();
