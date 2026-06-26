import { v4 as uuidv4 } from "uuid";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { onlinePlayers, partyMembers } from "../socket/index.js";
import { getHeroRole, computeHeroStats, computeEquipmentStats, Rarity } from "@jake-idler/game";
import type { Equipment, CombatPosition, CombatRole } from "@jake-idler/game";

/**
 * In-memory party storage (parties are ephemeral, not persisted to DB).
 */
interface PartyInvite {
  fromPlayerId: string;
  toPlayerId: string;
}

interface Party {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  memberRoles: Record<string, CombatRole>; // playerId → role
  keyShareOptIns: Set<string>; // playerIds that allow their keys to be used
  invites: PartyInvite[];
  currentFloor: number;
  createdAt: string; // ISO timestamp string
}

/** In-memory bot hero data (not in DB). */
export interface BotHero {
  heroId: string;
  name: string;
  role: CombatRole;
  position: CombatPosition;
  level: number;
  equipped: Record<string, Equipment | null>;
}

const parties = new Map<string, Party>();
const playerPartyMap = new Map<string, string>(); // playerId → partyId
const botHeroes = new Map<string, BotHero>(); // heroId → bot data

/** Bot name pools by role. */
const BOT_NAMES: Record<string, string[]> = {
  tank: ["Ironwall", "Bulwark", "Aegis", "Bastion", "Sentinel", "Warden", "Paladin"],
  dps: ["Blade", "Shadow", "Storm", "Blaze", "Fang", "Reaper", "Venom"],
  healer: ["Mender", "Grace", "Lightweaver", "Embrace", "Salve", "Haven", "Oracle"],
};

/**
 * Generate scaled bot equipment for a given level and role.
 * Stats match the user's gear level so the bot is useful for testing.
 */
function generateBotEquipment(role: CombatRole, level: number): Record<string, Equipment | null> {
  const equipped: Record<string, Equipment | null> = {};

  // Use common rarity to match player's starter gear
  const rarity = Rarity.Common;
  const rarityFlat = 0;

  // Helper to make an equipment piece with correct stats
  const makeWeapon = (slot: string, type: string): Equipment => ({
    id: uuidv4(),
    name: "",
    slot: slot as any,
    type: type as any,
    level,
    rarity,
    stats: { atk: level * 5 + rarityFlat, def: 0, hp: 0 },
    effectiveLevel: level + 20,
  });

  const makeArmour = (slot: string): Equipment => ({
    id: uuidv4(),
    name: "",
    slot: slot as any,
    type: "universal" as any,
    level,
    rarity,
    stats: { atk: 0, def: level * 2 + rarityFlat, hp: 0 },
    effectiveLevel: level + 20,
  });

  const makeAccessory = (slot: string): Equipment => ({
    id: uuidv4(),
    name: "",
    slot: slot as any,
    type: "universal" as any,
    level,
    rarity,
    stats: { atk: 0, def: 0, hp: level * 2 + rarityFlat },
    effectiveLevel: level + 20,
  });

  // Armour slots — all get DEF
  for (const slot of ["helmet", "body", "legs", "boots", "gloves"]) {
    equipped[slot] = makeArmour(slot);
  }

  // Accessory slots — all get HP
  for (const slot of ["necklace", "leftRing", "rightRing", "leftEarring", "rightEarring"]) {
    equipped[slot] = makeAccessory(slot);
  }

  // Weapon slots — ATK
  equipped["rightHandWeapon"] = makeWeapon("rightHandWeapon", "melee");
  equipped["leftHand"] = makeWeapon("leftHand", "melee");

  return equipped;
}

class PartyService {
  /**
   * Create a new party.
   */
  create(leaderPlayerId: string, name: string): Party {
    // Check if already in a party
    if (playerPartyMap.has(leaderPlayerId)) {
      throw new Error("Already in a party");
    }

    const party: Party = {
      id: uuidv4(),
      name,
      leaderId: leaderPlayerId,
      memberIds: [leaderPlayerId],
      memberRoles: { [leaderPlayerId]: "dps" as CombatRole },
      keyShareOptIns: new Set(),
      invites: [],
      currentFloor: 1,
      createdAt: new Date().toISOString(),
    };

    parties.set(party.id, party);
    playerPartyMap.set(leaderPlayerId, party.id);

    return party;
  }

  /**
   * Invite a player to a party.
   */
  invite(leaderPlayerId: string, targetPlayerId: string): Party {
    const party = this.getPartyByLeader(leaderPlayerId);
    if (!party) throw new Error("You are not a party leader");
    if (party.memberIds.length >= 999) throw new Error("Party is full (max 999)");
    if (party.memberIds.includes(targetPlayerId)) throw new Error("Already in party");
    if (targetPlayerId === leaderPlayerId) throw new Error("Cannot invite yourself");

    // Check if target is already in a party
    if (playerPartyMap.has(targetPlayerId)) throw new Error("Player is already in a party");

    // Check for existing pending invite
    const existingInvite = party.invites.find((i) => i.toPlayerId === targetPlayerId);
    if (existingInvite) throw new Error("Invite already sent");

    party.invites.push({ fromPlayerId: leaderPlayerId, toPlayerId: targetPlayerId });
    return party;
  }

  /**
   * Join a party by accepting an invite.
   */
  join(playerId: string, partyId: string): Party {
    if (playerPartyMap.has(playerId)) throw new Error("Already in a party");

    const party = parties.get(partyId);
    if (!party) throw new Error("Party not found");
    if (party.memberIds.length >= 999) throw new Error("Party is full (max 999)");

    const inviteIdx = party.invites.findIndex((i) => i.toPlayerId === playerId);
    if (inviteIdx === -1) throw new Error("No pending invite for this party");

    party.invites.splice(inviteIdx, 1);
    party.memberIds.push(playerId);
    party.memberRoles[playerId] = "dps" as CombatRole;
    playerPartyMap.set(playerId, partyId);

    // Sync floor to highest among members
    this.syncFloor(party);

    return party;
  }

  /**
   * Leave a party.
   */
  leave(playerId: string): void {
    const partyId = playerPartyMap.get(playerId);
    if (!partyId) throw new Error("Not in a party");

    const party = parties.get(partyId);
    if (!party) throw new Error("Party not found");

    party.memberIds = party.memberIds.filter((id) => id !== playerId);
    playerPartyMap.delete(playerId);

    // Remove invites sent by this player
    party.invites = party.invites.filter((i) => i.fromPlayerId !== playerId);

    // If party is empty, disband
    if (party.memberIds.length === 0) {
      parties.delete(partyId);
      partyMembers.delete(partyId);
    } else if (party.leaderId === playerId) {
      // Transfer leadership
      party.leaderId = party.memberIds[0];
    }
  }

  /**
   * Get party info for a player.
   */
  getPartyByPlayer(playerId: string): Party | null {
    const partyId = playerPartyMap.get(playerId);
    if (!partyId) return null;
    return parties.get(partyId) || null;
  }

  /**
   * Get a party by ID.
   */
  getParty(partyId: string): Party | null {
    return parties.get(partyId) || null;
  }

  /**
   * Get pending invites for a player.
   */
  getInvites(playerId: string): Party[] {
    const result: Party[] = [];
    for (const party of parties.values()) {
      if (party.invites.some((i) => i.toPlayerId === playerId)) {
        result.push(party);
      }
    }
    return result;
  }

  /**
   * Sync party floor to the highest among members.
   */
  async syncFloor(party: Party): Promise<void> {
    // Load all member heroes to find highest floor
    let highestFloor = 1;
    for (const memberId of party.memberIds) {
      const rows = await db.select().from(heroes).where(eq(heroes.playerId, memberId)).limit(1);
      if (rows.length > 0 && rows[0].currentFloor > highestFloor) {
        highestFloor = rows[0].currentFloor;
      }
    }
    party.currentFloor = highestFloor;
  }

  /**
   * Transfer party leadership to another member.
   */
  transferLeader(currentLeaderId: string, targetPlayerId: string): void {
    const party = this.getPartyByLeader(currentLeaderId);
    if (!party) throw new Error("You are not the party leader");

    if (!party.memberIds.includes(targetPlayerId)) {
      throw new Error("Target player is not in your party");
    }

    if (targetPlayerId === currentLeaderId) {
      throw new Error("You are already the leader");
    }

    party.leaderId = targetPlayerId;
  }

  /**
   * Get serialisable party info for API responses.
   */
  async getPartyResponse(
    party: Party,
    playerNames: Record<string, string>,
  ): Promise<any> {
    // Compute positions for each member
    const members = await Promise.all(
      party.memberIds.map(async (id) => {
        // Check if this is a bot
        const bot = botHeroes.get(id);
        if (bot) {
          const computed = computeHeroStats({ level: bot.level, equipped: bot.equipped });
          const botRole = party.memberRoles[id] || bot.role;
          return {
            playerId: id,
            username: bot.name,
            isOnline: true,
            role: botRole,
            position: botRole === "tank" ? "front" as CombatPosition : botRole === "healer" ? "rear" as CombatPosition : "middle" as CombatPosition,
            stats: {
              atk: computed.atk.toNumber(),
              def: computed.def.toNumber(),
              hp: computed.hp.toNumber(),
            },
            isBot: true,
            keyShareOptedIn: false,
            photoUrl: null,
            equipped: bot.equipped,
          };
        }

        const rows = await db.select().from(heroes).where(eq(heroes.playerId, id)).limit(1);
        const role = party.memberRoles[id] || ("dps" as CombatRole);
        const position = role === "tank" ? "front" as CombatPosition : role === "healer" ? "rear" as CombatPosition : "middle" as CombatPosition;
        let stats = { atk: 0, def: 0, hp: 0 };

        if (rows.length > 0) {
          const row = rows[0];
          const equipped = row.equipped as Record<string, Equipment | null>;
          // Recompute item stats using current formula (old DB items have wrong values)
          for (const [slot, item] of Object.entries(equipped)) {
            if (item) {
              item.stats = computeEquipmentStats(slot, item.level, item.rarity as any);
            }
          }
          const heroStats = computeHeroStats({ level: row.level, equipped });
          stats = {
            atk: heroStats.atk.toNumber(),
            def: heroStats.def.toNumber(),
            hp: heroStats.hp.toNumber(),
          };
        }

        const rowEquipped = rows.length > 0 ? (rows[0].equipped as Record<string, Equipment | null>) : {};
        const photoUrl = rows.length > 0 ? (rows[0].photoUrl as string) : null;

        return {
          playerId: id,
          username: playerNames[id] || "Unknown",
          isOnline: onlinePlayers.has(id) && (onlinePlayers.get(id)?.size || 0) > 0,
          role,
          position,
          stats,
          isBot: false,
          keyShareOptedIn: party.keyShareOptIns.has(id),
          photoUrl,
          equipped: rowEquipped,
        };
      }),
    );

    return {
      id: party.id,
      name: party.name,
      leaderId: party.leaderId,
      memberIds: party.memberIds,
      memberCount: party.memberIds.length,
      maxSize: 999,
      members,
      currentFloor: party.currentFloor,
      createdAt: party.createdAt,
    };
  }

  /**
   * Add a bot to the party. The bot's stats are scaled to the leader's level.
   */
  addBot(leaderPlayerId: string, role: CombatRole): BotHero {
    const party = this.getPartyByLeader(leaderPlayerId);
    if (!party) throw new Error("You are not a party leader");
    if (party.memberIds.length >= 999) throw new Error("Party is full (max 999)");

    // Determine the bot's level from the leader's hero
    // We need to look up the leader's hero level synchronously from the bot cache or use a default
    // For simplicity, we'll get the level from DB in the route handler and pass it here
    // Actually, let's store it on the party temporarily
    const botId = `bot_${uuidv4()}`;
    const names = BOT_NAMES[role] || BOT_NAMES.dps;
    const name = names[Math.floor(Math.random() * names.length)];

    // We'll set the level in the route handler since we need async DB access
    // For now, create with level 1 placeholder — route handler will fix it
    const bot: BotHero = {
      heroId: botId,
      name: `${name} (Bot)`,
      role,
      position: (role === "tank" ? "front" : role === "healer" ? "rear" : "middle") as CombatPosition,
      level: 10, // floor to starter gear level, rescaled by route handler
      equipped: generateBotEquipment(role, 10),
    };

    botHeroes.set(botId, bot);
    party.memberIds.push(botId);
    party.memberRoles[botId] = role;

    return bot;
  }

  /**
   * Update a bot's level and recompute equipment.
   */
  updateBotLevel(botId: string, level: number): void {
    const bot = botHeroes.get(botId);
    if (!bot) return;
    // Floor bot level to at least 10 (matching starter gear level)
    const botLevel = Math.max(10, level);
    bot.level = botLevel;
    bot.equipped = generateBotEquipment(bot.role, botLevel);
  }

  /**
   * Remove a bot from the party.
   */
  removeBot(leaderPlayerId: string, botId: string): void {
    const party = this.getPartyByLeader(leaderPlayerId);
    if (!party) throw new Error("You are not a party leader");

    party.memberIds = party.memberIds.filter((id) => id !== botId);
    botHeroes.delete(botId);
  }

  /** Set a member's combat role. */
  setMemberRole(partyId: string, memberId: string, role: CombatRole): void {
    const party = parties.get(partyId);
    if (!party) throw new Error("Party not found");
    if (!party.memberIds.includes(memberId)) throw new Error("Member not in party");
    party.memberRoles[memberId] = role;
  }

  /** Toggle whether a member allows their keys to be used by the party. Returns new state. */
  toggleKeyShare(playerId: string): boolean {
    const partyId = playerPartyMap.get(playerId);
    if (!partyId) throw new Error("Not in a party");
    const party = parties.get(partyId);
    if (!party) throw new Error("Party not found");
    if (!party.memberIds.includes(playerId)) throw new Error("Not in party");

    if (party.keyShareOptIns.has(playerId)) {
      party.keyShareOptIns.delete(playerId);
      return false;
    } else {
      party.keyShareOptIns.add(playerId);
      return true;
    }
  }

  /** Check if a member has opted into key sharing. */
  isKeyShareOptedIn(playerId: string): boolean {
    const partyId = playerPartyMap.get(playerId);
    if (!partyId) return false;
    const party = parties.get(partyId);
    if (!party) return false;
    return party.keyShareOptIns.has(playerId);
  }

  /** Check if an ID is a bot. */
  isBot(heroId: string): boolean {
    return botHeroes.has(heroId);
  }

  /** Get a bot's data. */
  getBot(heroId: string): BotHero | undefined {
    return botHeroes.get(heroId);
  }

  /** Get all bot hero IDs for a party. */
  getPartyBotIds(partyId: string): string[] {
    const party = parties.get(partyId);
    if (!party) return [];
    return party.memberIds.filter((id) => botHeroes.has(id));
  }

  private getPartyByLeader(playerId: string): Party | null {
    const partyId = playerPartyMap.get(playerId);
    if (!partyId) return null;
    const party = parties.get(partyId);
    if (!party || party.leaderId !== playerId) return null;
    return party;
  }
}

export const partyService = new PartyService();
