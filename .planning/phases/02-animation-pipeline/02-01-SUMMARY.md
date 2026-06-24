---
phase: 02-animation-pipeline
plan: 01
type: execute
status: complete
subsystem: animation-pipeline
tags:
  - pipeline
  - animation
  - WAAPI
  - FSM
  - promises
requires:
  - ANIM-01
  - ANIM-02
  - ANIM-03
provides:
  - apps/server/src/animation/types.ts
  - apps/server/src/animation/CombatDiff.ts
  - apps/server/src/animation/AnimationQueue.ts
  - apps/server/src/animation/EntityAnimFSM.ts
affects:
  - apps/server/src/routes/web.ts
tech-stack:
  added:
    - TypeScript ES2022 + DOM lib for client-side animation types
  patterns:
    - Pure data flow: CombatRoundState diff → AnimationStep[]
    - WAAPI promise-based sequencing replaces setTimeout chains
    - Per-entity FSM with legal transition map
    - CSS-driven timing via getComputedStyle
key-files:
  created:
    - apps/server/src/animation/types.ts — Shared type definitions (CombatEffectType, AnimationStep, AnimEntityState, FSM mappings)
    - apps/server/src/animation/CombatDiff.ts — Pure function computeAnimationSteps(prev, next) → AnimationStep[]
    - apps/server/src/animation/AnimationQueue.ts — Promise-based queue with WAAPI animationend + timeout fallback
    - apps/server/src/animation/EntityAnimFSM.ts — Per-entity state machine with legal transition guards
    - apps/server/src/animation/CombatDiff.test.ts — 12 tests for all diff behaviors
    - apps/server/src/animation/AnimationQueue.test.ts — 10 tests for queue behaviors
    - apps/server/src/animation/EntityAnimFSM.test.ts — 16 tests for all FSM behaviors
  modified:
    - apps/server/tsconfig.json — Added "dom" to lib for DOM type support
decisions:
  - Add DOM lib to server tsconfig for AnimationQueue DOM API types (document, getComputedStyle, Element)
  - Test infrastructure deferred — vitest not configured in server package; test files created alongside sources
  - AnimationQueue tab-throttling guard uses 500ms buffer on top of animation-duration for force-resolve
  - DoS guard caps at 100 steps per playSteps call per T-02-02
duration: ~15 minutes
completed: 2026-06-24
---

# Phase 02 Plan 01: Pipeline Core Modules — Summary

**One-liner:** Created three-tier animation pipeline (CombatDiff → AnimationQueue → EntityAnimFSM) with shared types, pure state diffing, WAAPI promise-based sequencing, and per-entity FSM guards.

## Completed Tasks

| Task | Name        | Commit | Files                        |
| ---- | ----------- | ------ | ---------------------------- |
| 1    | Shared types + CombatDiff | 99003b3 | types.ts, CombatDiff.ts, CombatDiff.test.ts |
| 1b   | tsconfig DOM lib          | 4ae3bc7 | tsconfig.json |
| 2    | AnimationQueue            | 8fbd0c6 | AnimationQueue.ts, AnimationQueue.test.ts |
| 3    | EntityAnimFSM             | 8c2a3d8 | EntityAnimFSM.ts, EntityAnimFSM.test.ts |

## What Was Built

### `types.ts` — Shared Types
- `CombatEffectType` union: ATTACK, HIT, HEAL, BLOCK, DEATH, MONSTER_DEATH, MONSTER_APPEAR
- `AnimationStep` interface with type, entityId, weaponType, damage, healAmount, isCrit, cssDurationMs, stepIndex
- `AnimEntityState` union: IDLE, ATTACKING, IMPACT, RECOVERY, DEAD
- Effect-to-FSM-state and effect-to-CSS-class mapping tables
- `FSM_STATE_ORDER` const array

### `CombatDiff.ts` — Pure State Diffing
- `computeAnimationSteps(prev: CombatRoundState | null, next: CombatRoundState): AnimationStep[]`
- Detects: attacks, hits, heals, blocks (tank), deaths, monster kills, monster appearances
- Assigns sequential `stepIndex` to preserve round-logic ordering
- Pure function — no DOM access, no side effects (D-01)
- No external libraries (D-02)

### `AnimationQueue.ts` — Promise-Based Queue
- `playSteps(steps)` processes FIFO via async/await
- CSS class application via `element.classList.add/remove`
- Animation timing driven by `getComputedStyle().animationDuration` — no magic numbers (D-04)
- `animationend` event listener with timeout fallback (2s guard for tab throttling, D-03)
- FSM guard check before each step — skips if entity is busy/dead (D-05)
- DoS guard: `MAX_STEPS = 100` per T-02-02
- Duration cache per CSS class name

### `EntityAnimFSM.ts` — Per-Entity State Machine
- States: IDLE → ATTACKING → IMPACT → RECOVERY → IDLE
- Legal transition map enforces lifecycle ordering
- `Any → DEAD` always allowed for death interrupt
- `DEAD → IDLE` allowed for respawn/reset
- Guards prevent animations on dead entities (D-05)
- Independent state per entity (hero/monster)
- Methods: registerEntity, getState, canTransition, transitionTo, forceReset, isDead, unregisterEntity

### Test Files (38 tests total)
- `CombatDiff.test.ts`: 12 tests — empty diff, ATTACK, HIT, HEAL, BLOCK, DEATH, MONSTER_DEATH, ordering, crit, mixed events, edge cases
- `AnimationQueue.test.ts`: 10 tests — FIFO order, animationend, duration lookup, fallback, FSM guard, MAX_STEPS cap, DEATH/MONSTER_DEATH handling
- `EntityAnimFSM.test.ts`: 16 tests — all legal/illegal transitions, DEAD guard, multiple entities, forceReset, isDead, size tracking, unregister

## Deviations from Plan

### Rule 1 — `tsconfig` DOM lib needed
- **Found during:** Task 2 TypeScript compilation
- **Issue:** `AnimationQueue.ts` uses DOM APIs (`document`, `getComputedStyle`, `Element`, `HTMLElement`) but server tsconfig only included `"ES2022"` in lib
- **Fix:** Added `"dom"` to `apps/server/tsconfig.json` lib array
- **Files modified:** `apps/server/tsconfig.json`
- **Commit:** `4ae3bc7`

### Deferred — Test Infrastructure
- **Issue:** The server package (`@jake-idler/server`) has no test framework configured (no vitest/jest). Test files were created alongside source files but cannot run without adding vitest + jsdom to the server package's devDependencies.
- **Impact:** Tests exist as `.ts` files but require `npm install vitest @vitest/ui` in apps/server to execute.

## Threat Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: dom-api-exposure | apps/server/src/animation/AnimationQueue.ts | AnimationQueue uses DOM APIs in server-side TypeScript — requires DOM lib. Only executed client-side via inline script. Acceptable for the animation module pattern. |

## Design Decisions

1. **DOM lib added to server tsconfig** — AnimationQueue uses DOM APIs for element manipulation and getComputedStyle. Since these modules are bundled into the client-side script, DOM types are required at compile time.

2. **Test files created without test runner** — The server package has no test framework configured. Test files follow vitest conventions (matching `packages/game/` pattern) and can be run once vitest is added to devDependencies.

3. **Duration cache in AnimationQueue** — Results of `getComputedStyle().animationDuration` are cached per CSS class name to avoid repeated style resolution during a round.

4. **No `setTimeout` in CombatDiff/EntityAnimFSM** — Both modules are pure logic. The only `setTimeout` is in AnimationQueue's `awaitAnimationEnd` as a tab-throttling fallback guard (per D-03).

## Verification

- ✅ TypeScript compilation: `tsc --noEmit` passes with 0 errors
- ✅ All 7 files exist at `apps/server/src/animation/`
- ✅ No CommonJS require usage — all imports use ESM `import type` / `import` syntax
- ✅ No external animation libraries added — package.json unchanged
- ✅ All modules have JSDoc documentation on exported interfaces

## Self-Check: PASSED

All created files verified:
- [x] apps/server/src/animation/types.ts exists
- [x] apps/server/src/animation/CombatDiff.ts exists
- [x] apps/server/src/animation/AnimationQueue.ts exists
- [x] apps/server/src/animation/EntityAnimFSM.ts exists
- [x] apps/server/src/animation/CombatDiff.test.ts exists
- [x] apps/server/src/animation/AnimationQueue.test.ts exists
- [x] apps/server/src/animation/EntityAnimFSM.test.ts exists
- [x] Commits verified: 99003b3, 4ae3bc7, 8fbd0c6, 8c2a3d8

## Next Steps

Proceed to Plan 02-02: Integrate pipeline modules into web.ts, refactor animateTransition to use CombatDiff + AnimationQueue + EntityAnimFSM, and remove embedded setTimeout animation chains.
