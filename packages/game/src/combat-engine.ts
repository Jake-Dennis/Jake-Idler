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
 * Flat CRIT_CHANCE% critical strike chance for all attacks.
 */
export function calculateCrit(): boolean {
  return Math.random() < GameConfig.CRIT_CHANCE;
}

/**
 * Critical strike damage multiplier from GameConfig.
 */
export const CRIT_MULTIPLIER = GameConfig.CRIT_MULTIPLIER;

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
 * Base monster stats at floor 1 (before scaling with sqrt(floor)),
 * sourced from GameConfig at runtime.
 */
function getBaseMonsterStats(): BigNumberStatBlock {
  return {
    atk: new BigNumber(GameConfig.MONSTER_BASE_ATK),
    def: new BigNumber(GameConfig.MONSTER_BASE_DEF),
    hp: new BigNumber(GameConfig.MONSTER_BASE_HP),
    spd: new BigNumber(0),
  };
}

/**
 * Generate a monster for a given floor.
 */
export function generateMonster(floor: number, isBoss: boolean = false): Monster {
  const base = getBaseMonsterStats();
  const scale = Math.pow(floor, GameConfig.FLOOR_SCALE_EXPONENT);
  const bossAtkMul = isBoss ? GameConfig.BOSS_ATK_MULTIPLIER : 1;
  const bossDefMul = isBoss ? GameConfig.BOSS_DEF_MULTIPLIER : 1;
  const bossHpMul = isBoss ? GameConfig.BOSS_HP_MULTIPLIER : 1;

  const baseAtk = base.atk.toNumber() * scale * bossAtkMul;
  const baseDef = base.def.toNumber() * scale * bossDefMul;
  const baseHp = base.hp.toNumber() * scale * bossHpMul;

  const xpMul = isBoss ? GameConfig.BOSS_XP_MULTIPLIER : 1;
  const goldMul = isBoss ? GameConfig.BOSS_GOLD_MULTIPLIER : 1;

  const names = [
    "Goblin", "Skeleton", "Slime", "Bat", "Spider",
    "Wolf", "Zombie", "Ghost", "Orc", "Demon",
  ];
  const name = isBoss
    ? ` ${["Brutal", "Vicious", "Colossal", "Dread", "Infernal"][floor % 5]} ${
        names[floor % names.length]
      }`
    : names[floor % names.length];

  return {
    id: nextMonsterId(),
    name: name.trim(),
    floor,
    isBoss,
    isBracketBoss: false,
    stats: {
      atk: new BigNumber(Math.round(baseAtk)),
      def: new BigNumber(Math.round(baseDef)),
      hp: new BigNumber(Math.round(baseHp)),
      spd: new BigNumber(0),
    },
    xpReward: new BigNumber(Math.round(GameConfig.MONSTER_XP_BASE * scale * xpMul)),
    goldReward: new BigNumber(Math.round(GameConfig.MONSTER_GOLD_BASE * scale * goldMul)),
  };
}

/**
 * Generate a bracket boss for the given bracket (floor 10, 20, 30, etc).
 */
export function generateBracketBoss(bracketNumber: number): Monster {
  const base = getBaseMonsterStats();
  const floor = bracketNumber * 10;
  const scale = Math.pow(floor, GameConfig.FLOOR_SCALE_EXPONENT);

  const baseAtk = base.atk.toNumber() * scale;
  const baseDef = base.def.toNumber() * scale;
  const baseHp = base.hp.toNumber() * scale * GameConfig.BRACKET_BOSS_HP_MULTIPLIER;

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
      spd: new BigNumber(0),
    },
    xpReward: new BigNumber(Math.round(GameConfig.BRACKET_BOSS_XP_BASE * scale)),
    goldReward: new BigNumber(Math.round(GameConfig.BRACKET_BOSS_GOLD_BASE * scale)),
  };
}
