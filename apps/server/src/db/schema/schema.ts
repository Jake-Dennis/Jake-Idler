import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

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

// ---------------------------------------------------------------------------
// guilds
// ---------------------------------------------------------------------------
export const guilds = sqliteTable("guilds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameLower: text("name_lower").notNull().unique(),
  description: text("description").default("").notNull(),
  leaderId: text("leader_id")
    .notNull()
    .references(() => players.id),
  memberCount: integer("member_count").default(1).notNull(),
  maxMembers: integer("max_members").default(50).notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// guild_members
// ---------------------------------------------------------------------------
export const guildMembers = sqliteTable(
  "guild_members",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" })
      .unique(),
    role: text("role", { enum: ["leader", "member"] }).default("member").notNull(),
    joinedAt: text("joined_at").notNull(),
    lastSeenAt: integer("last_seen_at"),
  },
  (t) => [index("idx_guild_members_guild").on(t.guildId)],
);

// ---------------------------------------------------------------------------
// combat_events (append-only round event log for crash recovery)
// ---------------------------------------------------------------------------
export const combatEvents = sqliteTable(
  "combat_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: text("run_id").notNull(),
    eventId: integer("event_id").notNull(),
    type: text("type").notNull(),
    payload: text("payload", { mode: "json" }).$type<unknown>().notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_combat_events_run_event").on(t.runId, t.eventId)],
);

// ---------------------------------------------------------------------------
// party_state (latest snapshot per combat run for crash recovery)
// ---------------------------------------------------------------------------
export const partyState = sqliteTable("party_state", {
  runId: text("run_id").primaryKey(),
  partyId: text("party_id").notNull(),
  state: text("state", { mode: "json" }).$type<unknown>().notNull(),
  tickCount: integer("tick_count").notNull(),
  finishedAt: integer("finished_at"),
  updatedAt: text("updated_at").notNull(),
});
