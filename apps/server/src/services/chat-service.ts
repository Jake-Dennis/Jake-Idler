import { db } from "../db/connection.js";
import { chatMessages, guildMembers } from "../db/schema/index.js";
import { eq, and, or, gt, asc } from "drizzle-orm";

const MESSAGE_LIMIT = 50;
const MESSAGE_MAX_LENGTH = 500;

export type ChatChannel = "global" | "guild" | "party" | "whisper";

export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  senderId: string;
  senderName: string;
  targetId?: string | null;
  targetName?: string | null;
  message: string;
  createdAt: string;
}

class ChatService {
  send(
    senderId: string,
    senderName: string,
    channel: ChatChannel,
    message: string,
    targetId?: string,
    targetName?: string,
  ): ChatMessage {
    const trimmed = message.trim();
    if (!trimmed) throw new Error("Message is required");
    if (trimmed.length > MESSAGE_MAX_LENGTH) throw new Error("Message must be at most " + MESSAGE_MAX_LENGTH + " characters");

    if (channel === "guild") {
      const member = db
        .select({ id: guildMembers.id })
        .from(guildMembers)
        .where(eq(guildMembers.playerId, senderId))
        .get();
      if (!member) throw new Error("Not in a guild");
    }

    if (channel === "whisper" && !targetId) {
      throw new Error("Recipient required for whisper");
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    db.insert(chatMessages).values({
      id,
      channel,
      senderId,
      senderName,
      targetId: targetId || null,
      targetName: targetName || null,
      message: trimmed,
      createdAt,
    }).run();

    return { id, channel, senderId, senderName, targetId: targetId || null, targetName: targetName || null, message: trimmed, createdAt };
  }

  getMessages(
    playerId: string,
    channel: ChatChannel,
    since?: string,
    targetId?: string,
  ): ChatMessage[] {
    const conditions = [eq(chatMessages.channel, channel)];

    if (channel === "whisper" && targetId) {
      conditions.push(
        or(
          and(eq(chatMessages.senderId, playerId), eq(chatMessages.targetId, targetId))!,
          and(eq(chatMessages.senderId, targetId), eq(chatMessages.targetId, playerId))!,
        )!,
      );
    }

    if (since) {
      conditions.push(gt(chatMessages.createdAt, since));
    }

    const whereClause: any = conditions.length === 1 ? conditions[0]! : and(...conditions)!;
    const rows = db
      .select()
      .from(chatMessages)
      .where(whereClause)
      .orderBy(asc(chatMessages.createdAt))
      .limit(MESSAGE_LIMIT)
      .all();

    return rows.map(r => ({
      id: r.id,
      channel: r.channel as ChatChannel,
      senderId: r.senderId,
      senderName: r.senderName,
      targetId: r.targetId,
      targetName: r.targetName,
      message: r.message,
      createdAt: r.createdAt,
    }));
  }
}

export const chatService = new ChatService();
