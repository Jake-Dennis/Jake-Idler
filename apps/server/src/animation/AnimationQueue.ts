/**
 * AnimationQueue — Promise-based queue for playing AnimationStep[] via WAAPI.
 *
 * Processes animation steps sequentially (FIFO). Each step:
 * 1. Checks FSM guard (canTransition) — skips if entity is busy/dead
 * 2. Locks entity state via FSM.transitionTo
 * 3. Applies CSS animation class(es) to the target DOM element
 * 4. Awaits animationend (or timeout fallback for tab throttling)
 * 5. Removes CSS class(es) and advances FSM to RECOVERY/IDLE
 *
 * Per D-03: Replaces all setTimeout chains with WAAPI animation.finished
 * promises + async/await. setTimeout only used as 2s tab-throttling fallback.
 *
 * Per D-04: Animation durations read from CSS via getComputedStyle.
 * No hardcoded magic numbers.
 *
 * @module animation/AnimationQueue
 */

import type { AnimationStep, AnimEntityState } from "./types.js";
import { EFFECT_TO_CSS_CLASS, EFFECT_TO_FSM_STATE } from "./types.js";
import { EntityAnimFSM } from "./EntityAnimFSM.js";

/** Maximum steps allowed in a single playSteps call (DoS guard per T-02-02). */
const MAX_STEPS = 100;

/** Default fallback duration when getComputedStyle returns a non-parseable value. */
const DEFAULT_DURATION_MS = 300;

/** Extra time added to animation-duration for the timeout guard (tab throttling). */
const TIMEOUT_GUARD_MS = 500;

/**
 * Resolve the animation-duration for a given CSS class name using
 * getComputedStyle on a temporary element. Results are cached per class.
 *
 * @param className - CSS class name (without leading dot)
 * @returns Duration in milliseconds
 */
const durationCache = new Map<string, number>();

function resolveAnimationDuration(className: string): number {
  const cached = durationCache.get(className);
  if (cached !== undefined) return cached;

  // Create temporary off-screen element to read computed style
  const el = document.createElement("div");
  el.className = className;
  el.style.position = "absolute";
  el.style.left = "-9999px";
  el.style.top = "-9999px";
  el.style.width = "1px";
  el.style.height = "1px";
  document.body.appendChild(el);

  let durationMs = DEFAULT_DURATION_MS;

  try {
    const cs = getComputedStyle(el);
    const raw = cs.animationDuration;

    if (raw && typeof raw === "string") {
      const parsed = parseDuration(raw);
      if (parsed !== null) {
        durationMs = parsed;
      }
    }
  } catch {
    // Silently fall back to default
  } finally {
    document.body.removeChild(el);
  }

  durationCache.set(className, durationMs);
  return durationMs;
}

/**
 * Parse a CSS duration string like "0.4s" or "400ms" to milliseconds.
 *
 * @param raw - CSS duration string
 * @returns Milliseconds or null if unparseable
 */
function parseDuration(raw: string): number | null {
  const s = raw.trim();

  if (s.endsWith("ms")) {
    const val = parseFloat(s.slice(0, -2));
    return isNaN(val) ? null : val;
  }

  if (s.endsWith("s")) {
    const val = parseFloat(s.slice(0, -1));
    return isNaN(val) ? null : val * 1000;
  }

  // Try plain number (treat as seconds)
  const val = parseFloat(s);
  return isNaN(val) ? null : val * 1000;
}

/**
 * Promise-based animation queue that processes AnimationStep[] sequentially.
 *
 * Each step is played via CSS class attachment + animationend event,
 * with a timeout fallback guard for browser tab throttling.
 */
export class AnimationQueue {
  private fsm: EntityAnimFSM;
  private getAnimDuration: (className: string) => number;

  /**
   * @param fsm - Reference to an EntityAnimFSM instance for state guards
   * @param getAnimDuration - Injectable duration lookup (default reads CSS animation-duration via getComputedStyle)
   */
  constructor(
    fsm: EntityAnimFSM,
    getAnimDuration?: (className: string) => number,
  ) {
    this.fsm = fsm;
    this.getAnimDuration = getAnimDuration ?? resolveAnimationDuration;
  }

  /**
   * Process an array of animation steps sequentially.
   *
   * Steps that cannot transition (entity busy/dead) are silently skipped.
   * The queue rejects if the total exceeds MAX_STEPS.
   *
   * @param steps - Ordered AnimationStep[] to play
   */
  async playSteps(steps: AnimationStep[]): Promise<void> {
    if (steps.length === 0) return;

    // DoS guard: cap at MAX_STEPS
    const capped = steps.length > MAX_STEPS ? steps.slice(0, MAX_STEPS) : steps;
    if (steps.length > MAX_STEPS) {
      console.warn(
        `[AnimationQueue] Step count (${steps.length}) exceeds max (${MAX_STEPS}). Truncating to ${MAX_STEPS}.`,
      );
    }

    for (const step of capped) {
      await this.playStep(step);
    }
  }

  /**
   * Play a single animation step.
   *
   * @param step - The animation step to execute
   */
  private async playStep(step: AnimationStep): Promise<void> {
    // Resolve target element
    const el = this.resolveElement(step);
    if (!el) {
      // Element not found — skip silently (entity may have left DOM)
      return;
    }

    // Resolve target FSM state from step type
    const targetState = EFFECT_TO_FSM_STATE[step.type];
    const entityId = this.ensureEntityId(step);

    // Guard: check FSM allows this transition
    if (!this.fsm.canTransition(entityId, targetState)) {
      // Entity is busy or dead — skip step
      return;
    }

    // Lock entity state
    this.fsm.transitionTo(entityId, targetState);

    // Get CSS classes for this effect
    const classNames = EFFECT_TO_CSS_CLASS[step.type];
    if (!classNames || classNames.length === 0) {
      // No CSS class defined — just advance FSM without visual
      this.fsm.transitionTo(entityId, "RECOVERY");
      this.fsm.transitionTo(entityId, "IDLE");
      return;
    }

    // Determine effective animation duration from the primary CSS class
    const primaryClass = classNames[0];
    const durationMs = this.getAnimDuration(primaryClass);

    // Apply CSS classes
    el.classList.add(...classNames);

    // Await animation completion (with timeout fallback)
    await this.awaitAnimationEnd(el, durationMs);

    // Remove CSS classes
    el.classList.remove(...classNames);

    // Advance FSM: DEAD is terminal, otherwise go IDLE via RECOVERY
    if (targetState === "DEAD") {
      // Stay in DEAD — no further transitions needed
    } else if (targetState === "ATTACKING") {
      this.fsm.transitionTo(entityId, "IMPACT");
      this.fsm.transitionTo(entityId, "RECOVERY");
      this.fsm.transitionTo(entityId, "IDLE");
    } else {
      this.fsm.transitionTo(entityId, "RECOVERY");
      this.fsm.transitionTo(entityId, "IDLE");
    }
  }

  /**
   * Await the animationend event on an element, with a timeout fallback
   * for browser tab throttling (per D-03).
   *
   * @param el - The DOM element with the animation
   * @param durationMs - Expected animation duration in milliseconds
   * @returns Promise that resolves when animation ends or timeout fires
   */
  private awaitAnimationEnd(
    el: Element,
    durationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;

      const onEnd = (): void => {
        if (!resolved) {
          resolved = true;
          el.removeEventListener("animationend", onEnd);
          resolve();
        }
      };

      el.addEventListener("animationend", onEnd, { once: true });

      // Timeout guard: if animationend doesn't fire within expected time + buffer
      // (e.g. tab is backgrounded and browser throttles animations)
      const timeoutMs = durationMs + TIMEOUT_GUARD_MS;
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          el.removeEventListener("animationend", onEnd);
          resolve();
        }
      }, timeoutMs);
    });
  }

  /**
   * Resolve the DOM element for a step's target entity.
   *
   * @param step - Animation step
   * @returns The target Element or null if not found
   */
  private resolveElement(step: AnimationStep): Element | null {
    const id = this.ensureEntityId(step);
    return document.getElementById(id);
  }

  /**
   * Ensure every step has a usable entityId. For steps with entityId === null
   * (monster-global effects), resolve to the focus monster card's ID.
   *
   * @param step - Animation step
   * @returns A concrete entityId string
   */
  private ensureEntityId(step: AnimationStep): string {
    if (step.entityId !== null) return step.entityId;

    // For monster-global effects, resolve to the focus monster card
    const focusCard = document.querySelector(
      ".monster-card.is-focus",
    ) as HTMLElement | null;
    if (focusCard?.id) return focusCard.id;

    // Fallback: first monster card
    const firstCard = document.querySelector(
      ".monster-card",
    ) as HTMLElement | null;
    if (firstCard?.id) return firstCard.id;

    // Last resort sentinel
    return "monster-focus";
  }

  /**
   * Clear the CSS duration cache. Useful when CSS changes at runtime.
   */
  static clearDurationCache(): void {
    durationCache.clear();
  }

  /**
   * Get the maximum steps allowed per playSteps call.
   */
  static get MAX_STEPS(): number {
    return MAX_STEPS;
  }
}
