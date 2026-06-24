import BigNumber from "break_infinity.js";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq, sql } from "drizzle-orm";
import {
  generateFloor,
  computeHeroStats,
  calculateDamage,
  calculateCrit,
  CRIT_MULTIPLIER,
} from "@jake-idler/game";
import type { Equipment, Monster, CombatPosition, CombatRole } from "@jake-idler/game";
import { lootService } from "./loot-service.js";

// ─── Exported Types ────────────────────────────────────────────

export interface PartyHeroRoundData {
  heroId: string;
  name: string;
  role: CombatRole;
  position: CombatPosition;
  damage: number;
  crit: boolean;
  healingDone: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  damageTaken: number;
  monsterCrit: boolean;
  healingReceived: number;
}

export interface CombatRoundState {
  round: number;
  totalHeroDamage: number;
  totalHeroCrit: boolean;
  monsterDamage: number;
  monsterCrit: boolean;
  monsterHp: number;
  monsterMaxHp: number;
  finished: boolean;
  heroWon: boolean;
  currentMonsterName: string;
  currentMonsterIsBoss: boolean;
  monstersDefeated: number;
  totalMonsters: number;
  monsterJustKilled: boolean;
  floorCompleted: boolean;
  floorFailed: boolean;
  partyHeroes: PartyHeroRoundData[];
}

// ─── Combat Events (explicit action log for client) ─────────

export type CombatEvent = {
  type: string;
  heroId?: string;
  damage?: number;
  crit?: boolean;
  weaponType?: string;
  role?: string;
  healAmount?: number;
  monsterName?: string;
};

// ─── Internal Types ──────────────────────────────────────────

interface FloorMonster {
  data: Monster;
  maxHp: number;
  currentHp: number;
  xpReward: number;
  goldReward: number;
  lootProcessed: boolean;
}

interface PartyHeroRunState {
  heroId: string;
  name: string;
  role: CombatRole;
  position: CombatPosition;
  hp: number;
  maxHp: number;
  /** Damage dealt per round (0 for tank/healer). */
  atk: number;
  /** Defense (tank gets raw ATK added to DEF). */
  def: number;
  /** Healing power per round (healer only — equals their original ATK). */
  healing: number;
  alive: boolean;
}

interface PartyFloorRunState {
  partyId: string;
  initiatorHeroId: string;
  floorNumber: number;
  heroes: PartyHeroRunState[];
  monsters: FloorMonster[];
  currentMonsterIndex: number;
  totalMonsters: number;
  monstersDefeated: number;
  floorCompleted: boolean;
  floorFailed: boolean;
  tickCount: number;
  roundIndex: number;
  lastRound: CombatRoundState | null;
  totalGoldRewarded: number;
  floorGoldValue: number;
  shardsEarned: Record<string, number>;
  finishedAt: number | null;
  events: CombatEvent[];
}

const POSITION_TARGET_PRIORITY: CombatPosition[] = [
  "front" as CombatPosition,
  "middle" as CombatPosition,
  "rear" as CombatPosition,
];

const HEAL_PRIORITY: CombatRole[] = [
  "tank" as CombatRole,
  "dps" as CombatRole,
  "healer" as CombatRole,
];

class CombatService {
  private partyFloors: Map<string, PartyFloorRunState> = new Map();
  public tickInterval: ReturnType<typeof setInterval> | null = null;
  public onTick: ((runId: string, run: PartyFloorRunState) => void) | null = null;

  startTickLoop(): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), 1000);
    console.log('[Combat] Tick loop started');
  }

  stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
      console.log('[Combat] Tick loop stopped');
    }
  }

  isInCombat(heroId: string): boolean {
    return this.getActivePartyIdForHero(heroId) !== null;
  }

  /** Find an active (not completed/failed) run for a hero. */
  private getActivePartyIdForHero(heroId: string): string | null {
    for (const [partyId, run] of this.partyFloors) {
      if (!run.floorCompleted && !run.floorFailed && run.heroes.some((h) => h.heroId === heroId)) {
        return partyId;
      }
    }
    return null;
  }

  /** Find any run (active OR recently completed) for a hero — used by status route. */
  getPartyIdForHero(heroId: string): string | null {
    for (const [partyId, run] of this.partyFloors) {
      if (run.finishedAt !== null && Date.now() - run.finishedAt > 60000) continue; // cleaned up
      if (run.heroes.some((h) => h.heroId === heroId)) {
        return partyId;
      }
    }
    return null;
  }

  // ─── Start Combat ─────────────────────────────────────────

  async startFloorRun(
    partyId: string,
    initiatorHeroId: string,
    floorNumber: number,
    partyMembers: Array<{
      heroId: string;
      name: string;
      role: CombatRole;
      position: CombatPosition;
      level: number;
      equipped: Record<string, Equipment | null>;
    }>,
  ): Promise<{
    totalMonsters: number;
    isBracketBossFloor: boolean;
    monsters: Array<{ id: string; name: string; isBoss: boolean; hp: number; atk: number; def: number }>;
    heroes: Array<{ heroId: string; role: CombatRole; position: CombatPosition; hp: number; maxHp: number; atk: number; def: number; healing: number }>;
  }> {
    const partySize = partyMembers.length;
    const monsters = this.generateMonsterQueue(floorNumber, partySize);

    // Scale monster HP by party size so each member contributes proportionally
    const hpScale = 1 + (Math.sqrt(partySize) - 1) * 0.5;
    for (const m of monsters) {
      m.maxHp = Math.round(m.maxHp * hpScale);
      m.currentHp = Math.round(m.currentHp * hpScale);
    }

    const heroes_: PartyHeroRunState[] = [];
    for (const pm of partyMembers) {
      const computed = computeHeroStats({ level: pm.level, equipped: pm.equipped });
      const rawAtk = computed.atk.toNumber();
      const rawDef = computed.def.toNumber();
      const baseHp = computed.hp.toNumber();

      let hp = baseHp;
      let def = rawDef;
      let atk = 0;
      let healing = 0;

      if (pm.role === "tank") {
        atk = 0;
        hp = baseHp + rawAtk;
      } else if (pm.role === "healer") {
        atk = 0;
        healing = Math.round(rawAtk * 0.5);
      } else {
        atk = rawAtk;
      }

      // Solo heroes get passive self-heal so they can survive a full floor with recommended gear
      if (partySize === 1 && pm.role !== "healer") {
        healing = rawAtk * 0.055;
      }

      heroes_.push({
        heroId: pm.heroId,
        name: pm.name,
        role: pm.role,
        position: pm.position,
        hp,
        maxHp: hp,
        atk,
        def,
        healing,
        alive: true,
      });
    }

    const run: PartyFloorRunState = {
      partyId,
      initiatorHeroId,
      floorNumber,
      heroes: heroes_,
      monsters,
      currentMonsterIndex: 0,
      totalMonsters: monsters.length,
      monstersDefeated: 0,
      floorCompleted: false,
      floorFailed: false,
      tickCount: 0,
      roundIndex: 0,
      lastRound: null,
      totalGoldRewarded: 0,
      floorGoldValue: monsters.reduce((sum, m) => sum + m.goldReward, 0),
      shardsEarned: {},
      finishedAt: null,
      events: [],
    };

    this.partyFloors.set(partyId, run);

    return {
      totalMonsters: monsters.length,
      isBracketBossFloor: floorNumber % 10 === 0,
      monsters: monsters.map(m => ({
        id: m.data.id,
        name: m.data.name,
        isBoss: m.data.isBoss,
        hp: m.maxHp,
        maxHp: m.maxHp,
        atk: m.data.stats.atk.toNumber(),
        def: m.data.stats.def.toNumber(),
      })),
      heroes: heroes_.map(h => ({
        heroId: h.heroId,
        role: h.role,
        position: h.position,
        hp: h.hp,
        maxHp: h.maxHp,
        atk: h.atk,
        def: h.def,
        healing: h.healing,
      })),
    };
  }

  getPartyFloorRun(partyId: string): PartyFloorRunState | undefined {
    return this.partyFloors.get(partyId);
  }

  isPartyInCombat(partyId: string): boolean {
    const run = this.partyFloors.get(partyId);
    return run !== undefined && !run.floorCompleted && !run.floorFailed;
  }

  // ─── Tick Loop ─────────────────────────────────────────────

  async tick(): Promise<void> {
    for (const [partyId, run] of this.partyFloors) {
      if (run.floorCompleted || run.floorFailed) continue;
      try {
        this.processRound(partyId, run);
        if (this.onTick) this.onTick(partyId, run);
      } catch (err) {
        console.error(`[Combat] Error processing ${partyId}:`, err);
      }
    }

    this.cleanupOldRuns();
  }

  // ─── Poll-and-Advance ─────────────────────────────────────

  processOneRound(partyId: string): boolean {
    const run = this.partyFloors.get(partyId);
    if (!run) return false;
    if (run.floorCompleted || run.floorFailed) return false;
    this.processRound(partyId, run);
    this.cleanupOldRuns();
    return true;
  }

  private cleanupOldRuns(): void {
    const now = Date.now();
    for (const [partyId, run] of this.partyFloors) {
      if (run.finishedAt !== null && now - run.finishedAt > 60000) {
        this.partyFloors.delete(partyId);
      }
    }
  }

  // ─── Round Processing ──────────────────────────────────────

  private processRound(partyId: string, run: PartyFloorRunState): void {
    run.tickCount++;

    const currentMonster = run.monsters[run.currentMonsterIndex];
    if (!currentMonster) {
      run.floorCompleted = true;
      return;
    }

    const aliveHeroes = run.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) {
      run.floorFailed = true;
      run.finishedAt = Date.now();
      this.finaliseRound(run, currentMonster, 0, false, 0, false, 0, [], true);
      return;
    }

    const heroData: PartyHeroRoundData[] = [];
    let totalDpsDamage = 0;
    let lastDpsCrit = false;
    let totalHealingDone = 0;

    // ─── 1. Healers heal (priority: tank → dps → other healers) ──
    // First pass: push placeholder heroData for all alive heroes
    const healedTargets = new Map<string, number>(); // heroId → healing received
    for (const hero of aliveHeroes) {
      heroData.push(this.makeHeroData(hero, 0, false, 0, 0, false, 0));
    }

    for (const hero of aliveHeroes) {
      if (hero.healing <= 0) continue;

      // Solo heroes heal themselves; party healers heal team members
      const isSoloHeal = run.heroes.length === 1;
      const targets = isSoloHeal
        ? [hero] // self-heal
        : aliveHeroes.filter((h) => h.heroId !== hero.heroId);

      if (targets.length === 0) continue;

      // Sort by role priority then lowest HP%
      const sorted = [...targets].sort((a, b) => {
        const pa = HEAL_PRIORITY.indexOf(a.role);
        const pb = HEAL_PRIORITY.indexOf(b.role);
        if (pa !== pb) return pa - pb;
        return (a.hp / a.maxHp) - (b.hp / b.maxHp);
      });

      const target = sorted[0];
      // Solo self-heal uses full amount (no rounding — fine margins matter); party healers use ×0.5
      const healAmount = isSoloHeal ? hero.healing : Math.round(hero.healing * 0.5);
      const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
      if (actualHeal > 0) {
        target.hp = Math.min(target.maxHp, target.hp + actualHeal);
        totalHealingDone += actualHeal;
        healedTargets.set(target.heroId, (healedTargets.get(target.heroId) || 0) + actualHeal);
      }

      // Update healer's heroData entry
      const hd = heroData.find((h) => h.heroId === hero.heroId);
      if (hd) hd.healingDone = actualHeal;
    }

    // Apply healing received to target heroData
    for (const [targetId, amount] of healedTargets) {
      const hd = heroData.find((h) => h.heroId === targetId);
      if (hd) hd.healingReceived = amount;
    }

    // ─── 2. DPS attack current monster ─────────────────────────
    for (const hero of aliveHeroes) {
      if (hero.role !== "dps") continue;

      const crit = calculateCrit();
      const baseDmg = calculateDamage(hero.atk, currentMonster.data.stats.def.toNumber());
      const variance = 0.8 + Math.random() * 0.4; // ±20%
      const dmg = Math.max(1, Math.round(baseDmg * variance * (crit ? CRIT_MULTIPLIER : 1.0)));
      var beforeHp = currentMonster.currentHp;
      currentMonster.currentHp = Math.max(0, currentMonster.currentHp - dmg);
      totalDpsDamage += dmg;
      if (dmg > 0) lastDpsCrit = crit;

      const existing = heroData.find((h) => h.heroId === hero.heroId);
      if (existing) {
        existing.damage = dmg;
        existing.crit = crit;
      } else {
        heroData.push(this.makeHeroData(hero, dmg, crit, 0, 0, false, 0));
      }
    }

    // ─── 3. ALL alive monsters attack simultaneously ────────────
    let totalMonsterDamage = 0;
    let anyMonsterCrit = false;

    // Find target once (tank → dps → healer)
    let target: PartyHeroRunState | null = null;
    for (const pos of POSITION_TARGET_PRIORITY) {
      const candidate = aliveHeroes.find((h) => h.position === pos && h.alive);
      if (candidate) { target = candidate; break; }
    }
    if (!target) target = aliveHeroes[0];

    if (target) {
      // Each monster deals 1-10 damage using ATK/(ATK+DEF) ratio
      // This ensures every hit lands but never oneshots
      const monsterList: Array<{ atk: number }> = [];
      for (let i = run.currentMonsterIndex; i < run.monsters.length - 1; i++) {
        const m = run.monsters[i];
        if (m.currentHp > 0) monsterList.push({ atk: m.data.stats.atk.toNumber() });
      }
      // If all trash dead, use the boss — hits multiple times per party member
      const isBossFight = monsterList.length === 0;
      if (isBossFight) {
        const boss = run.monsters[run.monsters.length - 1];
        if (boss && boss.currentHp > 0) {
          const partySize = run.heroes.length;
          for (let i = 0; i < partySize; i++) {
            monsterList.push({ atk: boss.data.stats.atk.toNumber() });
          }
        }
      }

      for (const m of monsterList) {
        const ratio = m.atk / (m.atk + target.def);
        const base = 1 + ratio * 9;
        // ±2 variance, 10% crit doubles the hit
        const isCrit = calculateCrit();
        const variance = (Math.random() - 0.5) * 4;
        const dmg = Math.max(1, Math.round((base + variance) * (isCrit ? 2 : 1)));
        totalMonsterDamage += dmg;
        if (dmg > 0 && isCrit) anyMonsterCrit = true;
      }

      target.hp = Math.max(0, target.hp - totalMonsterDamage);
      if (target.hp <= 0) target.alive = false;

      const existing = heroData.find((h) => h.heroId === target!.heroId);
      if (existing) {
        existing.damageTaken = totalMonsterDamage;
        existing.monsterCrit = anyMonsterCrit;
        existing.hp = target.hp;
      }
    }

    // ─── 4. Check if current monster died ─────────────────────
    const monsterDied = currentMonster.currentHp <= 0;

    // ─── 5. Finalise round state ─────────────────────────────
    this.finaliseRound(run, currentMonster, totalDpsDamage, lastDpsCrit, totalMonsterDamage, anyMonsterCrit, totalHealingDone, heroData, false);

    // ─── 6. Monster died handling ────────────────────────────
    if (monsterDied && aliveHeroes.length > 0) {
      run.monstersDefeated++;
      const nextIndex = run.currentMonsterIndex + 1;

      if (nextIndex < run.monsters.length) {
        run.currentMonsterIndex = nextIndex;
        const nextMonster = run.monsters[nextIndex];
        if (run.lastRound) {
          run.lastRound = {
            ...run.lastRound,
            currentMonsterName: nextMonster.data.name,
            currentMonsterIsBoss: nextMonster.data.isBoss,
            monsterHp: nextMonster.currentHp,
            monsterMaxHp: nextMonster.maxHp,
            monsterJustKilled: true,
            finished: false,
            heroWon: false,
          };
        }
      } else {
        run.floorCompleted = true;
        run.finishedAt = Date.now();
        if (run.lastRound) {
          run.lastRound = {
            ...run.lastRound,
            floorCompleted: true,
            finished: true,
            heroWon: true,
          };
        }
        for (const h of run.heroes) {
          if (h.alive) {
            db.update(heroes)
              .set({ level: run.floorNumber, currentFloor: sql`MAX(${heroes.currentFloor}, ${run.floorNumber})`, lastActive: new Date().toISOString() })
              .where(eq(heroes.id, h.heroId));
          }
        }
      }

      try {
        void this.processKillRewards(run, currentMonster);
      } catch (err) {
        console.error(`[Combat] Kill rewards failed for ${partyId}:`, err);
      }
    }

    // ─── 6. Wipe check ──────────────────────────────────────
    if (run.heroes.every((h) => !h.alive)) {
      run.floorFailed = true;
      run.finishedAt = Date.now();
      if (run.lastRound) {
        run.lastRound = {
          ...run.lastRound,
          floorFailed: true,
          finished: true,
          heroWon: false,
        };
      }
    }
  }

  private makeHeroData(
    hero: PartyHeroRunState,
    damage: number,
    crit: boolean,
    healingDone: number,
    damageTaken: number,
    monsterCrit: boolean,
    healingReceived: number,
  ): PartyHeroRoundData {
    return {
      heroId: hero.heroId,
      name: hero.name,
      role: hero.role,
      position: hero.position,
      damage,
      crit,
      healingDone,
      hp: hero.hp,
      maxHp: hero.maxHp,
      alive: hero.alive,
      damageTaken,
      monsterCrit,
      healingReceived,
    };
  }

  private finaliseRound(
    run: PartyFloorRunState,
    monster: FloorMonster,
    totalDpsDamage: number,
    lastDpsCrit: boolean,
    monsterDamage: number,
    monsterCrit: boolean,
    totalHealing: number,
    heroData: PartyHeroRoundData[],
    _wipe: boolean,
  ): void {
    run.roundIndex++;
    const monsterDied = monster.currentHp <= 0;
    const allDead = run.heroes.every((h) => !h.alive);

    run.lastRound = {
      round: run.roundIndex,
      totalHeroDamage: totalDpsDamage,
      totalHeroCrit: lastDpsCrit,
      monsterDamage,
      monsterCrit,
      monsterHp: monster.currentHp,
      monsterMaxHp: monster.maxHp,
      finished: monsterDied || allDead,
      heroWon: monsterDied && !allDead,
      currentMonsterName: monster.data.name,
      currentMonsterIsBoss: monster.data.isBoss,
      monstersDefeated: run.monstersDefeated,
      totalMonsters: run.totalMonsters,
      monsterJustKilled: monsterDied,
      floorCompleted: false,
      floorFailed: false,
      partyHeroes: heroData,
    };
  }

  // ─── Monster Generation ──────────────────────────────────

  private generateMonsterQueue(floorNumber: number, partySize: number = 1): FloorMonster[] {
    const floor = generateFloor(floorNumber);
    const monsters: FloorMonster[] = [];
    const toFloorMonster = (m: import("@jake-idler/game").Monster): FloorMonster => ({
      data: m,
      maxHp: m.stats.hp.toNumber(),
      currentHp: m.stats.hp.toNumber(),
      xpReward: m.xpReward.toNumber(),
      goldReward: m.goldReward.toNumber(),
      lootProcessed: false,
    });

    if (floor.isBracketBoss && floor.bracketBoss) {
      monsters.push(toFloorMonster(floor.bracketBoss));
    } else {
      // Trash count scales with party size
      let trashCount = 1 + (floorNumber % 2); // base: 1-2 trash
      if (partySize >= 2) trashCount = 2 + (floorNumber % 2); // duo: 2-3
      if (partySize >= 3) trashCount = 3 + (floorNumber % 2); // trio: 3-4
      if (partySize >= 4) trashCount = 3 + (floorNumber % 3); // full: 3-5

      for (let i = 0; i < trashCount; i++) {
        const m = floor.monsters[i % floor.monsters.length];
        monsters.push(toFloorMonster(m));
      }
      monsters.push(toFloorMonster(floor.floorBoss));
    }

    return monsters;
  }

  private async processKillRewards(
    run: PartyFloorRunState,
    currentMonster: FloorMonster,
  ): Promise<void> {
    if (currentMonster.lootProcessed) return;
    currentMonster.lootProcessed = true;

    const aliveHeroes = run.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) return;

    const isBoss = currentMonster.data.isBoss;
    const isBracketBoss = run.floorNumber % 10 === 0;

    // Fetch each hero's progression level so loot is capped to their own floor,
    // preventing high-level players from boosting low-level alts through high floors.
    const heroIds = aliveHeroes.map((h) => h.heroId);
    const heroRows = await db.select({ id: heroes.id, currentFloor: heroes.currentFloor }).from(heroes).where(sql`${heroes.id} IN ${heroIds}`);

    const heroFloorMap = new Map<string, number>();
    for (const row of heroRows) {
      heroFloorMap.set(row.id, row.currentFloor);
    }

    for (const h of aliveHeroes) {
      // Cap loot floor to the hero's own progression level
      const heroFloor = heroFloorMap.get(h.heroId) || 1;
      const cappedFloor = Math.min(run.floorNumber, Math.max(1, heroFloor));

      await db
        .update(heroes)
        .set({
          gold: sql`${heroes.gold} + ${currentMonster.goldReward}`,
          lastActive: new Date().toISOString(),
        })
        .where(eq(heroes.id, h.heroId));

      const lootResult = await lootService.processKillLoot(h.heroId, cappedFloor, isBoss, isBracketBoss);

      // Accumulate shard tracking from the initiator's drops only (avoid double-counting)
      if (h.heroId === run.initiatorHeroId) {
        run.totalGoldRewarded += currentMonster.goldReward;
        for (const [key, val] of Object.entries(lootResult.shardDrops)) {
          run.shardsEarned[key] = (run.shardsEarned[key] || 0) + val;
        }
      }
    }
  }
}

export const combatService = new CombatService();

