import type { Monster, CombatPosition, CombatRole } from "@jake-idler/game";
import { createChildLogger } from "../observability/logger.js";
import { gameEvents } from "./event-bus.js";

// ─── Types (mirror of combat-service.ts internals) ────────────

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

export interface FloorMonster {
  data: Monster;
  maxHp: number;
  currentHp: number;
  xpReward: number;
  goldReward: number;
  lootProcessed: boolean;
}

export interface PartyHeroRunState {
  heroId: string;
  name: string;
  role: CombatRole;
  position: CombatPosition;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  healing: number;
  alive: boolean;
  weaponType: string;
}

export interface PartyFloorRunState {
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
  goldPenaltyApplied?: boolean;
}

// ─── Session Manager ──────────────────────────────────────────

export class SessionManager {
  private runs = new Map<string, PartyFloorRunState>();
  private log = createChildLogger("session-manager");

  createRun(
    partyId: string,
    initiatorHeroId: string,
    floorNumber: number,
    heroes: PartyHeroRunState[],
    monsters: FloorMonster[],
    totalMonsters: number,
    floorGoldValue: number,
  ): PartyFloorRunState {
    const runId = partyId;
    const run: PartyFloorRunState = {
      partyId,
      initiatorHeroId,
      floorNumber,
      heroes,
      monsters,
      currentMonsterIndex: 0,
      totalMonsters,
      monstersDefeated: 0,
      floorCompleted: false,
      floorFailed: false,
      tickCount: 0,
      roundIndex: 0,
      lastRound: null,
      totalGoldRewarded: 0,
      floorGoldValue,
      shardsEarned: {},
      finishedAt: null,
      events: [],
    };

    this.runs.set(runId, run);
    this.log.info({ runId, partyId, floorNumber }, "Run created");
    gameEvents.emit("run:started", { runId, partyId, floorNumber });
    return run;
  }

  getRun(runId: string): PartyFloorRunState | undefined {
    return this.runs.get(runId);
  }

  listActiveRuns(): PartyFloorRunState[] {
    const active: PartyFloorRunState[] = [];
    for (const run of this.runs.values()) {
      if (!run.floorCompleted && !run.floorFailed) {
        active.push(run);
      }
    }
    return active;
  }

  markRunCompleted(runId: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      this.log.warn({ runId }, "markRunCompleted: run not found");
      return;
    }
    run.finishedAt = Date.now();
    run.floorCompleted = true;
    this.log.info({ runId, partyId: run.partyId }, "Run completed");
    gameEvents.emit("run:completed", {
      runId,
      reward: {
        goldEarned: run.totalGoldRewarded,
        monstersDefeated: run.monstersDefeated,
        totalMonsters: run.totalMonsters,
        shardsEarned: run.shardsEarned,
      },
    });
  }

  markRunFailed(runId: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      this.log.warn({ runId }, "markRunFailed: run not found");
      return;
    }
    run.finishedAt = Date.now();
    run.floorFailed = true;
    this.log.info({ runId, partyId: run.partyId }, "Run failed");
    gameEvents.emit("run:failed", {
      runId,
      goldLost: 0,
    });
  }

  getActivePartyIdForHero(heroId: string): string | null {
    for (const [runId, run] of this.runs) {
      if (!run.floorCompleted && !run.floorFailed && run.heroes.some((h) => h.heroId === heroId)) {
        return runId;
      }
    }
    return null;
  }

  getPartyIdForHero(heroId: string): string | null {
    for (const [runId, run] of this.runs) {
      if (run.finishedAt !== null && Date.now() - run.finishedAt > 60000) continue;
      if (run.heroes.some((h) => h.heroId === heroId)) {
        return runId;
      }
    }
    return null;
  }

  removeRun(runId: string): void {
    const existed = this.runs.delete(runId);
    if (existed) {
      this.log.info({ runId }, "Run removed");
    }
  }

  updateMonster(runId: string, monsterIndex: number, updates: Partial<FloorMonster>): void {
    const run = this.runs.get(runId);
    if (!run) {
      this.log.warn({ runId }, "updateMonster: run not found");
      return;
    }
    const monster = run.monsters[monsterIndex];
    if (!monster) {
      this.log.warn({ runId, monsterIndex }, "updateMonster: monster index out of bounds");
      return;
    }
    Object.assign(monster, updates);
  }

  getTick(runId: string): number {
    const run = this.runs.get(runId);
    if (!run) {
      this.log.warn({ runId }, "getTick: run not found");
      return 0;
    }
    return run.tickCount;
  }

  /** Advance the tick counter for a run and emit the round:processed event. */
  tick(runId: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      this.log.warn({ runId }, "tick: run not found");
      return;
    }
    if (run.floorCompleted || run.floorFailed) {
      return;
    }
    run.tickCount++;
    gameEvents.emit("round:processed", {
      runId,
      round: run.tickCount,
      state: run,
    });
  }

  /** Remove runs that finished more than 60 seconds ago. */
  cleanupOldRuns(): void {
    const now = Date.now();
    for (const [runId, run] of this.runs) {
      if (run.finishedAt !== null && now - run.finishedAt > 60000) {
        this.runs.delete(runId);
        this.log.info({ runId }, "Old run cleaned up");
      }
    }
  }
}

/** Singleton session manager for the game server. */
export const sessionManager = new SessionManager();
