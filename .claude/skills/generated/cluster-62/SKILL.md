---
name: cluster-62
description: "Skill for the Cluster_62 area of Jake-Idler. 6 symbols across 3 files."
---

# Cluster_62

6 symbols | 3 files | Cohesion: 91%

## When to Use

- Working with code in `packages/`
- Understanding how getBracketEquipmentLevel, computeEquipmentStats, createStarterEquipment work
- Modifying cluster_62-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/game/src/hero-stats.ts` | getSlotCategory, computeEquipmentStats, createStarterEquipment |
| `packages/game/src/loot.ts` | generateEquipment, generateFloorLoot |
| `packages/game/src/dungeon.ts` | getBracketEquipmentLevel |

## Entry Points

Start here when exploring this area:

- **`getBracketEquipmentLevel`** (Function) — `packages/game/src/dungeon.ts:37`
- **`computeEquipmentStats`** (Function) — `packages/game/src/hero-stats.ts:56`
- **`createStarterEquipment`** (Function) — `packages/game/src/hero-stats.ts:151`
- **`generateEquipment`** (Function) — `packages/game/src/loot.ts:142`
- **`generateFloorLoot`** (Function) — `packages/game/src/loot.ts:171`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getBracketEquipmentLevel` | Function | `packages/game/src/dungeon.ts` | 37 |
| `computeEquipmentStats` | Function | `packages/game/src/hero-stats.ts` | 56 |
| `createStarterEquipment` | Function | `packages/game/src/hero-stats.ts` | 151 |
| `generateEquipment` | Function | `packages/game/src/loot.ts` | 142 |
| `generateFloorLoot` | Function | `packages/game/src/loot.ts` | 171 |
| `getSlotCategory` | Function | `packages/game/src/hero-stats.ts` | 22 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GenerateFloorLoot → GetSlotCategory` | intra_community | 4 |
| `ProcessMonsterLoot → GetBracketEquipmentLevel` | cross_community | 3 |
| `CreateStarterEquipment → GetSlotCategory` | intra_community | 3 |

## How to Explore

1. `context({name: "getBracketEquipmentLevel"})` — see callers and callees
2. `query({search_query: "cluster_62"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
