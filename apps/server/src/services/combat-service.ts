import { v4 as uuidv4 } from "uuid";
import BigNumber from "break_infinity.js";
import { db } from "../db/connection.js";
import { heroes, keys } from "../db/schema/index.js";
import { eq, and, sql, inArray } from "drizzle-orm";
import { partyService } from "./party-service.js";
import {
  generateFloor,
  computeHeroStats,
  calculateDamage,
  calculateCrit,
  CRIT_MULTIPLIER,
  processMonsterLoot,
  generateFloorLoot,
  shardKey,
  rollKeyDrop,
  GameConfig,
} from "@jake-idler/game";
import type { Equipment, Monster, CombatPosition, CombatRole } from "@jake-idler/game";
import { combatSerializer } from "../game/serializers/combat-serializer.js";
import type { CombatEventView } from "../game/serializers/combat-serializer.js";
import { createChildLogger } from "../observability/logger.js";

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
  weaponType?: string;
  photoUrl?: string | null;
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

export interface MonsterView {
  id: string;
  name: string;
  isBoss: boolean;
  hp: number;
  maxHp: number;
  isCurrentFocus: boolean;
}

export interface CombatStateLog {
  round: number;
  events: CombatEventView[];
  monsters: MonsterView[];
  partyHeroes: PartyHeroRoundData[];
}

// ─── Internal Types ──────────────────────────────────────────

interface FloorMonster {
  data: Monster;
  maxHp: number;
  currentHp: number;
  xpReward: number;
  goldReward: number;
  lootProcessed: boolean;
  wave: number;  // 0, 1, 2 = trash waves, 3 = boss wave
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
  weaponType: string;
  photoUrl: string | null;
}

interface PartyFloorRunState {
  partyId: string;
  initiatorHeroId: string;
  floorNumber: number;
  heroes: PartyHeroRunState[];
  monsters: FloorMonster[];
  currentMonsterIndex: number;
  currentWave: number;  // 0, 1, 2 = trash, 3 = boss
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
  keyDropped: boolean;
  keyBracketLevel: number;
  keyConsumed: boolean;
  finishedAt: number | null;
  events: CombatEvent[];
  goldPenaltyApplied?: boolean;
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
  private log = createChildLogger("combat");

  // ─── Simulate Floor Run ───────────────────────────────────

  async simulateFloorRun(
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
      photoUrl: string | null;
    }>,
  ): Promise<{
    victory: boolean;
    totalRounds: number;
    roundStates: CombatStateLog[];
    goldEarned: number;
    monstersDefeated: number;
    totalMonsters: number;
    shardsEarned: Record<string, number>;
    keyDropped: boolean;
    keyBracketLevel: number;
    keyConsumed: boolean;
    floorCompleted: boolean;
    floorFailed: boolean;
    monsters: Array<{ id: string; name: string; isBoss: boolean; hp: number; maxHp: number; atk: number; def: number }>;
    heroes: Array<{ heroId: string; role: CombatRole; position: CombatPosition; hp: number; maxHp: number; atk: number; def: number; healing: number }>;
    isBracketBossFloor: boolean;
  }> {
    const partySize = partyMembers.length;
    const monsters = this.generateMonsterQueue(floorNumber, partySize);

    // Scale monster HP by party size — each additional member adds meaningful difficulty
    const hpScale = 1.3 + (partySize - 1) * 0.29;
    for (const m of monsters) {
      m.maxHp = Math.round(m.maxHp * hpScale);
      m.currentHp = Math.round(m.currentHp * hpScale);
    }

    const heroes_ = this.initHeroes(partyMembers);
    const floorGoldValue = monsters.reduce((sum, m) => sum + m.goldReward, 0);

    const run: PartyFloorRunState = {
      partyId,
      initiatorHeroId,
      floorNumber,
      heroes: heroes_,
      monsters,
      currentMonsterIndex: 0,
      currentWave: 0,
      totalMonsters: monsters.length,
      monstersDefeated: 0,
      floorCompleted: false,
      floorFailed: false,
      tickCount: 0,
      roundIndex: 0,
      lastRound: null,
      totalGoldRewarded: 0,
      floorGoldValue,
      shardsEarned: {},
      keyDropped: false,
      keyBracketLevel: 0,
      keyConsumed: false,
      finishedAt: null,
      events: [],
    };

    // Fetch hero rows once for reward accumulation
    const heroIds = heroes_.map((h) => h.heroId);
    const heroRows = await db.select().from(heroes).where(sql`${heroes.id} IN ${heroIds}`);
    const heroMap = new Map(heroRows.map((r) => [r.id, r]));

    // Accumulators for deferred DB writes
    const heroGoldAccum: Record<string, number> = {};
    const heroShardAccum: Record<string, Record<string, number>> = {};
    const heroEquipAccum: Record<string, Equipment[]> = {};
    for (const h of heroes_) {
      const row = heroMap.get(h.heroId);
      heroGoldAccum[h.heroId] = row?.gold || 0;
      heroShardAccum[h.heroId] = { ...(row?.shards as unknown as Record<string, number> || {}) };
      heroEquipAccum[h.heroId] = [...((row?.inventory as unknown as Equipment[]) || [])];
    }

    const roundStates: CombatStateLog[] = [];

    while (!run.floorCompleted && !run.floorFailed) {
      // Check if current wave is fully cleared
      const aliveInWave = run.monsters.filter(m => m.wave === run.currentWave && m.currentHp > 0);
      if (aliveInWave.length === 0) {
        // Advance to next wave
        run.currentWave++;
        if (run.currentWave > 3) {
          run.floorCompleted = true;
          break;
        }
        // Push wave_start event as a standalone round state
        const waveEvent: CombatEventView = { type: "wave_start", wave: run.currentWave };
        const waveSnapshot: MonsterView[] = run.monsters
          .filter(m => m.wave === run.currentWave)
          .map((m) => ({
            id: m.data.id,
            name: m.data.name,
            isBoss: m.data.isBoss,
            hp: m.currentHp,
            maxHp: m.maxHp,
            isCurrentFocus: true,
          }));
        roundStates.push({
          round: run.roundIndex + 1,
          events: [waveEvent],
          monsters: waveSnapshot,
          partyHeroes: run.lastRound?.partyHeroes ?? [],
        });
        continue;
      }

      // Find first alive monster in current wave as focus target
      const currentMonster = aliveInWave[0];
      run.currentMonsterIndex = run.monsters.indexOf(currentMonster);

      const { monsterDied } = await this.processRound(partyId, run);

      const weaponTypes: Record<string, string> = {};
      for (const h of run.heroes) {
        weaponTypes[h.heroId] = h.weaponType || "melee";
      }
      const events = combatSerializer.buildEvents(run.lastRound, weaponTypes);

      const monstersSnapshot: MonsterView[] = run.monsters
        .filter(m => m.wave === run.currentWave)
        .map((m) => ({
        id: m.data.id,
        name: m.data.name,
        isBoss: m.data.isBoss,
        hp: m.currentHp,
        maxHp: m.maxHp,
        isCurrentFocus: m.currentHp > 0 && m === currentMonster,
      }));

      roundStates.push({
        round: run.lastRound!.round,
        events,
        monsters: monstersSnapshot,
        partyHeroes: run.lastRound!.partyHeroes,
      });

      if (monsterDied && currentMonster && run.heroes.some((h) => h.alive)) {
        this.accumulateKillRewards(
          run,
          currentMonster,
          heroMap,
          heroGoldAccum,
          heroShardAccum,
          heroEquipAccum,
        );
      }
    }

    // Apply wipe penalty to initiator (preserves old status-route behaviour)
    if (run.floorFailed && run.floorGoldValue > 0) {
      heroGoldAccum[run.initiatorHeroId] = Math.max(0, heroGoldAccum[run.initiatorHeroId] - run.floorGoldValue);
    }

    // Deferred DB writes — apply all accumulated rewards once
    // Consume one key per party clear (bracket boss floors)
    if (run.floorCompleted && run.floorNumber % 10 === 0) {
      const initiatorRow = heroMap.get(run.initiatorHeroId);
      if (initiatorRow) {
        const bracketNumber = Math.ceil(run.floorNumber / 10);
        // Try initiator's key first
        let keyRows = await db.select().from(keys).where(and(eq(keys.playerId, initiatorRow.playerId), eq(keys.floorBracket, bracketNumber))).limit(1);
        if (keyRows.length > 0) {
          await db.delete(keys).where(eq(keys.id, keyRows[0].id));
          run.keyConsumed = true;
        } else {
          // Initiator has no key — check opt-in party members' keys
          const party = partyService.getPartyByPlayer(initiatorRow.playerId);
          if (party) {
            for (const optInId of party.keyShareOptIns) {
              if (optInId === initiatorRow.playerId) continue; // already checked
              keyRows = await db.select().from(keys).where(and(eq(keys.playerId, optInId), eq(keys.floorBracket, bracketNumber))).limit(1);
              if (keyRows.length > 0) {
                await db.delete(keys).where(eq(keys.id, keyRows[0].id));
                run.keyConsumed = true;
                break;
              }
            }
          }
        }
      }
    }
    for (const h of run.heroes) {
      const row = heroMap.get(h.heroId);
      if (!row) continue; // Skip bots

      if (run.floorCompleted && h.alive) {
        const updates: Record<string, any> = {
          currentFloor: sql`MAX(${heroes.currentFloor}, ${run.floorNumber})`,
          lastActive: new Date().toISOString(),
        };
        // Only track highest solo floor as hero level
        if (partySize === 1) {
          updates.level = sql`MAX(${heroes.level}, ${run.floorNumber})`;
        }
        await db
          .update(heroes)
          .set(updates)
          .where(eq(heroes.id, h.heroId));
      }

      await db
        .update(heroes)
        .set({
          gold: heroGoldAccum[h.heroId],
          shards: heroShardAccum[h.heroId] as any,
          inventory: heroEquipAccum[h.heroId] as any,
          lastActive: new Date().toISOString(),
        })
        .where(eq(heroes.id, h.heroId));
    }

    return {
      victory: run.floorCompleted,
      totalRounds: run.roundIndex,
      roundStates,
      goldEarned: run.totalGoldRewarded,
      monstersDefeated: run.monstersDefeated,
      totalMonsters: run.totalMonsters,
      shardsEarned: run.shardsEarned,
      keyDropped: run.keyDropped,
      keyBracketLevel: run.keyBracketLevel,
      keyConsumed: run.keyConsumed,
      floorCompleted: run.floorCompleted,
      floorFailed: run.floorFailed,
      monsters: monsters.filter(m => m.wave === 0).map((m) => ({
        id: m.data.id,
        name: m.data.name,
        isBoss: m.data.isBoss,
        hp: m.maxHp,
        maxHp: m.maxHp,
        atk: m.data.stats.atk.toNumber(),
        def: m.data.stats.def.toNumber(),
      })),
      heroes: heroes_.map((h) => ({
        heroId: h.heroId,
        name: h.name,
        role: h.role,
        position: h.position,
        hp: h.hp,
        maxHp: h.maxHp,
        atk: h.atk,
        def: h.def,
        healing: h.healing,
        weaponType: h.weaponType,
        photoUrl: h.photoUrl,
      })),
      isBracketBossFloor: floorNumber % 10 === 0,
    };
  }

  // ─── Hero Initialization ──────────────────────────────────

  private initHeroes(
    partyMembers: Array<{
      heroId: string;
      name: string;
      role: CombatRole;
      position: CombatPosition;
      level: number;
      equipped: Record<string, Equipment | null>;
      photoUrl: string | null;
    }>,
  ): PartyHeroRunState[] {
    const partySize = partyMembers.length;
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
        atk = Math.round(rawAtk * 0.5);
        hp = baseHp + Math.round(rawAtk * 0.5);
      } else if (pm.role === "healer") {
        atk = Math.round(rawAtk * 0.5);
        healing = Math.round(rawAtk * 0.5);
      } else {
        atk = rawAtk;
      }

      // Solo heroes get passive self-heal so they can survive a full floor with recommended gear
      if (partySize === 1 && pm.role !== "healer") {
        healing = rawAtk * 0.055;
      }

      const weaponType =
        pm.equipped?.rightHandWeapon?.type
        || pm.equipped?.leftHand?.type
        || "melee";

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
        weaponType,
        photoUrl: pm.photoUrl ?? null,
      });
    }

    return heroes_;
  }

  // ─── Round Processing ──────────────────────────────────────

  private async processRound(partyId: string, run: PartyFloorRunState): Promise<{ monsterDied: boolean }> {
    run.tickCount++;

    const currentMonster = run.monsters[run.currentMonsterIndex];
    if (!currentMonster) {
      run.floorCompleted = true;
      return { monsterDied: false };
    }

    const aliveHeroes = run.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) {
      run.floorFailed = true;
      run.finishedAt = Date.now();
      this.finaliseRound(run, currentMonster, 0, false, 0, false, 0, []);
      return { monsterDied: false };
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
      const variance = 0.8 + Math.random() * 0.4; // ±20%
      const rawDmg = hero.atk * variance - currentMonster.data.stats.def.toNumber();
      const dmg = Math.max(1, Math.round(rawDmg * (crit ? CRIT_MULTIPLIER : 1.0)));
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
      // All alive monsters in current wave attack simultaneously
      const aliveMonsters = run.monsters.filter(m => m.wave === run.currentWave && m.currentHp > 0);
      const isBossFight = aliveMonsters.some(m => m.data.isBoss);
      const monsterList: Array<{ atk: number }> = [];

      if (isBossFight) {
        // Boss hits each party member once
        const boss = aliveMonsters.find(m => m.data.isBoss);
        if (boss) {
          for (let i = 0; i < run.heroes.length; i++) {
            monsterList.push({ atk: boss.data.stats.atk.toNumber() });
          }
        }
      } else {
        // Each alive trash monster attacks once
        for (const m of aliveMonsters) {
          monsterList.push({ atk: m.data.stats.atk.toNumber() });
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
    this.finaliseRound(run, currentMonster, totalDpsDamage, lastDpsCrit, totalMonsterDamage, anyMonsterCrit, totalHealingDone, heroData);

    // ─── 6. Monster died handling ────────────────────────────
    if (monsterDied && aliveHeroes.length > 0) {
      run.monstersDefeated++;
      // Find next alive monster in current wave for focus
      const aliveInWave = run.monsters.filter(m => m.wave === run.currentWave && m.currentHp > 0);
      const nextMonster = aliveInWave.length > 0 ? aliveInWave[0] : null;
      if (run.lastRound) {
        run.lastRound = {
          ...run.lastRound,
          monsterHp: nextMonster?.currentHp ?? 0,
          monsterMaxHp: nextMonster?.maxHp ?? 0,
          monsterJustKilled: true,
          finished: nextMonster === null && run.currentWave >= 3,
          heroWon: nextMonster === null && run.currentWave >= 3,
        };
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

    return { monsterDied };
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
      weaponType: hero.weaponType,
      photoUrl: hero.photoUrl,
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
    const toFloorMonster = (m: import("@jake-idler/game").Monster, wave: number): FloorMonster => ({
      data: m,
      maxHp: m.stats.hp.toNumber(),
      currentHp: m.stats.hp.toNumber(),
      xpReward: m.xpReward.toNumber(),
      goldReward: m.goldReward.toNumber(),
      lootProcessed: false,
      wave,
    });

    // Only bracket boss floors use the direct bracket boss (floor 10, 20, etc.)
    if (floor.isBracketBoss && floor.bracketBoss) {
      // 3 waves of trash, then bracket boss
      const perWave = Math.max(1, partySize);
      let trashCount = 0;
      const pool = floor.monsters;
      for (let w = 0; w < 3; w++) {
        for (let i = 0; i < perWave; i++) {
          const src = pool[trashCount % pool.length];
          monsters.push(toFloorMonster(src, w));
          trashCount++;
        }
      }
      monsters.push(toFloorMonster(floor.bracketBoss, 3));
    } else {
      // Normal floor: 3 waves of trash, then floor boss
      const perWave = Math.max(1, partySize);
      let trashCount = 0;
      const pool = floor.monsters;
      for (let w = 0; w < 3; w++) {
        for (let i = 0; i < perWave; i++) {
          const src = pool[trashCount % pool.length];
          monsters.push(toFloorMonster(src, w));
          trashCount++;
        }
      }
      monsters.push(toFloorMonster(floor.floorBoss, 3));
    }

    return monsters;
  }

  // ─── Reward Accumulation (deferred DB writes) ────────────

  private accumulateKillRewards(
    run: PartyFloorRunState,
    currentMonster: FloorMonster,
    heroMap: Map<string, any>,
    heroGoldAccum: Record<string, number>,
    heroShardAccum: Record<string, Record<string, number>>,
    heroEquipAccum: Record<string, Equipment[]>,
  ): void {
    if (currentMonster.lootProcessed) return;
    currentMonster.lootProcessed = true;

    const aliveHeroes = run.heroes.filter((h) => h.alive);
    if (aliveHeroes.length === 0) return;

    const isBoss = currentMonster.data.isBoss;
    const isBracketBoss = run.floorNumber % 10 === 0;

    for (const h of aliveHeroes) {
      const row = heroMap.get(h.heroId);
      if (!row) continue; // Skip bots

      const heroFloor = row.currentFloor;
      const cappedFloor = Math.min(run.floorNumber, Math.max(1, heroFloor));

      // Gold from monster's goldReward (first source)
      heroGoldAccum[h.heroId] += currentMonster.goldReward;

      // Loot roll (second gold source + shards + equipment)
      const loot = processMonsterLoot(cappedFloor, isBoss, isBracketBoss);
      heroGoldAccum[h.heroId] += loot.gold;

      for (const drop of loot.shards) {
        const key = shardKey(drop.rarity, drop.bracketLevel);
        heroShardAccum[h.heroId][key] = (heroShardAccum[h.heroId][key] || 0) + drop.amount;
      }

      if (isBracketBoss) {
        const equipment = generateFloorLoot(run.floorNumber);
        heroEquipAccum[h.heroId].push(equipment);
      }

      // Key drop — chance scales with floor position within bracket (1-10), up to 25%
      if (isBoss) {
        const bracketKeyLevel = Math.ceil(run.floorNumber / 10) * 10;
        const floorPos = run.floorNumber % 10 === 0 ? 10 : run.floorNumber % 10;
        const dropKey = Math.random() < (floorPos / 10) * GameConfig.KEY_DROP_CHANCE_MAX;

        if (dropKey) {
          run.keyDropped = true;
          run.keyBracketLevel = bracketKeyLevel;
          const keyId = uuidv4();
          db.insert(keys).values({
            id: keyId,
            playerId: row.playerId,
            floorBracket: bracketKeyLevel,
            createdAt: new Date().toISOString(),
          }).run();
        }
      }

      // Track initiator rewards for response
      if (h.heroId === run.initiatorHeroId) {
        run.totalGoldRewarded += currentMonster.goldReward;
        for (const drop of loot.shards) {
          const key = shardKey(drop.rarity, drop.bracketLevel);
          run.shardsEarned[key] = (run.shardsEarned[key] || 0) + drop.amount;
        }
      }
    }
  }
}

export const combatService = new CombatService();
