import BigNumber from "break_infinity.js";
import { GameConfig, type BigNumberStatBlock, type Monster } from "./types/index.js";

/**
 * Simple counter-based ID for procedurally generated monsters.
 */
let monsterIdCounter = 0;
function nextMonsterId(): string {
  return `monster_${Date.now()}_${++monsterIdCounter}`;
}

/**
 * Result of a single combat round between a hero and a monster.
 */
export interface CombatRound {
  /** Damage dealt by the hero to the monster this round. */
  damageDealt: number;
  /** Whether the hit was a critical strike. */
  wasCritical: boolean;
  /** Remaining monster HP after this round. */
  monsterHpRemaining: number;
  /** Whether the monster was defeated this round. */
  monsterDefeated: boolean;
}

/**
 * Result of a full combat encounter (one hero vs one monster).
 */
export interface CombatResult {
  /** The monster's ID. */
  monsterId: string;
  /** Combat rounds executed. */
  rounds: CombatRound[];
  /** Total rounds taken. */
  totalRounds: number;
  /** Whether the hero won. */
  heroWon: boolean;
  /** XP earned from this combat. */
  xpEarned: number;
  /** Gold earned from this combat. */
  goldEarned: number;
}

// ─── Damage Calculation ──────────────────────────────────────────

/**
 * Calculate base damage dealt from attacker ATK to defender DEF.
 *
 * Formula:
 *   baseDamage = max(0, attackerATK - defenderDEF)
 *
 * Minimum 0 ensures tank with high DEF takes no damage.
 */
export function calculateDamage(attackerAtk: number, defenderDef: number): number {
  return Math.max(0, Math.round(attackerAtk - defenderDef));
}

/**
 * Flat 10% critical strike chance for all attacks.
 */
export function calculateCrit(): boolean {
  return Math.random() < 0.1;
}

/**
 * Critical strike damage multiplier (1.5x by default).
 */
export const CRIT_MULTIPLIER = 1.5;

// ─── Single Round ────────────────────────────────────────────────

/**
 * Process one round of combat between a hero and a monster.
 */
export function processRound(
  heroStats: { atk: number },
  monsterHp: number,
  monsterDef: number,
): CombatRound {
  const wasCritical = calculateCrit();
  const multiplier = wasCritical ? CRIT_MULTIPLIER : 1.0;

  const baseDmg = calculateDamage(heroStats.atk, monsterDef);
  const damageDealt = Math.round(baseDmg * multiplier);

  const newHp = Math.max(0, monsterHp - damageDealt);

  return {
    damageDealt,
    wasCritical,
    monsterHpRemaining: newHp,
    monsterDefeated: newHp <= 0,
  };
}

// ─── Full Encounter ──────────────────────────────────────────────

/**
 * Run a full combat encounter (hero vs one monster).
 * Combat runs tick-by-tick (one round per tick) until one side falls.
 */
export function processCombat(
  heroStats: { atk: number },
  monster: { stats: { atk: number; def: number; hp: number; spd: number }; xpReward: number; goldReward: number },
): CombatResult {
  const rounds: CombatRound[] = [];
  let monsterHp = monster.stats.hp;

  while (monsterHp > 0) {
    const round = processRound(heroStats, monsterHp, monster.stats.def);
    rounds.push(round);
    monsterHp = round.monsterHpRemaining;

    if (rounds.length > 100) break;
  }

  const heroWon = monsterHp <= 0;

  return {
    monsterId: nextMonsterId(),
    rounds,
    totalRounds: rounds.length,
    heroWon,
    xpEarned: heroWon ? monster.xpReward : 0,
    goldEarned: heroWon ? monster.goldReward : 0,
  };
}

// ─── Monster Generation ───────────────────────────────────────────

/**
 * Base monster stats at floor 1 (before scaling with sqrt(floor)).
 */
export const BASE_MONSTER_STATS: BigNumberStatBlock = {
  atk: new BigNumber(50),
  def: new BigNumber(5),
  hp: new BigNumber(1500),
  spd: new BigNumber(50),
};

/**
 * Generate a monster for a given floor.
 */
export function generateMonster(floor: number, isBoss: boolean = false): Monster {
  const scale = Math.pow(floor, GameConfig.FLOOR_SCALE_EXPONENT);
  const bossAtkMul = isBoss ? 2 : 1;
  const bossDefMul = isBoss ? 2 : 1;
  const bossHpMul = isBoss ? 2 : 1;

  const baseAtk = BASE_MONSTER_STATS.atk.toNumber() * scale * bossAtkMul;
  const baseDef = BASE_MONSTER_STATS.def.toNumber() * scale * bossDefMul;
  const baseHp = BASE_MONSTER_STATS.hp.toNumber() * scale * bossHpMul;
  const baseSpd = BASE_MONSTER_STATS.spd.toNumber() * scale;

  const bossLabel = "";
  const names = [
    "Goblin", "Skeleton", "Slime", "Bat", "Spider",
    "Wolf", "Zombie", "Ghost", "Orc", "Demon",
  ];
  const name = isBoss
    ? ` ${["Brutal", "Vicious", "Colossal", "Dread", "Infernal"][floor % 5]} ${
        names[floor % names.length]
      }`
    : names[floor % names.length];

  const xpMul = isBoss ? 3 : 1;
  const goldMul = isBoss ? 3 : 1;

  return {
    id: nextMonsterId(),
    name: `${bossLabel}${name}`.trim(),
    floor,
    isBoss,
    isBracketBoss: false,
    stats: {
      atk: new BigNumber(Math.round(baseAtk)),
      def: new BigNumber(Math.round(baseDef)),
      hp: new BigNumber(Math.round(baseHp)),
      spd: new BigNumber(Math.round(baseSpd)),
    },
    xpReward: new BigNumber(Math.round(20 * scale * xpMul)),
    goldReward: new BigNumber(Math.round(10 * scale * goldMul)),
  };
}

/**
 * Generate a bracket boss for the given bracket (floor 10, 20, 30, etc).
 */
export function generateBracketBoss(bracketNumber: number): Monster {
  const floor = bracketNumber * 10;
  const scale = Math.pow(floor, GameConfig.FLOOR_SCALE_EXPONENT);

  const baseAtk = BASE_MONSTER_STATS.atk.toNumber() * scale;
  const baseDef = BASE_MONSTER_STATS.def.toNumber() * scale;
  const baseHp = BASE_MONSTER_STATS.hp.toNumber() * scale * 2.5;
  const baseSpd = BASE_MONSTER_STATS.spd.toNumber() * scale;

  const names = [
    "Demon Lord", "Ancient Wyrm", "Lich King", " Titan", "Void Walker",
  ];

  return {
    id: nextMonsterId(),
    name: names[bracketNumber % names.length],
    floor,
    isBoss: true,
    isBracketBoss: true,
    stats: {
      atk: new BigNumber(Math.round(baseAtk)),
      def: new BigNumber(Math.round(baseDef)),
      hp: new BigNumber(Math.round(baseHp)),
      spd: new BigNumber(Math.round(baseSpd)),
    },
    xpReward: new BigNumber(Math.round(50 * scale)),
    goldReward: new BigNumber(Math.round(30 * scale)),
  };
}
