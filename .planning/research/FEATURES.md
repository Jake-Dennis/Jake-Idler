# Feature Landscape: Combat Animation & UI Polish

**Domain:** Dark gothic idle RPG combat animation
**Researched:** 2026-06-24

## Table Stakes

Features users expect. Missing = combat feels flat and unsatisfying.

| Feature | Why Expected | Complexity | Current State |
|---------|--------------|------------|---------------|
| **Hit flash** | Instant visual feedback that damage occurred | Low | ✅ Present — `.animate-flash-white` (monster) and `.animate-flash-red` (hero) |
| **Damage numbers** | See how much damage was dealt | Low | ✅ Present — `floatText()` function with color-coded damage/heal/block/crit |
| **Death animation** | Clear signal unit is defeated | Low | ✅ Present — `.animate-fade-out` with scale+opacity |
| **Attack movement** | Attacker visually reaches out to target | Low | ✅ Present — `.animate-lunge` for melee, projectiles for ranged/mage |
| **HP bar smooth transition** | Health changes feel continuous | Low | ✅ Present — `.hp-bar-inner` with `transition: width .4s ease` |
| **Screen shake on heavy hit** | Communicates impact weight | Low | ❌ Missing — shake is only on individual elements, not the screen container |
| **Hit-stop / impact freeze** | Brief pause on contact makes hits feel weighty | Low | ❌ Missing — single most impactful combat feel improvement |

## Differentiators

Features that elevate combat from "functional" to "visceral and rewarding." Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-layer hit feedback** | Every hit triggers flash + shake + particles + float text + optional screen effects simultaneously | Low | Currently only flash + float text. Adding shake + particles + vignette costs ~10 lines of CSS. |
| **Hit particles (sparks/burst)** | Visual impact debris that sells the force of a blow | Medium | DIY class, ~50 lines. Color-code by damage type: orange for melee, blue for frost, purple for arcane, red for crit. |
| **Crit explosion effect** | Radial burst, larger particles, screen vignette flash | Medium | Builds on particle system. Add screen-wide overlay flash for 300ms. |
| **Block/parry spark** | Directional spark effect showing deflection (← → direction from attacker) | Low | 4-6 particles sprayed perpendicular to attack direction. Gold/white color. |
| **Dodge/shimmer ghost** | Brief transparency + ghost outline on dodge | Low | `opacity: 0.3` + `filter: drop-shadow()` on the dodging unit for 200ms. |
| **Heal sparkles** | Upward-rising green/yellow sparkles | Low | 6-8 particles with negative gravity (float upward). Green/gold color. |
| **Death dissolve** | Multi-stage death: flash bright → desaturate → shrink → particles | Medium | Combine fade-out with brightness filter and burst particles at midpoint. Diablo 3 enemy death style. |
| **Aura/buff glow** | Growing ambient glow on buffed units | Low | Expand existing `.animate-shield` pattern. Add per-buff color (red for rage, blue for frost armor). |
| **Boss phase-change effects** | Screen shake + vignette + roar indicator on boss HP thresholds | Medium | Trigger at 75%, 50%, 25% HP. Red vignette flash + deeper screen tint. |
| **Ambient torch-flicker glow** | Subtle pulsing shadows on UI borders | Low | `@keyframes torchFlicker` on panel borders. Creates atmosphere without gameplay impact. |
| **Dark mist / shadow pooling on death** | Shadow expands outward from killed unit | Medium | Radial gradient overlay with scale animation. Fits dark gothic theme perfectly. |
| **Damage type signature** | Each weapon class has unique visual identity | Medium | Melee: lunge + sparks. Mage: colored projectile + explosion. Range: arc arrow + hit. Crit: added screen effects. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **GSAP-based animation** | Commercial license required for many use cases, 30KB+ payload | CSS + WAAPI (native, free, smaller) |
| **tsParticles for hit effects** | 500KB+ library loading for 8-particle bursts is absurd overhead | DIY particle class (~50 lines) |
| **Canvas 2D game renderer** | Mixing Canvas + DOM creates compositing complexity. Turn-based game doesn't need 60fps canvas loop | Keep DOM rendering. CSS transforms + WAAPI are sufficient. |
| **Sprite sheet animation** | No character sprites exist — game uses text/icons/Lucide SVGs. Sprite sheets add asset pipeline complexity. | Focus on CSS effects (flash, shake, glow, particles). These work with any visual representation. |
| **Parallax backgrounds** | Desktop-only game with static arena. Parallax adds complexity with no gameplay benefit. | Keep arena background gradient. Add subtle ember particles for atmosphere. |
| **Persistent particle systems** | Continuous smoke/fire/ambient particles drain battery and cause visual noise | Use targeted burst particles only (on events). No background ambient systems. |

## Feature Dependencies

```
AnimCoordinator (async/await framework)
  ├── CSS @keyframes (class-based effects)
  │     ├── flash (red/white)
  │     ├── shake (element-level)
  │     ├── fade-out
  │     ├── shield-glow
  │     ├── float-text
  │     └── boss-pulse
  │
  ├── WAAPI element.animate() (dynamic effects)
  │     ├── projectile arcs
  │     ├── screen-shake (arena container)
  │     ├── vignette flash (arena::after)
  │     └── hit-stop (animation-play-state)
  │
  └── ParticleBurst class (burst effects)
        ├── hit-sparks
        ├── death-burst
        ├── heal-sparkles
        ├── block-sparks
        └── crit-explosion
```

## MVP Recommendation

**Phase 1 — Foundation (must have):**
1. AnimCoordinator class — promise-based, replaces setTimeout
2. Hit-stop — 80ms freeze on impact
3. Screen shake on container — `.arena` transform shake on heavy hits
4. Multi-layer feedback — every hit triggers flash + shake + float text (minimum 3 effects)

**Phase 2 — Polish (should have):**
5. DIY ParticleBurst class — hit sparks, death burst
6. Enhanced death animation — dissolve + particles
7. Crit/victory/defeat screen effects — vignette flash, particle celebration

**Defer** (can wait):
- Block/parry sparks: not all heroes have block abilities yet
- Damage type signature differentiation: needs weapon system maturity
- Boss phase-change effects: needs boss encounter design
- Ambient torch-flicker: purely decorative, low priority

---

*Feature landscape for: Combat animation and UI polish*
*Researched: 2026-06-24*
