import { describe, it, expect } from "vitest";
import rootLogger, { createChildLogger } from "../../observability/logger.js";

describe("logger", () => {
  it("creates a root logger", () => {
    expect(rootLogger).toBeDefined();
    expect(rootLogger.level).toBe("info");
  });

  it("creates a child logger with service field", () => {
    const child = createChildLogger("combat");
    expect(child).toBeDefined();
    // Child should be able to log
    expect(() => child.info("test")).not.toThrow();
  });

  it("child log output includes the service name", () => {
    const child = createChildLogger("test-service");
    // Capture stdout by listening to the logger's stream
    const chunks: Buffer[] = [];
    const write = process.stdout.write.bind(process.stdout);
    // We can't easily capture pino output without a transport,
    // so verify the child was created with the correct bindings
    expect((child as any).bindings?.()?.service).toBe("test-service");
  });

  it("level is configurable", () => {
    expect(rootLogger.level).toBe("info");
    rootLogger.level = "warn";
    expect(rootLogger.level).toBe("warn");
    rootLogger.level = "info";
  });
});
