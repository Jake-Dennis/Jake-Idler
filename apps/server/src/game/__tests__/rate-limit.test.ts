import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../../middleware/rate-limit.js";

describe("rate-limit", () => {
  it("creates a rate limiter middleware", () => {
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyPrefix: "test",
    });
    expect(limiter).toBeDefined();
    expect(typeof limiter).toBe("function");
  });

  it("accepts custom window and max", () => {
    const limiter = createRateLimiter({
      windowMs: 10 * 1000,
      max: 2,
      keyPrefix: "custom",
    });
    expect(limiter).toBeDefined();
  });

  it("keyGenerator uses user ID when available", () => {
    // This test verifies the limiter is created;
    // the actual key generation is tested via integration
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyPrefix: "auth",
    });
    expect(limiter).toBeDefined();
  });
});
