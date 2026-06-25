import { describe, it, expect } from "vitest";
import { combatSerializer, type CombatViewState } from "../serializers/combat-serializer.js";

function makeStubRun(overrides: {
  floorCompleted?: boolean;
  floorFailed?: boolean;
  partyId?: string;
  currentMonsterIndex?: number;
  monstersDefeated?: number;
  lastRound?: ReturnType<typeof makeStubLastRound> | null;
} = {}): Parameters<typeof combatSerializer.toView>[0] {
  const monsterA = {
    data: { id: "m1", name: "Goblin Scout", isBoss: false },
    maxHp: 100,
    currentHp: 0,
  };
  const monsterB = {
    data: { id: "m2", name: "Orc Warrior", isBoss: false },
    maxHp: 150,
    currentHp: 80,
  };
  const monsterC = {
    data: { id: "m3", name: "Floor Boss", isBoss: true },
    maxHp: 300,
    currentHp: 300,
  };

  return {
    partyId: overrides.partyId ?? "party_abc",
    initiatorHeroId: "h1",
    floorNumber: 5,
    heroes: [
      {
        heroId: "h1",
        name: "Hero One",
        role: "dps",
        position: "middle",
        hp: 100,
        maxHp: 100,
        atk: 20,
        def: 10,
        healing: 0,
        alive: true,
      },
    ],
    monsters: [monsterA, monsterB, monsterC],
    currentMonsterIndex: overrides.currentMonsterIndex ?? 1,
    totalMonsters: 3,
    monstersDefeated: overrides.monstersDefeated ?? 1,
    floorCompleted: overrides.floorCompleted ?? false,
    floorFailed: overrides.floorFailed ?? false,
    tickCount: 42,
    roundIndex: 5,
    lastRound: overrides.lastRound !== undefined ? overrides.lastRound : makeStubLastRound(),
    totalGoldRewarded: 120,
    floorGoldValue: 75,
    shardsEarned: { fire: 3, water: 1 },
    finishedAt: overrides.floorCompleted || overrides.floorFailed ? Date.now() : null,
    events: [],
    goldPenaltyApplied: false,
  };
}

function makeStubLastRound(overrides: {
  monsterJustKilled?: boolean;
  floorCompleted?: boolean;
  floorFailed?: boolean;
  monsterHp?: number;
} = {}) {
  return {
    round: 5,
    totalHeroDamage: 45,
    totalHeroCrit: true,
    monsterDamage: 12,
    monsterCrit: false,
    monsterHp: overrides.monsterHp ?? 80,
    monsterMaxHp: 150,
    finished: false,
    heroWon: false,
    currentMonsterName: "Orc Warrior",
    currentMonsterIsBoss: false,
    monstersDefeated: 1,
    totalMonsters: 3,
    monsterJustKilled: overrides.monsterJustKilled ?? false,
    floorCompleted: overrides.floorCompleted ?? false,
    floorFailed: overrides.floorFailed ?? false,
    partyHeroes: [
      {
        heroId: "h1",
        name: "Hero One",
        role: "dps",
        position: "middle",
        damage: 45,
        crit: true,
        healingDone: 0,
        hp: 88,
        maxHp: 100,
        alive: true,
        damageTaken: 12,
        monsterCrit: false,
        healingReceived: 0,
      },
    ],
  };
}

describe("combatSerializer.toView", () => {
  it("serializes a mid-floor active run with the correct shape", () => {
    const run = makeStubRun();
    const view = combatSerializer.toView(run, "h1");

    expect(view.inCombat).toBe(true);
    expect(view.finished).toBe(false);
    expect(view.floorCompleted).toBe(false);
    expect(view.floorFailed).toBe(false);
    expect(view.partyCombat).toBe(true);
    expect(view.result).toBeUndefined();

    expect(view.monsters).toHaveLength(2);
    expect(view.monsters[0]).toMatchObject({
      id: "m2",
      name: "Orc Warrior",
      isBoss: false,
      hp: 80,
      maxHp: 150,
      isCurrentFocus: true,
    });
    expect(view.monsters[1]).toMatchObject({
      id: "m3",
      name: "Floor Boss",
      isBoss: true,
      hp: 300,
      maxHp: 300,
      isCurrentFocus: false,
    });

    expect(view.round).not.toBeNull();
    expect(view.round!.round).toBe(5);
    expect(view.round!.heroDamage).toBe(45);
    expect(view.round!.heroCrit).toBe(true);
    expect(view.round!.monsterDamage).toBe(12);
    expect(view.round!.monsterCrit).toBe(false);
    expect(view.round!.monsterHp).toBe(80);
    expect(view.round!.monsterMaxHp).toBe(150);
    expect(view.round!.totalRounds).toBe(5);
    expect(view.round!.monstersDefeated).toBe(1);
    expect(view.round!.totalMonsters).toBe(3);
    expect(view.round!.currentMonsterName).toBe("Orc Warrior");
    expect(view.round!.currentMonsterIsBoss).toBe(false);
    expect(view.round!.monsterJustKilled).toBe(false);
    expect(view.round!.partyHeroes).toHaveLength(1);

    expect(view.floorProgress).toEqual({
      monstersDefeated: 1,
      totalMonsters: 3,
      currentMonsterName: "Orc Warrior",
      currentMonsterIsBoss: false,
    });
  });

  it("serializes a completed run with result present", () => {
    const run = makeStubRun({
      floorCompleted: true,
      monstersDefeated: 3,
      lastRound: makeStubLastRound({ monsterHp: 0, monsterJustKilled: true }),
    });
    const view = combatSerializer.toView(run, "h1");

    expect(view.inCombat).toBe(false);
    expect(view.finished).toBe(true);
    expect(view.floorCompleted).toBe(true);
    expect(view.floorFailed).toBe(false);
    expect(view.result).toBeDefined();
    expect(view.result!.heroWon).toBe(true);
    expect(view.result!.totalRounds).toBe(5);
    expect(view.result!.goldEarned).toBe(120);
    expect(view.result!.goldLost).toBe(0);
    expect(view.result!.monstersDefeated).toBe(3);
    expect(view.result!.totalMonsters).toBe(3);
    expect(view.result!.shardsEarned).toEqual({ fire: 3, water: 1 });
  });

  it("serializes a failed run with goldLost equal to floorGoldValue", () => {
    const run = makeStubRun({
      floorFailed: true,
      lastRound: makeStubLastRound({ monsterHp: 80, floorFailed: true }),
    });
    const view = combatSerializer.toView(run, "h1");

    expect(view.inCombat).toBe(false);
    expect(view.finished).toBe(true);
    expect(view.floorCompleted).toBe(false);
    expect(view.floorFailed).toBe(true);
    expect(view.result).toBeDefined();
    expect(view.result!.heroWon).toBe(false);
    expect(view.result!.goldLost).toBe(75);
    expect(view.result!.goldEarned).toBe(120);
  });

  it("sets partyCombat to false for a solo run", () => {
    const run = makeStubRun({ partyId: "solo_h1" });
    const view = combatSerializer.toView(run, "h1");

    expect(view.partyCombat).toBe(false);
    expect(view.inCombat).toBe(true);
  });

  it("produces a stable snapshot for a known state", () => {
    const run = makeStubRun({
      partyId: "party_xyz",
      currentMonsterIndex: 2,
      monstersDefeated: 2,
      lastRound: {
        round: 12,
        totalHeroDamage: 99,
        totalHeroCrit: false,
        monsterDamage: 7,
        monsterCrit: true,
        monsterHp: 250,
        monsterMaxHp: 300,
        finished: false,
        heroWon: false,
        currentMonsterName: "Floor Boss",
        currentMonsterIsBoss: true,
        monstersDefeated: 2,
        totalMonsters: 3,
        monsterJustKilled: false,
        floorCompleted: false,
        floorFailed: false,
        partyHeroes: [
          {
            heroId: "h1",
            name: "Hero One",
            role: "dps",
            position: "middle",
            damage: 99,
            crit: false,
            healingDone: 0,
            hp: 50,
            maxHp: 100,
            alive: true,
            damageTaken: 7,
            monsterCrit: true,
            healingReceived: 0,
          },
        ],
      },
    });

    const view = combatSerializer.toView(run, "h1");

    // Byte-for-byte field assertions against the expected snapshot
    const expected: CombatViewState = {
      inCombat: true,
      finished: false,
      floorCompleted: false,
      floorFailed: false,
      partyCombat: true,
      monsters: [
        {
          id: "m2",
          name: "Orc Warrior",
          isBoss: false,
          hp: 80,
          maxHp: 150,
          isCurrentFocus: false,
        },
        {
          id: "m3",
          name: "Floor Boss",
          isBoss: true,
          hp: 300,
          maxHp: 300,
          isCurrentFocus: true,
        },
      ],
      round: {
        round: 12,
        heroDamage: 99,
        heroCrit: false,
        monsterDamage: 7,
        monsterCrit: true,
        monsterHp: 250,
        monsterMaxHp: 300,
        totalRounds: 12,
        monstersDefeated: 2,
        totalMonsters: 3,
        currentMonsterName: "Floor Boss",
        currentMonsterIsBoss: true,
        monsterJustKilled: false,
        partyHeroes: [
          {
            heroId: "h1",
            name: "Hero One",
            role: "dps",
            position: "middle",
            damage: 99,
            crit: false,
            healingDone: 0,
            hp: 50,
            maxHp: 100,
            alive: true,
            damageTaken: 7,
            monsterCrit: true,
            healingReceived: 0,
          },
        ],
      },
      events: [
        { type: "hero_attack", heroId: "h1", damage: 99, crit: false, weaponType: "melee", role: "dps" },
        { type: "hero_hit", heroId: "h1", damage: 7, crit: true },
      ],
      floorProgress: {
        monstersDefeated: 2,
        totalMonsters: 3,
        currentMonsterName: "Floor Boss",
        currentMonsterIsBoss: true,
      },
    };

    expect(view).toEqual(expected);
    expect(JSON.stringify(view)).toBe(JSON.stringify(expected));
  });

  it("returns round as null when lastRound is null", () => {
    const run = makeStubRun({ lastRound: null });
    const view = combatSerializer.toView(run, "h1");
    expect(view.round).toBeNull();
  });

  it("marks isCurrentFocus correctly for the current monster", () => {
    const run = makeStubRun({ currentMonsterIndex: 0 });
    // Monster A is dead (currentHp: 0), so it's filtered out
    // currentMonsterIndex is 0, but monster at index 0 has currentHp 0
    // So currentMonster = monsters[0] which has currentHp 0
    // After filter, only monsters with currentHp > 0 remain
    // So monsters array will be [monsterB, monsterC]
    // currentMonster = run.monsters[0] (dead monster)
    // m === currentMonster will be false for all filtered monsters
    const view = combatSerializer.toView(run, "h1");
    expect(view.monsters.every((m) => !m.isCurrentFocus)).toBe(true);
  });
});

describe("combatSerializer.buildEvents", () => {
  it("produces hero_attack events with weapon type from playerHero", () => {
    const lastRound = makeStubLastRound();
    const playerHero = {
      id: "h1",
      equipped: {
        rightHandWeapon: { type: "bow" },
      } as Record<string, unknown>,
    };

    const events = combatSerializer.buildEvents(lastRound, playerHero);
    const attack = events.find((e) => e.type === "hero_attack");
    expect(attack).toBeDefined();
    expect(attack!.weaponType).toBe("bow");
    expect(attack!.damage).toBe(45);
    expect(attack!.crit).toBe(true);
    expect(attack!.role).toBe("dps");
  });

  it("defaults weapon type to melee for other heroes", () => {
    const lastRound = {
      ...makeStubLastRound(),
      partyHeroes: [
        {
          heroId: "h2",
          name: "Hero Two",
          role: "dps",
          position: "middle",
          damage: 30,
          crit: false,
          healingDone: 0,
          hp: 100,
          maxHp: 100,
          alive: true,
          damageTaken: 0,
          monsterCrit: false,
          healingReceived: 0,
        },
      ],
    };

    const playerHero = {
      id: "h1",
      equipped: {
        rightHandWeapon: { type: "sword" },
      } as Record<string, unknown>,
    };

    const events = combatSerializer.buildEvents(lastRound, playerHero);
    const attack = events.find((e) => e.type === "hero_attack");
    expect(attack).toBeDefined();
    expect(attack!.weaponType).toBe("melee");
  });

  it("produces heal_cast and healed events", () => {
    const lastRound = {
      ...makeStubLastRound(),
      partyHeroes: [
        {
          heroId: "h1",
          name: "Hero One",
          role: "healer",
          position: "rear",
          damage: 0,
          crit: false,
          healingDone: 25,
          hp: 90,
          maxHp: 100,
          alive: true,
          damageTaken: 0,
          monsterCrit: false,
          healingReceived: 15,
        },
      ],
    };

    const events = combatSerializer.buildEvents(lastRound, { id: "h1", equipped: null });
    expect(events.some((e) => e.type === "heal_cast" && e.healAmount === 25)).toBe(true);
    expect(events.some((e) => e.type === "healed" && e.healAmount === 15)).toBe(true);
  });

  it("produces hero_hit and block events for tanks", () => {
    const lastRound = {
      ...makeStubLastRound(),
      partyHeroes: [
        {
          heroId: "h1",
          name: "Hero One",
          role: "tank",
          position: "front",
          damage: 0,
          crit: false,
          healingDone: 0,
          hp: 80,
          maxHp: 100,
          alive: true,
          damageTaken: 20,
          monsterCrit: true,
          healingReceived: 0,
        },
      ],
    };

    const events = combatSerializer.buildEvents(lastRound, { id: "h1", equipped: null });
    expect(events.some((e) => e.type === "hero_hit" && e.damage === 20 && e.crit === true)).toBe(true);
    expect(events.some((e) => e.type === "block" && e.damage === 20)).toBe(true);
  });

  it("produces hero_death when a hero is not alive", () => {
    const lastRound = {
      ...makeStubLastRound(),
      partyHeroes: [
        {
          heroId: "h1",
          name: "Hero One",
          role: "dps",
          position: "middle",
          damage: 0,
          crit: false,
          healingDone: 0,
          hp: 0,
          maxHp: 100,
          alive: false,
          damageTaken: 100,
          monsterCrit: false,
          healingReceived: 0,
        },
      ],
    };

    const events = combatSerializer.buildEvents(lastRound, { id: "h1", equipped: null });
    expect(events.some((e) => e.type === "hero_death")).toBe(true);
  });

  it("produces monster_death when monsterJustKilled is true", () => {
    const lastRound = makeStubLastRound({ monsterJustKilled: true });
    const events = combatSerializer.buildEvents(lastRound, { id: "h1", equipped: null });
    expect(events.some((e) => e.type === "monster_death")).toBe(true);
  });

  it("returns an empty array when lastRound is null", () => {
    // CombatRoundState is required by signature; use a minimal object with empty partyHeroes
    const lastRound = {
      round: 0,
      totalHeroDamage: 0,
      totalHeroCrit: false,
      monsterDamage: 0,
      monsterCrit: false,
      monsterHp: 0,
      monsterMaxHp: 0,
      finished: false,
      heroWon: false,
      currentMonsterName: "",
      currentMonsterIsBoss: false,
      monstersDefeated: 0,
      totalMonsters: 0,
      monsterJustKilled: false,
      floorCompleted: false,
      floorFailed: false,
      partyHeroes: [],
    };
    const events = combatSerializer.buildEvents(lastRound, { id: "h1", equipped: null });
    expect(events).toEqual([]);
  });
});
