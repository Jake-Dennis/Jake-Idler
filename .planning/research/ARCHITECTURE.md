# Architecture Research

**Domain:** Combat animation and UI polish for dark gothic idle RPG (vanilla JS)
**Researched:** 2026-06-24
**Confidence:** MEDIUM (findings synthesized from domain patterns but not verified against this specific codebase's runtime behavior)

## Current Architecture (Problem State)

The existing code at `apps/server/src/routes/web.ts` embeds all HTML, CSS, and JS in a single 2000+ line file served via Express. The animation system is **procedural with fire-and-forget setTimeout chains**:

```
pollCombat (1.5s interval)
    ↓
animateTransition(prevState, state)
    ↓ (per hero)
    playAttackAnimation()       ← setTimeout chain: add class → wait → add hit → wait → remove
    playHealAnimation()         ← setTimeout: add class → wait → remove
    playHitAnimation()          ← setTimeout: add class → wait → remove
    playDeathAnimation()        ← class add only (no cleanup)
    playMonsterDeathAnimation() ← setTimeout chain + particle burst
```

**Problems with current architecture:**
1. No animation queue — all animations fire simultaneously from `animateTransition`, causing overlapping effects
2. `setTimeout` durations are hardcoded and not synchronized with actual CSS `animation-duration`
3. No `animationend` event listeners — cleanup is guessed with timers, causing visual glitches when timers miss
4. Game state and animation state are conflated — `animateTransition` both computes diffs AND plays animations
5. Particle system creates DOM elements that leak if timers misfire
6. No entity-level state machine — every animation is a standalone function, not a state transition

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Server (Express + SQLite)                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     combat-service.ts                            │   │
│  │  Computes rounds → stores state → serves via REST endpoints      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│              REST Poll (1.5s interval): GET /combat/status               │
├─────────────────────────────────────────────────────────────────────────┤
│                        Client Architecture                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       CombatStore                                 │   │
│  │  • Holds raw server state (CombatRoundState)                      │   │
│  │  • Immutable snapshots — prevState / currentState                 │   │
│  │  • Only public method: update(newState) → triggers diff           │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │ store updated                                 │
│                         ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      CombatDiff                                   │   │
│  │  PURE FUNCTION: (prevState, nextState) → AnimationStep[]          │   │
│  │  • Compares hero-by-hero (damage, healing, damageTaken, alive)    │   │
│  │  • Compares monster state (death, new monster, HP changes)        │   │
│  │  • Produces ordered list of steps with parallel/sequential flags  │   │
│  │  • No DOM access, no timing, no side effects                      │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │ steps array                                   │
│                         ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    AnimationQueue                                 │   │
│  │  • Processes AnimationStep[] one-by-one (or parallel batches)     │   │
│  │  • Each step: { type, targetId, sourceId, timing, data }          │   │
│  │  • Waits for animationend event before dequeuing next step        │   │
│  │  • Fallback setTimeout guard (animation-duration + 50ms padding)  │   │
│  │  • Exposes onComplete callback for HP bar updates                 │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │ step dispatched                               │
│                         ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      DOMRenderer                                  │   │
│  │  • Applies CSS classList.add/remove to entity elements            │   │
│  │  • Creates/destroys projectile DOM elements                       │   │
│  │  • Manages the "is-focus" class for targeted monsters             │   │
│  │  • NO setTimeout — listens on animationend for cleanup            │   │
│  └──────┬──────────────────────────────────┬────────────────────────┘   │
│         │                                  │                            │
│         ▼                                  ▼                            │
│  ┌──────────────────┐            ┌──────────────────────┐              │
│  │  FloatTextManager │            │   ParticleManager    │              │
│  │  • Queue of float │            │  • rAF-based projectile │            │
│  │    text items     │            │    animation (arcs)   │              │
│  │  • Creates DOM,   │            │  • Particle burst on  │              │
│  │    auto-removes   │            │    death/explosion    │              │
│  └──────────────────┘            │  • DOM cleanup after  │              │
│                                  │    animation          │              │
│                                  └──────────────────────┘              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      EntityAnimFSM                                │   │
│  │  One per hero + one per monster. Tracks current animation state:  │   │
│  │  IDLE → WINDUP → ATTACK → IMPACT → RECOVERY → IDLE               │   │
│  │  IDLE → HEALING → IDLE                                            │   │
│  │  IDLE → BLOCKING → IDLE                                           │   │
│  │  IDLE → DYING → DEAD                                              │   │
│  │  Prevents overlapping animations on same entity                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CombatStore** | Holds raw server state; exposes `getState()` and `subscribe(callback)` | Singleton object with internal `_state` and `_listeners` array |
| **CombatDiff** | Pure function to diff previous vs current combat state into animation steps | `(prev: CombatRoundState, next: CombatRoundState) => AnimationStep[]` |
| **AnimationQueue** | Manages sequential/parallel execution of animation steps | Class with `_queue: AnimationStep[]`, `process()`, `_advance()` methods |
| **DOMRenderer** | Applies CSS classes, manages entity DOM elements | Stateless module, functions like `applyLunge(entityId)`, `applyFlash(entityId)` |
| **FloatTextManager** | Creates floating damage/heal text that auto-animates and removes | Class with `enqueue(text, x, y, type)` that creates DOM, listens for `animationend` |
| **ParticleManager** | rAF-based projectile arcs and particle explosions | Class with `launchProjectile(from, to, color, isArc)` returning Promise resolves on impact |
| **EntityAnimFSM** | Per-entity finite state machine preventing animation overlap | Class with `state`, `transition(newState)` that guards against invalid transitions |
| **HPBarUpdater** | Instantly updates HP bar widths on state change | Module with `updateHeroBars()`, `updateMonsterBars()` — called immediately, not queued |

## Recommended Project Structure

```
apps/server/src/
├── routes/
│   └── web.ts                    # Routes + HTML shell only (minimal, layout logic)
├── public/                       # NEW: Static client files
│   ├── index.html                # HTML shell (extracted from web.ts)
│   ├── css/
│   │   ├── theme.css             # Dark gothic theme variables, fonts, base styles
│   │   ├── layout.css            # Screen system, cards, buttons, tabs
│   │   ├── combat.css            # Arena layout, entity cards, HP bars
│   │   └── animations.css       # ALL @keyframes definitions (lunge, flash, shake, etc.)
│   └── js/
│       ├── main.js               # Init, Lucide icons, screen routing
│       ├── combat/
│       │   ├── CombatStore.js    # Server state container with subscriber pattern
│       │   ├── CombatDiff.js     # Pure function: prevState → nextState → steps
│       │   ├── AnimationQueue.js # Step sequencer with parallel/sequential modes
│       │   ├── DOMRenderer.js    # CSS class applier + entity DOM management
│       │   ├── FloatTextManager.js # Floating text subsystem
│       │   ├── ParticleManager.js  # rAF projectiles + particle bursts
│       │   └── EntityAnimFSM.js  # Per-entity animation FSM (IDLE/ATTACK/HIT/etc)
│       ├── ui/
│       │   ├── HeroSelect.js     # Hero selection screen logic
│       │   ├── DungeonUI.js      # Dungeon setup, floor select
│       │   ├── EquipmentUI.js    # Equipment screen rendering
│       │   ├── PartyUI.js        # Party management UI
│       │   ├── CombatUI.js       # Combat arena rendering, poll orchestration
│       │   └── OverlayUI.js      # Result overlay, loop UI
│       └── lib/
│           ├── api.js            # fetch wrappers with auth headers
│           ├── state.js          # Global state (hero, token, inventory)
│           ├── utils.js          # escHtml, hpColorClass, formatting
│           └── logger.js         # Combat log entry management
└── services/
    └── combat-service.ts         # (unchanged — server-side round computation)
```

### Structure Rationale

- **`public/`**: Extracting client code from `web.ts` into static files eliminates the embedded string escaping mess. Express serves these as static files. The HTML shell becomes minimal (just renders screen divs, loads script modules).
- **`css/animations.css`**: All `@keyframes` in one file makes animation timing viewable and adjustable without touching JS. Each animation class has a known `animation-duration` that the JS can read via `getComputedStyle()`.
- **`js/combat/`**: Combat animation is the most complex subsystem — it gets its own directory. Each file is a single-responsibility module. No file exceeds 200 lines.
- **`js/ui/`**: Screen-specific UI logic separated from animation logic. CombatUI orchestrates the polling loop and wires CombatStore → CombatDiff → AnimationQueue.
- **`js/lib/`**: Shared utilities that crosscut concerns. No UI or animation logic here.

## Architectural Patterns

### Pattern 1: State Diff → Animation Step Pipeline

**What:** Combat state arrives from server → it's diffed against previous state → the diff produces an ordered list of animation steps → steps are played through a queue.

**When to use:** Any turn-based game where server state arrives as discrete snapshots (REST polling) rather than event streams (WebSocket).

**Trade-offs:**
- (+) Clean separation — diff logic is pure and testable
- (+) Steps are data, not imperative calls — can be logged, replayed, skipped
- (-) More boilerplate than direct `if (h.damage > 0) playAttack()`
- (-) Need to manage parallel vs sequential step dispatching

**Example:**
```javascript
// CombatDiff.js — pure function, no DOM, no timing
export function diffCombatState(prev, next) {
  const steps = [];

  if (!prev?.round || !next?.round) return steps;

  // Hero actions
  for (const h of next.round.partyHeroes) {
    const prevH = prev.round.partyHeroes?.find(p => p.heroId === h.heroId);
    if (!prevH) continue;

    if (h.damage > 0) {
      steps.push({
        type: 'attack',
        targetId: 'hero-' + h.heroId,
        weaponType: h.role === 'mage' ? 'mage' : h.role === 'range' ? 'range' : 'melee',
        parallel: true,  // Heroes attack simultaneously
      });
      steps.push({
        type: 'impact',
        targetId: 'monster',
        text: h.crit ? 'CRIT!' : 'HIT!',
        textClass: h.crit ? 'crit' : 'damage',
        delay: 300,  // Impact slightly after attack starts
        parallel: true,
      });
    }

    if (h.damageTaken > 0) {
      steps.push({
        type: 'hit',
        targetId: 'hero-' + h.heroId,
        damage: Math.round(h.damageTaken),
        isCrit: h.monsterCrit,
        isBlock: h.role === 'tank',
        parallel: true,
      });
    }

    if (!h.alive && prevH.alive) {
      steps.push({
        type: 'death',
        targetId: 'hero-' + h.heroId,
        parallel: false,  // Deaths should not be parallel with other actions
      });
    }
  }

  // Monster events
  if (next.round.monsterJustKilled && !prev.round.monsterJustKilled) {
    steps.push({
      type: 'monsterDeath',
      parallel: false,
    });
  }

  return steps;
}
```

### Pattern 2: Promise-Based Animation Queue

**What:** Each animation is wrapped in a Promise that resolves when the CSS animation ends (via `animationend` event). The queue processes steps by awaiting each promise (or `Promise.all` for parallel steps).

**When to use:** When you need ordered execution of timed visual effects without nested setTimeout pyramids.

**Trade-offs:**
- (+) Eliminates setTimeout timing guesswork — `animationend` fires when CSS actually finishes
- (+) Natural composition with `Promise.all` for parallel actions
- (+) Easy to add timeout fallback: `Promise.race([animationEndPromise, timeoutPromise])`
- (-) Requires `animationend` listener management (must clean up to avoid leaks)
- (-) Promise rejection if element is removed mid-animation

**Example:**
```javascript
// AnimationQueue.js
export class AnimationQueue {
  constructor(domRenderer, floatTextManager, particleManager) {
    this._queue = [];
    this._processing = false;
    this._renderer = domRenderer;
    this._floatText = floatTextManager;
    this._particles = particleManager;
  }

  enqueue(steps) {
    this._queue.push(...steps);
    if (!this._processing) this._process();
  }

  async _process() {
    this._processing = true;
    while (this._queue.length > 0) {
      // Collect parallel batch (consecutive steps with parallel:true)
      const batch = [];
      while (this._queue.length > 0 && this._queue[0].parallel) {
        batch.push(this._queue.shift());
      }
      // If next step is sequential, add just it
      if (this._queue.length > 0 && !this._queue[0].parallel) {
        batch.push(this._queue.shift());
      }

      // Execute batch
      if (batch.length === 1) {
        await this._executeStep(batch[0]);
      } else {
        await Promise.all(batch.map(s => this._executeStep(s)));
      }
    }
    this._processing = false;
  }

  async _executeStep(step) {
    switch (step.type) {
      case 'attack':
        return this._renderer.playLunge(step.targetId);
      case 'impact':
        await this._renderer.playFlash(step.targetId);
        this._floatText.show(step.text, step.targetId, step.textClass);
        break;
      case 'hit':
        await Promise.all([
          this._renderer.playHit(step.targetId),
          this._renderer.playShake(step.targetId),
        ]);
        this._floatText.show('-' + step.damage, step.targetId, 'damage');
        if (step.isBlock) {
          await this._renderer.playShield(step.targetId);
          this._floatText.show('BLOCKED', step.targetId, 'block');
        }
        break;
      case 'death':
        return this._renderer.playDeath(step.targetId);
      case 'monsterDeath':
        await this._renderer.playMonsterDeath();
        this._particles.burst();
        break;
      case 'projectile':
        return this._particles.launchProjectile(step.fromId, step.toId, step.color, step.isArc);
    }
  }
}
```

### Pattern 3: Wait-for-Animation Promise Wrapper

**What:** A reusable function that adds a CSS animation class to an element and returns a Promise that resolves when the `animationend` event fires (with a `setTimeout` fallback guard).

**When to use:** Every time you add a CSS animation class and need to know when it completes.

**Trade-offs:**
- (+) Single source of truth for timing — CSS `animation-duration` drives the wait, not duplicated JS constants
- (+) Handles edge cases (element removed, multiple animations, browser tab hidden)
- (-) Must store and clean up event listeners
- (-) `animationend` doesn't fire if element is `display:none` or removed — setTimeout fallback needed

**Example:**
```javascript
// DOMRenderer.js
export class DOMRenderer {
  animateElement(elId, className, fallbackMs) {
    return new Promise((resolve) => {
      const el = document.getElementById(elId);
      if (!el) { resolve(); return; }

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        el.classList.remove(className);
        el.removeEventListener('animationend', onEnd);
        clearTimeout(fallbackTimer);
        resolve();
      };

      const onEnd = (e) => {
        if (e.animationName === className.replace('animate-', '')) {
          finish();
        }
      };

      el.addEventListener('animationend', onEnd);
      const fallbackTimer = setTimeout(finish, fallbackMs || 1000);

      // Force reflow then add class
      void el.offsetWidth;
      el.classList.add(className);
    });
  }

  async playLunge(heroId) {
    return this.animateElement(heroId, 'animate-lunge', 800);
  }

  async playFlash(targetId) {
    return this.animateElement(targetId, 'animate-flash-white', 400);
  }

  async playHit(heroId) {
    return this.animateElement(heroId, 'animate-flash-red', 450);
  }

  async playDeath(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.add('animate-fade-out');
    // Death doesn't remove class — entity stays faded out
    return new Promise(resolve => {
      el.addEventListener('animationend', () => {
        el.style.display = 'none';
        resolve();
      }, { once: true });
      setTimeout(resolve, 700);
    });
  }
}
```

## Data Flow

### Combat Poll → Animation Playback

```
pollCombat() → fetch GET /combat/status
    ↓
CombatStore.update(newState)
    ↓
CombatStore notifies subscribers
    ↓
CombatDiff(prevState, newState) → AnimationStep[]
    ↓
AnimationQueue.enqueue(steps)
    ↓
AnimationQueue._process() → Promise loop
    ↓ (per step)
DOMRenderer.playLunge(id)      ──→ CSS class add → animationend → class remove
FloatTextManager.show("-42")   ──→ DOM create → CSS animation → animationend → DOM remove
ParticleManager.launchProjectile ──→ rAF loop (style.left/style.top) → DOM remove
    ↓
HPBarUpdater.updateHeroBars()  ← Called immediately on state update (not queued)
HPBarUpdater.updateMonsterBars() ← Called immediately on state update (not queued)
```

### State Management

```
Game State (server authoritative, immutable snapshots):
  CombatStore._state = {
    round: CombatRoundState,
    monsters: Monster[],
    finished: boolean,
    ...
  }

Animation State (per-entity, transient):
  EntityAnimFSM._states = Map<entityId, {
    current: 'idle' | 'attacking' | 'hit' | 'healing' | 'blocking' | 'dying' | 'dead',
    since: timestamp,
  }>

DOM State (visual, derived):
  Element.classList reflects animation state
  Element.style.width reflects HP %
  Projectile/float DOM elements are ephemeral
```

### Key Data Flows

1. **Combat state update flow:** Server → REST poll → CombatStore.update() → diff → steps → queue → renderer → DOM
2. **HP bar update flow:** CombatStore.update() → immediate HPBarUpdater (skips queue, must be instant)
3. **Monster transition flow:** `monsterJustKilled` step → death animation → queue callback triggers renderMonsters() with new lineup
4. **Round completion flow:** All steps drained from queue → check `state.finished` → showResult overlay

## Event Flow for a Single Round

```
1. pollCombat() fires (1.5s timer)
2. Response: round 5, hero deals 42 damage, monster deals 15 damage to tank
3. CombatDiff produces:
   [
     { type: 'attack', targetId: 'hero-1', weaponType: 'melee', parallel: true },
     { type: 'impact', targetId: 'monster', text: 'HIT!', textClass: 'damage', delay: 300, parallel: true },
     { type: 'hit', targetId: 'hero-1', damage: 15, isBlock: true, parallel: true },
   ]
4. AnimationQueue processes all three in parallel (all marked parallel:true):
   → hero-1 gets animate-lunge class
   → hero-1 gets animate-flash-red + animate-shake classes
   → hero-1 gets animate-shield class
5. After 300ms (impact from attack):
   → monster gets animate-flash-white class
   → float text "HIT!" appears on monster
6. Each entity's animationend fires independently:
   → hero-1's lunge ends → animate-lunge removed
   → hero-1's hit ends → animate-flash-red + animate-shake removed
   → hero-1's shield ends → animate-shield removed
   → monster's flash ends → animate-flash-white removed
7. All parallel promises resolve → queue drains
8. HPBarUpdater.updateHeroBars() and updateMonsterBars() called (already happened on step 3)
9. Next poll fires
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (single-player) | Architecture as described is fine — single CombatStore, single AnimationQueue, synchronous classList operations |
| 10+ simultaneous battles | Each battle instance gets its own CombatStore + AnimationQueue + DOMRenderer trio. They don't share state. The polling interval spreads naturally since each battle has its own interval timer. |
| 100+ simultaneous battles | Same as above, but monitor JS thread. The main bottleneck would be DOM operations during batch animation processing. Consider virtual rendering (only animate entities in viewport) or canvas rendering for particles at scale. |

### Scaling Priorities

1. **First bottleneck:** `requestAnimationFrame` for projectile arcs — each projectile has its own rAF loop. At 10+ simultaneous projectiles, this can cause frame drops. Fix: share a single rAF loop in ParticleManager that updates all active projectiles per frame.
2. **Second bottleneck:** DOM garbage from particle bursts — each death creates 12 spark DOM elements. After hundreds of rounds, DOM fragments accumulate. Fix: pool/reuse particle DOM elements instead of creating + removing.

## Anti-Patterns

### Anti-Pattern 1: setTimeout Chain Synchronization

**What people do:** Nested `setTimeout` calls to coordinate animation sequences, with hardcoded millisecond durations that must match CSS `animation-duration` values.

**What the current code does:**
```javascript
// CURRENT (problematic)
heroEl.classList.add('animate-lunge');
setTimeout(function() {
  monsterEl.classList.add('animate-flash-white');
  setTimeout(function() {
    monsterEl.classList.remove('animate-flash-white');
    heroEl.classList.remove('animate-lunge');
  }, 400);
}, 330);
```

**Why it's wrong:**
- Durations are duplicated from CSS (750ms lunge, 350ms flash, etc.) — when CSS changes, JS breaks silently
- If the browser lags or the animation is interrupted, `animationend` never fires but setTimeout still does, applying stale state
- Nested callbacks don't compose — adding "wait for lunge to finish before starting projectile" requires another nesting level
- No way to cancel or skip an in-progress animation sequence

**Do this instead:** Use `animationend` event + Promise-based queue as shown in Pattern 2 & 3 above. The CSS `animation-duration` property is the single source of truth for timing.

### Anti-Pattern 2: Animating Game State Dependencies

**What people do:** Blocking game state updates until animations finish, e.g., "don't update HP bar until hit animation completes" or "don't allow next poll to render until current animation queue is empty."

**Why it's wrong:** The server has already computed the result. If the player tab is backgrounded, `animationend` events may be delayed or suppressed (browsers throttle animations in hidden tabs). The game state and HP values should always reflect the true server state, not the visual animation state. Delaying state updates makes the game feel sluggish and can cause desync if the player switches tabs.

**Do this instead:** Update game state and HP bars **immediately** on poll response. Animations are a visual effect playing on top of the true state — they don't gate state updates. Use CSS `animation-fill-mode: forwards` to keep the visual state consistent during animation, but the numeric state (HP values, alive/dead) is always current.

### Anti-Pattern 3: Global Animation Functions with DOM Queries

**What people do:** Functions like `playAttackAnimation(weaponType, heroId)` that internally query the DOM (`document.getElementById`, `document.querySelector`) and make assumptions about DOM structure (`.monster-card.is-focus`).

**Why it's wrong:** Ties animation logic to specific DOM structure. If `.monster-card.is-focus` changes to `.monster-card.active` or monster rendering changes from cards to rows, animation functions break silently. Also, querying the DOM in every animation call is wasteful since entity references can be cached.

**Do this instead:** Pass entity element references explicitly, or use a DOM renderer that maintains an entity reference map. The DOMRenderer should be the only module that queries the DOM — animation functions receive element references or IDs, not selectors.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CombatStore → AnimationQueue | `subscribe(callback)` — CombatStore invokes callback when state updates | Callback receives `(prevState, newState)` — AnimationQueue is NOT gated on this; it processes asynchronously |
| CombatDiff → AnimationQueue | Returns `AnimationStep[]` — no shared state | CombatDiff is a pure function called synchronously by the subscription handler |
| AnimationQueue → DOMRenderer | Method calls with entity IDs and animation params: `playLunge('hero-1')` | Returns Promise<void> — queue awaits before processing next batch |
| AnimationQueue → FloatTextManager | Method call: `show(text, entityId, type)` | Fire-and-forget — FloatTextManager manages its own DOM lifecycle |
| AnimationQueue → ParticleManager | Method call: `launchProjectile(fromId, toId, color, isArc)` | Returns Promise<void> that resolves on impact — queue can await or fire-and-forget |
| pollCombat → CombatStore | Direct assignment: `combatStore.update(response)` | Called from CombatUI's setInterval callback |
| HPBarUpdater → DOM | Direct style mutations: `el.style.width = pct + '%'` | Called immediately, not queued — never blocked by animation |

### CombatStore API Contract

```javascript
// CombatStore.js — Interface
class CombatStore {
  getState(): CombatSnapshot | null;
  update(newState: CombatSnapshot): void;
  subscribe(callback: (prev: CombatSnapshot | null, next: CombatSnapshot) => void): () => void;
  // Returns unsubscribe function
}

// CombatSnapshot — shape of server response
{
  round: CombatRoundState | null,
  monsters: Monster[],
  finished: boolean,
  floorCompleted: boolean,
  hero: HeroSnapshot,
  result: FloorResult,
}

// AnimationStep — output of CombatDiff
{
  type: 'attack' | 'impact' | 'hit' | 'heal' | 'block' | 'death' | 'monsterDeath' | 'projectile',
  targetId: string,       // DOM element ID
  sourceId?: string,      // Source entity ID (for projectiles)
  parallel: boolean,      // Can play simultaneously with other steps
  delay?: number,         // ms delay before playing (for staggered effects)
  data?: {                // Type-specific payload
    damage?: number,
    text?: string,
    textClass?: string,
    color?: string,
    isArc?: boolean,
    isCrit?: boolean,
    isBlock?: boolean,
  },
}
```

## Build Order Implications

The architecture suggests a phased refactoring approach:

### Phase 1: Extract + Isolate (No behavioral change)
- Extract CSS from `web.ts` into `public/css/animations.css`, `theme.css`, `combat.css`, `layout.css`
- Extract HTML into `public/index.html` with screen divs
- Serve `public/` as static files
- JS stays in `web.ts` for now — this is purely a CSS/HTML extraction
- **Why first:** Zero behavioral risk, immediately simplifies the 2000+ line file

### Phase 2: Build CombatStore + CombatDiff (New pure modules)
- Implement `CombatStore.js` (singleton, subscriber pattern)
- Implement `CombatDiff.js` (pure function that produces `AnimationStep[]`)
- These are side-effect-free modules that can be tested without the DOM
- **Why second:** They don't require rewriting any existing animation code; they sit alongside it

### Phase 3: Build AnimationQueue + DOMRenderer (Replace setTimeout chains)
- Implement `AnimationQueue.js` (Promise-based step processor)
- Implement `DOMRenderer.js` (animationend-based class toggling)
- Rewrite `playAttackAnimation`, `playHitAnimation`, etc. as DOMRenderer methods
- Replace `animateTransition` body with: `combatDiff()` → `animationQueue.enqueue()`
- **Why third:** The core animation replacement — highest risk, needs careful testing

### Phase 4: ParticleManager + FloatTextManager
- Implement `ParticleManager.js` (unified rAF loop for all projectiles)
- Implement `FloatTextManager.js` (queue-based float text with pooling)
- Replace inline projectile/floating text code in old functions
- **Why fourth:** These are additive enhancements on top of the working queue system

### Phase 5: EntityAnimFSM (Polish + Safety)
- Implement per-entity FSM
- Add guards to prevent animation overlap (e.g., don't play hit animation on a dying entity)
- **Why last:** Safety net once everything else works — prevents edge case glitches

## Sources

- MDN: [Using CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations) — confidence HIGH (official docs)
- MDN: [Element: animationend event](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event) — confidence HIGH (official docs)
- Domain research (websearch): Combat animation architecture for vanilla JS idle RPGs — confidence LOW (synthesized from patterns, not verified against this specific codebase)
- Domain research (websearch): Queue-based animation sequencing patterns — confidence LOW (synthesized from patterns)
- Domain research (websearch): Decoupling game state from animation state — confidence LOW (synthesized from patterns)
- Existing codebase analysis: `apps/server/src/routes/web.ts` (2145 lines) — confidence HIGH (direct observation)
- Existing codebase analysis: `apps/server/src/services/combat-service.ts` — confidence HIGH (direct observation)

---
*Architecture research for: Jake Idler — Combat animation and UI polish*
*Researched: 2026-06-24*
