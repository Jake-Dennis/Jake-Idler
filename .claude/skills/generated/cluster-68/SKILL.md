---
name: cluster-68
description: "Skill for the Cluster_68 area of Jake-Idler. 4 symbols across 1 files."
---

# Cluster_68

4 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `packages/`
- Understanding how calculateSalvageValue, getCraftGoldCost, getShardSalvageValue work
- Modifying cluster_68-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/game/src/loot.ts` | calculateSalvageValue, rarityMultiplier, getCraftGoldCost, getShardSalvageValue |

## Entry Points

Start here when exploring this area:

- **`calculateSalvageValue`** (Function) — `packages/game/src/loot.ts:220`
- **`getCraftGoldCost`** (Function) — `packages/game/src/loot.ts:239`
- **`getShardSalvageValue`** (Function) — `packages/game/src/loot.ts:247`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `calculateSalvageValue` | Function | `packages/game/src/loot.ts` | 220 |
| `getCraftGoldCost` | Function | `packages/game/src/loot.ts` | 239 |
| `getShardSalvageValue` | Function | `packages/game/src/loot.ts` | 247 |
| `rarityMultiplier` | Function | `packages/game/src/loot.ts` | 231 |

## How to Explore

1. `context({name: "calculateSalvageValue"})` — see callers and callees
2. `query({search_query: "cluster_68"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
