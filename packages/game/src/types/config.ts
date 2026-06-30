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

  /** Number of floors in each bracket before a bracket boss encounter. */
  FLOORS_PER_BRACKET: 10,

  /** Number of regular monsters spawned on each floor. */
  MONSTERS_PER_FLOOR: 5,

  // ──────────────────────────────────────────────────────────
  //  Encounter scaling (per-player on a floor)
  // ──────────────────────────────────────────────────────────

  /**
   * Base number of trash mobs before party-size bonuses.
   * Trash = TRASH_BASE + floorNumber % 2 + TRASH_PER_PLAYER × (partySize − 1)
   */
  TRASH_BASE: 1,
  /** Extra trash mobs per additional party member (beyond the first). */
  TRASH_PER_PLAYER: 1,

  /**
   * Expected gear rarity per floor bracket for difficulty curve display.
   * Keys are floor numbers or ranges ("1-2"), values are rarity names.
   */
  FLOOR_RARITY: {
    "1-2": "common",
    "3-5": "uncommon",
    "6-10": "rare",
    "11-20": "epic",
    "21-999": "legendary",
  },

  /**
   * Number of equipped gear slots used for difficulty curve calculations.
   * Determines how many pieces of gear the player is expected to have.
   */
  GEAR_SLOTS: 7,

  /** Floor bosses always present on non-bracket floors. */
  BOSSES_BASE: 1,
  /** Extra bosses per additional party member. */
  BOSSES_PER_PLAYER: 0,

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
    [Rarity.Common]: 0,
    [Rarity.Uncommon]: 100,
    [Rarity.Rare]: 200,
    [Rarity.Epic]: 300,
    [Rarity.Legendary]: 400,
  } as Record<Rarity, number>,

  /**
   * Equipment stat = BASE x max(1, level/10)^FLOOR_SCALE_EXPONENT + RARITY_BONUS[rarity].
   *
   * Uses the same exponential scaling as monster stats so the ATK/DEF ratio
   * stays consistent across all floor brackets. Base values are at level 10.
   *
   * Example with current values:
   *   Level 10 common: 500 × 1^0.55 + 0 = 500 ATK
   *   Level 50 common: 500 × 5^0.55 + 0 ≈ 1200 ATK
   */
  WEAPON_BASE_ATK: 500,
  ARMOR_BASE_DEF: 50,
  ACC_BASE_HP: 200,

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

  // ──────────────────────────────────────────────────────────
  //  Monster stat formula constants
  // ──────────────────────────────────────────────────────────

  /**
   * Base monster stats at floor 1 (before floor scaling).
   * Monster stat = MONSTER_BASE_xxx × floor^FLOOR_SCALE_EXPONENT × (boss multiplier)
   */
  MONSTER_BASE_ATK: 50,
  MONSTER_BASE_DEF: 5,
  MONSTER_BASE_HP: 1500,

  /**
   * Boss stat multipliers relative to a regular monster on the same floor.
   */
  BOSS_ATK_MULTIPLIER: 2,
  BOSS_DEF_MULTIPLIER: 2,
  BOSS_HP_MULTIPLIER: 2,

  /**
   * Bracket boss (floor 10, 20, 30…) additional HP multiplier
   * on top of the boss multiplier.
   */
  BRACKET_BOSS_HP_MULTIPLIER: 2.5,

  // ──────────────────────────────────────────────────────────
  //  Crit formula constants
  // ──────────────────────────────────────────────────────────

  /** Flat critical strike chance (0–1). */
  CRIT_CHANCE: 0.1,
  /** Critical strike damage multiplier. */
  CRIT_MULTIPLIER: 1.5,

  // ──────────────────────────────────────────────────────────
  //  XP / Gold reward constants
  // ──────────────────────────────────────────────────────────

  /** Base XP from a regular monster before floor scaling. */
  MONSTER_XP_BASE: 20,
  /** Base gold from a regular monster before floor scaling. */
  MONSTER_GOLD_BASE: 10,
  /** Boss XP/gold multiplier vs regular monster. */
  BOSS_XP_MULTIPLIER: 3,
  BOSS_GOLD_MULTIPLIER: 3,
  /** Base XP/gold for bracket bosses (already accounting for boss mul). */
  BRACKET_BOSS_XP_BASE: 50,
  BRACKET_BOSS_GOLD_BASE: 30,
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
