import { describe, it, expect } from "vitest";
import {
  Rarity,
  GameConfig,
  computeHeroStats,
  computeEquipmentStats,
  createStarterEquipment,
  calculateDamage,
  calculateCrit,
  processCombat,
  generateMonster,
  generateBracketBoss,
  processMonsterLoot,
  calculateGoldReward,
  getKeyDropChance,
  rollKeyDrop,
  getFloorDifficulty,
  getBracketEquipmentLevel,
  getBracketName,
} from "../src/index";

// ─── Hero Stats ──────────────────────────────────────────────────

describe("computeHeroStats", () => {
  it("returns base stats for a level 1 hero with no equipment", () => {
    const hero = {
      level: 1,
      equipped: {} as Record<string, any>,
    };
    const stats = computeHeroStats(hero);
    expect(stats.atk.toNumber()).toBe(0); // HERO_STAT_MULTIPLIER = 0
    expect(stats.def.toNumber()).toBe(0);
    expect(stats.hp.toNumber()).toBe(0);
    expect(stats.spd.toNumber()).toBe(0);
  });

  it("adds equipment stats to hero level only", () => {
    const hero = {
      level: 1,
      equipped: {
        rightHandWeapon: {
          slot: "rightHandWeapon",
          stats: { atk: 15, def: 0, hp: 0 },
        },
      } as any,
    };
    const stats = computeHeroStats(hero);
    expect(stats.atk.toNumber()).toBe(15); // 15 (weapon) + 0 (level bonus)
  });

  it("clamps stats at minimum 0", () => {
    const hero = {
      level: 0,
      equipped: {
        body: {
          slot: "body",
          stats: { atk: -10, def: -10, hp: -10 },
        },
      } as any,
    };
    const stats = computeHeroStats(hero);
    expect(stats.atk.toNumber()).toBe(0);
    expect(stats.def.toNumber()).toBe(0);
    expect(stats.hp.toNumber()).toBe(0);
    expect(stats.spd.toNumber()).toBe(0);
  });
});

// ─── Equipment Stats ─────────────────────────────────────────────

describe("computeEquipmentStats", () => {
  it("generates correct stats for weapon slot", () => {
    // level 1 common → 700 + ((1-10)/10)*300 + 0 = 430 ATK
    const stats = computeEquipmentStats("rightHandWeapon", 1, Rarity.Common);
    expect(stats.atk).toBe(430);
    expect(stats.def).toBe(0);
    expect(stats.hp).toBe(0);
  });

  it("generates correct stats for accessory slot", () => {
    // level 1 common → 700 + ((1-10)/10)*300 + 0 = 430 HP
    const stats = computeEquipmentStats("necklace", 1, Rarity.Common);
    expect(stats.atk).toBe(0);
    expect(stats.def).toBe(0);
    expect(stats.hp).toBe(430);
  });
});

// ─── Starter Equipment ───────────────────────────────────────────

describe("createStarterEquipment", () => {
  it("creates 16 starter items (6 weapons + 5 armour + 5 accessories)", () => {
    const gear = createStarterEquipment();
    expect(gear).toHaveLength(16);
    // 3 main hands (melee/range/mage)
    const mh = gear.filter((i) => i.slot === "rightHandWeapon");
    expect(mh).toHaveLength(3);
    expect(mh.map((i) => i.type).sort()).toEqual(["mage", "melee", "range"]);
    // 3 off hands (melee/range/mage)
    const oh = gear.filter((i) => i.slot === "leftHand");
    expect(oh).toHaveLength(3);
    expect(oh.map((i) => i.type).sort()).toEqual(["mage", "melee", "range"]);
    // 5 armour slots
    expect(gear.filter((i) => i.slot === "helmet")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "body")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "legs")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "boots")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "gloves")).toHaveLength(1);
    // 5 accessory slots
    expect(gear.filter((i) => i.slot === "necklace")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "leftRing")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "rightRing")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "leftEarring")).toHaveLength(1);
    expect(gear.filter((i) => i.slot === "rightEarring")).toHaveLength(1);
  });

  it("all starter items are Lv10 common with effectiveLevel 10 (raw level, no rarity bonus)", () => {
    const gear = createStarterEquipment();
    for (const item of gear) {
      expect(item.rarity).toBe("common");
      expect(item.level).toBe(10);
      expect(item.effectiveLevel).toBe(10);
    }
  });
});

// ─── Monster Scaling ─────────────────────────────────────────────

describe("monster scaling vs starter gear", () => {
  it("floor 1 trash takes ~50 rounds for starter hero (~5 min for full floor)", () => {
    // Starter hero with full Lv10 common gear: weapon=40+10, armor=10+10, accessory=10+10
    const heroAtk = 100;  // 2 weapons × (40 + 10)
    const heroDef = 100;  // 5 armor × (10 + 10)
    const heroHp = 100;   // 5 accessories × (10 + 10)

    // Floor 1 monster stats
    const monster = generateMonster(1, false);
    const monsterAtk = monster.stats.atk.toNumber();
    const monsterDef = monster.stats.def.toNumber();
    const monsterHp = monster.stats.hp.toNumber();

    // Floor 1 monsters should NOT damage starter hero (ATK == DEF → 0 with min=0)
    const dmgToHero = Math.max(0, monsterAtk - heroDef);
    expect(dmgToHero).toBe(0);

    // Hero damage per round
    const dmgPerRound = Math.max(0, heroAtk - monsterDef);
    const roundsPerKill = Math.ceil(monsterHp / dmgPerRound);

    // ~15 rounds per trash mob with Lv10 common starter gear
    expect(roundsPerKill).toBeGreaterThan(10);
    expect(roundsPerKill).toBeLessThan(20);
  });

  it("bracket boss at floor 10 needs epic+ gear to survive", () => {
    // Floor 10 bracket boss stats
    const boss = generateBracketBoss(1); // bracket 1, floor 10
    const bossAtk = boss.stats.atk.toNumber();

    // Starter Lv10 common DEF = 5 × (10 + 0) = 50 → boss should punch through
    expect(Math.max(0, bossAtk - 50)).toBeGreaterThan(0);

    // Lv10 epic DEF = 5 × (10 + 30) = 200 → tank should be safe
    const epicDef = 5 * (10 + 30);
    expect(Math.max(0, bossAtk - epicDef)).toBe(0);
  });
});

// ─── Combat ──────────────────────────────────────────────────────

describe("calculateDamage", () => {
  it("calculates damage as ATK - DEF", () => {
    expect(calculateDamage(10, 3)).toBe(7);
    expect(calculateDamage(50, 20)).toBe(30);
  });

  it("minimum damage is 0 — defence can fully negate attack", () => {
    expect(calculateDamage(5, 10)).toBe(0);
    expect(calculateDamage(0, 100)).toBe(0);
  });
});

describe("calculateCrit", () => {
  it("returns false when random roll is above 0.1", () => {
    const origRandom = Math.random;
    Math.random = () => 0.5; // always above 0.1
    try {
      const result = calculateCrit();
      expect(result).toBe(false);
    } finally {
      Math.random = origRandom;
    }
  });

  it("returns true when random roll is below 0.1", () => {
    const origRandom = Math.random;
    Math.random = () => 0.05; // always below 0.1
    try {
      const result = calculateCrit();
      expect(result).toBe(true);
    } finally {
      Math.random = origRandom;
    }
  });

  it("returns true for guaranteed crit scenario", () => {
    const origRandom = Math.random;
    Math.random = () => 0.01; // always return very low value
    try {
      const result = calculateCrit();
      expect(result).toBe(true);
    } finally {
      Math.random = origRandom;
    }
  });
});

describe("processCombat", () => {
  it("hero defeats monster with higher stats", () => {
    const heroStats = { atk: 50 };
    const monsterStats = { stats: { atk: 5, def: 2, hp: 50, spd: 3 }, xpReward: 10, goldReward: 5 };

    const result = processCombat(heroStats, monsterStats);
    expect(result.heroWon).toBe(true);
    // With min=0 damage: hero ATK 50 vs DEF 2 → 48 dmg/round, 50 HP → 2 rounds
    expect(result.totalRounds).toBe(2);
    expect(result.goldEarned).toBeGreaterThan(0);
  });

  it("monster with DEF higher than hero ATK survives (min 0 damage)", () => {
    const heroStats = { atk: 5 };
    const monsterStats = { stats: { atk: 99, def: 50, hp: 50, spd: 3 }, xpReward: 0, goldReward: 0 };

    const result = processCombat(heroStats, monsterStats);
    // Hero ATK 5 vs monster DEF 50 = 0 damage per round → monster never dies
    expect(result.heroWon).toBe(false);
    expect(result.totalRounds).toBeGreaterThanOrEqual(100); // safety cap
  });
});

// ─── Monster Generation ──────────────────────────────────────────

describe("generateMonster", () => {
  it("generates a monster with correct floor", () => {
    const monster = generateMonster(5, false);
    expect(monster.floor).toBe(5);
    expect(monster.isBoss).toBe(false);
    expect(monster.stats.hp.toNumber()).toBeGreaterThan(0);
  });

  it("boss has 2x stats and 3x XP vs regular", () => {
    const regular = generateMonster(5, false);
    const boss = generateMonster(5, true);
    expect(boss.stats.hp.toNumber()).toBeCloseTo(regular.stats.hp.toNumber() * 2, -2);
    expect(boss.stats.atk.toNumber()).toBeCloseTo(regular.stats.atk.toNumber() * 2, -2);
    expect(boss.stats.def.toNumber()).toBeCloseTo(regular.stats.def.toNumber() * 2, -2);
    expect(boss.xpReward.toNumber()).toBeGreaterThan(regular.xpReward.toNumber());
  });
});

// ─── Loot ────────────────────────────────────────────────────────

describe("processMonsterLoot", () => {
  it("returns gold for any kill", () => {
    const loot = processMonsterLoot(1, false, false);
    expect(loot.gold).toBeGreaterThan(0);
  });

  it("bracket boss drops more gold", () => {
    const normalLoot = processMonsterLoot(1, false, false);
    const bossLoot = processMonsterLoot(1, false, true);
    expect(bossLoot.gold).toBeGreaterThanOrEqual(normalLoot.gold);
  });
});

describe("calculateGoldReward", () => {
  it("returns positive gold for any floor", () => {
    expect(calculateGoldReward(1)).toBeGreaterThan(0);
    expect(calculateGoldReward(50)).toBeGreaterThan(0);
  });

  it("higher floors give more gold", () => {
    const gold1 = calculateGoldReward(1);
    const gold10 = calculateGoldReward(10);
    expect(gold10).toBeGreaterThan(gold1);
  });
});

// ─── Dungeon ─────────────────────────────────────────────────────

describe("getKeyDropChance", () => {
  it("returns 0 for bracket boss floors", () => {
    expect(getKeyDropChance(10)).toBe(0);
    expect(getKeyDropChance(20)).toBe(0);
  });

  it("returns higher chance on deeper floors", () => {
    const chance1 = getKeyDropChance(1);
    const chance9 = getKeyDropChance(9);
    expect(chance9).toBeGreaterThan(chance1);
  });

  it("chance stays within valid range", () => {
    for (let f = 1; f <= 9; f++) {
      const chance = getKeyDropChance(f);
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(0.15);
    }
  });
});

describe("rollKeyDrop", () => {
  it("drops key when random value is below threshold", () => {
    const result = rollKeyDrop(9, 0.001); // very high floor + very low roll
    expect(result).toBe(true);
  });

  it("does not drop key when random value is above threshold", () => {
    const result = rollKeyDrop(1, 0.999); // low floor + high roll
    expect(result).toBe(false);
  });
});

describe("getFloorDifficulty", () => {
  it("returns 1-5 stars", () => {
    const diff = getFloorDifficulty(1, 10);
    expect(diff).toBeGreaterThanOrEqual(1);
    expect(diff).toBeLessThanOrEqual(5);
  });

  it("higher floors are harder relative to hero level", () => {
    const easy = getFloorDifficulty(1, 100);
    const hard = getFloorDifficulty(50, 1);
    expect(hard).toBeGreaterThan(easy);
  });
});

// ─── Config ──────────────────────────────────────────────────────

describe("GameConfig", () => {
  it("has valid drop rates summing approximately to 100", () => {
    const total = Object.values(GameConfig.BASE_DROP_RATES).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, -1);
  });

  it("has valid RARITY_BONUS in ascending order", () => {
    const bonuses = Object.values(GameConfig.RARITY_BONUS);
    for (let i = 1; i < bonuses.length; i++) {
      expect(bonuses[i]).toBeGreaterThan(bonuses[i - 1]);
    }
  });
});

// ─── Bracket Names ───────────────────────────────────────────────

describe("getBracketName", () => {
  it("returns themed names for brackets 1-5", () => {
    expect(getBracketName(1)).toBe("The Abandoned Mines");
    expect(getBracketName(2)).toBe("The Shadow Forest");
    expect(getBracketName(3)).toBe("The Crystal Caverns");
    expect(getBracketName(5)).toBe("The Sky Citadel");
  });

  it("falls back to generic name for higher brackets", () => {
    expect(getBracketName(6)).toContain("Void");
  });
});

// ─── Bracket Equipment Level ─────────────────────────────────────

describe("getBracketEquipmentLevel", () => {
  it("returns Lv10 for bracket 1", () => {
    expect(getBracketEquipmentLevel(1)).toBe(10);
    expect(getBracketEquipmentLevel(10)).toBe(10);
  });

  it("returns Lv20 for bracket 2", () => {
    expect(getBracketEquipmentLevel(11)).toBe(20);
    expect(getBracketEquipmentLevel(20)).toBe(20);
  });
});
