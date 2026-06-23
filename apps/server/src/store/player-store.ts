import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { players } from "../db/schema/index.js";

export interface Player {
  id: string;
  username: string;
  passwordHash: string | null;
  createdAt: string; // ISO string
}

class PlayerStore {
  private cache: Map<string, Player> = new Map();

  async create(username: string, passwordHash: string | null = null): Promise<Player> {
    const now = new Date().toISOString();
    const player: Player = {
      id: uuidv4(),
      username,
      passwordHash,
      createdAt: now,
    };

    // Persist to SQLite so hero/foreign-key constraints are satisfied
    await db.insert(players).values({
      id: player.id,
      username: player.username,
      passwordHash: player.passwordHash,
      isGuest: player.passwordHash === null,
      createdAt: now,
      lastLogin: now,
    });

    this.cache.set(player.id, player);
    return player;
  }

  async findByUsername(username: string): Promise<Player | undefined> {
    // Check cache first (fast path for current-session players)
    for (const player of this.cache.values()) {
      if (player.username === username) return player;
    }
    // Fall back to DB (e.g. after server restart)
    const rows = await db
      .select()
      .from(players)
      .where(eq(players.username, username))
      .limit(1);
    if (rows.length === 0) return undefined;
    const row = rows[0];
    const player: Player = {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
    };
    this.cache.set(player.id, player);
    return player;
  }

  async findById(id: string): Promise<Player | undefined> {
    // Check cache first
    if (this.cache.has(id)) return this.cache.get(id);
    // Fall back to DB
    const rows = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);
    if (rows.length === 0) return undefined;
    const row = rows[0];
    const player: Player = {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
    };
    this.cache.set(id, player);
    return player;
  }
}

// Singleton
export const playerStore = new PlayerStore();
