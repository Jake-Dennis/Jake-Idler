import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Shards are stored as `{rarity}_{bracketLevel}` keys (e.g. `rare_10`, `common_20`). */
export interface HeroShards {
  [key: string]: number;
}

export interface HeroStats {
  atk: number;
  def: number;
  hp: number;
  healing: number;
}

// ---------------------------------------------------------------------------
// players
// ---------------------------------------------------------------------------
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash"),
  isGuest: integer("is_guest", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").notNull(),
  lastLogin: text("last_login").notNull(),
});

// ---------------------------------------------------------------------------
// heroes
// ---------------------------------------------------------------------------
export const heroes = sqliteTable("heroes", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  name: text("name").notNull(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  gold: integer("gold").default(0).notNull(),
  currentFloor: integer("current_floor").default(1).notNull(),
  shards: text("shards", { mode: "json" })
    .$type<HeroShards>()
    .default({ common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 })
    .notNull(),
  equipped: text("equipped", { mode: "json" })
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  inventory: text("inventory", { mode: "json" })
    .$type<unknown[]>()
    .default([])
    .notNull(),
  stats: text("stats", { mode: "json" })
    .$type<HeroStats>()
    .default({ atk: 0, def: 0, hp: 0, healing: 0 })
    .notNull(),
  lastActive: text("last_active").notNull(),
  createdAt: text("created_at").notNull(),
  photoUrl: text("photo_url"),
});

// ---------------------------------------------------------------------------
// friends
// ---------------------------------------------------------------------------
export const friends = sqliteTable(
  "friends",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    friendId: text("friend_id")
      .notNull()
      .references(() => players.id),
    status: text("status", { enum: ["pending", "accepted", "blocked"] })
      .default("pending")
      .notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_friends_player_friend").on(t.playerId, t.friendId),
  ],
);

// ---------------------------------------------------------------------------
// keys (bracket boss keys)
// ---------------------------------------------------------------------------
export const keys = sqliteTable("keys", {
  id: text("id").primaryKey(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  floorBracket: integer("floor_bracket").notNull(),
  createdAt: text("created_at").notNull(),
});
