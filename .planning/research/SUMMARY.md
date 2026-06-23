# Project Research Summary

**Project:** Jake Idler
**Domain:** Combat animation & UI polish for browser-based dark gothic idle RPG
**Researched:** 2026-06-24
**Confidence:** HIGH

## Executive Summary

Jake Idler is a vanilla JS idle RPG with turn-based combat, currently running all client code out of a single 2000+ line Express-served file (`web.ts`). The existing animation system works — it uses CSS `@keyframes` for basic effects (flash, lunge, shield glow) and serves damage numbers — but it's held together by nested `setTimeout` chains that are fragile, impossible to pause, and drift under load. The combat feels functional but lacks weight: there's no hit-stop freeze, no screen shake, no particle bursts, and no layered feedback that makes each blow feel visceral.

The research is conclusive: **add zero external dependencies** and build a native DOM animation pipeline using CSS `@keyframes` (for simple triggered effects), the Web Animations API (for sequenced, scripted effects), and a ~50-line DIY `ParticleBurst` class (for hit sparks and death particles). For a turn-based game where animations fire discretely every 2–5 seconds, GSAP and tsParticles are absurd overkill — WAAPI + CSS covers every case while staying on the compositor thread. The single highest-ROI change is **hit-stop** (an 80ms animation freeze on impact), which costs almost nothing to implement and transforms combat weight perception.

The key risk is the refactoring itself: extracting animation logic from a monolithic 2000+ line file into a clean pipeline (CombatStore → CombatDiff → AnimationQueue → DOMRenderer) while keeping existing functionality intact. The research prescribes a safe 5-phase approach: (1) extract CSS/HTML to static files with zero behavioral change, (2) build pure-data diff modules alongside existing code, (3) replace `setTimeout` chains with Promise-based queue, (4) add particle and float-text managers, and (5) add entity-level state machines for safety. Each phase is designed to be independently testable with a rollback path.

## Key Findings

### Recommended Stack

**Decision: Zero external animation libraries.** CSS `@keyframes` + Web Animations API (`Element.animate()`) + a DIY DOM Particle class covers every animation need for a turn-based idle RPG. Adding GSAP or tsParticles would introduce licensing risk (GSAP commercial), 500KB+ payloads (tsParticles), and dependency friction that contradicts the project's vanilla-JS constraint.

**Core technologies:**
- **CSS `@keyframes`**: Simple one-shot effects (flash, shake, fade, pulse, float text) — zero runtime cost, runs on compositor thread. Keep existing patterns unchanged.
- **Web Animations API (WAAPI)**: Scripted sequencing for attack chains and coordinated multi-step effects — replaces `setTimeout` hell with `await animation.finished`. Compositor-thread performance, native API.
- **`Element.animate()`**: Dynamic per-frame animations (projectile arcs, custom trajectories) — combines CSS keyframe flexibility with JS control, replaces `requestAnimationFrame` for projectiles.
- **DIY `ParticleBurst` class**: ~50 lines, creates 8–20 short-lived `<div>` elements per burst. Physics via `rAF` (velocity, gravity, opacity decay). Color-coded by damage type. Turn-based = never exceeds 30 particles simultaneously.

**Alternatives (not needed now):**
- Anime.js v4 (CDN, <10KB) — if animation sequences exceed 10+ steps per round
- Motion mini (2.3KB, spring physics) — if CSS `cubic-bezier()` can't express desired bounce/spring

### Expected Features

**Must have (table stakes):**
- **Hit flash** (red/white) — ✅ present
- **Damage numbers** (color-coded) — ✅ present via `floatText()`
- **Death animation** (fade + scale) — ✅ present
- **Attack movement** (lunge/projectile) — ✅ present
- **HP bar smooth transition** — ✅ present (CSS transition)
- **Screen shake on heavy hit** — ❌ missing — shake only on individual elements, not the container
- **Hit-stop / impact freeze** — ❌ missing — single most impactful combat feel improvement

**Should have (differentiators):**
- **Multi-layer hit feedback** — flash + shake + particles + float text + vignette (currently flash + text only)
- **Hit particles (sparks/burst)** — color-coded by damage type (orange/blue/purple/red)
- **Crit explosion effect** — radial burst + screen vignette flash
- **Block/parry spark** — directional gold/white spray (← → perpendicular to attack)
- **Dodge/shimmer ghost** — opacity 0.3 + drop-shadow for 200ms
- **Death dissolve** — flash bright → desaturate → shrink → particle burst (Diablo-style)
- **Damage type visual signatures** — unique look per weapon class (melee: lunge + sparks, mage: colored projectile + explosion, range: arc arrow + hit)

**Defer (v2+):**
- Boss phase-change effects (needs boss encounter design)
- Ambient torch-flicker glow (purely decorative)
- Damage type signature differentiation (needs weapon system maturity)

### Architecture Approach

The current architecture embeds all HTML, CSS, and JS in a single 2000+ line Express-served file (`web.ts`). Animation logic is a procedural `animateTransition()` function that fires fire-and-forget `setTimeout` chains for every combat event — all animations fire simultaneously with no queue, no synchronization, and timer-based cleanup that frequently misses.

The recommended architecture decouples this into a **State Diff → Animation Step Pipeline**: server state arrives via REST poll → `CombatStore` holds immutable snapshots → `CombatDiff` is a pure function that produces an ordered `AnimationStep[]` array → `AnimationQueue` processes steps sequentially (or in parallel batches via `Promise.all`) → `DOMRenderer` applies CSS classes and listens for `animationend` events to clean up. Game state updates (HP bars, alive/dead flags) happen **immediately** on poll response — animations are visual effects playing *on top* of the true state, never gating it.

**Major components:**
1. **CombatStore** — Immutable server state container with subscriber pattern. Only public method: `update(newState)` triggers diff.
2. **CombatDiff** — Pure function `(prev, next) => AnimationStep[]`. No DOM access, no timing, no side effects. Produces typed steps with `parallel: boolean` flags.
3. **AnimationQueue** — Promise-based step sequencer. Processes steps via `async/await`, groups consecutive `parallel:true` steps into batches.
4. **DOMRenderer** — CSS class applier with `animateElement()` wrapper that returns a Promise resolving on `animationend` event (with `setTimeout` fallback guard).
5. **FloatTextManager** — Creates DOM float text, auto-removes on `animationend`.
6. **ParticleManager** — Unified `rAF` loop for all active projectiles and particle bursts. Single loop, not one-per-particle.
7. **EntityAnimFSM** — Per-entity state machine (`IDLE → WINDUP → ATTACK → IMPACT → RECOVERY → IDLE`). Prevents overlapping animations on the same entity.

### Critical Pitfalls

1. **setTimeout Cascade (CURRENT CODEBASE)** — Nested `setTimeout` calls for animation sequencing with hardcoded durations that break when CSS changes. Prevents pause/skip/cancel. **Fix:** Use WAAPI `animation.finished` promises — duration changes propagate automatically.
2. **Animating Layout Properties** — Using `top`/`left`/`width`/`height` in animations triggers layout recalculations. **Fix:** Only animate `transform` and `opacity` (compositor-only properties).
3. **Particle DOM Leaks** — Particles create `<div>` elements that survive screen transitions if cleanup mistimes. **Fix:** Track all active particles in a `Set`; call `ParticleManager.clear()` on every screen transition.
4. **Over-animation / Visual Noise** — Too many simultaneous effects (flash + shake + particles + vignette + glow + border pulse) creates visual chaos. **Fix:** Scale effects by importance — normal hit = flash + small text (+ 2–4 particles); crit = flash + shake + 8–12 particles + vignette; death = fade + 15–20 particles.
5. **Hit-Stop Timing Too Long** — Freeze >200ms makes combat feel sluggish. **Fix:** Start at 60ms, test up to max 100ms. Should feel like a weighty pause, not a stutter.

## Implications for Roadmap

### Phase 1: Extract Assets (CSS + HTML)
**Rationale:** Zero behavioral risk. The current `web.ts` (2000+ lines) embeds CSS as string literals and HTML as template strings. Extracting these to static files immediately simplifies the codebase without touching animation logic.
**Delivers:** Clean separation of CSS animations, theme, layout => `public/css/*.css`. HTML shell => `public/index.html`. Server routes trimmed to layout logic only.
**Addresses:** Foundation for all subsequent phases (no features directly, but unblocks everything).
**Avoids:** Pitfall 2 (layout thrash) — extracted CSS already uses `transform`/`opacity` only.
**Research flag:** Standard patterns — file extraction from Express routes is well-documented. Skip research-phase.

### Phase 2: Build CombatStore + CombatDiff (Pure Data Layer)
**Rationale:** These are side-effect-free modules that can be built and tested alongside existing code. No animation code is rewritten yet — they sit parallel to the current `animateTransition()` function.
**Delivers:** `CombatStore.js` (immutable state with subscriber pattern) and `CombatDiff.js` (pure diff function => `AnimationStep[]`). These are testable without DOM.
**Uses:** Architecture patterns from ARCHITECTURE.md (State Diff → Step Pipeline).
**Avoids:** Pitfall 1 (setTimeout cascade) — these modules are pure data, no timing logic.
**Research flag:** Standard patterns — subscriber/pure-function patterns are well-established. Skip research-phase.

### Phase 3: Replace setTimeout Chains with AnimationQueue + DOMRenderer
**Rationale:** The core animation refactoring. This is where `setTimeout` chains are replaced with Promise-based sequencing using WAAPI and `animationend` events. Highest risk — needs careful testing against existing behavior.
**Delivers:** `AnimationQueue.js` (Promise-based step processor), `DOMRenderer.js` (animationend-based class toggling). Existing `playAttackAnimation`, `playHitAnimation`, `playDeathAnimation` rewritten as DOMRenderer methods. The `animateTransition` body becomes: `combatDiff()` → `animationQueue.enqueue()`.
**Addresses:** Hit-stop (FEATURES table stake — #1 combat improvement), Screen shake on heavy hit (FEATURES table stake), Multi-layer hit feedback (FEATURES differentiator — flash + shake + float text).
**Uses:** WAAPI `Element.animate()` and CSS `@keyframes` from STACK.md.
**Avoids:** Pitfall 1 (setTimeout cascade — eliminated), Pitfall 2 (layout thrash — policy of transform/opacity only).
**Research flag:** Needs deeper animation timing research during planning. The interaction between `animationend` events and WAAPI `.finished` promises needs verification against actual browser behavior in this codebase.

### Phase 4: Add ParticleManager + FloatTextManager
**Rationale:** These are additive enhancements that build on the working queue system from Phase 3. They don't require rewriting anything — they slot into the AnimationQueue's step execution switch.
**Delivers:** `ParticleManager.js` (unified rAF loop for projectiles + bursts), `FloatTextManager.js` (queue-based float text with automatic DOM cleanup). Particle bursts on hit, death, block, crit. Enhanced death dissolve animation.
**Addresses:** Hit particles (FEATURES differentiator), Crit explosion (FEATURES differentiator), Death dissolve (FEATURES differentiator), Block/parry sparks (FEATURES differentiator).
**Uses:** DIY ParticleBurst class from STACK.md.
**Avoids:** Pitfall 3 (particle DOM leaks — `ParticleManager.clear()` on screen transitions), Pitfall 4 (over-animation — effect scaling by importance).

### Phase 5: EntityAnimFSM + Safety Polish
**Rationale:** Safety net phase. Once everything else works, add per-entity state machines to prevent animation overlap edge cases (e.g., playing hit animation on a dying entity).
**Delivers:** EntityAnimFSM for each hero and monster. Guards against invalid state transitions.
**Addresses:** Safety polish for all animation features.
**Uses:** EntityAnimFSM pattern from ARCHITECTURE.md.
**Avoids:** Pitfall 4 (over-animation — FSM prevents overlapping animations).

### Phase Ordering Rationale

- **Dependency-driven order:** Phase 1 (extraction) must come first — you can't refactor animation logic until CSS/HTML is in files, not strings. Phase 2 (pure data layer) must precede Phase 3 (replacement) because the queue needs a feed of animation steps. Phase 4 and 5 are additive and can be swapped.
- **Risk mitigation:** The safe refactoring path keeps old functions as fallback through Phase 2. Only Phase 3 actually rewrites existing behavior, and it does so one animation type at a time with `debug` mode logging.
- **Pitfall avoidance:** Each phase specifically targets one of the critical pitfalls from PITFALLS.md. The `setTimeout` cascade (Pitfall 1) is the single biggest source of technical debt and is eliminated in Phase 3. Particle leaks (Pitfall 3) are prevented in Phase 4 by design. Layout thrash (Pitfall 2) is a standing policy across all phases.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (AnimationQueue + DOMRenderer):** Needs verification of `animationend` event behavior against actual CSS `animation-duration` values in this codebase. The interaction between multiple CSS classes on the same element and multiple `animationend` events firing needs testing. WAAPI `.finished` browser edge cases (Firefox) also need validation.
- **Phase 4 (Particles):** Needs verification that screen transition hooks exist and work as expected for `ParticleManager.clear()`. Current code has navigation patterns in web.ts that need audit.

Phases with standard patterns (skip research-phase):
- **Phase 1 (CSS/HTML extraction):** Express static file serving is well-documented. Standard `express.static()` usage.
- **Phase 2 (CombatStore + CombatDiff):** Pure function and subscriber patterns are standard. Well-established in frontend architecture.
- **Phase 5 (EntityAnimFSM):** Finite state machines are a solved pattern. Basic implementation without framework overhead.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MDN documentation, official browser API specs, direct codebase analysis. CSS + WAAPI + DIY particles is well-validated for turn-based games. |
| Features | HIGH | Direct comparison against current codebase behavior. Table stakes are clearly present/missing. Differentiators are opinionated but well-reasoned. |
| Architecture | MEDIUM | State-diff pipeline pattern is synthetically derived from domain knowledge. Not verified against this specific codebase's runtime behavior. The anti-pattern analysis (setTimeout chains, state gating, DOM queries) is HIGH confidence from direct code reading. |
| Pitfalls | HIGH | setTimeout cascade is directly observed in codebase. Layout thrash, DOM leaks, and GSAP licensing are well-documented industry knowledge. Visual noise and hit-stop timing are opinionated but experience-based. |

**Overall confidence:** HIGH — the stack decision is definitive (no external libs), the features are grounded in direct codebase observation, and the pitfalls are either already present in the codebase or well-documented. The architecture confidence is MEDIUM because the pipeline recommendation is synthesized rather than tested, but it's built on sound patterns.

### Gaps to Address

- **WAAPI `.finished` behavior in Firefox:** WAAPI's `.finished` promise resolution timing differs between Chrome and Firefox (Firefox may fire `.finished` before the last frame renders). Mitigation: use the `onfinish` callback as cross-browser fallback or the `sleep()` helper for critical timing. Verify during Phase 3 execution.
- **Current animation timing values:** The exact `animation-duration` values in current CSS (`animate-lunge`, `animate-flash-white`, etc.) need to be documented before Phase 3 refactoring to ensure backward-compatible timing. This is a quick audit task during planning.
- **Screen transition hooks:** The codebase needs a reliable `clear()` call site for `ParticleManager` during screen transitions. The current navigation pattern in `web.ts` needs audit during Phase 4 planning.
- **`prefers-reduced-motion` support:** Should be implemented as a game setting toggle rather than purely a media query, since users may want to disable screen shake independently of OS-level motion preference. Needs UI consideration during Phase 3 or Phase 5.

## Sources

### Primary (HIGH confidence)
- MDN Web Animations API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
- MDN CSS Animations — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations
- MDN Element: animationend event — https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event
- Direct codebase analysis: `apps/server/src/routes/web.ts` (2145 lines) — observed setTimeout chains, CSS class toggle patterns, particle implementation
- Direct codebase analysis: `apps/server/src/services/combat-service.ts` — server-side combat state structure
- web.dev — Animations overview and performance guide

### Secondary (MEDIUM confidence)
- animejs.com — Anime.js v4 documentation (not recommended, but evaluated)
- motion.dev — Motion library documentation (evaluated as alternative)
- tsParticles documentation — https://particles.js.org/ (evaluated as anti-recommendation)
- Domain research on queue-based animation sequencing patterns (synthesized, not codebase-verified)

### Tertiary (LOW confidence)
- Domain research on decoupling game state from animation state (synthesized from general patterns)
- Domain research on hit-stop timing best practices (experience-based recommendation of 60–100ms)

---
*Research completed: 2026-06-24*
*Ready for roadmap: yes*
