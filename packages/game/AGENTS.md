## packages/game — Game Engine

**Pure TypeScript game logic. No I/O, no runtime deps beyond break_infinity.js. Consumed by apps/server via npm workspace.**

---

### STRUCTURE

| File | Purpose |
|------|---------|
| `src/index.ts` | Barrel export — entire public API |
| `src/combat-engine.ts` | Damage calc, crit (CRIT_MULTIPLIER), round processing, monster/boss gen from BASE_MONSTER_STATS |
| `src/dungeon.ts` | Floor generation, bracket bosses (every 10 floors), key drops, difficulty/gold/xp multipliers |
| `src/hero-stats.ts` | computeHeroStats, computeEquipmentStats, createStarterEquipment, getHeroRole |
| `src/loot.ts` | Drop tables (Rarity-based rates), salvage shard values, craft costs, equipment generation |
| `src/types/` | 9 type files: config.ts (GameConfig), enums.ts, equipment.ts, hero.ts, monster.ts, floor.ts, shards.ts, social.ts |
| `tests/core.test.ts` | Vitest suite (14KB), covers combat, loot, dungeon, hero stats |

---

### WHERE TO LOOK

| Task | Location |
|------|----------|
| Tune balance | `src/types/config.ts` — GameConfig holds all knobs (drop rates, scaling, stat constants) |
| Change combat formula | `src/combat-engine.ts` |
| Change loot tables | `src/loot.ts` |

---

### CONVENTIONS (package-specific)

- break_infinity.js BigNumber for all computed stats
- SCREAMING_SNAKE_CASE for GameConfig keys and constant tables
- vitest with describe/it/expect

---

### ANTI-PATTERNS (game-package-specific)

- `spd` field on equipment+stats — always 0, no longer a real stat
- `CombatRole` (Tank/DPS/Healer) and `CombatPosition` enums — LEGACY, all heroes are DPS/Middle
- `getHeroRole()` always returns `CombatRole.DPS` / `CombatPosition.Middle` — dead branching
- `CRAFT_COST` values in GameConfig all set to 1 — likely placeholders
- `types` in package.json points to `./src/index.ts` (source, not dist)

---

### NOTES

- No project references between packages — server finds game via npm workspace + `types` field
- GameConfig is the single source of truth for all balance constants
