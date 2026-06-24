# Phase 02: Animation Pipeline - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

Refactor animation system from fragile `setTimeout` chains to a clean Promise-based pipeline using WAAPI, with decoupled state management and entity-level safety.

## Implementation Decisions

### Architecture Pattern
- Three-layer separation: CombatStore (state) → CombatDiff (delta detection) → AnimationQueue (playback)
- Pure data flow: CombatStore produces state snapshots, CombatDiff produces AnimationStep[], AnimationQueue consumes them
- No external animation libraries — pure WAAPI + CSS keyframes

### Timer Replacement
- Replace all setTimeout chains with WAAPI `animation.finished` promises
- Use `async/await` for animation sequencing
- Keep setTimeout only as a fallback guard for browser tab throttling

### Animation Timing
- No hardcoded magic numbers — durations read from CSS `animation-duration` via `getComputedStyle`
- Animations driven by `animationend` events for precise synchronization

### Entity State Machine
- Per-entity FSM: IDLE → ATTACKING → IMPACT → RECOVERY → IDLE
- Guards prevent playing animations on dead/dying entities
- Each hero/monster maintains independent state

### Code Organization
- `apps/server/src/routes/web.ts` — remove setTimeout animation logic, reference new module
- New file: `apps/server/src/animation/AnimationQueue.ts` — Promise-based queue
- New file: `apps/server/src/animation/CombatDiff.ts` — state diffing
- New file: `apps/server/src/animation/EntityAnimFSM.ts` — per-entity FSM

## Deferred Ideas
- Particle system — Phase 6
- Screen effects — Phase 3
- Class-specific attack animations — Phase 4
