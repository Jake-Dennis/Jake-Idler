---
name: cluster-67
description: "Skill for the Cluster_67 area of Jake-Idler. 4 symbols across 1 files."
---

# Cluster_67

4 symbols | 1 files | Cohesion: 86%

## When to Use

- Working with code in `packages/`
- Understanding how getAdjustedDropRate, rollShardDrops, calculateGoldReward work
- Modifying cluster_67-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/game/src/loot.ts` | getAdjustedDropRate, rollShardDrops, calculateGoldReward, processMonsterLoot |

## Entry Points

Start here when exploring this area:

- **`getAdjustedDropRate`** (Function) — `packages/game/src/loot.ts:37`
- **`rollShardDrops`** (Function) — `packages/game/src/loot.ts:55`
- **`calculateGoldReward`** (Function) — `packages/game/src/loot.ts:81`
- **`processMonsterLoot`** (Function) — `packages/game/src/loot.ts:98`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getAdjustedDropRate` | Function | `packages/game/src/loot.ts` | 37 |
| `rollShardDrops` | Function | `packages/game/src/loot.ts` | 55 |
| `calculateGoldReward` | Function | `packages/game/src/loot.ts` | 81 |
| `processMonsterLoot` | Function | `packages/game/src/loot.ts` | 98 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ProcessMonsterLoot → GetBracketEquipmentLevel` | cross_community | 3 |
| `ProcessMonsterLoot → GetAdjustedDropRate` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_62 | 1 calls |

## How to Explore

1. `context({name: "getAdjustedDropRate"})` — see callers and callees
2. `query({search_query: "cluster_67"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
