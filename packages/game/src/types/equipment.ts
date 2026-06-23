import type BigNumber from "break_infinity.js";
import { EquipmentSlot, EquipmentType, Rarity } from "./enums.js";

/**
 * The three core combat stats for equipment pieces.
 * Attack (ATK) comes from weapons, Defence (DEF) from armour,
 * and Hit Points (HP) from accessories.  SPD is no longer an
 * equipment stat — hero SPD is derived solely from hero level.
 */
export interface StatBlock {
  /** Attack power — determined by weapon slots. */
  atk: number;
  /** Defence — determined by armour slots. */
  def: number;
  /** Hit points — determined by accessory slots. */
  hp: number;
}

/**
 * Aggregated stat block that may use {@link BigNumber} for values that
 * can exceed `Number.MAX_SAFE_INTEGER` in late-game scenarios.
 */
export interface BigNumberStatBlock {
  /** Attack power. */
  atk: BigNumber;
  /** Defence. */
  def: BigNumber;
  /** Hit points. */
  hp: BigNumber;
  /** Speed. */
  spd: BigNumber;
}

/**
 * A single piece of equipment that can be equipped by a hero or stored
 * in the inventory.
 *
 * Equipment levels advance in steps of 5 (5, 10, 15, 20 …).
 * The *effective level* used for stat calculations equals
 * `level + RARITY_BONUS[rarity]`.
 */
export interface Equipment {
  /** Unique identifier for this equipment instance. */
  id: string;
  /** Display name (e.g. "Iron Longsword"). */
  name: string;
  /** The slot this equipment occupies. */
  slot: EquipmentSlot;
  /** The class archetype this equipment belongs to. */
  type: EquipmentType;
  /** Base level of the equipment (increments of 5: 5, 10, 15 …). */
  level: number;
  /** Rarity tier of this equipment. */
  rarity: Rarity;
  /** Raw stat values on this piece before any scaling. */
  stats: StatBlock;
  /**
   * Effective level used for stat calculations.
   * Computed as `level + RARITY_BONUS[rarity]`.
   */
  effectiveLevel: number;
}

/**
 * A material (shard) obtained from salvaging equipment.
 * Shards are used for crafting and upgrading.
 */
export interface Shard {
  /** The rarity tier of the original equipment this shard came from. */
  rarity: Rarity;
  /** Number of shards of this rarity the hero owns. */
  amount: number;
}
