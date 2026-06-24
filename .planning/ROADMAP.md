# ROADMAP: Jake Idler

## Overview

**Core Value:** Combat feels visceral and rewarding — smooth animations, satisfying feedback, and clear progression that keeps players engaged.

**Total v1 Requirements:** 29
**Phases:** 8
**Granularity:** Fine
**Project Mode:** mvp

## Phases

- [ ] **Phase 1: Foundation — Asset Extraction** - Extract CSS, HTML, and animation module structure from monolithic `web.ts` to static files
- [ ] **Phase 2: Animation Pipeline** - Refactor setTimeout chains to WAAPI Promise-based pipeline with CombatStore/CombatDiff/AnimationQueue/DOMRenderer
- [ ] **Phase 3: Critical Hits & Screen Effects** - Screen shake, vignette flash, and enhanced crit visuals decoupled from entity-specific animations
- [ ] **Phase 4: Hero Combat Feedback** - Distinct attack animations per hero class with hit-stop impact weight
- [ ] **Phase 5: Enemy Combat Feedback** - Layered monster damage/death feedback with color-coded damage numbers
- [ ] **Phase 6: DIY Particle System** - Pooled particle system for hit sparks, death bursts, heal sparkles, and block sparks
- [ ] **Phase 7: Gothic UI Polish** - Cohesive dark gothic theme across all screens with atmospheric effects and contrast compliance
- [ ] **Phase 8: Accessibility** - prefers-reduced-motion respect and screen shake toggle

## Phase Details

### Phase 1: Foundation — Asset Extraction
**Mode:** mvp
**Goal:** CSS, HTML, and animation module directories are extracted from the monolithic `web.ts` into separate static files with zero behavioral change.
**Depends on:** Nothing (first phase)
**Requirements:** (Enabling infrastructure — no direct requirements)
**Success Criteria** (what must be TRUE):
  1. All CSS animations and theme styles live in external `.css` files (not template strings in `web.ts`)
  2. All HTML templates live in external `.html` files, served via `express.static()`
  3. The game loads and runs identically to before extraction — zero behavioral regressions
  4. Directory structure exists for animation modules (`public/animations/`, `public/particles/`)
  5. Express routes are trimmed — `web.ts` only handles layout logic, not embedded CSS/HTML
**Plans**: 1 plan

Plans:
- [ ] 01-01-PLAN.md — Extract CSS to static files, wire express.static, replace inline `<style>` with `<link>` tags

### Phase 2: Animation Pipeline
**Mode:** mvp
**Goal:** Animation system is refactored from fragile `setTimeout` chains to a clean Promise-based pipeline using WAAPI, with decoupled state management and entity-level safety.
**Depends on:** Phase 1
**Requirements:** ANIM-01, ANIM-02, ANIM-03, ANIM-04
**Success Criteria** (what must be TRUE):
  1. All combat animations are queued and sequenced through a Promise-based AnimationQueue — no `setTimeout` chains remain for animation logic
  2. Combat state updates flow through CombatStore → CombatDiff → AnimationQueue — state and animation are fully decoupled
  3. Each entity follows an animation state machine (IDLE → WINDUP → ATTACK → IMPACT → RECOVERY → IDLE) preventing overlapping animations on the same entity
  4. Animation durations are driven by CSS `animation-duration` and propagated to JS via `animationend` events — no hardcoded magic numbers
  5. Existing combat functionality works identically (regression-free transition)
**Plans**: TBD

### Phase 3: Critical Hits & Screen Effects
**Mode:** mvp
**Goal:** Big moments (critical strikes, round transitions) carry dramatic screen-level impact that differentiates them from normal combat events, available as infrastructure for hero and enemy animations.
**Depends on:** Phase 2
**Requirements:** COMBAT-06, COMBAT-11, COMBAT-13
**Success Criteria** (what must be TRUE):
  1. Critical hits trigger enhanced visual — larger flash, screen shake, and bigger damage number text
  2. Screen shake activates on heavy hits and critical strikes with configurable intensity
  3. Round transitions display a vignette flash effect that signals combat phase changes
  4. Screen effects are callable as reusable functions (`shake(duration, intensity)`, `vignetteFlash(color, duration)`) for use by hero and enemy combat phases
**Plans**: TBD

### Phase 4: Hero Combat Feedback
**Mode:** mvp
**Goal:** Each hero class has a distinct, satisfying attack animation with hit-stop providing visceral weight on impact.
**Depends on:** Phase 2, Phase 3
**Requirements:** COMBAT-01, COMBAT-02, COMBAT-03, COMBAT-04, COMBAT-05, COMBAT-12
**Success Criteria** (what must be TRUE):
  1. Melee hero lunges to target, freezes for 60-100ms on impact (hit-stop), then returns to position
  2. Mage hero projectile varies by element (fire/ice/arcane) with distinct visual identity
  3. Range hero arrow follows visible arc trajectory with impact effect
  4. Tank hero shows blocking animation with shield impact spark
  5. Healer hero shows casting animation with recipient glow effect
  6. Hit-stop on melee impacts creates perceptible weight without making combat feel sluggish
**Plans**: TBD

### Phase 5: Enemy Combat Feedback
**Mode:** mvp
**Goal:** Every enemy hit, boss entrance, and death communicates clearly through layered visual feedback and color-coded floating damage numbers.
**Depends on:** Phase 2, Phase 3
**Requirements:** COMBAT-07, COMBAT-08, COMBAT-09, COMBAT-10
**Success Criteria** (what must be TRUE):
  1. Monsters flash, shake, and display floating damage numbers simultaneously on hit
  2. Boss monsters have a distinct entrance animation and multi-stage death sequence
  3. Normal monsters have dissolve/burst death animation
  4. Damage numbers float upward from the hit point with different colors for normal/crit/block/heal
**Plans**: TBD

### Phase 6: DIY Particle System
**Mode:** mvp
**Goal:** A lightweight, pooled particle system provides satisfying visual bursts across all combat events with zero external dependencies.
**Depends on:** Phase 4, Phase 5
**Requirements:** PART-01, PART-02, PART-03, PART-04, PART-05
**Success Criteria** (what must be TRUE):
  1. DIY particle system (≤100 lines of JS) manages pooled DOM elements with a single `requestAnimationFrame` loop
  2. Hit sparks burst on melee impact (orange/white particles)
  3. Death burst particles scatter from monster/hero on defeat
  4. Heal sparkle particles rise and fade from healing recipients
  5. Block spark particles spray perpendicular from tank shield on block
  6. All particles auto-cleanup on animation end and clear on screen transitions — zero DOM leaks
**Plans**: TBD

### Phase 7: Gothic UI Polish
**Mode:** mvp
**Goal:** All game screens feel cohesive and polished with a dark gothic theme, atmospheric visual effects, and accessibility-compliant contrast.
**Depends on:** Phase 6
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Ambient torch-flicker glow effect animates on hero bar and arena borders
  2. Shadow pooling effect expands under defeated entities on death
  3. Blood drip / dark ember particle effects appear on damage
  4. All UI screens (dungeon, equipment, party, hero select) follow consistent dark gothic styling
  5. Body text meets WCAG AA 4.5:1 minimum contrast ratio across all screens
**Plans**: TBD
**UI hint**: yes

### Phase 8: Accessibility
**Mode:** mvp
**Goal:** Players can control animation intensity and disable motion effects for comfort and accessibility.
**Depends on:** Phase 7
**Requirements:** A11Y-01, A11Y-02
**Success Criteria** (what must be TRUE):
  1. `prefers-reduced-motion` media query disables non-essential animations (combat animations remain functional but simplified)
  2. Screen shake has a dedicated in-game toggle that can be switched independently of OS motion preference
  3. Toggling shake does not break or skip combat animations
  4. Both reduced-motion mode and shake toggle persist across combat rounds and dungeon transitions
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Asset Extraction | 0/1 | Planned | - |
| 2. Animation Pipeline | 0/0 | Not started | - |
| 3. Critical Hits & Screen Effects | 0/0 | Not started | - |
| 4. Hero Combat Feedback | 0/0 | Not started | - |
| 5. Enemy Combat Feedback | 0/0 | Not started | - |
| 6. DIY Particle System | 0/0 | Not started | - |
| 7. Gothic UI Polish | 0/0 | Not started | - |
| 8. Accessibility | 0/0 | Not started | - |
