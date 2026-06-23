import { Rarity } from "./enums.js";

/**
 * Represents a shard drop from salvaging equipment.
 */
export interface ShardDrop {
  /** The rarity tier of the shards. */
  rarity: Rarity;
  /** Number of shards in this drop. */
  amount: number;
}

/**
 * Drop rate entry for a specific rarity tier.
 */
export interface DropRateEntry {
  /** The rarity tier. */
  rarity: Rarity;
  /** Drop probability as a percentage (0–100). */
  rate: number;
}


