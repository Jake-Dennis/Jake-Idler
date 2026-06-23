import { db } from "../db/connection.js";
import { heroes, players } from "../db/schema/index.js";
import { eq, desc } from "drizzle-orm";

class LeaderboardService {
  /**
   * Get the top N players by highest floor + gold.
   * Queries SQLite directly — no Redis caching (SQLite is already local and fast).
   */
  async getTopPlayers(limit: number = 100): Promise<
    Array<{
      rank: number;
      playerId: string;
      username: string;
      heroName: string;
      highestFloor: number;
      gold: number;
    }>
  > {
    const rows = await db
      .select({
        playerId: heroes.playerId,
        username: players.username,
        heroName: heroes.name,
        highestFloor: heroes.currentFloor,
        gold: heroes.gold,
      })
      .from(heroes)
      .innerJoin(players, eq(heroes.playerId, players.id))
      .orderBy(desc(heroes.currentFloor), desc(heroes.gold))
      .limit(limit);

    return rows.map((row, i) => ({
      rank: i + 1,
      ...row,
    }));
  }

  /**
   * Update the leaderboard (called periodically — kept for API compatibility).
   * With SQLite the query is always fresh, so this is effectively a no-op.
   */
  async updateLeaderboard(): Promise<void> {
    // SQLite is always fresh; no caching needed.
    // This method is kept for API compatibility with the game loop timer.
  }
}

export const leaderboardService = new LeaderboardService();
