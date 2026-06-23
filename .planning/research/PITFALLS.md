# Domain Pitfalls: Combat Animation & UI Polish

**Domain:** Browser-based turn-based idle RPG animation system
**Researched:** 2026-06-24

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: setTimeout Cascade (CURRENT CODEBASE ISSUE)
**What goes wrong:** Deeply nested `setTimeout()` calls for animation sequencing create unmaintainable callback pyramids. Each animation function has hardcoded timing offsets that must be manually adjusted when animation durations change.

**Why it happens:** It's the simplest first approach. Write a 300ms timeout here, a 450ms timeout there, and it works initially.

**Consequences:**
- Changing one animation's duration requires recalculating all dependent timeouts
- Cannot pause/skip/cancel mid-sequence
- Timing drifts under CPU load (setTimeout is not frame-accurate)
- Adding a new effect in the middle of a sequence requires restructuring all timeouts

**Prevention:** Use WAAPI `animation.finished` promises with `async/await`. Each animation step returns a promise. Duration changes are automatically propagated.

**Detection:** Any `setTimeout` that is used for animation timing (not for debouncing or polling) is a red flag.

### Pitfall 2: Animating Layout Properties (jank)
**What goes wrong:** Using `top`, `left`, `width`, `height`, `margin`, `padding` in CSS animations or JS transitions. These trigger layout recalculations, which are the most expensive part of the browser rendering pipeline.

**Why it happens:** It's intuitive to think "move element to position X by setting `left: Xpx`."

**Consequences:** Animation jank (dropped frames). Combat feels stuttery. CPU usage spikes.

**Prevention:** Only animate `transform` (translate, scale, rotate) and `opacity`. These are compositor-only properties. If you need to animate position, use `transform: translateX()` instead of `left`.

**Detection:** Check DevTools Performance panel for "Layout" events during animation.

### Pitfall 3: Particle DOM Leaks
**What goes wrong:** Particles are created as DOM elements but not properly cleaned up during screen transitions or when the user navigates away.

**Why it happens:** Each particle creates a `<div>` and sets a `setTimeout` to remove it. If the user changes screens before the timeout fires, the elements stay in the DOM forever.

**Consequences:** Memory grows unbounded over long play sessions. Eventually causes page slowdown or crash.

**Prevention:** Track all active particles in a `Set`. Provide a `ParticleManager.clear()` method called on every screen transition. Use `cancelAnimationFrame` on cleanup.

**Detection:** Profile heap in DevTools — if particle div count grows over time without resetting, there's a leak.

### Pitfall 4: GSAP Commercial Licensing
**What goes wrong:** GSAP's standard license is free for certain uses but requires a "Business Green" license ($199+/year) for commercial games and applications.

**Why it happens:** GSAP is the most well-known animation library. Developers reach for it by default.

**Consequences:** Legal exposure if distributing a commercial product without the proper license. Enforcing animation library licensing in a hobby project is unnecessary overhead.

**Prevention:** Don't use GSAP. WAAPI covers the same use cases natively. If you must have a library, use Anime.js (MIT licensed) or Motion (MIT licensed).

## Moderate Pitfalls

### Pitfall 1: Over-animation / Visual Noise
**What goes wrong:** Adding too many simultaneous effects (particles + screen shake + flash + vignette + float text + glow + border pulse) on every hit creates visual chaos.

**Prevention:** Scale effects by importance:
- Normal hit: flash + small float text (+ optional 2-4 particles)
- Crit: flash + shake + 8-12 particles + vignette flash + large float text
- Death: fade + 15-20 particles + screen flash
- Normal attacks: lunge/projectile movement only (no particle burst)

### Pitfall 2: Hit-Stop Timing Too Long
**What goes wrong:** Setting hit-stop freeze too long (200ms+) makes combat feel sluggish and unresponsive.

**Prevention:** Start at 60ms, test, adjust up to max 100ms. The freeze should feel like a weighty pause, not a stutter.

### Pitfall 3: Screen Shake on Every Hit
**What goes wrong:** Shaking the screen container on every attack (even normal hits) causes motion sickness and visual fatigue.

**Prevention:** Only shake on:
- Critical hits (2x+ damage)
- Boss attacks
- Heavy weapon types (identified by weapon properties)

### Pitfall 4: Ignoring prefers-reduced-motion
**What goes wrong:** Animations, especially screen shake and screen flash, trigger vestibular disorders in some users.

**Prevention:** Wrap all screen-level effects (shake, flash, hit-stop) in a `prefers-reduced-motion` media query or a game settings toggle. Offer a "Reduced Motion" option in settings.

### Pitfall 5: WAAPI Browser Support Gaps
**What goes wrong:** WAAPI's `.finished` promise and `Element.animate()` are supported in all modern browsers but may have subtle differences.

**Prevention:** Test in Chrome, Firefox, and Edge. Firefox had issues with `.finished` promise resolution timing — use `.onfinish` callback as fallback or the `sleep()` helper for cross-browser reliability.

## Minor Pitfalls

### Pitfall 1: Float Text Position Drift
**What goes wrong:** Damage numbers are positioned using `getBoundingClientRect()` at animation start, but if the target element moves during the animation (lunge/shake), the text appears in the wrong position.

**Prevention:** Capture position at the moment of hit (not at animation start). For lunge attacks, capture monster position at 45% of lunge animation (impact point), not at 0%.

### Pitfall 2: Animation Timing on First Load
**What goes wrong:** CSS animations sometimes fire on initial page load when elements first appear, before the user interacts.

**Prevention:** Wrap combat animations in a class that's only added when combat starts. Use `animation: none` on elements until they enter combat.

### Pitfall 3: Z-Index Stacking Conflicts
**What goes wrong:** Projectiles, particles, float text, and overlays all set `position: fixed` with `z-index` values that can conflict.

**Prevention:** Define a z-index system:

| z-index | Layer |
|---------|-------|
| 500 | Projectiles |
| 499 | Particle trails |
| 600 | Float text |
| 700 | Overlay (victory/defeat screens) |
| 300 | Hero cards (during combat) |
| 200 | Monster cards |
| 100 | Arena background effects |

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **AnimCoordinator refactor** | Breaking existing animation timing (everything fires at wrong time) | Keep old functions as fallback. Test each animation type individually after refactor. Add a `debug` mode that logs timing. |
| **Particle system** | Particles not cleaned up on screen transition | Always call `ParticleManager.clear()` in the screen hide/show functions. Already hooks exist for screen transitions. |
| **Hit-stop** | Hit-stop feels wrong (too long or too short) | Make hit-stop duration a configurable constant. Test at 60ms, 80ms, 100ms with real combat scenarios. |
| **Screen shake** | Shake causes motion sickness | Default to OFF. Give explicit toggle in settings. Use `prefers-reduced-motion` query. |
| **Gothic polish pass** | Over-styling makes UI hard to read | Keep readability contrast ratios (WCAG AA on text). The gothic aesthetic should enhance readability, not sacrifice it. Dark backgrounds + gold text already handles this. |

---

*Domain pitfalls for: Combat animation and UI polish*
*Researched: 2026-06-24*
