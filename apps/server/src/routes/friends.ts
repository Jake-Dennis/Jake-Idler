import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { friendService } from "../services/friend-service.js";

const router = Router();

// POST /api/friends/add — send a friend request by username
const addSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

router.post("/add", requireAuth, async (req, res) => {
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    await friendService.addFriend(req.player!.id, parsed.data.username);
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/friends/accept — accept a friend request
const acceptSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
});

router.post("/accept", requireAuth, async (req, res) => {
  try {
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    await friendService.acceptFriend(req.player!.id, parsed.data.playerId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/friends/remove — remove a friend / cancel a request
const removeSchema = z.object({
  friendId: z.string().min(1, "Friend ID is required"),
});

router.post("/remove", requireAuth, async (req, res) => {
  try {
    const parsed = removeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    await friendService.removeFriend(req.player!.id, parsed.data.friendId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/friends — list friends with online status
router.get("/", requireAuth, async (req, res) => {
  try {
    const friendList = await friendService.getFriends(req.player!.id);
    res.json({ friends: friendList });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/friends/requests — get pending friend requests
router.get("/requests", requireAuth, async (req, res) => {
  try {
    const requests = await friendService.getPendingRequests(req.player!.id);
    res.json({ requests });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
