---
name: cluster-60
description: "Skill for the Cluster_60 area of Jake-Idler. 4 symbols across 2 files."
---

# Cluster_60

4 symbols | 2 files | Cohesion: 89%

## When to Use

- Working with code in `packages/`
- Understanding how generateMonster, generateBracketBoss, generateFloor work
- Modifying cluster_60-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/game/src/combat-engine.ts` | nextMonsterId, generateMonster, generateBracketBoss |
| `packages/game/src/dungeon.ts` | generateFloor |

## Entry Points

Start here when exploring this area:

- **`generateMonster`** (Function) — `packages/game/src/combat-engine.ts:143`
- **`generateBracketBoss`** (Function) — `packages/game/src/combat-engine.ts:188`
- **`generateFloor`** (Function) — `packages/game/src/dungeon.ts:7`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `generateMonster` | Function | `packages/game/src/combat-engine.ts` | 143 |
| `generateBracketBoss` | Function | `packages/game/src/combat-engine.ts` | 188 |
| `generateFloor` | Function | `packages/game/src/dungeon.ts` | 7 |
| `nextMonsterId` | Function | `packages/game/src/combat-engine.ts` | 7 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GenerateFloor → NextMonsterId` | intra_community | 3 |

## How to Explore

1. `context({name: "generateMonster"})` — see callers and callees
2. `query({search_query: "cluster_60"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
