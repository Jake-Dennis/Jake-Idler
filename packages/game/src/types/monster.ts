import type BigNumber from "break_infinity.js";

/**
 * A dungeon monster encountered during idle combat.
 *
 * Each floor spawns a set of regular monsters and a floor boss.
 * Every 10 floors (10, 20, 30 …) a bracket boss guards the transition
 * to the next bracket.
 */
export interface Monster {
  /** Unique identifier for this monster instance. */
  id: string;
  /** Display name (e.g. "Goblin Scout", "Shadow Wraith"). */
  name: string;
  /** The dungeon floor this monster spawns on. */
  floor: number;
  /** Whether this monster is the floor's boss encounter. */
  isBoss: boolean;
  /** Whether this monster is a bracket boss (floors 10, 20, 30 …). */
  isBracketBoss: boolean;

  /** Combat stats for this monster. Scaled by floor number. */
  stats: {
    /** Current / max hit points. */
    hp: BigNumber;
    /** Attack power. */
    atk: BigNumber;
    /** Defence value. */
    def: BigNumber;
    /** Speed (determines turn order). */
    spd: BigNumber;
  };

  /** Base XP reward for defeating this monster. */
  xpReward: BigNumber;
  /** Gold reward for defeating this monster. */
  goldReward: BigNumber;
}
