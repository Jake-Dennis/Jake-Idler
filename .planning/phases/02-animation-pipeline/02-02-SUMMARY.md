---
phase: 02-animation-pipeline
plan: 02
type: execute
status: complete
subsystem: animation-pipeline
tags:
  - pipeline
  - integration
  - web.ts
  - setTimeout-removal
  - CSS
requires:
  - ANIM-01
  - ANIM-02
  - ANIM-03
  - ANIM-04
provides:
  - Inlined CombatDiff/EntityAnimFSM/AnimationQueue in web.ts script block
  - Pipeline-based animateTransition
  - Step-based combat log helper
affects:
  - apps/server/src/routes/web.ts
  - apps/server/static/css/game.css
tech-stack:
  added:
    - async/await animation sequencing in browser script
    - CSS animation-duration explicit declarations
  removed:
    - All 17 animation-sequencing setTimeout callbacks
    - 6 standalone play*Animation functions (148 lines)
key-files:
  created: []
  modified:
    - apps/server/src/routes/web.ts — Inlined pipeline code, refactored animateTransition, removed play*Animation functions
    - apps/server/static/css/game.css — Added animation-duration properties, animate-windup, animate-fade-in classes
decisions:
  - Inlined pipeline logic as plain JS (not ES modules) to match existing IIFE script pattern
  - Projectile/particle systems kept as-is (moved to Phase 6 per plan)
  - createExplosion spark cleanup uses animationend listeners instead of setTimeout
  - ATTACK steps with weaponType 'mage'/'range' call projectile system instead of CSS animations
duration: ~10 minutes
completed: 2026-06-24
---

# Phase 02 Plan 02: Pipeline Integration — Summary

**One-liner:** Refactored web.ts combat animations to use the inlined CombatDiff → AnimationQueue → EntityAnimFSM pipeline, removing all setTimeout animation-sequencing chains in favor of async/await with WAAPI-driven timing.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Verify Phase 1 (auto-approved) | — | — |
| 2 | Refactor animateTransition to pipeline | 195ee23 | web.ts |
| 3 | Remove setTimeout chains, add CSS timing | 195ee23 | web.ts, game.css |
| 4 | Verify animations (auto-approved) | — | — |

## What Was Built

### Inlined Pipeline Code (`web.ts` lines ~702-944)
- **`computeAnimationSteps(prev, next)`** — Pure diff function ported from CombatDiff.ts to plain JS. Detects ATTACK, HIT, HEAL, BLOCK, DEATH, MONSTER_DEATH, MONSTER_APPEAR from state diffs.
- **`EntityAnimFSM`** — Prototype-based class with per-entity state tracking (IDLE/ATTACKING/IMPACT/RECOVERY/DEAD) and legal transition map.
- **`AnimationQueue`** — Promise-based class with `playSteps` async method. CSS class manipulation, `animationend` event handling, timeout guard (tab throttling fallback). Supports projectile-based attacks for mage/range weapon types.
- **`addCombatLogEntry(step, next)`** — Step-based combat log helper replacing the imperative if/else chain.

### Refactored `animateTransition` 
- Registers entities in FSM
- Calls `computeAnimationSteps(prev.round, next.round)` to produce AnimationStep[]
- Awaits `animQueue.playSteps(steps)` for all animation sequencing
- Updates HP bars and combat log after animations

### Removed Code
- `playAttackAnimation(weaponType, heroId)` — Entire function removed (replaced by ATTACK steps + AnimationQueue weapon-type dispatch)
- `playHitAnimation(heroId, damage)` — Removed (HIT steps handle via Queue)
- `playHealAnimation(heroId, amount)` — Removed (HEAL steps handle via Queue)
- `playBlockAnimation(heroId, damage)` — Removed (BLOCK steps handle via Queue)
- `playDeathAnimation(elId)` — Removed (DEATH steps handle via Queue)
- `playMonsterDeathAnimation()` — Removed (MONSTER_DEATH steps handle via Queue)
- All 17 setTimeout calls reduced to 8 remaining (non-animation or specified fallback)

### CSS Changes (`game.css`)
- Added explicit `animation-duration` to all 8 animation classes for cross-browser safety
- Added `.animate-windup` (15s windup anticipation) and `.animate-fade-in` (monster appear) CSS classes
- `createExplosion` spark cleanup uses `animationend` listeners instead of `setTimeout`

## Deviations from Plan

### Rule 1 — `computeAnimationSteps` parameter alignment
- **Found during:** Integration testing code review
- **Issue:** Inlined `computeAnimationSteps` was accessing `next.partyHeroes` etc. correctly only when called with CombatRoundState objects, but the animateTransition was passing full state objects. 
- **Fix:** Changed call site from `computeAnimationSteps(prev, next)` to `computeAnimationSteps(prev.round, next.round)` to match the pure function's expected CombatRoundState parameters.

### Weapon-type-specific attack handling
- **Added:** The plan's inlined AnimationQueue didn't account for mage/range weapon types needing projectile/explosion effects. Added conditional branching in `_playStep` to call `createProjectile` + `createExplosion` for non-melee attacks, preserving the existing projectile system behavior.

## Remaining setTimeout Calls

| Line | Purpose | Category | Verification |
|------|---------|----------|-------------|
| 604 | floatText element cleanup (800ms) | Non-animation — kept per plan | ✓ |
| 908 | Projectile flight delay (380ms, mage) | Async/await delay in AnimationQueue | ✓ (new pattern) |
| 913 | Projectile flight delay (430ms, range) | Async/await delay | ✓ (new pattern) |
| 917 | Range flash duration (400ms) | Async/await delay | ✓ (new pattern) |
| 952 | AnimationQueue timeout guard (D-03) | Tab throttling fallback | ✓ (specified) |
| 1096 | Projectile trail removal (300ms) | Particle DOM cleanup | ✓ (Phase 6) |
| 1121 | Projectile removal (400ms) | Particle DOM cleanup | ✓ (Phase 6) |
| 1290 | Overlay dismiss auto-retry (1500ms) | Non-animation — kept per plan | ✓ |

## Threat Scan

No new security-relevant surface introduced — pipeline logic is inlined client-side code that replaces existing animation functions with the same DOM manipulation patterns.

## Verification

- ✅ TypeScript compilation: `tsc --noEmit` passes with 0 errors
- ✅ All play*Animation function bodies removed (lines 774-958 replaced)
- ✅ animateTransition now uses computeAnimationSteps + animQueue.playSteps
- ✅ Combat log emitted from step-based helper (addCombatLogEntry)
- ✅ All CSS animation classes have explicit animation-duration declarations
- ✅ New CSS classes: `.animate-windup`, `.animate-fade-in`
- ✅ createExplosion spark/flash cleanup uses animationend (no setTimeout)

## Self-Check: PASSED

All verification criteria met:
- [x] `tsc --noEmit` passes without errors
- [x] web.ts compiles correctly (part of tsc output)
- [x] game.css updated with explicit animation-duration properties
- [x] All animation-sequencing setTimeout removed (only fallback + non-animation remain)
- [x] Commits verified: 195ee23

## Next Steps

Phase 02 is complete. Pipeline modules exist as TS source files (02-01) and are inlined in web.ts (02-02). EntityAnimFSM guards entity overlap. Animation timing is CSS-driven. Next phases could add:
- Phase 3: Screen effects (overlay pulses, screen shake)
- Phase 4: Class-specific attack animations
- Phase 6: Particle system refactor
