/**
 * EntityAnimFSM — Per-entity animation state machine.
 *
 * Each entity (hero or monster) maintains an independent state machine
 * with states IDLE / ATTACKING / IMPACT / RECOVERY / DEAD. Guards prevent
 * playing animations on dead or busy entities, ensuring no overlapping
 * animations occur on the same entity.
 *
 * Per D-05: Each entity maintains independent state. Guards prevent playing
 * animations on dead/dying entities.
 *
 * @module animation/EntityAnimFSM
 */

import type { AnimEntityState } from "./types.js";

/**
 * Legal transition map. The key is "currentState→targetState".
 * `*→DEAD` is always allowed for death interrupt.
 * `DEAD→IDLE` is allowed for respawn/reset.
 */
const LEGAL_TRANSITIONS = new Map<string, boolean>();

// IDLE transitions
LEGAL_TRANSITIONS.set("IDLE→ATTACKING", true);

// ATTACKING transitions
LEGAL_TRANSITIONS.set("ATTACKING→IMPACT", true);
LEGAL_TRANSITIONS.set("ATTACKING→DEAD", true);

// IMPACT transitions
LEGAL_TRANSITIONS.set("IMPACT→RECOVERY", true);
LEGAL_TRANSITIONS.set("IMPACT→DEAD", true);

// RECOVERY transitions
LEGAL_TRANSITIONS.set("RECOVERY→IDLE", true);
LEGAL_TRANSITIONS.set("RECOVERY→DEAD", true);

// DEAD transitions (respawn/reset)
LEGAL_TRANSITIONS.set("DEAD→IDLE", true);

// Any → DEAD is always allowed
LEGAL_TRANSITIONS.set("*→DEAD", true);

/**
 * Per-entity animation state machine.
 *
 * Usage:
 * ```ts
 * const fsm = new EntityAnimFSM();
 * fsm.registerEntity("hero-abc123");
 *
 * if (fsm.canTransition("hero-abc123", "ATTACKING")) {
 *   fsm.transitionTo("hero-abc123", "ATTACKING");
 * }
 * ```
 */
export class EntityAnimFSM {
  /** Internal per-entity state storage. */
  private states = new Map<string, AnimEntityState>();

  /**
   * Register an entity with the FSM, initialising it to IDLE.
   * No-op if the entity is already registered.
   *
   * @param entityId - Unique entity identifier (e.g. "hero-<uuid>")
   */
  registerEntity(entityId: string): void {
    if (!this.states.has(entityId)) {
      this.states.set(entityId, "IDLE");
    }
  }

  /**
   * Get the current FSM state for an entity.
   * Unknown entities default to IDLE (no side effects).
   *
   * @param entityId - Entity identifier
   * @returns Current AnimEntityState (defaults to "IDLE" for unknown entities)
   */
  getState(entityId: string): AnimEntityState {
    return this.states.get(entityId) ?? "IDLE";
  }

  /**
   * Check whether a transition is legal for the given entity.
   * Pure predicate — no side effects.
   *
   * @param entityId - Target entity
   * @param targetState - Desired next state
   * @returns `true` if the transition is allowed
   */
  canTransition(entityId: string, targetState: AnimEntityState): boolean {
    const current = this.getState(entityId);

    // Any → DEAD is always allowed (death interrupt)
    if (targetState === "DEAD") return true;

    // If entity is DEAD, only DEAD→IDLE is allowed
    if (current === "DEAD") {
      return targetState === "IDLE";
    }

    const key = `${current}→${targetState}`;
    return LEGAL_TRANSITIONS.has(key);
  }

  /**
   * Attempt to transition an entity to a new state.
   * If the transition is not allowed, the entity's state is unchanged.
   *
   * @param entityId - Target entity
   * @param targetState - Desired next state
   * @returns `true` if the transition was performed, `false` otherwise
   */
  transitionTo(entityId: string, targetState: AnimEntityState): boolean {
    if (!this.canTransition(entityId, targetState)) {
      return false;
    }

    this.states.set(entityId, targetState);
    return true;
  }

  /**
   * Force-reset an entity to IDLE state.
   * Useful for cleanup or retry scenarios.
   *
   * @param entityId - Entity to reset
   */
  forceReset(entityId: string): void {
    this.states.set(entityId, "IDLE");
  }

  /**
   * Convenience check: is the entity in DEAD state?
   *
   * @param entityId - Entity to check
   * @returns `true` if entity is in DEAD state
   */
  isDead(entityId: string): boolean {
    return this.getState(entityId) === "DEAD";
  }

  /**
   * Return the number of currently registered entities.
   */
  get size(): number {
    return this.states.size;
  }

  /**
   * Remove an entity from the FSM entirely (cleanup on party leave / disconnect).
   *
   * @param entityId - Entity to remove
   */
  unregisterEntity(entityId: string): void {
    this.states.delete(entityId);
  }
}
