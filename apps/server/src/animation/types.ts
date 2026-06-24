/**
 * Shared type definitions for the animation pipeline.
 *
 * These types form the contract between CombatDiff (pure state diffing),
 * AnimationQueue (WAAPI-based playback), and EntityAnimFSM (per-entity
 * state machine). No DOM or side-effect dependencies.
 *
 * @module animation/types
 */

/** The type of combat effect that occurred during a round. */
export type CombatEffectType =
  | "ATTACK"
  | "HIT"
  | "HEAL"
  | "BLOCK"
  | "DEATH"
  | "MONSTER_DEATH"
  | "MONSTER_APPEAR";

/**
 * A single animation step produced by CombatDiff and consumed by AnimationQueue.
 *
 * Steps are ordered by `stepIndex` which preserves round-logic sequence
 * (attacks before heals before deaths).
 */
export interface AnimationStep {
  /** The type of combat effect (determines which CSS animation class plays). */
  type: CombatEffectType;

  /**
   * Target entity ID (e.g. "hero-<uuid>") or `null` for monster-global effects.
   * When null, AnimationQueue resolves to `.monster-card.is-focus`.
   */
  entityId: string | null;

  /** The weapon type used for ATTACK steps (melee / mage / range). */
  weaponType?: "melee" | "mage" | "range";

  /** Raw damage number (for HIT / ATTACK / BLOCK steps). */
  damage?: number;

  /** Healing amount (for HEAL steps). */
  healAmount?: number;

  /** Whether this attack was a critical hit. */
  isCrit?: boolean;

  /**
   * CSS animation duration in milliseconds.
   * Populated externally by AnimationQueue via `getComputedStyle`.
   */
  cssDurationMs?: number;

  /** Sequential ordering index within a round. Assigned by CombatDiff. */
  stepIndex: number;
}

/**
 * Per-entity animation state machine states.
 *
 * States follow the lifecycle:
 *   IDLE → ATTACKING → IMPACT → RECOVERY → IDLE
 *
 * DEAD can interrupt ATTACKING, IMPACT, or RECOVERY at any time.
 * DEAD → IDLE is allowed for respawn/reset.
 */
export type AnimEntityState =
  | "IDLE"
  | "ATTACKING"
  | "IMPACT"
  | "RECOVERY"
  | "DEAD";

/** Describes a single transition between two FSM states. */
export interface FsmTransition {
  from: AnimEntityState;
  to: AnimEntityState;
}

/**
 * Ordered list of FSM states for iteration / display.
 * Follows the natural lifecycle loop order.
 */
export const FSM_STATE_ORDER: readonly AnimEntityState[] = [
  "IDLE",
  "ATTACKING",
  "IMPACT",
  "RECOVERY",
  "DEAD",
] as const;

/**
 * Mapping from CombatEffectType to the target FSM state the entity
 * should transition to before the animation plays.
 */
export const EFFECT_TO_FSM_STATE: Record<CombatEffectType, AnimEntityState> = {
  ATTACK: "ATTACKING",
  HIT: "IMPACT",
  HEAL: "RECOVERY",
  BLOCK: "RECOVERY",
  DEATH: "DEAD",
  MONSTER_DEATH: "DEAD",
  MONSTER_APPEAR: "IDLE",
};

/**
 * Mapping from CombatEffectType to the CSS class(es) applied to the target element.
 */
export const EFFECT_TO_CSS_CLASS: Record<CombatEffectType, string[]> = {
  ATTACK: ["animate-lunge", "animate-windup"],
  HIT: ["animate-flash-red", "animate-shake"],
  HEAL: ["animate-pulse-green"],
  BLOCK: ["animate-shield"],
  DEATH: ["animate-fade-out"],
  MONSTER_DEATH: ["animate-fade-out"],
  MONSTER_APPEAR: ["animate-fade-in"],
};
