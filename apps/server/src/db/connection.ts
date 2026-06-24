import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config/index.js";

import * as schema from "./schema/index.js";

const dbPath = path.resolve(config.db.url);
const dbDir = path.dirname(dbPath);

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let client: Database.Database;

try {
  client = new Database(dbPath);
  // Enable WAL mode for better concurrent read performance
  client.pragma("journal_mode = WAL");
  // Enable foreign keys
  client.pragma("foreign_keys = ON");
  console.log(`[DB] SQLite connected: ${dbPath}`);
} catch (err) {
  console.warn("[DB] Failed to open SQLite database:", (err as Error).message);
  throw err;
}

export const db = drizzle(client, { schema });

/** Helper to get the current timestamp as an ISO string for DB writes. */
export function now(): string {
  return new Date().toISOString();
}

/** Initialize database schema — creates tables if they don't exist. */
export function initDatabase(): void {
  client.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      is_guest INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS heroes (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1 NOT NULL,
      xp INTEGER DEFAULT 0 NOT NULL,
      gold INTEGER DEFAULT 0 NOT NULL,
      current_floor INTEGER DEFAULT 1 NOT NULL,
      shards TEXT DEFAULT '{}' NOT NULL,
      equipped TEXT DEFAULT '{}' NOT NULL,
      inventory TEXT DEFAULT '[]' NOT NULL,
      stats TEXT DEFAULT '{}' NOT NULL,
      last_active TEXT NOT NULL,
      created_at TEXT NOT NULL,
      photo_url TEXT
    );
    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      friend_id TEXT NOT NULL REFERENCES players(id),
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS keys (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      floor_bracket INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_friends_player_friend ON friends(player_id, friend_id);
    CREATE TABLE IF NOT EXISTS combat_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_combat_events_run_event ON combat_events(run_id, event_id);
    CREATE TABLE IF NOT EXISTS party_state (
      run_id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL,
      state TEXT NOT NULL,
      tick_count INTEGER NOT NULL,
      finished_at INTEGER,
      updated_at TEXT NOT NULL
    );
  `);
  console.log("[DB] Schema initialized");
}
