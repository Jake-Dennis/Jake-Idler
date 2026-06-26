import { Rarity } from "./enums.js";
import type BigNumber from "break_infinity.js";
import type { Hero } from "./hero.js";
import type { Party } from "./social.js";

/**
 * Core game configuration constants.
 *
 * All balance-tuning knobs live here so they can be adjusted in one place
 * without scattering magic numbers across the codebase.
 *
 * Runtime overrides from balancing.json are applied via {@link applyConfigOverrides}.
 */
const BASE_CONFIG = {
  /** Maximum number of items a hero can hold in their inventory. */
  MAX_INVENTORY: 30,

  /** Maximum number of heroes in a single party. */
  PARTY_MAX_SIZE: 999,

  /** Interval in milliseconds between server-side game ticks. */
  TICK_INTERVAL_MS: 1_000,

  /** Number of floors in each bracket before a bracket boss encounter. */
  FLOORS_PER_BRACKET: 10,

  /** Number of regular monsters spawned on each floor. */
  MONSTERS_PER_FLOOR: 5,

  /**
   * Base drop rates (percentages) for each rarity tier at floor 1.
   * Scales upward with floor depth:
   * `adjustedRate = baseRate * (1 + floor * FLOOR_SCALE_FACTOR)`
   */
  BASE_DROP_RATES: {
    [Rarity.Common]: 70,
    [Rarity.Uncommon]: 20,
    [Rarity.Rare]: 8,
    [Rarity.Epic]: 1.5,
    [Rarity.Legendary]: 0.5,
  } as Record<Rarity, number>,

  /**
   * Per-rarity flat bonus added to equipment base level
   * to compute effective level.
   */
  RARITY_BONUS: {
    [Rarity.Common]: 10,
    [Rarity.Uncommon]: 20,
    [Rarity.Rare]: 30,
    [Rarity.Epic]: 40,
    [Rarity.Legendary]: 50,
  } as Record<Rarity, number>,

  // ──────────────────────────────────────────────────────────
  //  Stat scaling formula constants
  // ──────────────────────────────────────────────────────────

  /**
   * Equipment stat = level + RARITY_BONUS[rarity].
   * No multipliers or scale factors — purely linear.
   */

  /**
   * Hero-level stat multiplier.
   * Set to 0 — all stats come from gear only.
   */
  HERO_STAT_MULTIPLIER: 0,

  /**
   * Floor scaling exponent for monster stats.
   * Monster stat = `baseMonsterStat * floor^FLOOR_SCALE_EXPONENT`
   *
   * Using sqrt(floor) — even math, clean milestones:
   *   floor 1: 1×    floor 4: 2×    floor 9: 3×    floor 16: 4×
   */
  FLOOR_SCALE_EXPONENT: 0.3,

  /**
   * Floor scaling factor for drop rate adjustments.
   * Drop rate at floor N = `baseRate * (1 + N * FLOOR_SCALE_FACTOR)`
   */
  FLOOR_SCALE_FACTOR: 0.02,

  /**
   * Gold reward multiplier per floor.
   * Gold from monster = `baseGoldReward * (1 + floor * GOLD_SCALE_FACTOR)`
   */
  GOLD_SCALE_FACTOR: 0.1,

  /**
   * Number of shards obtained when salvaging equipment of each rarity.
   */
  SALVAGE_SHARDS: {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 4,
    [Rarity.Epic]: 8,
    [Rarity.Legendary]: 16,
  } as Record<Rarity, number>,

  /**
   * Crafting cost (in shards) to create equipment of each rarity.
   */
  CRAFT_COST: {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 1,
    [Rarity.Rare]: 1,
    [Rarity.Epic]: 1,
    [Rarity.Legendary]: 1,
  } as Record<Rarity, number>,

  /**
   * Maximum key drop chance for boss kills (as a decimal 0-1).
   * Scales linearly with floor position within bracket:
   *   floor pos 1 → KEY_DROP_CHANCE_MIN (below)
   *   floor pos 10 → KEY_DROP_CHANCE_MAX
   * Bracket bosses (floor 10, 20, 30...) use the max chance.
   */
  KEY_DROP_CHANCE_MAX: 0.25,
} as const;

/** Runtime-mutable version of GameConfig. Starts as a copy of the base config. */
const runtimeOverrides: Record<string, unknown> = {};

/**
 * Public config object. Returns base values by default; runtime overrides
 * applied via {@link applyConfigOverrides} take precedence.
 *
 * IMPORTANT: Only read — do NOT mutate directly. Use applyConfigOverrides().
 */
export const GameConfig: typeof BASE_CONFIG = new Proxy(BASE_CONFIG as any, {
  get(target, prop: string) {
    if (prop in runtimeOverrides) {
      return (runtimeOverrides as any)[prop];
    }
    return (target as any)[prop];
  },
});

/**
 * Apply runtime overrides from balancing.json.
 * Supports both flat keys (FLOOR_SCALE_EXPONENT) and nested objects (BASE_DROP_RATES).
 */
export function applyConfigOverrides(overrides: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (!(key in BASE_CONFIG)) continue;
    const baseVal = (BASE_CONFIG as any)[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value) && typeof baseVal === "object") {
      // Merge nested objects (e.g. BASE_DROP_RATES)
      runtimeOverrides[key] = { ...baseVal, ...value };
    } else {
      runtimeOverrides[key] = value;
    }
  }
}

/** Type-safe keys for GameConfig (useful for dynamic lookups). */
export type GameConfigKey = keyof typeof GameConfig;

/**
 * Serializable game state snapshot for persistence.
 *
 * Contains the minimum data needed to reconstruct a hero's progress
 * from a database or save file. No class instances or functions —
 * pure data only.
 */
export interface GameState {
  /** The hero's full state. */
  hero: Hero;

  /** Active party, if the hero is in one. `null` when solo. */
  party: Party | null;

  /** ISO 8601 timestamp of when this state was last saved. */
  savedAt: string;

  /** Schema version — increment on breaking changes to enable migrations. */
  version: number;
}
