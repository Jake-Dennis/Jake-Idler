import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────
// Each schema mirrors a client→server socket event payload.

export const heroJoinSchema = z.object({
  heroId: z.string().min(1, "heroId is required"),
});

export const partyJoinRoomSchema = z.object({
  partyId: z.string().min(1, "partyId is required"),
});

export const partyLeaveRoomSchema = z.object({
  partyId: z.string().min(1, "partyId is required"),
});

export const partyUpdateRoleSchema = z.object({
  partyId: z.string().min(1, "partyId is required"),
  role: z.enum(["tank", "dps", "healer"]),
});

export const partyChatSchema = z.object({
  partyId: z.string().min(1, "partyId is required"),
  text: z.string().min(1).max(500, "Max 500 characters"),
});

// ─── Parse Helper ─────────────────────────────────────────────

export class SocketValidationError extends Error {
  constructor(
    public readonly event: string,
    message: string,
  ) {
    super(message);
    this.name = "SocketValidationError";
  }
}

export function parseSocketEvent<T>(
  event: string,
  payload: unknown,
  schema: z.ZodType<T>,
): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const msg = firstIssue
      ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
      : "Invalid payload";
    throw new SocketValidationError(event, msg);
  }
  return result.data;
}
