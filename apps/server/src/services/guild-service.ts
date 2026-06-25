import { db } from "../db/connection.js";
import { guilds, guildMembers, players } from "../db/schema/index.js";
import { eq, and, lt, desc, sql } from "drizzle-orm";
import { presenceService } from "./presence-service.js";
import { createChildLogger } from "../observability/logger.js";

const log = createChildLogger("guild");

// ─── Name validation ───────────────────────────────────────────

const NAME_BLOCKLIST = new Set(["admin", "moderator", "everyone", "system", "guild", "server"]);
const NAME_MIN = 3;
const NAME_MAX = 32;
const NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) throw new GuildError(`Name must be at least ${NAME_MIN} characters`, 400);
  if (trimmed.length > NAME_MAX) throw new GuildError(`Name must be at most ${NAME_MAX} characters`, 400);
  if (!NAME_PATTERN.test(trimmed)) throw new GuildError("Name can only contain letters, numbers, spaces, hyphens, and underscores", 400);
  const lower = trimmed.toLowerCase();
  if (NAME_BLOCKLIST.has(lower)) throw new GuildError("That name is not allowed", 400);
  return trimmed;
}

// ─── Errors ────────────────────────────────────────────────────

export class GuildError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "GuildError";
    this.statusCode = statusCode;
  }
}

// ─── Types ─────────────────────────────────────────────────────

export interface GuildMemberInfo {
  id: string;
  playerId: string;
  username: string;
  role: "leader" | "member";
  joinedAt: string;
  isOnline: boolean;
}

export interface GuildInfo {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  isFull: boolean;
}

export interface MyGuildResult {
  guild: GuildInfo;
  members: GuildMemberInfo[];
}

// ─── Service ───────────────────────────────────────────────────

class GuildService {
  // ─── Create ──────────────────────────────────────────────────

  create(leaderPlayerId: string, name: string, description?: string): GuildInfo {
    const validatedName = validateName(name);
    const nameLower = validatedName.toLowerCase();
    const desc = description?.trim() ?? "";

    const guildId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if player is already in a guild
    const existingMember = db
      .select({ id: guildMembers.id })
      .from(guildMembers)
      .where(eq(guildMembers.playerId, leaderPlayerId))
      .get();

    if (existingMember) {
      throw new GuildError("You are already in a guild", 409);
    }

    // Check if guild name is taken
    const existingName = db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.nameLower, nameLower))
      .get();

    if (existingName) {
      throw new GuildError("A guild with that name already exists", 409);
    }

    // Insert guild + member in a transaction
    const insertGuild = db
      .insert(guilds)
      .values({
        id: guildId,
        name: validatedName,
        nameLower,
        description: desc,
        leaderId: leaderPlayerId,
        memberCount: 1,
        maxMembers: 50,
        createdAt: now,
      })
      .run();

    const insertMember = db
      .insert(guildMembers)
      .values({
        id: crypto.randomUUID(),
        guildId,
        playerId: leaderPlayerId,
        role: "leader",
        joinedAt: now,
      })
      .run();

    log.info({ guildId, name: validatedName, playerId: leaderPlayerId }, "Guild created");

    return {
      id: guildId,
      name: validatedName,
      description: desc,
      leaderId: leaderPlayerId,
      memberCount: 1,
      maxMembers: 50,
      createdAt: now,
      isFull: false,
    };
  }

  // ─── List open guilds ────────────────────────────────────────

  listOpenGuilds(offset: number = 0, limit: number = 50): { guilds: GuildInfo[]; total: number } {
    const total = db
      .select({ count: sql<number>`count(*)` })
      .from(guilds)
      .where(lt(guilds.memberCount, guilds.maxMembers))
      .get();

    const rows = db
      .select()
      .from(guilds)
      .where(lt(guilds.memberCount, guilds.maxMembers))
      .orderBy(desc(guilds.memberCount))
      .limit(limit)
      .offset(offset)
      .all();

    return {
      guilds: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        leaderId: r.leaderId,
        memberCount: r.memberCount,
        maxMembers: r.maxMembers,
        createdAt: r.createdAt,
        isFull: r.memberCount >= r.maxMembers,
      })),
      total: total?.count ?? 0,
    };
  }

  // ─── Get single guild ────────────────────────────────────────

  getGuild(guildId: string): GuildInfo | null {
    const row = db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .get();

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      leaderId: row.leaderId,
      memberCount: row.memberCount,
      maxMembers: row.maxMembers,
      createdAt: row.createdAt,
      isFull: row.memberCount >= row.maxMembers,
    };
  }

  // ─── Get my guild ────────────────────────────────────────────

  getMyGuild(playerId: string): MyGuildResult | null {
    const membership = db
      .select({ guildId: guildMembers.guildId })
      .from(guildMembers)
      .where(eq(guildMembers.playerId, playerId))
      .get();

    if (!membership) return null;

    const guild = this.getGuild(membership.guildId);
    if (!guild) return null;

    // Get roster with player names and online status
    const memberRows = db
      .select({
        id: guildMembers.id,
        playerId: guildMembers.playerId,
        username: players.username,
        role: guildMembers.role,
        joinedAt: guildMembers.joinedAt,
      })
      .from(guildMembers)
      .innerJoin(players, eq(guildMembers.playerId, players.id))
      .where(eq(guildMembers.guildId, guild.id))
      .all();

    const members: GuildMemberInfo[] = memberRows.map((r) => ({
      id: r.id,
      playerId: r.playerId,
      username: r.username,
      role: r.role as "leader" | "member",
      joinedAt: r.joinedAt,
      isOnline: presenceService.isOnline(r.playerId),
    }));

    return { guild, members };
  }

  // ─── Join ────────────────────────────────────────────────────

  join(playerId: string, guildId: string): GuildInfo {
    // Check player not already in a guild
    const existingMember = db
      .select({ id: guildMembers.id })
      .from(guildMembers)
      .where(eq(guildMembers.playerId, playerId))
      .get();

    if (existingMember) {
      throw new GuildError("You are already in a guild", 409);
    }

    // Check guild exists and isn't full
    const guild = this.getGuild(guildId);
    if (!guild) throw new GuildError("Guild not found", 404);
    if (guild.isFull) throw new GuildError("Guild is full", 409);

    // Insert member and increment count in a transaction
    db.transaction(() => {
      db.insert(guildMembers)
        .values({
          id: crypto.randomUUID(),
          guildId,
          playerId,
          role: "member",
          joinedAt: new Date().toISOString(),
        })
        .run();

      db.update(guilds)
        .set({ memberCount: guild.memberCount + 1 })
        .where(eq(guilds.id, guildId))
        .run();
    });

    log.info({ guildId, playerId }, "Player joined guild");

    return { ...guild, memberCount: guild.memberCount + 1 };
  }

  // ─── Leave ───────────────────────────────────────────────────

  leave(playerId: string, guildId: string): void {
    const member = db
      .select({ id: guildMembers.id, role: guildMembers.role })
      .from(guildMembers)
      .where(and(eq(guildMembers.playerId, playerId), eq(guildMembers.guildId, guildId)))
      .get();

    if (!member) throw new GuildError("You are not a member of this guild", 404);
    if (member.role === "leader") throw new GuildError("Guild leader cannot leave. Use disband instead.", 409);

    const guild = this.getGuild(guildId);

    db.transaction(() => {
      db.delete(guildMembers)
        .where(eq(guildMembers.id, member.id))
        .run();

      if (guild) {
        db.update(guilds)
          .set({ memberCount: Math.max(0, guild.memberCount - 1) })
          .where(eq(guilds.id, guildId))
          .run();
      }
    });

    log.info({ guildId, playerId }, "Player left guild");
  }

  // ─── Kick ────────────────────────────────────────────────────

  kick(leaderPlayerId: string, targetPlayerId: string): void {
    // Verify the requester is a guild leader
    const leaderMember = db
      .select({ guildId: guildMembers.guildId })
      .from(guildMembers)
      .where(and(eq(guildMembers.playerId, leaderPlayerId), eq(guildMembers.role, "leader")))
      .get();

    if (!leaderMember) throw new GuildError("Only guild leaders can kick members", 403);

    // Find target membership
    const targetMember = db
      .select({ id: guildMembers.id, role: guildMembers.role })
      .from(guildMembers)
      .where(and(eq(guildMembers.playerId, targetPlayerId), eq(guildMembers.guildId, leaderMember.guildId)))
      .get();

    if (!targetMember) throw new GuildError("Player not found in your guild", 404);
    if (targetMember.role === "leader") throw new GuildError("Cannot kick the guild leader", 400);

    const guild = this.getGuild(leaderMember.guildId);

    db.transaction(() => {
      db.delete(guildMembers)
        .where(eq(guildMembers.id, targetMember.id))
        .run();

      if (guild) {
        db.update(guilds)
          .set({ memberCount: Math.max(0, guild.memberCount - 1) })
          .where(eq(guilds.id, leaderMember.guildId))
          .run();
      }
    });

    log.info({ guildId: leaderMember.guildId, targetPlayerId, byPlayerId: leaderPlayerId }, "Player kicked from guild");
  }

  // ─── Disband ─────────────────────────────────────────────────

  disband(leaderPlayerId: string, guildId: string): void {
    // Verify the requester is the guild leader
    const guild = this.getGuild(guildId);
    if (!guild) throw new GuildError("Guild not found", 404);
    if (guild.leaderId !== leaderPlayerId) throw new GuildError("Only the guild leader can disband", 403);

    // CASCADE deletes all member rows
    db.delete(guilds).where(eq(guilds.id, guildId)).run();

    log.info({ guildId, playerId: leaderPlayerId }, "Guild disbanded");
  }
}

export const guildService = new GuildService();
