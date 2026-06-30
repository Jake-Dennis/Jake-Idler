import BigNumber from "break_infinity.js";
import { v4 as uuidv4 } from "uuid";
import { GameConfig, Rarity, type Equipment } from "./types/index.js";
import { computeEquipmentStats, getBracketEquipmentLevel } from "./index.js";

// ─── Shard Drop System ──────────────────────────────────────────

/**
 * Result of a shard drop roll.
 */
export interface ShardDropResult {
  rarity: Rarity;
  amount: number;
  bracketLevel: number;
}

/**
 * Result of processing loot after a monster kill.
 */
export interface LootResult {
  gold: number;
  shards: ShardDropResult[];
  keyDropped: boolean;
}

/**
 * Get the adjusted drop rate for a given floor and rarity.
 *
 * Formula:
 *   adjustedRate = baseRate * (1 + (floorWithinBracket - 1) * FLOOR_SCALE_FACTOR)
 *
 * Drop rates reset at the start of each bracket (floor 1, 11, 21, etc.).
 * Rates improve slightly within the bracket as you go deeper.
 *
 * Floor bosses get a 1.5x multiplier.
 * Bracket bosses get a 3x multiplier.
 */
export function getAdjustedDropRate(
  floorNumber: number,
  rarity: Rarity,
  bossMultiplier: number = 1.0,
): number {
  const baseRate = GameConfig.BASE_DROP_RATES[rarity];
  const floorWithinBracket = floorNumber % GameConfig.FLOORS_PER_BRACKET || GameConfig.FLOORS_PER_BRACKET;
  const scaledRate = baseRate * (1 + (floorWithinBracket - 1) * GameConfig.FLOOR_SCALE_FACTOR);
  return scaledRate * bossMultiplier;
}

/**
 * Roll for shard drops based on the floor and boss type.
 *
 * @param floorNumber     Current floor number.
 * @param bossMultiplier  Additional drop rate multiplier (1.0 for trash, 1.5 for floor boss, 3.0 for bracket boss).
 * @returns Array of shard drops (usually 0-1, but bracket bosses may drop multiple).
 */
export function rollShardDrops(
  floorNumber: number,
  bossMultiplier: number = 1.0,
): ShardDropResult[] {
  // Roll for each rarity in descending order (legendary first, common last).
  // Each kill can drop AT MOST 1 shard. Once a rarity hits, stop.
  const bracketLevel = getBracketEquipmentLevel(floorNumber);
  const rarities = [
    Rarity.Legendary,
    Rarity.Epic,
    Rarity.Rare,
    Rarity.Uncommon,
    Rarity.Common,
  ];

  for (const rarity of rarities) {
    const adjustedRate = getAdjustedDropRate(floorNumber, rarity, bossMultiplier);
    if (Math.random() * 100 < adjustedRate) {
      return [{ rarity, amount: 1, bracketLevel }];
    }
  }

  return [];
}

/**
 * Calculate gold reward for a monster kill.
 *
 * @param floorNumber     Current floor number.
 * @param bossMultiplier  Gold multiplier (1.0 for trash, 3.0 for floor boss, 5.0 for bracket boss).
 * @returns Amount of gold.
 */
export function calculateGoldReward(
  floorNumber: number,
  bossMultiplier: number = 1.0,
): number {
  const baseGold = 10;
  const floorScale = Math.pow(floorNumber, GameConfig.FLOOR_SCALE_EXPONENT);
  return Math.round(baseGold * floorScale * bossMultiplier);
}

/**
 * Process all loot for a monster kill.
 *
 * @param floorNumber    Current floor number.
 * @param isBoss         Whether the defeated monster is a boss.
 * @param isBracketBoss  Whether the defeated monster is a bracket boss.
 * @returns The loot result.
 */
export function processMonsterLoot(
  floorNumber: number,
  isBoss: boolean,
  isBracketBoss: boolean,
): LootResult {
  const bossMul = isBracketBoss ? 3.0 : isBoss ? 1.5 : 1.0;
  const goldMul = isBracketBoss ? 5.0 : isBoss ? 3.0 : 1.0;

  return {
    gold: calculateGoldReward(floorNumber, goldMul),
    // Shards drop from floor bosses and bracket bosses only (not trash)
    shards: isBoss ? rollShardDrops(floorNumber, bossMul) : [],
    keyDropped: false, // key drops handled by dungeon service
  };
}

// ─── Item Generation (for Shop crafting) ────────────────────────

/**
 * Available equipment type variants per slot for crafting.
 */
export const CRAFTABLE_EQUIPMENT_TYPES: Record<string, string[]> = {
  rightHandWeapon: ["melee", "range", "mage"],
  leftHand: ["melee", "range", "mage"],
  helmet: ["universal"],
  body: ["universal"],
  legs: ["universal"],
  boots: ["universal"],
  gloves: ["universal"],
  necklace: ["universal"],
  leftRing: ["universal"],
  rightRing: ["universal"],
  leftEarring: ["universal"],
  rightEarring: ["universal"],
};

/**
 * Generate a random equipment item with the given parameters.
 *
 * @param slot         The equipment slot.
 * @param type         The equipment type (melee/mage/range/universal).
 * @param level        The base level of the equipment (5, 10, 15, ...).
 * @param rarity       The rarity tier.
 * @returns A fully generated equipment item.
 */
export function generateEquipment(
  slot: string,
  type: string,
  level: number,
  rarity: Rarity,
): Equipment {
  const rarityMult = GameConfig.RARITY_MULTIPLIER[rarity] ?? 1.0;

  return {
    id: uuidv4(),
    name: "",
    slot: slot as any,
    type: type as any,
    level,
    rarity,
    stats: computeEquipmentStats(slot, level, rarity),
    effectiveLevel: level,
  };
}

/**
 * Generate a random equipment item for a floor-appropriate level and rarity.
 * Used for loot drops from bosses.
 *
 * @param floorNumber  The floor where the item drops.
 * @param slot         Optional specific slot (random if omitted).
 * @param rarity       Optional specific rarity (random if omitted).
 * @returns A generated equipment item.
 */
export function generateFloorLoot(
  floorNumber: number,
  slot?: string,
  rarity?: Rarity,
): Equipment {
  const bracketLevel = getBracketEquipmentLevel(floorNumber);

  // Pick a random slot if not specified
  const slots = Object.keys(CRAFTABLE_EQUIPMENT_TYPES);
  const chosenSlot = slot || slots[Math.floor(Math.random() * slots.length)];

  // Pick a random type for the slot
  const types = CRAFTABLE_EQUIPMENT_TYPES[chosenSlot] || ["universal"];
  const chosenType = types[Math.floor(Math.random() * types.length)];

  // Roll rarity if not specified
  let chosenRarity = rarity;
  if (!chosenRarity) {
    const rarities = [Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Epic, Rarity.Legendary];
    const weights = [60, 25, 10, 4, 1];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < rarities.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        chosenRarity = rarities[i];
        break;
      }
    }
  }

  return generateEquipment(chosenSlot, chosenType, bracketLevel, chosenRarity!);
}

// ─── Alchemy ───────────────────────────────────────────────────

/**
 * Calculate the gold value of salvaging an item.
 *
 * Formula:
 *   goldValue = itemLevel * rarityMultiplier * 3
 *
 * Rarity multipliers:
 *   Common:    2x
 *   Uncommon:  5x
 *   Rare:     12x
 *   Epic:     30x
 *   Legendary: 80x
 */
export function calculateSalvageValue(equipment: Equipment): number {
  const mul = rarityMultiplier(equipment.rarity);
  return equipment.level * mul * 3;
}

/** Compound key for bracket-level shards: `{rarity}_{bracketLevel}` (e.g. `rare_10`). */
export function shardKey(rarity: string, bracketLevel: number): string {
  return rarity + '_' + bracketLevel;
}

/** Rarity multiplier shared by salvage value and craft gold cost. */
function rarityMultiplier(rarity: string): number {
  const m: Record<string, number> = { common: 2, uncommon: 5, rare: 12, epic: 30, legendary: 80 };
  return m[rarity] || 1;
}

/**
 * Gold cost to craft an item — ~2x salvage so salvaging isn't free item generation.
 */
export function getCraftGoldCost(rarity: Rarity, bracketLevel: number): number {
  return bracketLevel * rarityMultiplier(rarity) * 7;
}

/**
 * Gold received when salvaging a single shard of the given rarity and bracket level.
 * ~1/4 of craft cost so salvaging shards is a gold source but crafting gear costs net gold.
 */
export function getShardSalvageValue(rarity: Rarity, bracketLevel: number): number {
  return Math.round(bracketLevel * rarityMultiplier(rarity) * 1.75);
}

/**
 * Calculate the shard cost to craft an item of the given rarity.
 * Uses GameConfig.CRAFT_COST (1 per rarity — each shard type crafts its own tier).
 */
export function getCraftCost(rarity: Rarity): number {
  return GameConfig.CRAFT_COST[rarity];
}

/**
 * Calculate the number of shards obtained from salvaging an item of the given rarity.
 * Uses GameConfig.SALVAGE_SHARDS.
 */
export function getSalvageShards(rarity: Rarity): number {
  return GameConfig.SALVAGE_SHARDS[rarity];
}
