import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { generateToken } from "../auth/jwt.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { playerStore } from "../store/player-store.js";
import { requireAuth } from "../auth/middleware.js";

const router = Router();

// POST /api/auth/guest
router.post("/guest", async (_req, res) => {
  const guestId = uuidv4().slice(0, 8);
  const username = `Guest_${guestId}`;
  const player = await playerStore.create(username);
  const token = generateToken({ id: player.id, username: player.username });
  res.json({ token, player: { id: player.id, username: player.username } });
});

// POST /api/auth/register
const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9]+$/,
      "Username must be alphanumeric",
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { username, password } = parsed.data;

  const existing = await playerStore.findByUsername(username);
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const player = await playerStore.create(username, passwordHash);
  const token = generateToken({ id: player.id, username: player.username });
  res.status(201).json({ token, player: { id: player.id, username: player.username } });
});

// POST /api/auth/login
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { username, password } = parsed.data;

  const player = await playerStore.findByUsername(username);
  if (!player || !player.passwordHash) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await verifyPassword(password, player.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = generateToken({ id: player.id, username: player.username });
  res.json({ token, player: { id: player.id, username: player.username } });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const authPlayer = req.player!;
  const player = await playerStore.findById(authPlayer.id);
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json({
    player: { id: player.id, username: player.username, createdAt: player.createdAt },
  });
});

export default router;
