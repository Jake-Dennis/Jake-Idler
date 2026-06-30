/** Game version — keep in sync with package.json. */
export const GAME_VERSION = "0.0.1";

// Re-export all types, enums, and constants from the types directory.
export * from "./types/index.js";

// Hero stat computation engine
export { computeHeroStats, computeEquipmentStats, createStarterEquipment, getHeroRole } from "./hero-stats.js";
export type { HeroComputedStats } from "./hero-stats.js";

// Combat engine
export {
  calculateDamage,
  calculateCrit,
  processRound,
  processCombat,
  generateMonster,
  generateBracketBoss,
  CRIT_MULTIPLIER,
} from "./combat-engine.js";
export type { CombatRound, CombatResult } from "./combat-engine.js";

// Dungeon floor system
export {
  generateFloor,
  getBracketEquipmentLevel,
  getKeyDropChance,
  rollKeyDrop,
  getFloorXpMultiplier,
  getFloorGoldMultiplier,
  getBracketName,
  getFloorDifficulty,
} from "./dungeon.js";

// Loot, shop, alchemy
export {
  processMonsterLoot,
  calculateGoldReward,
  rollShardDrops,
  generateEquipment,
  generateFloorLoot,
  calculateSalvageValue,
  getCraftCost,
  getCraftGoldCost,
  getSalvageShards,
  getShardSalvageValue,
  shardKey,
  CRAFTABLE_EQUIPMENT_TYPES,
} from "./loot.js";
export type { ShardDropResult, LootResult } from "./loot.js";

