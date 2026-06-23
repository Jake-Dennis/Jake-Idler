import BigNumber from "break_infinity.js";
import { GameConfig, type Monster, type Floor } from "./types/index.js";
import { generateMonster, generateBracketBoss } from "./combat-engine.js";

/**
 * Generate a dungeon floor with monsters and bosses.
 */
export function generateFloor(floorNumber: number): Floor {
  const bracketNumber = Math.ceil(floorNumber / GameConfig.FLOORS_PER_BRACKET);
  const isBracketBossFloor = floorNumber % GameConfig.FLOORS_PER_BRACKET === 0;

  // Generate regular monsters (3-5 per floor)
  const monsterCount = 3 + (floorNumber % 3);
  const monsters: Monster[] = [];
  for (let i = 0; i < monsterCount; i++) {
    monsters.push(generateMonster(floorNumber, false));
  }

  // Floor boss (always present)
  const floorBoss = generateMonster(floorNumber, true);

  // Bracket boss (only on floors 10, 20, 30, etc.)
  const bracketBoss = isBracketBossFloor ? generateBracketBoss(bracketNumber) : null;

  return {
    floorNumber,
    bracketNumber,
    monsters,
    floorBoss,
    bracketBoss,
    isBracketBoss: isBracketBossFloor,
  };
}

/**
 * Calculate the equipment level for gear dropped in a given floor bracket.
 */
export function getBracketEquipmentLevel(floorNumber: number): number {
  const bracketNumber = Math.ceil(floorNumber / GameConfig.FLOORS_PER_BRACKET);
  return bracketNumber * 10;
}

/**
 * Calculate the key drop chance for a given floor.
 */
export function getKeyDropChance(floorNumber: number): number {
  if (floorNumber % GameConfig.FLOORS_PER_BRACKET === 0) return 0;
  const floorWithinBracket = floorNumber % GameConfig.FLOORS_PER_BRACKET || GameConfig.FLOORS_PER_BRACKET;
  if (floorWithinBracket === GameConfig.FLOORS_PER_BRACKET) return 0;
  return (floorWithinBracket / GameConfig.FLOORS_PER_BRACKET) * 0.15;
}

/**
 * Determine whether a key drops for the given floor based on a random roll.
 */
export function rollKeyDrop(floorNumber: number, randomValue: number = Math.random()): boolean {
  const chance = getKeyDropChance(floorNumber);
  return randomValue < chance;
}

/**
 * Calculate the XP multiplier for a given floor.
 */
export function getFloorXpMultiplier(floorNumber: number): number {
  return 1 + (floorNumber - 1) * 0.1;
}

/**
 * Calculate the gold multiplier for a given floor.
 */
export function getFloorGoldMultiplier(floorNumber: number): number {
  return 1 + (floorNumber - 1) * 0.08;
}

/**
 * Get the display name for a floor bracket.
 */
export function getBracketName(bracketNumber: number): string {
  const names = [
    "The Abandoned Mines",
    "The Shadow Forest",
    "The Crystal Caverns",
    "The Molten Depths",
    "The Sky Citadel",
  ];
  if (bracketNumber <= names.length) {
    return names[bracketNumber - 1];
  }
  return `The Void - Level ${bracketNumber}`;
}

/**
 * Generate a floor difficulty indicator (1-5 stars).
 */
export function getFloorDifficulty(floorNumber: number, heroLevel: number): number {
  if (heroLevel <= 0) return 5;
  const effectiveMonsterLevel = Math.pow(floorNumber, GameConfig.FLOOR_SCALE_EXPONENT);
  const ratio = effectiveMonsterLevel / heroLevel;

  if (ratio < 0.5) return 1;
  if (ratio < 1.0) return 2;
  if (ratio < 2.0) return 3;
  if (ratio < 4.0) return 4;
  return 5;
}
