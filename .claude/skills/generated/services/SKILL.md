---
name: services
description: "Skill for the Services area of Jake-Idler. 32 symbols across 6 files."
---

# Services

32 symbols | 6 files | Cohesion: 96%

## When to Use

- Working with code in `apps/`
- Understanding how getHero, getHeroesByPlayer, createHero work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/services/combat-service.ts` | tick, processOneRound, cleanupOldRuns, processRound, makeHeroData (+6) |
| `apps/server/src/services/party-service.ts` | generateBotEquipment, makeWeapon, makeArmour, makeAccessory, updateBotLevel (+6) |
| `apps/server/src/services/hero-service.ts` | getHero, getHeroesByPlayer, createHero, equipItem, unequipItem (+1) |
| `apps/server/src/services/dungeon-service.ts` | getFloorState, getFloorPreview |
| `apps/server/src/services/loot-service.ts` | processKillLoot |
| `apps/server/src/routes/hero-photo.ts` | verifyOwnership |

## Entry Points

Start here when exploring this area:

- **`getHero`** (Method) — `apps/server/src/services/hero-service.ts:40`
- **`getHeroesByPlayer`** (Method) — `apps/server/src/services/hero-service.ts:48`
- **`createHero`** (Method) — `apps/server/src/services/hero-service.ts:55`
- **`equipItem`** (Method) — `apps/server/src/services/hero-service.ts:116`
- **`unequipItem`** (Method) — `apps/server/src/services/hero-service.ts:167`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getHero` | Method | `apps/server/src/services/hero-service.ts` | 40 |
| `getHeroesByPlayer` | Method | `apps/server/src/services/hero-service.ts` | 48 |
| `createHero` | Method | `apps/server/src/services/hero-service.ts` | 55 |
| `equipItem` | Method | `apps/server/src/services/hero-service.ts` | 116 |
| `unequipItem` | Method | `apps/server/src/services/hero-service.ts` | 167 |
| `toResponse` | Method | `apps/server/src/services/hero-service.ts` | 221 |
| `verifyOwnership` | Function | `apps/server/src/routes/hero-photo.ts` | 41 |
| `generateBotEquipment` | Function | `apps/server/src/services/party-service.ts` | 52 |
| `makeWeapon` | Function | `apps/server/src/services/party-service.ts` | 60 |
| `makeArmour` | Function | `apps/server/src/services/party-service.ts` | 71 |
| `makeAccessory` | Function | `apps/server/src/services/party-service.ts` | 82 |
| `tick` | Method | `apps/server/src/services/combat-service.ts` | 283 |
| `processOneRound` | Method | `apps/server/src/services/combat-service.ts` | 298 |
| `cleanupOldRuns` | Method | `apps/server/src/services/combat-service.ts` | 307 |
| `processRound` | Method | `apps/server/src/services/combat-service.ts` | 318 |
| `makeHeroData` | Method | `apps/server/src/services/combat-service.ts` | 531 |
| `finaliseRound` | Method | `apps/server/src/services/combat-service.ts` | 557 |
| `processKillRewards` | Method | `apps/server/src/services/combat-service.ts` | 626 |
| `processKillLoot` | Method | `apps/server/src/services/loot-service.ts` | 32 |
| `updateBotLevel` | Method | `apps/server/src/services/party-service.ts` | 366 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Tick → FinaliseRound` | intra_community | 3 |
| `Tick → MakeHeroData` | intra_community | 3 |
| `ProcessOneRound → FinaliseRound` | intra_community | 3 |
| `ProcessOneRound → MakeHeroData` | intra_community | 3 |
| `VerifyOwnership → ToResponse` | intra_community | 3 |
| `AddBot → MakeArmour` | cross_community | 3 |
| `AddBot → MakeAccessory` | cross_community | 3 |
| `AddBot → MakeWeapon` | cross_community | 3 |
| `StartFloorRun → ToFloorMonster` | intra_community | 3 |
| `UpdateBotLevel → MakeArmour` | intra_community | 3 |

## How to Explore

1. `context({name: "getHero"})` — see callers and callees
2. `query({search_query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
