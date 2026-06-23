import type BigNumber from "break_infinity.js";
import { EquipmentSlot, Rarity } from "./enums.js";
import type { BigNumberStatBlock, Equipment, StatBlock } from "./equipment.js";

/**
 * The player's hero — the core entity that progresses through the dungeon.
 *
 * Heroes gain XP by defeating monsters, equip gear found as loot, and
 * advance through dungeon floors. All combat stats are derived from
 * equipped gear via {@link computeHeroStats}.
 */
export interface Hero {
  /** Unique identifier for this hero. */
  id: string;
  /** Player-chosen display name. */
  name: string;
  /** Current hero level (determines base stat scaling). */
  level: number;
  /** Accumulated experience points toward the next level. */
  xp: number;

  /**
   * Currently equipped items indexed by slot.
   * A slot value of `null` means nothing is equipped there.
   */
  equipped: Record<EquipmentSlot, Equipment | null>;

  /**
   * Combat stats derived from all equipped gear combined with hero level.
   * May use {@link BigNumber} at extreme levels.
   */
  computedStats: BigNumberStatBlock;

  /** Raw stat breakdown from equipment only (before hero-level scaling). */
  baseEquipmentStats: StatBlock;

  /** Currency earned from defeating monsters. */
  gold: BigNumber;

  /** The deepest dungeon floor the hero has currently unlocked. */
  currentFloor: number;

  /**
   * Items in the hero's inventory awaiting equip or salvage.
   * Maximum capacity is {@link GameConfig.MAX_INVENTORY}.
   */
  inventory: Equipment[];

  /**
   * Accumulated crafting shards indexed by rarity.
   * Obtained by salvaging equipment of the corresponding tier.
   */
  shards: Record<Rarity, number>;

  /** Timestamp (ms) of the last recorded game tick for offline progress. */
  lastTickTimestamp: number;

  /** ISO 8601 timestamp of when this hero was created. */
  createdAt: string;

  /** ISO 8601 timestamp of the last time this hero was updated. */
  updatedAt: string;
}
