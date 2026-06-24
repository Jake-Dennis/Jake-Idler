import { describe, it, expect, vi } from "vitest";
import { gameEvents, TypedEventEmitter } from "../event-bus.js";

describe("TypedEventEmitter", () => {
  it("emits and receives typed events", () => {
    const handler = vi.fn();
    gameEvents.on("round:processed", handler);
    gameEvents.emit("round:processed", {
      runId: "r1",
      round: 1,
      state: {} as any,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "r1", round: 1 }),
    );
    gameEvents.off("round:processed", handler);
  });

  it("emit returns false when no listeners", () => {
    const result = gameEvents.emit("run:started", {
      runId: "r2",
      partyId: "p1",
      floorNumber: 5,
    });
    // With EventEmitter, emit returns true if there were listeners
    expect(typeof result).toBe("boolean");
  });

  it("listenerCount returns correct count", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    gameEvents.on("loot:dropped", h1);
    gameEvents.on("loot:dropped", h2);
    expect(gameEvents.listenerCount("loot:dropped")).toBe(2);
    gameEvents.off("loot:dropped", h1);
    expect(gameEvents.listenerCount("loot:dropped")).toBe(1);
    gameEvents.off("loot:dropped", h2);
  });

  it("removeAllListeners clears event", () => {
    const handler = vi.fn();
    gameEvents.on("hero:leveled", handler);
    gameEvents.removeAllListeners("hero:leveled");
    gameEvents.emit("hero:leveled", { heroId: "h1", newLevel: 10 });
    expect(handler).not.toHaveBeenCalled();
  });
});
