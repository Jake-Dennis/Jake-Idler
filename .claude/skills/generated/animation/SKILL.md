---
name: animation
description: "Skill for the Animation area of Jake-Idler. 14 symbols across 3 files."
---

# Animation

14 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `apps/`
- Understanding how computeAnimationSteps, playSteps, playStep work
- Modifying animation-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/animation/AnimationQueue.ts` | playSteps, playStep, awaitAnimationEnd, resolveElement, ensureEntityId (+2) |
| `apps/server/src/animation/EntityAnimFSM.ts` | getState, canTransition, transitionTo, isDead |
| `apps/server/src/animation/CombatDiff.ts` | computeAnimationSteps, findHero, inferWeaponType |

## Entry Points

Start here when exploring this area:

- **`computeAnimationSteps`** (Function) — `apps/server/src/animation/CombatDiff.ts:24`
- **`playSteps`** (Method) — `apps/server/src/animation/AnimationQueue.ts:131`
- **`playStep`** (Method) — `apps/server/src/animation/AnimationQueue.ts:152`
- **`awaitAnimationEnd`** (Method) — `apps/server/src/animation/AnimationQueue.ts:216`
- **`resolveElement`** (Method) — `apps/server/src/animation/AnimationQueue.ts:252`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `computeAnimationSteps` | Function | `apps/server/src/animation/CombatDiff.ts` | 24 |
| `playSteps` | Method | `apps/server/src/animation/AnimationQueue.ts` | 131 |
| `playStep` | Method | `apps/server/src/animation/AnimationQueue.ts` | 152 |
| `awaitAnimationEnd` | Method | `apps/server/src/animation/AnimationQueue.ts` | 216 |
| `resolveElement` | Method | `apps/server/src/animation/AnimationQueue.ts` | 252 |
| `ensureEntityId` | Method | `apps/server/src/animation/AnimationQueue.ts` | 264 |
| `getState` | Method | `apps/server/src/animation/EntityAnimFSM.ts` | 80 |
| `canTransition` | Method | `apps/server/src/animation/EntityAnimFSM.ts` | 92 |
| `transitionTo` | Method | `apps/server/src/animation/EntityAnimFSM.ts` | 115 |
| `isDead` | Method | `apps/server/src/animation/EntityAnimFSM.ts` | 140 |
| `findHero` | Function | `apps/server/src/animation/CombatDiff.ts` | 138 |
| `inferWeaponType` | Function | `apps/server/src/animation/CombatDiff.ts` | 150 |
| `resolveAnimationDuration` | Function | `apps/server/src/animation/AnimationQueue.ts` | 41 |
| `parseDuration` | Function | `apps/server/src/animation/AnimationQueue.ts` | 83 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `PlaySteps → GetState` | intra_community | 5 |
| `PlaySteps → EnsureEntityId` | intra_community | 4 |

## How to Explore

1. `context({name: "computeAnimationSteps"})` — see callers and callees
2. `query({search_query: "animation"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
