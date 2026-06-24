# Phase 07: Gothic UI Polish - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

All game screens feel cohesive and polished with a dark gothic theme, atmospheric visual effects, and accessibility-compliant contrast.

## Implementation Decisions

### Torch-flicker glow
- CSS-only animation on hero bar and arena borders
- Subtle box-shadow pulse (gold/orange, 2s cycle)
- Class: `.animate-torch-flicker`

### Shadow pooling
- On entity death: dark pool expands under the defeated card
- CSS: radial gradient that scales up from 0 to full
- Class: `.shadow-pool`

### Blood drip / dark ember
- Dark red particles on monster hits (reuse particle system from Phase 6)
- Ember-like particles floating upward in arena (ambient, triggered by CSS animation)

### Contrast fixes
- Body text: #9a949a → #b0a8b0 (improve from 3.8:1 to ~5:1 ratio against #030203)
- Muted text: #3a373a → #5a555a (improve contrast)
- Labels: ensure minimum 4.5:1 ratio

### Login page consistency
- Match the game page's dark gothic styling
