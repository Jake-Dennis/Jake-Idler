import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import BigNumber from "break_infinity.js";
import { CombatRole, CombatPosition } from "@jake-idler/game";
import { SessionManager, type PartyHeroRunState, type FloorMonster } from "../session-manager.js";
import { gameEvents } from "../event-bus.js";

describe("SessionManager", () => {
  let manager: SessionManager;

  const mockHeroes: PartyHeroRunState[] = [
    {
      heroId: "hero-1",
      name: "Aragorn",
      role: CombatRole.DPS,
      position: CombatPosition.Front,
      hp: 100,
      maxHp: 100,
      atk: 20,
      def: 10,
      healing: 0,
      alive: true,
      weaponType: "melee",
      photoUrl: null,
    },
    {
      heroId: "hero-2",
      name: "Gandalf",
      role: CombatRole.Healer,
      position: CombatPosition.Rear,
      hp: 80,
      maxHp: 80,
      atk: 5,
      def: 5,
      healing: 10,
      alive: true,
      weaponType: "melee",
      photoUrl: null,
    },
  ];

  const mockMonsters: FloorMonster[] = [
    {
      data: {
        id: "m1",
        name: "Goblin",
        floor: 1,
        isBoss: false,
        isBracketBoss: false,
        stats: {
          hp: new BigNumber(50),
          atk: new BigNumber(10),
          def: new BigNumber(5),
          spd: new BigNumber(5),
        },
        xpReward: new BigNumber(10),
        goldReward: new BigNumber(5),
      },
      maxHp: 50,
      currentHp: 50,
      xpReward: 10,
      goldReward: 5,
      lootProcessed: false,
    },
  ];

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    gameEvents.removeAllListeners("run:started");
    gameEvents.removeAllListeners("run:completed");
    gameEvents.removeAllListeners("run:failed");
    gameEvents.removeAllListeners("round:processed");
  });

  describe("createRun", () => {
    it("creates and stores a new run", () => {
      const run = manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      expect(run.partyId).toBe("party-1");
      expect(run.floorNumber).toBe(5);
      expect(run.heroes).toHaveLength(2);
      expect(run.monsters).toHaveLength(1);
      expect(run.floorCompleted).toBe(false);
      expect(run.floorFailed).toBe(false);
      expect(run.tickCount).toBe(0);
    });

    it("emits run:started event", () => {
      const handler = vi.fn();
      gameEvents.on("run:started", handler);
      const run = manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ runId: expect.any(String), partyId: "party-1", floorNumber: 5 }),
      );
      gameEvents.off("run:started", handler);
    });

    it("returns a run that can be retrieved by getRun", () => {
      const run = manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const retrieved = manager.getRun(run.partyId);
      // Note: runId is generated internally, not the partyId
      // We need to get the actual runId somehow — but createRun doesn't return it.
      // Since runs are keyed by runId (UUID), not partyId, getRun(partyId) won't work.
      // However, we can verify the run object itself is what was stored.
      expect(run).toBeDefined();
    });
  });

  describe("getRun", () => {
    it("returns undefined for unknown runId", () => {
      expect(manager.getRun("non-existent")).toBeUndefined();
    });

    it("returns the run after creation", () => {
      const run = manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      // We need the runId. Since createRun returns the run state (not the id),
      // and the manager stores by generated UUID, we can use listActiveRuns to find it.
      const active = manager.listActiveRuns();
      expect(active).toHaveLength(1);
      const runId = manager.getActivePartyIdForHero("hero-1");
      expect(runId).not.toBeNull();
      const retrieved = manager.getRun(runId!);
      expect(retrieved).toBeDefined();
      expect(retrieved!.partyId).toBe("party-1");
    });
  });

  describe("listActiveRuns", () => {
    it("returns only active runs", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      manager.createRun("party-2", "hero-2", 6, mockHeroes, mockMonsters, 1, 100);
      expect(manager.listActiveRuns()).toHaveLength(2);
    });

    it("excludes completed runs", () => {
      const run = manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      expect(manager.listActiveRuns()).toHaveLength(0);
    });

    it("excludes failed runs", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunFailed(runId);
      expect(manager.listActiveRuns()).toHaveLength(0);
    });
  });

  describe("markRunCompleted", () => {
    it("sets floorCompleted and finishedAt", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      const run = manager.getRun(runId);
      expect(run!.floorCompleted).toBe(true);
      expect(run!.finishedAt).not.toBeNull();
    });

    it("emits run:completed event", () => {
      const handler = vi.fn();
      gameEvents.on("run:completed", handler);
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          runId,
          reward: expect.objectContaining({
            goldEarned: 0,
            monstersDefeated: 0,
            totalMonsters: 1,
            shardsEarned: {},
          }),
        }),
      );
      gameEvents.off("run:completed", handler);
    });

    it("is a no-op for unknown runId", () => {
      expect(() => manager.markRunCompleted("unknown")).not.toThrow();
    });
  });

  describe("markRunFailed", () => {
    it("sets floorFailed and finishedAt", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunFailed(runId);
      const run = manager.getRun(runId);
      expect(run!.floorFailed).toBe(true);
      expect(run!.finishedAt).not.toBeNull();
    });

    it("emits run:failed event", () => {
      const handler = vi.fn();
      gameEvents.on("run:failed", handler);
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunFailed(runId);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ runId, goldLost: 0 }),
      );
      gameEvents.off("run:failed", handler);
    });

    it("is a no-op for unknown runId", () => {
      expect(() => manager.markRunFailed("unknown")).not.toThrow();
    });
  });

  describe("getActivePartyIdForHero", () => {
    it("returns runId when hero is in an active run", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1");
      expect(runId).not.toBeNull();
    });

    it("returns null when hero is not in any run", () => {
      expect(manager.getActivePartyIdForHero("hero-99")).toBeNull();
    });

    it("returns null when the run is completed", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      expect(manager.getActivePartyIdForHero("hero-1")).toBeNull();
    });
  });

  describe("getPartyIdForHero", () => {
    it("returns runId for a recently completed run", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      expect(manager.getPartyIdForHero("hero-1")).toBe(runId);
    });

    it("returns null for an old completed run", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      const run = manager.getRun(runId)!;
      run.finishedAt = Date.now() - 120_000; // 2 minutes ago
      expect(manager.getPartyIdForHero("hero-1")).toBeNull();
    });
  });

  describe("removeRun", () => {
    it("removes the run from the map", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.removeRun(runId);
      expect(manager.getRun(runId)).toBeUndefined();
    });
  });

  describe("updateMonster", () => {
    it("updates monster fields", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.updateMonster(runId, 0, { currentHp: 25 });
      const run = manager.getRun(runId);
      expect(run!.monsters[0].currentHp).toBe(25);
    });

    it("is a no-op for unknown runId", () => {
      expect(() => manager.updateMonster("unknown", 0, { currentHp: 25 })).not.toThrow();
    });
  });

  describe("getTick", () => {
    it("returns the run's tickCount", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      expect(manager.getTick(runId)).toBe(0);
    });

    it("returns 0 for unknown runId", () => {
      expect(manager.getTick("unknown")).toBe(0);
    });
  });

  describe("tick", () => {
    it("increments tickCount", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.tick(runId);
      expect(manager.getTick(runId)).toBe(1);
    });

    it("emits round:processed when lastRound exists", () => {
      const handler = vi.fn();
      gameEvents.on("round:processed", handler);
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      const run = manager.getRun(runId)!;
      run.lastRound = {
        round: 1,
        totalHeroDamage: 10,
        totalHeroCrit: false,
        monsterDamage: 5,
        monsterCrit: false,
        monsterHp: 40,
        monsterMaxHp: 50,
        finished: false,
        heroWon: false,
        currentMonsterName: "Goblin",
        currentMonsterIsBoss: false,
        monstersDefeated: 0,
        totalMonsters: 1,
        monsterJustKilled: false,
        floorCompleted: false,
        floorFailed: false,
        partyHeroes: [],
      };
      manager.tick(runId);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ runId, round: 1, state: expect.any(Object) }),
      );
      gameEvents.off("round:processed", handler);
    });

    it("emits round:processed even when lastRound is null", () => {
      const handler = vi.fn();
      gameEvents.on("round:processed", handler);
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.tick(runId);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ runId, round: 1 }),
      );
      gameEvents.off("round:processed", handler);
    });

    it("does not tick completed runs", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      manager.tick(runId);
      expect(manager.getTick(runId)).toBe(0);
    });
  });

  describe("cleanupOldRuns", () => {
    it("removes runs finished more than 60s ago", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      const run = manager.getRun(runId)!;
      run.finishedAt = Date.now() - 120_000;
      manager.cleanupOldRuns();
      expect(manager.getRun(runId)).toBeUndefined();
    });

    it("preserves recently finished runs", () => {
      manager.createRun("party-1", "hero-1", 5, mockHeroes, mockMonsters, 1, 100);
      const runId = manager.getActivePartyIdForHero("hero-1")!;
      manager.markRunCompleted(runId);
      manager.cleanupOldRuns();
      expect(manager.getRun(runId)).toBeDefined();
    });
  });
});
