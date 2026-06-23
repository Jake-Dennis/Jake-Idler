import type { Monster } from "./monster.js";

/**
 * Represents a single dungeon floor.
 *
 * Floors are grouped into *brackets* of 10. Each bracket has a bracket
 * boss at floor 10, 20, 30, etc. that must be defeated to unlock the
 * next bracket.
 */
export interface Floor {
  /** The absolute floor number (1-indexed). */
  floorNumber: number;
  /**
   * The bracket this floor belongs to.
   * Floors 1–10 → bracket 1, 11–20 → bracket 2, etc.
   */
  bracketNumber: number;

  /**
   * Regular monsters spawned on this floor.
   * Excludes the floor boss and bracket boss.
   */
  monsters: Monster[];

  /** The boss that guards this specific floor. Must be defeated to progress. */
  floorBoss: Monster;

  /**
   * The bracket boss — only present on floors 10, 20, 30, etc.
   * `null` on all other floors.
   */
  bracketBoss: Monster | null;

  /** `true` if this floor has a bracket boss encounter. */
  isBracketBoss: boolean;
}
