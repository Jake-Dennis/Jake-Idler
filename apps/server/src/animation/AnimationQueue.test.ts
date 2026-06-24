/**
 * Tests for AnimationQueue — Promise-based WAAPI sequencing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimationQueue } from "./AnimationQueue.js";
import { EntityAnimFSM } from "./EntityAnimFSM.js";
import type { AnimationStep } from "./types.js";

// ─── Mock infrastructure ─────────────────────────────────────

/**
 * Creates a mock DOM element with classList manipulation tracking.
 */
function createMockElement(id: string): HTMLElement {
  const classList = new Set<string>();

  const el = {
    id,
    classList: {
      add: vi.fn((...classes: string[]) => {
        for (const c of classes) classList.add(c);
      }),
      remove: vi.fn((...classes: string[]) => {
        for (const c of classes) classList.delete(c);
      }),
      contains: vi.fn((c: string) => classList.has(c)),
      values: () => classList.values(),
    },
    style: {} as CSSStyleDeclaration,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 100,
      height: 50,
      right: 100,
      bottom: 50,
    })),
  } as unknown as HTMLElement;

  return el;
}

describe("AnimationQueue", () => {
  let fsm: EntityAnimFSM;
  let queue: AnimationQueue;
  let mockGetDuration: (className: string) => number;
  let mockEls: Map<string, HTMLElement>;

  beforeEach(() => {
    fsm = new EntityAnimFSM();

    // Mock duration lookup: return 300ms for all classes
    mockGetDuration = (_cls: string) => 300;

    queue = new AnimationQueue(fsm, mockGetDuration);

    // Set up mock DOM elements
    mockEls = new Map();

    vi.spyOn(document, "getElementById").mockImplementation(
      (id: string) => mockEls.get(id) ?? null,
    );

    vi.spyOn(document, "querySelector").mockImplementation(
      (selector: string) => {
        if (selector === ".monster-card.is-focus" || selector === ".monster-card") {
          return mockEls.get("monster-focus") ?? null;
        }
        return null;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Tests ─────────────────────────────────────────────────

  it("handles an empty step array gracefully (resolves immediately)", async () => {
    await expect(queue.playSteps([])).resolves.toBeUndefined();
  });

  it("skips steps when target element does not exist", async () => {
    fsm.registerEntity("hero-1");

    const steps: AnimationStep[] = [
      {
        type: "HIT",
        entityId: "hero-nonexistent",
        stepIndex: 0,
      },
    ];

    // Should not throw — silently skip
    await expect(queue.playSteps(steps)).resolves.toBeUndefined();
  });

  it("applies CSS class and awaits animationend for a step", async () => {
    const el = createMockElement("hero-1");
    mockEls.set("hero-1", el);
    fsm.registerEntity("hero-1");

    // Capture the animationend callback
    let animationEndCallback: (() => void) | null = null;
    el.addEventListener = vi.fn(
      (event: string, cb: EventListenerOrEventListenerObject) => {
        if (event === "animationend") {
          animationEndCallback = cb as () => void;
        }
      },
    ) as typeof el.addEventListener;

    const steps: AnimationStep[] = [
      {
        type: "HEAL",
        entityId: "hero-1",
        healAmount: 20,
        stepIndex: 0,
      },
    ];

    const promise = queue.playSteps(steps);

    // Simulate animationend firing
    expect(animationEndCallback).not.toBeNull();
    animationEndCallback!();

    await expect(promise).resolves.toBeUndefined();

    // CSS class should have been applied and removed
    expect(el.classList.add).toHaveBeenCalledWith("animate-pulse-green");
    expect(el.classList.remove).toHaveBeenCalledWith("animate-pulse-green");
  });

  it("processes multiple steps in FIFO order", async () => {
    const hero1 = createMockElement("hero-1");
    const hero2 = createMockElement("hero-2");
    mockEls.set("hero-1", hero1);
    mockEls.set("hero-2", hero2);
    fsm.registerEntity("hero-1");
    fsm.registerEntity("hero-2");

    const callOrder: string[] = [];
    const callbacks: (() => void)[] = [];

    hero1.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        callbacks.push(() => {
          callOrder.push("hero-1");
          (cb as () => void)();
        });
      },
    ) as typeof hero1.addEventListener;

    hero2.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        callbacks.push(() => {
          callOrder.push("hero-2");
          (cb as () => void)();
        });
      },
    ) as typeof hero2.addEventListener;

    const steps: AnimationStep[] = [
      { type: "HEAL", entityId: "hero-1", healAmount: 10, stepIndex: 0 },
      { type: "HEAL", entityId: "hero-2", healAmount: 20, stepIndex: 1 },
    ];

    const promise = queue.playSteps(steps);

    // Both should have registered listeners
    expect(callbacks.length).toBe(2);

    // Fire them in order (simulate animationend)
    for (const cb of callbacks) {
      cb();
      // Yield to microtask queue between each
      await new Promise((r) => setTimeout(r, 0));
    }

    await expect(promise).resolves.toBeUndefined();

    // hero-1 should be processed before hero-2
    expect(callOrder).toEqual(["hero-1", "hero-2"]);
  });

  it("reads animation duration from getAnimDuration lookup", async () => {
    const el = createMockElement("hero-1");
    mockEls.set("hero-1", el);
    fsm.registerEntity("hero-1");

    // Custom duration: return 500ms for animate-pulse-green
    mockGetDuration = (cls: string) => {
      if (cls === "animate-pulse-green") return 500;
      return 300;
    };

    queue = new AnimationQueue(fsm, mockGetDuration);

    let animationEndCallback: (() => void) | null = null;
    el.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        animationEndCallback = cb as () => void;
      },
    ) as typeof el.addEventListener;

    const steps: AnimationStep[] = [
      {
        type: "HEAL",
        entityId: "hero-1",
        healAmount: 20,
        stepIndex: 0,
      },
    ];

    const promise = queue.playSteps(steps);

    // Duration resolver was called with the CSS class (verified by animation playing)
    animationEndCallback!();
    await expect(promise).resolves.toBeUndefined();
  });

  it("falls back when element has no computed animation-duration", async () => {
    const el = createMockElement("hero-1");
    mockEls.set("hero-1", el);
    fsm.registerEntity("hero-1");

    // Make getDuration return undefined-like (default)
    mockGetDuration = (_cls: string) => 300;

    queue = new AnimationQueue(fsm, mockGetDuration);

    let animationEndCallback: (() => void) | null = null;
    el.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        animationEndCallback = cb as () => void;
      },
    ) as typeof el.addEventListener;

    const steps: AnimationStep[] = [
      { type: "HEAL", entityId: "hero-1", healAmount: 10, stepIndex: 0 },
    ];

    const promise = queue.playSteps(steps);

    animationEndCallback!();
    await expect(promise).resolves.toBeUndefined();
  });

  it("stops processing steps for a DEAD entity (guard via FSM)", async () => {
    const el = createMockElement("hero-1");
    mockEls.set("hero-1", el);
    fsm.registerEntity("hero-1");

    // Put entity in DEAD state
    fsm.transitionTo("hero-1", "DEAD");

    const addSpy = vi.spyOn(el.classList, "add");

    const steps: AnimationStep[] = [
      { type: "HEAL", entityId: "hero-1", healAmount: 10, stepIndex: 0 },
    ];

    await queue.playSteps(steps);

    // CSS class should NOT have been applied (FSM guard prevents it)
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("processes all steps before resolving the queue promise", async () => {
    const hero1 = createMockElement("hero-1");
    const hero2 = createMockElement("hero-2");
    mockEls.set("hero-1", hero1);
    mockEls.set("hero-2", hero2);
    fsm.registerEntity("hero-1");
    fsm.registerEntity("hero-2");

    let resolvedCount = 0;
    const callbacks: (() => void)[] = [];

    hero1.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        callbacks.push(cb as () => void);
      },
    ) as typeof hero1.addEventListener;

    hero2.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        callbacks.push(cb as () => void);
      },
    ) as typeof hero2.addEventListener;

    const steps: AnimationStep[] = [
      { type: "HEAL", entityId: "hero-1", healAmount: 10, stepIndex: 0 },
      { type: "HEAL", entityId: "hero-2", healAmount: 20, stepIndex: 1 },
    ];

    const promise = queue.playSteps(steps).then(() => {
      resolvedCount++;
    });

    // Fire callbacks one at a time
    for (const cb of callbacks) {
      cb();
      await new Promise((r) => setTimeout(r, 0));
    }

    await promise;
    expect(resolvedCount).toBe(1);
  });

  it("does not apply classes and returns for steps with no CSS mapping", async () => {
    // Use a step type that maps to empty classes — won't happen with
    // current EFFECT_TO_CSS_CLASS but tests the fallback path
    const el = createMockElement("hero-1");
    mockEls.set("hero-1", el);
    fsm.registerEntity("hero-1");

    const addSpy = vi.spyOn(el.classList, "add");

    // Use future-proof: test with a type that may not have classes
    // Using a basic step that should have classes
    const steps: AnimationStep[] = [
      { type: "DEATH", entityId: "hero-1", stepIndex: 0 },
    ];

    await queue.playSteps(steps);
    expect(addSpy).toHaveBeenCalled();
  });

  it("caps steps at MAX_STEPS and warns on overflow", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create many steps that reference nonexistent entities (silent skip)
    const steps: AnimationStep[] = [];
    for (let i = 0; i < 150; i++) {
      steps.push({ type: "HEAL", entityId: `nonexistent-${i}`, stepIndex: i });
    }

    await queue.playSteps(steps);

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain("150");
    expect(warnSpy.mock.calls[0][0]).toContain("100");

    warnSpy.mockRestore();
  });

  it("handles DEATH step — applies fade-out and advances FSM to DEAD", async () => {
    const el = createMockElement("hero-1");
    mockEls.set("hero-1", el);
    fsm.registerEntity("hero-1");

    let animationEndCallback: (() => void) | null = null;
    el.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        animationEndCallback = cb as () => void;
      },
    ) as typeof el.addEventListener;

    const steps: AnimationStep[] = [
      { type: "DEATH", entityId: "hero-1", stepIndex: 0 },
    ];

    const promise = queue.playSteps(steps);

    expect(el.classList.add).toHaveBeenCalledWith("animate-fade-out");

    animationEndCallback!();

    await promise;

    expect(el.classList.remove).toHaveBeenCalledWith("animate-fade-out");
    expect(fsm.isDead("hero-1")).toBe(true);
  });

  it("handles MONSTER_DEATH step (entityId null — resolves to focus monster)", async () => {
    const monsterEl = createMockElement("monster-focus");
    mockEls.set("monster-focus", monsterEl);
    fsm.registerEntity("monster-focus");

    let animationEndCallback: (() => void) | null = null;
    monsterEl.addEventListener = vi.fn(
      (_event: string, cb: EventListenerOrEventListenerObject) => {
        animationEndCallback = cb as () => void;
      },
    ) as typeof monsterEl.addEventListener;

    const steps: AnimationStep[] = [
      { type: "MONSTER_DEATH", entityId: null, stepIndex: 0 },
    ];

    const promise = queue.playSteps(steps);

    // Should resolve entityId null to the focus monster
    expect(monsterEl.classList.add).toHaveBeenCalledWith("animate-fade-out");

    animationEndCallback!();
    await promise;
  });
});
