# Requirements: Jake Idler

**Defined:** 2026-06-24
**Core Value:** Combat feels visceral and rewarding — smooth animations, satisfying feedback, and clear progression that keeps players engaged.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Animation System Refactoring

- [ ] **ANIM-01**: Replace setTimeout animation chains with WAAPI Promise-based queue using animationend events
- [ ] **ANIM-02**: Decouple animation playback from combat state updates (CombatStore → CombatDiff → AnimationQueue)
- [ ] **ANIM-03**: Per-entity animation state machine (IDLE → ATTACKING → IMPACT → RECOVERY → IDLE)
- [ ] **ANIM-04**: Animation timing synchronised between CSS keyframes and JS coordination (no hardcoded magic numbers)

### Combat Feedback — Heroes

- [ ] **COMBAT-01**: Melee heroes leap to target, impact with hit-stop (60-100ms freeze), then return
- [ ] **COMBAT-02**: Mage heroes cast with distinct projectile per weapon element (fire/ice/arcane)
- [ ] **COMBAT-03**: Range heroes fire with visible arc trajectory and impact
- [ ] **COMBAT-04**: Tank heroes show blocking animation with shield impact spark
- [ ] **COMBAT-05**: Healer heroes show healing cast animation with recipient glow
- [ ] **COMBAT-06**: Critical hits trigger enhanced visual (larger flash, screen shake, bigger text)

### Combat Feedback — Enemies

- [ ] **COMBAT-07**: Monsters take damage with layered feedback — flash + shake + damage number
- [ ] **COMBAT-08**: Boss monsters have entrance animation and death sequence
- [ ] **COMBAT-09**: Monster death animation with dissolve/burst effect
- [ ] **COMBAT-10**: Damage numbers float up from hit point (different colors for normal/crit/block/heal)

### Screen Effects

- [ ] **COMBAT-11**: Screen shake on heavy hits and critical strikes
- [ ] **COMBAT-12**: Hit-stop (animation pause) on impact for weight
- [ ] **COMBAT-13**: Round transition vignette flash

### Particle System

- [ ] **PART-01**: DIY particle system (50-100 lines, pooled DOM elements)
- [ ] **PART-02**: Hit sparks on melee impact
- [ ] **PART-03**: Death burst particles on monster/hero death
- [ ] **PART-04**: Heal sparkle particles
- [ ] **PART-05**: Block spark particles on tank shield

### UI Polish — Gothic Theme

- [ ] **UI-01**: Ambient torch-flicker glow effect on hero bar and arena borders
- [ ] **UI-02**: Shadow pooling effect on death (dark pool expands under defeated entity)
- [ ] **UI-03**: Blood drip / dark ember particle effects on damage
- [ ] **UI-04**: Consistent dark gothic styling across all tabs (dungeon, equipment, party)
- [ ] **UI-05**: WCAG AA contrast compliance (4.5:1 minimum for body text)

### Accessibility

- [ ] **A11Y-01**: Respect prefers-reduced-motion (disable non-essential animations)
- [ ] **A11Y-02**: Screen shake has toggle

## v2 Requirements

Deferred to future release.

### Enhanced Effects

- **COMBAT-14**: Element-specific death effects (fire → burn, ice → shatter, arcane → dissolve)
- **COMBAT-15**: Dodge/evasion visual feedback
- **COMBAT-16**: Status effect indicators (poison, burn, stun icons on entities)
- **COMBAT-17**: Hit direction indicator (show which hero/monster was targeted)

### UI Enhancements

- **UI-06**: Animated transition between dungeon setup and combat arena
- **UI-07**: Inventory item hover tooltip with stat comparison
- **UI-08**: Party member health bars in combat

## Out of Scope

| Feature | Reason |
|---------|--------|
| Canvas/WebGL rendering | CSS animations sufficient for turn-based combat scope |
| External animation libraries (GSAP, Anime.js) | Added bundle size, licensing cost (GSAP), unnecessary for scope |
| Sprite sheets / frame animation | Not needed for card-based combat display |
| Mobile responsive | Desktop-only game by design |
| Audio/SFX | Visual-only game |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANIM-01 | | Pending |
| ANIM-02 | | Pending |
| ANIM-03 | | Pending |
| ANIM-04 | | Pending |
| COMBAT-01 | | Pending |
| COMBAT-02 | | Pending |
| COMBAT-03 | | Pending |
| COMBAT-04 | | Pending |
| COMBAT-05 | | Pending |
| COMBAT-06 | | Pending |
| COMBAT-07 | | Pending |
| COMBAT-08 | | Pending |
| COMBAT-09 | | Pending |
| COMBAT-10 | | Pending |
| COMBAT-11 | | Pending |
| COMBAT-12 | | Pending |
| COMBAT-13 | | Pending |
| PART-01 | | Pending |
| PART-02 | | Pending |
| PART-03 | | Pending |
| PART-04 | | Pending |
| PART-05 | | Pending |
| UI-01 | | Pending |
| UI-02 | | Pending |
| UI-03 | | Pending |
| UI-04 | | Pending |
| UI-05 | | Pending |
| A11Y-01 | | Pending |
| A11Y-02 | | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 0
- Unmapped: 29 ⚠️

---
*Requirements defined: 2026-06-24*
*Last updated: 2026-06-24 after initial definition*
