import { describe, it, expect } from "vitest";
import {
  heroJoinSchema,
  partyJoinRoomSchema,
  partyUpdateRoleSchema,
  partyChatSchema,
  parseSocketEvent,
  SocketValidationError,
} from "../validators/socket.js";

describe("Socket validators", () => {
  describe("heroJoinSchema", () => {
    it("accepts valid heroId", () => {
      const result = heroJoinSchema.parse({ heroId: "h1" });
      expect(result.heroId).toBe("h1");
    });

    it("rejects empty heroId", () => {
      expect(() => heroJoinSchema.parse({})).toThrow();
    });
  });

  describe("partyJoinRoomSchema", () => {
    it("accepts valid partyId", () => {
      const result = partyJoinRoomSchema.parse({ partyId: "p1" });
      expect(result.partyId).toBe("p1");
    });
  });

  describe("partyUpdateRoleSchema", () => {
    it("accepts valid tank role", () => {
      const result = partyUpdateRoleSchema.parse({ partyId: "p1", role: "tank" });
      expect(result.role).toBe("tank");
    });

    it("accepts healer role", () => {
      const result = partyUpdateRoleSchema.parse({ partyId: "p1", role: "healer" });
      expect(result.role).toBe("healer");
    });

    it("rejects invalid role", () => {
      expect(() => partyUpdateRoleSchema.parse({ partyId: "p1", role: "mage" })).toThrow();
    });
  });

  describe("partyChatSchema", () => {
    it("accepts valid message", () => {
      const result = partyChatSchema.parse({ partyId: "p1", text: "hello" });
      expect(result.text).toBe("hello");
    });

    it("rejects empty message", () => {
      expect(() => partyChatSchema.parse({ partyId: "p1", text: "" })).toThrow();
    });

    it("rejects overlong message", () => {
      expect(() =>
        partyChatSchema.parse({ partyId: "p1", text: "x".repeat(501) }),
      ).toThrow();
    });
  });

  describe("parseSocketEvent", () => {
    it("returns typed data on valid payload", () => {
      const result = parseSocketEvent("hero:join", { heroId: "h1" }, heroJoinSchema);
      expect(result).toEqual({ heroId: "h1" });
    });

    it("throws SocketValidationError on invalid payload", () => {
      expect(() =>
        parseSocketEvent("party:update-role", { partyId: "p1", role: "mage" }, partyUpdateRoleSchema),
      ).toThrow(SocketValidationError);
    });

    it("error message includes the failing field", () => {
      try {
        parseSocketEvent("test", { partyId: "p1", role: "mage" }, partyUpdateRoleSchema);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(SocketValidationError);
        expect((err as SocketValidationError).event).toBe("test");
        expect((err as Error).message).toContain("role");
      }
    });
  });
});
