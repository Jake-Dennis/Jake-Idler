---
name: cluster-61
description: "Skill for the Cluster_61 area of Jake-Idler. 4 symbols across 1 files."
---

# Cluster_61

4 symbols | 1 files | Cohesion: 86%

## When to Use

- Working with code in `packages/`
- Understanding how calculateDamage, calculateCrit, processRound work
- Modifying cluster_61-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/game/src/combat-engine.ts` | calculateDamage, calculateCrit, processRound, processCombat |

## Entry Points

Start here when exploring this area:

- **`calculateDamage`** (Function) — `packages/game/src/combat-engine.ts:53`
- **`calculateCrit`** (Function) — `packages/game/src/combat-engine.ts:60`
- **`processRound`** (Function) — `packages/game/src/combat-engine.ts:74`
- **`processCombat`** (Function) — `packages/game/src/combat-engine.ts:101`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `calculateDamage` | Function | `packages/game/src/combat-engine.ts` | 53 |
| `calculateCrit` | Function | `packages/game/src/combat-engine.ts` | 60 |
| `processRound` | Function | `packages/game/src/combat-engine.ts` | 74 |
| `processCombat` | Function | `packages/game/src/combat-engine.ts` | 101 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ProcessCombat → CalculateCrit` | intra_community | 3 |
| `ProcessCombat → CalculateDamage` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_60 | 1 calls |

## How to Explore

1. `context({name: "calculateDamage"})` — see callers and callees
2. `query({search_query: "cluster_61"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
