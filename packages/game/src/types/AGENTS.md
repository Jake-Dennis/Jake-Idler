# packages/game/src/types — Game Type System

9 type files. All exported via `src/index.ts` barrel. Pure types (no runtime logic).

## FILE REFERENCE

| File | Exports | Purpose |
|------|---------|---------|
| `config.ts` | `BASE_CONFIG`, `GameConfig` (Proxy), `applyConfigOverrides()` | All balance knobs (drop rates, scaling, stat constants) |
| `enums.ts` | `Rarity`, `EquipmentSlot`, `CombatRole`, `CombatPosition`, `WeaponType` | Core enums used across game + server |
| `equipment.ts` | `Equipment`, `StatBlock`, `BigNumberStatBlock` | Item and stat type definitions |
| `hero.ts` | `Hero` (interface) | Hero state shape (level, equipped, inventory, gold) |
| `monster.ts` | `Monster` (interface) | Monster shape (id, name, floor, stats, rewards) |
| `floor.ts` | `GeneratedFloor` | Floor generation result (monsters, bracket boss, key rewards) |
| `social.ts` | `Party`, `FriendRequest`, `Guild`, `GuildMember` | Social feature types |
| `shards.ts` | `ShardEntry` | Shard crafting/salvage types |
| `index.ts` | Barrel re-export of all above | Single import path for consumers |

## WHERE TO LOOK

| Task | File |
|------|------|
| Tune balance constants | `config.ts` — GameConfig |
| Add a new rarity/enum | `enums.ts` |
| Change item schema | `equipment.ts` |
| Add hero stat field | `hero.ts` |
| Change social features | `social.ts` |

## CONVENTIONS

- All interfaces, not classes (plain data objects)
- `Rarity` and `EquipmentSlot` use string literal unions (`"common" | "uncommon" | ...`)
- GameConfig uses `Proxy` for runtime overrides from balancing.json
- `BigNumber` from break_infinity.js for all numeric stat types
- `StatBlock` (number) vs `BigNumberStatBlock` (BigNumber) — two representations
