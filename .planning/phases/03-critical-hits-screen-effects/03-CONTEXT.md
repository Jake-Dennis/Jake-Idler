# Phase 03: Critical Hits & Screen Effects - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

Big moments (critical strikes, round transitions) carry dramatic screen-level impact that differentiates them from normal combat events, available as infrastructure for hero and enemy animations.

## Implementation Decisions

### Screen Shake
- CSS-only animation using translate3d keyframes (GPU accelerated)
- Duration: 300ms for normal hits, 500ms for crits
- Reusable class: `.animate-shake` → add/remove via classList
- Trigger point: after damage is applied in animation pipeline

### Hit-Stop
- 80ms animation pause on impact (adds weight)
- Implemented via a brief `animation-play-state: paused` on the attacking entity
- Only on melee impacts (not projectiles)
- Duration should be tuneable (start at 80ms, cap at 120ms)

### Vignette Flash
- CSS pseudo-element overlay on `.arena` that briefly flashes
- White/red vignette on critical hits
- Subtle dark vignette on round transitions
- Duration: 200ms flash, 600ms fade

### Enhanced Crit Visuals
- Bigger damage text (1.5x size, gold color with text-shadow glow)
- Screen shake + vignette flash combined on crits
- Float text already exists — just enhance size/color

## Deferred Ideas
- Element-specific crit effects (fire=orange, ice=blue) — Phase 4
- Boss-specific screen effects — Phase 5
