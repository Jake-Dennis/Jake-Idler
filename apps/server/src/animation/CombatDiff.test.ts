/**
 * Tests for CombatDiff — pure state diffing function.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { computeAnimationSteps } from "./CombatDiff.js";
import type { CombatRoundState } from "../services/combat-service.js";

// ─── Factory helpers ─────────────────────────────────────────

function makePrevRound(overrides: Partial<CombatRoundState> = {}): CombatRoundState {
  return {
    round: 1,
    totalHeroDamage: 0,
    totalHeroCrit: false,
    monsterDamage: 0,
    monsterCrit: false,
    monsterHp: 100,
    monsterMaxHp: 100,
    finished: false,
    heroWon: false,
    currentMonsterName: "Goblin",
    currentMonsterIsBoss: false,
    monstersDefeated: 0,
    totalMonsters: 10,
    monsterJustKilled: false,
    floorCompleted: false,
    floorFailed: false,
    partyHeroes: [],
    ...overrides,
  };
}

function heroBase(overrides: Record<string, unknown> = {}) {
  return {
    heroId: "hero-1",
    role: "dps",
    position: "front",
    damage: 0,
    crit: false,
    healingDone: 0,
    hp: 100,
    maxHp: 100,
    alive: true,
    damageTaken: 0,
    monsterCrit: false,
    healingReceived: 0,
    ...overrides,
  } as CombatRoundState["partyHeroes"][number];
}

// ─── Tests ───────────────────────────────────────────────────

describe("CombatDiff — computeAnimationSteps", () => {
  it("returns empty array when prev is null (first poll)", () => {
    const steps = computeAnimationSteps(null, makePrevRound());
    expect(steps).toEqual([]);
  });

  it("returns empty array when rounds are identical", () => {
    const prev = makePrevRound({ partyHeroes: [heroBase()] });
    const next = makePrevRound({ partyHeroes: [heroBase()] });
    const steps = computeAnimationSteps(prev, next);
    expect(steps).toEqual([]);
  });

  it("returns empty array when next round <= prev round", () => {
    const prev = makePrevRound({ round: 2, partyHeroes: [heroBase()] });
    const next = makePrevRound({ round: 1, partyHeroes: [heroBase()] });
    const steps = computeAnimationSteps(prev, next);
    expect(steps).toEqual([]);
  });

  it("produces ATTACK + HIT step when a hero dealt damage", () => {
    const prev = makePrevRound({ partyHeroes: [heroBase({ heroId: "h1" })] });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", damage: 25, crit: false })],
    });

    const steps = computeAnimationSteps(prev, next);

    expect(steps.length).toBeGreaterThanOrEqual(2);

    const attackStep = steps.find((s) => s.type === "ATTACK");
    expect(attackStep).toBeDefined();
    expect(attackStep!.entityId).toBe("hero-h1");
    expect(attackStep!.damage).toBe(25);
    expect(attackStep!.isCrit).toBe(false);

    const hitStep = steps.find((s) => s.type === "HIT" && s.damage === 25);
    expect(hitStep).toBeDefined();
    expect(hitStep!.entityId).toBeNull();
  });

  it("produces HIT step when a hero took damage", () => {
    const prev = makePrevRound({ partyHeroes: [heroBase({ heroId: "h1" })] });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", damageTaken: 15 })],
    });

    const steps = computeAnimationSteps(prev, next);
    const hitSteps = steps.filter((s) => s.type === "HIT" && s.entityId === "hero-h1");

    expect(hitSteps.length).toBeGreaterThanOrEqual(1);
    expect(hitSteps[0].damage).toBe(15);
  });

  it("produces HEAL step when a hero received healing", () => {
    const prev = makePrevRound({ partyHeroes: [heroBase({ heroId: "h1" })] });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", healingReceived: 20 })],
    });

    const steps = computeAnimationSteps(prev, next);
    const healStep = steps.find((s) => s.type === "HEAL");

    expect(healStep).toBeDefined();
    expect(healStep!.entityId).toBe("hero-h1");
    expect(healStep!.healAmount).toBe(20);
  });

  it("produces HIT + BLOCK step when a tank blocked damage", () => {
    const prev = makePrevRound({ partyHeroes: [heroBase({ heroId: "h1", role: "tank" })] });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", role: "tank", damageTaken: 30 })],
    });

    const steps = computeAnimationSteps(prev, next);

    const hitStep = steps.find((s) => s.type === "HIT" && s.entityId === "hero-h1");
    expect(hitStep).toBeDefined();
    expect(hitStep!.damage).toBe(30);

    const blockStep = steps.find((s) => s.type === "BLOCK");
    expect(blockStep).toBeDefined();
    expect(blockStep!.entityId).toBe("hero-h1");
    expect(blockStep!.damage).toBe(30);
  });

  it("produces DEATH step when a hero goes from alive to !alive", () => {
    const prev = makePrevRound({
      partyHeroes: [heroBase({ heroId: "h1", alive: true })],
    });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", alive: false, hp: 0 })],
    });

    const steps = computeAnimationSteps(prev, next);
    const deathStep = steps.find((s) => s.type === "DEATH");

    expect(deathStep).toBeDefined();
    expect(deathStep!.entityId).toBe("hero-h1");
  });

  it("does NOT produce DEATH step when hero was already dead", () => {
    const prev = makePrevRound({
      partyHeroes: [heroBase({ heroId: "h1", alive: false })],
    });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", alive: false, hp: 0 })],
    });

    const steps = computeAnimationSteps(prev, next);
    const deathStep = steps.find((s) => s.type === "DEATH");
    expect(deathStep).toBeUndefined();
  });

  it("produces MONSTER_DEATH step when monsterJustKilled toggles", () => {
    const prev = makePrevRound({ monsterJustKilled: false });
    const next = makePrevRound({
      round: 2,
      monsterJustKilled: true,
    });

    const steps = computeAnimationSteps(prev, next);
    const deathStep = steps.find((s) => s.type === "MONSTER_DEATH");

    expect(deathStep).toBeDefined();
    expect(deathStep!.entityId).toBeNull();
  });

  it("does NOT produce MONSTER_DEATH when monsterJustKilled was already true", () => {
    const prev = makePrevRound({ monsterJustKilled: true });
    const next = makePrevRound({
      round: 2,
      monsterJustKilled: true,
    });

    const steps = computeAnimationSteps(prev, next);
    const deathStep = steps.find((s) => s.type === "MONSTER_DEATH");
    expect(deathStep).toBeUndefined();
  });

  it("produces steps ordered by stepIndex (attacks before heals before deaths)", () => {
    const prev = makePrevRound({
      partyHeroes: [
        heroBase({ heroId: "h1", alive: true }),
        heroBase({ heroId: "h2", role: "healer", alive: true }),
      ],
    });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [
        heroBase({ heroId: "h1", damage: 25, alive: true }),
        heroBase({ heroId: "h2", role: "healer", healingReceived: 20, alive: false }),
      ],
      monsterJustKilled: true,
    });

    const steps = computeAnimationSteps(prev, next);

    // All steps must have sequential stepIndex
    const indices = steps.map((s) => s.stepIndex);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }

    // First steps should be ATTACK/HIT (from dps dealing damage)
    const firstTypes = steps.slice(0, 2).map((s) => s.type);
    expect(firstTypes).toContain("ATTACK");
  });

  it("produces MONSTER_APPEAR when monster name changes (without kill)", () => {
    const prev = makePrevRound({
      currentMonsterName: "Goblin",
      monsterJustKilled: false,
    });
    const next = makePrevRound({
      round: 2,
      currentMonsterName: "Orc",
      monsterJustKilled: false,
    });

    const steps = computeAnimationSteps(prev, next);
    const appearStep = steps.find((s) => s.type === "MONSTER_APPEAR");

    expect(appearStep).toBeDefined();
    expect(appearStep!.entityId).toBeNull();
  });

  it("attaches isCrit flag to ATTACK step when hero crits", () => {
    const prev = makePrevRound({ partyHeroes: [heroBase({ heroId: "h1" })] });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [heroBase({ heroId: "h1", damage: 50, crit: true })],
    });

    const steps = computeAnimationSteps(prev, next);
    const attackStep = steps.find((s) => s.type === "ATTACK");

    expect(attackStep).toBeDefined();
    expect(attackStep!.isCrit).toBe(true);
    expect(attackStep!.damage).toBe(50);
  });

  it("handles multiple heroes with mixed events", () => {
    const prev = makePrevRound({
      partyHeroes: [
        heroBase({ heroId: "h1", role: "dps", alive: true }),
        heroBase({ heroId: "h2", role: "tank", alive: true }),
        heroBase({ heroId: "h3", role: "healer", alive: true }),
      ],
    });
    const next = makePrevRound({
      round: 2,
      partyHeroes: [
        heroBase({ heroId: "h1", role: "dps", damage: 30, alive: true }),
        heroBase({ heroId: "h2", role: "tank", damageTaken: 20, alive: true }),
        heroBase({ heroId: "h3", role: "healer", healingReceived: 15, alive: true }),
      ],
    });

    const steps = computeAnimationSteps(prev, next);

    // Should have steps for all 3 heroes
    const attackSteps = steps.filter((s) => s.type === "ATTACK");
    const hitSteps = steps.filter((s) => s.type === "HIT");
    const healSteps = steps.filter((s) => s.type === "HEAL");

    expect(attackSteps.length).toBeGreaterThanOrEqual(1);
    expect(hitSteps.length).toBeGreaterThanOrEqual(1);
    expect(healSteps.length).toBeGreaterThanOrEqual(1);
  });
});
