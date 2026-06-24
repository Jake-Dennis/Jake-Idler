# Phase 06: DIY Particle System - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

A lightweight, pooled particle system provides satisfying visual bursts across all combat events with zero external dependencies.

## Implementation Decisions

### Pooled Particle System
- Pool of 20 reusable DOM elements (pre-created, reused via display toggle)
- Each particle: small div with absolute positioning, CSS transition/animation for movement
- Pool recycling: when a particle finishes, it goes back to the pool

### Particle Types
- Hit sparks: small orange/yellow bursts on melee impact (8 particles, spread in fan)
- Death burst: larger grey/red burst on monster death (12 particles, radial spread)
- Heal sparkles: small green upward particles on heal (6 particles, gentle float up)
- Block sparks: small blue/white sparks on tank block (6 particles, forward spread)

### Integration
- ParticleSystem global object with `emit(type, x, y)` method
- Called from _playStep after HIT, DEATH, HEAL, BLOCK effects
- Added to web.ts as inline JS (not a separate module)
