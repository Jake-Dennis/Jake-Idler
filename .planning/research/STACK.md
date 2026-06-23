# Stack Research: Combat Animation & UI Polish

**Domain:** Browser-based dark gothic idle RPG (turn-based combat)
**Researched:** 2026-06-24
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **CSS `@keyframes`** | — | Simple triggered effects: flash, shake, fade, pulse, float text | Zero runtime cost, runs on compositor thread, already proven in codebase. Keep for: flash-white, flash-red, shake, fade-out, shield-glow, boss-pulse, float-up. |
| **Web Animations API (WAAPI)** | — | Scripted sequencing: attack chains, timed coordination, dynamic keyframes | Replaces `setTimeout` callback hell with `await animation.finished`. Compositor-thread performance. Native API — no dependency. Supports `play()`, `pause()`, `reverse()`, `playbackRate`. |
| **`element.animate()`** | — | Dynamic per-frame animations: projectiles, arcs, custom trajectories | Combines CSS keyframe flexibility with JS control. Quadratic bezier arcs (current `requestAnimationFrame`) can be replaced with `Element.animate()` offset-path or multi-keyframe transforms. |
| **DIY DOM Particle System** | — | Burst effects: hit sparks, death particles, heal sparkles, block sparks | No library needed. 8–20 short-lived `<div>` elements per burst, managed via `requestAnimationFrame` for physics (velocity, gravity, opacity decay). For turn-based combat this is trivially performant (< 30 particles at once). |

### Animation Techniques (Not Libraries)

| Technique | What It Does | Why Important |
|-----------|-------------|---------------|
| **Hit-stop (impact freeze)** | Pause all animation for 50–100ms on hit | Single most impactful combat feel improvement. Creates weight. Implement via `animation-play-state: paused` on container during freeze frames. |
| **Multi-layer feedback** | Flash + shake + particles + float text + screen vignette simultaneously | Combat feel comes from layering, not single effects. Each hit triggers 4–5 sub-effects with staggered timing. |
| **Screen-shake container** | Apply `transform: translate` to `.arena` or `.screen` on crit/heavy hit | Cheap (compositor-only) way to communicate impact. Use WAAPI for programmable shake magnitude based on damage %. |
| **Overlay flash / vignette pulse** | Full-screen `rgba` overlay that pulses on crit/boss phase-change | Communicates drama. Dark gothic theme: deep red or dark gold overlay at 15–30% opacity, 600ms duration. |
| **Easing curve personality** | Custom `cubic-bezier()` for different weapon types | Melee: fast-in/slow-out (`cubic-bezier(0.2, 0.8, 0.4, 1)`). Mage: floaty ease. Support hit-stop feel requires specific curves. |

### Recommendation: NO External Libraries

**Decision: Zero external animation libraries.**

Rationale:
1. **Project constraint** — "Vanilla JS stays, no build step." Adding an npm dependency introduces friction.
2. **Turn-based, not real-time** — Animations fire discretely (once per combat tick, ~2–5 seconds apart). There is no 60fps render loop pressure. A 30KB+ library provides zero benefit over native APIs for this schedule.
3. **CSS @keyframes + WAAPI covers every case:**
   - Looped ambient animations → `@keyframes` (bossPulse, idle shimmer)
   - Triggered one-shot effects → `@keyframes` class toggle (flash, shake, fade)
   - Sequenced multi-step → `Element.animate()` with promises
   - Dynamic trajectories → `Element.animate()` with JS-computed keyframes
   - Particle bursts → DIY (see below)
4. **Fewer failure points** — No CDN dependency, no version mismatch, no licensing (GSAP requires commercial license).
5. **Anime.js (best candidate)** — Under 10KB, zero deps, excellent API, timeline support. Future consideration if animation complexity grows significantly, but not needed now.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| CSS + WAAPI hybrid | **Anime.js v4** (CDN) | If animation sequences exceed 10+ steps per round OR if you need advanced timeline scrubbing / scrubbing controls. Anime.js's `timeline` API is cleaner than manual WAAPI promise chaining for complex sequences. Add via `<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/4.5.0/anime.min.js">`. |
| CSS + WAAPI hybrid | **Motion (mini)** 2.3KB CDN | If you need spring physics for UI animations (bouncy buttons, elastic panels) that CSS `cubic-bezier()` can't easily express. Motion's spring model (`type: "spring"`, `stiffness`, `damping`) is excellent. Import as ES module: `<script type="module">import { animate } from "https://cdn.jsdelivr.net/npm/motion@12.40.0/+esm"</script>`. |
| DIY DOM particles | **tsParticles** | If you need persistent ambient particle systems (snow, smoke, fire in background). tsParticles is 500KB+ and designed for background decoration, not targeted game effects. **Do NOT use for hit sparks.** |
| DIY DOM particles | **Canvas-based particles** | If you were building a real-time game (60fps, 500+ particles). For turn-based combat with 8–20 burst particles, Canvas setup overhead is not justified. DOM `<div>` particles are simpler and sufficient. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **GSAP (GreenSock)** | 30KB+ gzipped, requires commercial license for many use cases, overkill for turn-based sequencing. WAAPI does everything needed natively. | CSS + WAAPI |
| **tsParticles for game effects** | 500KB+ library designed for ambient background particles. Importing it for 8-particle hit sparks is like using a flamethrower to light a candle. | DIY DOM particles |
| **`setTimeout` chaining** | Currently in codebase — creates callback hell, unmanageable timing, cannot pause/resume, inaccurate over long durations. | WAAPI `animation.finished` promises |
| **Canvas 2D for sprite rendering** | The game uses DOM elements for heroes/monsters. Adding a Canvas layer creates compositing conflicts, extra complexity, and coordinate mapping issues. The DOM is the right render target here. | CSS + WAAPI on DOM |
| **`requestAnimationFrame` loop for projectiles** | Current code uses `rAF` for arc projectiles. This works but WAAPI's `Element.animate()` is cleaner, uses the compositor thread, and integrates with promise sequencing. | `Element.animate()` with `offset-path` or multi-keyframe |

## Installation

Zero installation. Everything is inline CSS and native browser APIs.

If future needs justify an animation library:

```html
<!-- Option A: Anime.js v4 (ES module via CDN) -->
<script type="module">
  import { animate, timeline } from "https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm";
</script>

<!-- Option B: Motion mini (2.3KB, spring physics) -->
<script type="module">
  import { animate } from "https://cdn.jsdelivr.net/npm/motion@12.40.0/mini/+esm";
</script>

<!-- Option C: Motion hybrid (18KB, independent transforms + sequences) -->
<script type="module">
  import { animate } from "https://cdn.jsdelivr.net/npm/motion@12.40.0/+esm";
</script>
```

## Stack Architecture: Animation Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                Animation Coordinator                │
│         (async/await promise-based sequencer)        │
│         Replaces current setTimeout chains           │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────┐   ┌────────────┐   ┌──────────┐  │
│   │  CSS @keyframes│   │ WAAPI      │   │ DIY      │  │
│   │  (class toggles)│   │ animate()  │   │ Particles│  │
│   │                │   │            │   │          │  │
│   │ • flash-white  │   │ • lunge    │   │ • sparks │  │
│   │ • flash-red    │   │ • projectile│   │ • burst  │  │
│   │ • shake        │   │ • screen   │   │ • heal   │  │
│   │ • fade-out     │   │   shake    │   │ • block  │  │
│   │ • shield-glow  │   │ • overlay  │   │ • death  │  │
│   │ • boss-pulse   │   │   flash    │   │          │  │
│   │ • float-text   │   │ • hit-stop │   │          │  │
│   │ • fade-in      │   │            │   │          │  │
│   └──────────────┘   └────────────┘   └──────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                  Compositor Thread                   │
│         (transform, opacity — no layout thrash)      │
└─────────────────────────────────────────────────────┘
```

## Key CSS Patterns to Implement

### Hit Feedback Layering (new pattern)
```css
/* Combine multiple effects on a single hit */
.hero-card.animate-hit-taken {
  animation: 
    flash-red 0.35s ease,
    shake 0.3s ease;
}

/* Death dissolve with particle-like expansion */
.monster-card.animate-death-dissolve {
  animation: dissolve 0.8s ease-out forwards;
}
@keyframes dissolve {
  0%   { opacity: 1; transform: scale(1); filter: brightness(1); }
  50%  { opacity: 0.5; transform: scale(1.1); filter: brightness(2) saturate(0); }
  100% { opacity: 0; transform: scale(0.8); filter: brightness(3) saturate(0); }
}

/* Hit-stop (pause) via CSS */
.arena.animate-freeze {
  animation-play-state: paused;
}

/* Overlay vignette flash */
.arena::after {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s;
}
.arena.animate-crit-flash::after {
  background: radial-gradient(ellipse at center, transparent 40%, rgba(90, 50, 20, 0.3) 100%);
  opacity: 1;
  animation: flashVignette 0.6s ease-out forwards;
}
@keyframes flashVignette {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
```

### Gothic Dark Theme Animation Patterns
```css
/* Ambient torch-flicker glow on UI borders */
.ui-panel {
  animation: torchFlicker 4s ease-in-out infinite;
}
@keyframes torchFlicker {
  0%, 100% { box-shadow: 0 0 10px rgba(60, 30, 10, 0.1); }
  25%      { box-shadow: 0 0 15px rgba(60, 30, 10, 0.15); }
  50%      { box-shadow: 0 0 8px rgba(60, 30, 10, 0.08); }
  75%      { box-shadow: 0 0 12px rgba(60, 30, 10, 0.12); }
}

/* Blood drip on heavy hit (pseudo-element) */
.hero-card.animate-bleeding::after {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  width: 2px; height: 0;
  background: linear-gradient(to bottom, #4a1515, transparent);
  animation: bloodDrip 0.6s ease-out forwards;
}
@keyframes bloodDrip {
  0%   { height: 0; opacity: 1; }
  100% { height: 30px; opacity: 0; }
}

/* Dark mist / shadow pooling on death */
.monster-card.animate-shadow-death::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.6), transparent);
  opacity: 0;
  animation: shadowPool 0.6s ease-out forwards;
}
@keyframes shadowPool {
  0%   { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1.5); }
}
```

## WAAPI Coordination Pattern (Replacing setTimeout)

### Current Pattern (messy)
```javascript
// Current — callback hell, hard to read, cannot pause
heroEl.classList.add('animate-lunge');
setTimeout(() => {
  monsterEl.classList.add('animate-flash-white');
  setTimeout(() => {
    monsterEl.classList.remove('animate-flash-white');
    heroEl.classList.remove('animate-lunge');
  }, 400);
}, 330);
```

### Replacement Pattern (clean, pauseable, maintainable)
```javascript
// Helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function playMeleeAttack(heroEl, monsterEl) {
  // Lunge with WAAPI — compositor-thread
  const lunge = heroEl.animate([
    { transform: 'translate(0, 0)', offset: 0 },
    { transform: 'translate(40px, -32px)', offset: 0.25 },
    { transform: 'translate(65px, 0)', offset: 0.45 },
    { transform: 'translate(65px, 0)', offset: 0.55 },
    { transform: 'translate(20px, -15px)', offset: 0.8 },
    { transform: 'translate(0, 0)', offset: 1 }
  ], { duration: 750, easing: 'ease-in-out' });

  // Wait for lunge to reach impact point (45% = ~340ms)
  await sleep(340);

  // Hit-stop: freeze everything briefly
  arena.classList.add('animate-freeze');
  monsterEl.classList.add('animate-flash-white', 'animate-shake');
  spawnHitSparks(monsterEl, 8);
  floatText(monsterEl, 'HIT!', 'damage');

  await sleep(80); // 80ms freeze
  arena.classList.remove('animate-freeze');

  await sleep(260); // remaining flash duration
  monsterEl.classList.remove('animate-flash-white', 'animate-shake');
}
```

## DIY Particle System Template

```javascript
class Particle {
  constructor(x, y, options = {}) {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 500;
      width: ${options.size || 6}px;
      height: ${options.size || 6}px;
      border-radius: 50%;
      background: ${options.color || '#ff8800'};
      box-shadow: 0 0 ${options.glow || 6}px ${options.color || '#ff8800'};
      left: ${x}px;
      top: ${y}px;
      opacity: 1;
    `;
    document.body.appendChild(this.el);

    this.x = x;
    this.y = y;
    this.vx = options.vx || (Math.random() - 0.5) * 200;
    this.vy = options.vy || (Math.random() - 0.5) * 200 - 100;
    this.gravity = options.gravity || 400; // px/s²
    this.life = 1;
    this.decay = options.decay || 0.02;
    this.alive = true;
  }

  update(dt) {
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= this.decay;
    this.el.style.left = this.x + 'px';
    this.el.style.top = this.y + 'px';
    this.el.style.opacity = Math.max(0, this.life);
    this.el.style.transform = `scale(${this.life})`;
    if (this.life <= 0) { this.remove(); }
  }

  remove() {
    this.alive = false;
    this.el.remove();
  }
}

class ParticleBurst {
  constructor(x, y, count = 12, options = {}) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
      const speed = 150 + Math.random() * 150;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: options.color || '#ff8800',
        size: options.size || 6,
        decay: options.decay || 0.025,
        gravity: options.gravity || 300
      }));
    }
    this.lastTime = performance.now();
    this.active = true;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  _tick(now) {
    if (!this.active) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    let alive = 0;
    for (const p of this.particles) {
      if (p.alive) { p.update(dt); alive++; }
    }
    if (alive > 0) requestAnimationFrame(this._tick);
    else this.active = false;
  }
}
```

## Performance Guarantees

For a turn-based idle game, performance concerns are minimal:

| Concern | Reality | Mitigation |
|---------|---------|------------|
| Layout thrash | Turn-based = 1 animation batch every 2–5 seconds. No pressure. | Keep animations on `transform` + `opacity` only. Avoid animating `width`, `height`, `top`, `left`. |
| Particle count | Never exceeds 30 particles active simultaneously. | Set `dt` cap at 50ms to prevent spiral of death. Remove particles immediately when `life <= 0`. |
| `setTimeout` drift | Current code uses `setTimeout` for timing, which drifts. | WAAPI uses the browser's internal timing, which is frame-accurate. Only use `sleep()` for inter-effect gaps (not animation timing). |
| Memory leaks | Particles leak if not cleaned up. | `Map` of active particles, clean on combat round transition (`cancelAnimationFrame` loop on clean-up). |

## Source of Truth Principles

1. **Animations use `transform` and `opacity` only** — never `width`, `height`, `margin`, `padding`, `top`, `left`. These trigger layout, which kills performance.
2. **CSS for simple effects** — anything that toggles on/off with no intermediate state changes.
3. **WAAPI for dynamic effects** — anything that needs JS-calculated values, pause/resume, or promise chaining.
4. **Particles are always short-lived** — create, animate, destroy. Never accumulate.
5. **Hit-stop** — the #1 combat feel improvement, costs almost nothing.
6. **Layered feedback** — every combat event triggers at least 3 sub-effects (flash + particle + float text + optional shake).

## Sources

- MDN Web Animations API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- MDN CSS Animations — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations
- web.dev — Animations overview and performance guide
- animejs.com — Anime.js v4 documentation
- motion.dev — Motion library documentation
- tsParticles documentation — https://particles.js.org/
- Project codebase analysis — Current animation implementation in `routes/web.ts`

---

*Stack research for: Combat animation and UI polish in dark gothic idle RPG*
*Researched: 2026-06-24*
