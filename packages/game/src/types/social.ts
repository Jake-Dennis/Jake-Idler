import type BigNumber from "break_infinity.js";
import type { StatBlock } from "./equipment.js";
import type { CombatPosition, CombatRole } from "./enums.js";

/**
 * Online status of a player.
 */
export type OnlineStatus = "online" | "offline" | "pending";

/**
 * A multiplayer party that cooperatively clears dungeon floors.
 * Parties share floor progress — the party's floor is the deepest floor
 * unlocked by any member.
 */
export interface Party {
  /** Unique identifier for this party. */
  id: string;
  /** The heroes currently in this party (max {@link GameConfig.PARTY_MAX_SIZE}). */
  members: PartyMember[];
  /** Maximum number of members allowed in a party. */
  maxSize: number;

  /**
   * The party's current floor — equal to the deepest floor unlocked
   * by any single member.
   */
  currentFloor: number;

  /** ISO 8601 timestamp of when this party was created. */
  createdAt: string;
}

/**
 * A hero's representation within a party context.
 * Contains enough info for combat display and online tracking.
 */
export interface PartyMember {
  /** The hero's unique ID. */
  heroId: string;
  /** The hero's display name (denormalized for convenience). */
  heroName: string;
  /** The player's username who owns this hero. */
  playerName: string;

  /** Aggregated combat stats for this hero. */
  stats: StatBlock;

  /** Whether the player controlling this hero is currently online. */
  isOnline: boolean;

  /** The hero's current floor. */
  currentFloor: number;

  /** Formation position — auto-assigned based on equipped gear. */
  position: CombatPosition;
  /** Combat role — derived from equipped gear (tank/dps/healer). */
  role: CombatRole;
}

/**
 * A friend relationship between two players.
 */
export interface Friend {
  /** Unique identifier for this friendship record. */
  id: string;
  /** The friend's username. */
  username: string;
  /** The friend's hero display name. */
  heroName: string;

  /** Current online / relationship status. */
  status: OnlineStatus;

  /** The deepest floor the friend has currently unlocked. */
  currentFloor: number;
}
