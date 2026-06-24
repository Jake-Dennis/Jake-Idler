import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TickScheduler } from "../tick-scheduler.js";

describe("TickScheduler", () => {
  let scheduler: TickScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new TickScheduler();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  it("starts and fires the first tick within the interval", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");
    scheduler.start(200);

    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("fires multiple ticks at the configured rate", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");
    scheduler.start(100);

    vi.advanceTimersByTime(550);

    const count = handler.mock.calls.length;
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(7);
  });

  it("stop() halts the loop", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");
    scheduler.start(100);

    vi.advanceTimersByTime(250);
    const beforeStop = handler.mock.calls.length;
    expect(beforeStop).toBeGreaterThanOrEqual(1);

    scheduler.stop();
    vi.advanceTimersByTime(500);
    expect(handler.mock.calls.length).toBe(beforeStop);
  });

  it("getTickCount matches handler call count", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");
    scheduler.start(100);

    expect(scheduler.getTickCount()).toBe(0);
    vi.advanceTimersByTime(350);

    expect(scheduler.getTickCount()).toBeGreaterThanOrEqual(3);
    expect(scheduler.getTickCount()).toBe(handler.mock.calls.length);
  });

  it("getLastTickDurationMs returns a value after at least one tick", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");
    scheduler.start(100);

    vi.advanceTimersByTime(250);
    expect(scheduler.getLastTickDurationMs()).toBeGreaterThanOrEqual(0);
  });

  it("start is idempotent — second call does nothing", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");

    scheduler.start(100);
    scheduler.start(100);
    scheduler.start(100);

    vi.advanceTimersByTime(250);
    // Called ~2 times (not 6)
    const count = handler.mock.calls.length;
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(4);
  });

  it("unsubscribe removes a handler", () => {
    const handler = vi.fn();
    scheduler.subscribe(handler, "test");
    scheduler.unsubscribe(handler);

    scheduler.start(100);
    vi.advanceTimersByTime(250);
    expect(handler).not.toHaveBeenCalled();
  });

  it("isRunning returns correct state", () => {
    expect(scheduler.isRunning()).toBe(false);
    scheduler.start(100);
    expect(scheduler.isRunning()).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("throwing subscriber does not stop other subscribers", () => {
    const thrower = vi.fn().mockImplementation(() => { throw new Error("oops"); });
    const good = vi.fn();

    scheduler.subscribe(thrower, "thrower");
    scheduler.subscribe(good, "good");

    scheduler.start(100);
    vi.advanceTimersByTime(250);

    expect(thrower).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
    expect(good.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("multiple subscribers all fire on each tick with same count", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();

    scheduler.subscribe(h1, "h1");
    scheduler.subscribe(h2, "h2");

    scheduler.start(200);
    vi.advanceTimersByTime(250);

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
    expect(h1.mock.calls.length).toBe(h2.mock.calls.length);
  });
});
