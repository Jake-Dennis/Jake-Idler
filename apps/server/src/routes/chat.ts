import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { chatService } from "../services/chat-service.js";
import type { ChatChannel } from "../services/chat-service.js";

const router = Router();

const sendSchema = z.object({
  channel: z.enum(["global", "guild", "party", "whisper"]),
  message: z.string().min(1, "Message is required").max(500),
  targetId: z.string().optional(),
  targetName: z.string().optional(),
});

// POST /api/chat/send
router.post("/send", requireAuth, async (req, res) => {
  try {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { channel, message, targetId, targetName } = parsed.data;
    const msg = chatService.send(req.player!.id, req.player!.username, channel as ChatChannel, message, targetId, targetName);
    res.status(201).json({ message: msg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/chat/messages?channel=global&since=2024-01-01T00:00:00Z&targetId=
router.get("/messages", requireAuth, async (req, res) => {
  try {
    const channel = (req.query.channel as string) || "global";
    if (!["global", "guild", "party", "whisper"].includes(channel)) {
      res.status(400).json({ error: "Invalid channel" });
      return;
    }
    const since = req.query.since as string | undefined;
    const targetId = req.query.targetId as string | undefined;
    const messages = chatService.getMessages(req.player!.id, channel as ChatChannel, since, targetId);
    res.json({ messages });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
