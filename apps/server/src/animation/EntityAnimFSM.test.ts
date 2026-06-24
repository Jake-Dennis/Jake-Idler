/**
 * Tests for EntityAnimFSM — per-entity animation state machine.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { EntityAnimFSM } from "./EntityAnimFSM.js";

describe("EntityAnimFSM", () => {
  it("starts each new entity in IDLE state", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    expect(fsm.getState("hero-1")).toBe("IDLE");
  });

  it("defaults unknown entities to IDLE (no registration needed)", () => {
    // Per guard specification: unknown entities default to IDLE
    // with no side effects
    const fsm = new EntityAnimFSM();
    expect(fsm.getState("unknown-entity")).toBe("IDLE");
  });

  it("allows IDLE → ATTACKING transition (legal)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    expect(fsm.canTransition("hero-1", "ATTACKING")).toBe(true);
    expect(fsm.transitionTo("hero-1", "ATTACKING")).toBe(true);
    expect(fsm.getState("hero-1")).toBe("ATTACKING");
  });

  it("rejects ATTACKING → ATTACKING (no overlap — illegal)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    expect(fsm.canTransition("hero-1", "ATTACKING")).toBe(false);
    expect(fsm.transitionTo("hero-1", "ATTACKING")).toBe(false);
    expect(fsm.getState("hero-1")).toBe("ATTACKING");
  });

  it("allows ATTACKING → IMPACT (legal)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    expect(fsm.canTransition("hero-1", "IMPACT")).toBe(true);
    expect(fsm.transitionTo("hero-1", "IMPACT")).toBe(true);
    expect(fsm.getState("hero-1")).toBe("IMPACT");
  });

  it("allows IMPACT → RECOVERY (legal)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    fsm.transitionTo("hero-1", "IMPACT");
    expect(fsm.canTransition("hero-1", "RECOVERY")).toBe(true);
    expect(fsm.transitionTo("hero-1", "RECOVERY")).toBe(true);
    expect(fsm.getState("hero-1")).toBe("RECOVERY");
  });

  it("allows RECOVERY → IDLE (legal)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    fsm.transitionTo("hero-1", "IMPACT");
    fsm.transitionTo("hero-1", "RECOVERY");
    expect(fsm.canTransition("hero-1", "IDLE")).toBe(true);
    expect(fsm.transitionTo("hero-1", "IDLE")).toBe(true);
    expect(fsm.getState("hero-1")).toBe("IDLE");
  });

  it("allows any state → DEAD (always legal — death interrupt)", () => {
    const fsm = new EntityAnimFSM();

    // ATTACKING → DEAD
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    expect(fsm.canTransition("hero-1", "DEAD")).toBe(true);
    expect(fsm.transitionTo("hero-1", "DEAD")).toBe(true);
    expect(fsm.getState("hero-1")).toBe("DEAD");

    // IMPACT → DEAD
    fsm.registerEntity("hero-2");
    fsm.transitionTo("hero-2", "ATTACKING");
    fsm.transitionTo("hero-2", "IMPACT");
    expect(fsm.canTransition("hero-2", "DEAD")).toBe(true);
    expect(fsm.transitionTo("hero-2", "DEAD")).toBe(true);
    expect(fsm.getState("hero-2")).toBe("DEAD");

    // RECOVERY → DEAD
    fsm.registerEntity("hero-3");
    fsm.transitionTo("hero-3", "ATTACKING");
    fsm.transitionTo("hero-3", "IMPACT");
    fsm.transitionTo("hero-3", "RECOVERY");
    expect(fsm.canTransition("hero-3", "DEAD")).toBe(true);
    expect(fsm.transitionTo("hero-3", "DEAD")).toBe(true);
    expect(fsm.getState("hero-3")).toBe("DEAD");
  });

  it("rejects ATTACKING → IDLE (skipping IMPACT/RECOVERY — illegal)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    expect(fsm.canTransition("hero-1", "IDLE")).toBe(false);
    expect(fsm.transitionTo("hero-1", "IDLE")).toBe(false);
    expect(fsm.getState("hero-1")).toBe("ATTACKING");
  });

  it("prevents any transition on a DEAD entity (except DEAD → IDLE)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "DEAD");

    // No animations on dead entity
    expect(fsm.canTransition("hero-1", "ATTACKING")).toBe(false);
    expect(fsm.canTransition("hero-1", "IMPACT")).toBe(false);
    expect(fsm.canTransition("hero-1", "RECOVERY")).toBe(false);

    // DEAD → IDLE is allowed (respawn)
    expect(fsm.canTransition("hero-1", "IDLE")).toBe(true);

    // transitionTo must also reject
    expect(fsm.transitionTo("hero-1", "ATTACKING")).toBe(false);
    expect(fsm.transitionTo("hero-1", "IMPACT")).toBe(false);
    expect(fsm.transitionTo("hero-1", "RECOVERY")).toBe(false);
    expect(fsm.transitionTo("hero-1", "IDLE")).toBe(true); // respawn
  });

  it("allows DEAD → IDLE (respawn/reset)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "DEAD");
    expect(fsm.canTransition("hero-1", "IDLE")).toBe(true);
    expect(fsm.transitionTo("hero-1", "IDLE")).toBe(true);
    expect(fsm.getState("hero-1")).toBe("IDLE");
  });

  it("getState returns current state after transitions", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");

    expect(fsm.getState("hero-1")).toBe("IDLE");
    fsm.transitionTo("hero-1", "ATTACKING");
    expect(fsm.getState("hero-1")).toBe("ATTACKING");
    fsm.transitionTo("hero-1", "IMPACT");
    expect(fsm.getState("hero-1")).toBe("IMPACT");
    fsm.transitionTo("hero-1", "RECOVERY");
    expect(fsm.getState("hero-1")).toBe("RECOVERY");
    fsm.transitionTo("hero-1", "IDLE");
    expect(fsm.getState("hero-1")).toBe("IDLE");
  });

  it("supports multiple independent entities", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.registerEntity("hero-2");

    fsm.transitionTo("hero-1", "ATTACKING");
    fsm.transitionTo("hero-2", "ATTACKING");

    // Each entity independently tracks its state
    expect(fsm.getState("hero-1")).toBe("ATTACKING");
    expect(fsm.getState("hero-2")).toBe("ATTACKING");

    // hero-1 advances independently
    fsm.transitionTo("hero-1", "IMPACT");
    expect(fsm.getState("hero-1")).toBe("IMPACT");
    expect(fsm.getState("hero-2")).toBe("ATTACKING"); // still attacking
  });

  it("forceReset sets entity to IDLE from any state", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "DEAD");
    expect(fsm.getState("hero-1")).toBe("DEAD");
    fsm.forceReset("hero-1");
    expect(fsm.getState("hero-1")).toBe("IDLE");

    // After reset, entity can animate again
    expect(fsm.canTransition("hero-1", "ATTACKING")).toBe(true);
  });

  it("isDead returns true only for DEAD state", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");

    expect(fsm.isDead("hero-1")).toBe(false);
    fsm.transitionTo("hero-1", "ATTACKING");
    expect(fsm.isDead("hero-1")).toBe(false);
    fsm.transitionTo("hero-1", "DEAD");
    expect(fsm.isDead("hero-1")).toBe(true);
  });

  it("registerEntity is idempotent (no-op for already registered)", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    fsm.transitionTo("hero-1", "ATTACKING");
    fsm.registerEntity("hero-1"); // should not reset to IDLE
    expect(fsm.getState("hero-1")).toBe("ATTACKING");
  });

  it("reports correct entity count via size", () => {
    const fsm = new EntityAnimFSM();
    expect(fsm.size).toBe(0);
    fsm.registerEntity("hero-1");
    expect(fsm.size).toBe(1);
    fsm.registerEntity("hero-2");
    expect(fsm.size).toBe(2);
    fsm.registerEntity("hero-1"); // duplicate
    expect(fsm.size).toBe(2); // no change
  });

  it("unregisterEntity removes entity from tracking", () => {
    const fsm = new EntityAnimFSM();
    fsm.registerEntity("hero-1");
    expect(fsm.size).toBe(1);
    fsm.unregisterEntity("hero-1");
    expect(fsm.size).toBe(0);
    // After unregister, getState defaults to IDLE
    expect(fsm.getState("hero-1")).toBe("IDLE");
  });
});
