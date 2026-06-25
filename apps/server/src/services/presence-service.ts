import { db } from "../db/connection.js";
import { guildMembers } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { onlinePlayers } from "../socket/index.js";
import { createChildLogger } from "../observability/logger.js";

const log = createChildLogger("presence");

/**
 * How long (ms) before a player who hasn't heartbeated is considered offline.
 */
const STALE_TIMEOUT_MS = 75_000;

/**
 * How often (ms) the stale sweeper runs.
 */
const SWEEP_INTERVAL_MS = 30_000;

class PresenceService {
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Called when a player sends a heartbeat.
   * - Adds them to the in-memory onlinePlayers map (used by friend/guild services)
   * - Persists last_seen_at to guild_members (for guild roster after server restart)
   */
  heartbeat(playerId: string): void {
    // Update in-memory map
    let conns = onlinePlayers.get(playerId);
    if (!conns) {
      conns = new Set<string>();
      onlinePlayers.set(playerId, conns);
    }
    conns.add("heartbeat");

    // Persist to DB (fire-and-forget, no error if not in a guild)
    try {
      db.update(guildMembers)
        .set({ lastSeenAt: Date.now() })
        .where(eq(guildMembers.playerId, playerId))
        .run();
    } catch {
      // Not in a guild — that's fine, heartbeat still counts for online status
    }
  }

  /**
   * Check if a player is currently online (via in-memory map).
   */
  isOnline(playerId: string): boolean {
    const conns = onlinePlayers.get(playerId);
    return conns !== undefined && conns.size > 0;
  }

  /**
   * Remove stale entries (players who haven't heartbeated recently).
   */
  sweepStale(): void {
    const now = Date.now();
    const stale: string[] = [];

    // Check DB for stale guild members
    try {
      const rows = db
        .select({ playerId: guildMembers.playerId, lastSeenAt: guildMembers.lastSeenAt })
        .from(guildMembers)
        .all();

      for (const row of rows) {
        if (row.lastSeenAt !== null && (now - row.lastSeenAt) > STALE_TIMEOUT_MS) {
          stale.push(row.playerId);
        }
      }
    } catch {
      // Table might not exist yet on first boot
    }

    // Remove stale entries from in-memory map and null out DB
    for (const playerId of stale) {
      onlinePlayers.delete(playerId);
      try {
        db.update(guildMembers)
          .set({ lastSeenAt: null })
          .where(eq(guildMembers.playerId, playerId))
          .run();
      } catch {
        // Ignore
      }
    }

    if (stale.length > 0) {
      log.info({ staleCount: stale.length }, "Swept stale presence entries");
    }
  }

  /**
   * Start the periodic stale sweeper.
   */
  startSweeper(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweepStale(), SWEEP_INTERVAL_MS);
    log.info("Presence sweeper started");
  }

  /**
   * Stop the stale sweeper (for graceful shutdown).
   */
  stopSweeper(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }
}

export const presenceService = new PresenceService();
