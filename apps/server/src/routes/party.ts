import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { partyService } from "../services/party-service.js";
import { playerStore } from "../store/player-store.js";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import type { CombatRole } from "@jake-idler/game";
import { createChildLogger } from "../observability/logger.js";
import { partyCreateLimiter } from "../middleware/rate-limit.js";

const log = createChildLogger("party-route");

const router = Router();

// POST /api/party/create — create a new party
const createSchema = z.object({
  name: z.string().min(1, "Party name is required").max(30),
});

router.post("/create", partyCreateLimiter, requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const party = partyService.create(req.player!.id, parsed.data.name);
    const playerNames: Record<string, string> = { [req.player!.id]: req.player!.username };
    res.status(201).json({ party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/party/invite — invite a player by username
const inviteSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

router.post("/invite", requireAuth, async (req, res) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const targetPlayer = await playerStore.findByUsername(parsed.data.username);
    if (!targetPlayer) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const party = partyService.invite(req.player!.id, targetPlayer.id);
    const playerNames: Record<string, string> = { [req.player!.id]: req.player!.username };
    for (const mid of party.memberIds) {
      const p = await playerStore.findById(mid);
      if (p) playerNames[mid] = p.username;
    }
    res.json({ party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/party/join — join a party by ID
const joinSchema = z.object({
  partyId: z.string().min(1, "Party ID is required"),
});

router.post("/join", requireAuth, async (req, res) => {
  try {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const party = partyService.join(req.player!.id, parsed.data.partyId);
    const playerNames: Record<string, string> = {};
    for (const mid of party.memberIds) {
      const p = await playerStore.findById(mid);
      if (p) playerNames[mid] = p.username;
    }
    res.json({ party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/party/leave — leave current party
router.post("/leave", requireAuth, async (req, res) => {
  try {
    const oldParty = partyService.getPartyByPlayer(req.player!.id);
    const pid = oldParty?.id;
    partyService.leave(req.player!.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/party/transfer — transfer leadership to another member
const transferSchema = z.object({
  targetPlayerId: z.string().min(1, "Target player ID is required"),
});

router.post("/transfer", requireAuth, async (req, res) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    partyService.transferLeader(req.player!.id, parsed.data.targetPlayerId);

    const party = partyService.getPartyByPlayer(req.player!.id);
    if (!party) {
      res.status(400).json({ error: "Party not found" });
      return;
    }
    const playerNames: Record<string, string> = {};
    for (const mid of party.memberIds) {
      const p = await playerStore.findById(mid);
      if (p) playerNames[mid] = p.username;
    }
    playerNames[req.player!.id] = req.player!.username;
    res.json({ party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/party — get current party info
router.get("/", requireAuth, async (req, res) => {
  const party = partyService.getPartyByPlayer(req.player!.id);
  if (!party) {
    res.json({ party: null });
    return;
  }
  const playerNames: Record<string, string> = {};
  for (const mid of party.memberIds) {
    const p = await playerStore.findById(mid);
    if (p) playerNames[mid] = p.username;
  }
  // Also check DB for any non-in-memory players
  playerNames[req.player!.id] = req.player!.username;
  res.json({ party: await partyService.getPartyResponse(party, playerNames) });
});

// GET /api/party/invites — get pending invites
router.get("/invites", requireAuth, async (req, res) => {
  try {
    const invites = partyService.getInvites(req.player!.id);
    res.json({ invites: invites.map((p) => ({ partyId: p.id, partyName: p.name, leaderId: p.leaderId })) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/party/bot — add a bot to the party
const botSchema = z.object({
  role: z.enum(["tank", "dps", "healer"]),
});

router.post("/bot", requireAuth, async (req, res) => {
  try {
    const parsed = botSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    // Get the leader's hero level to scale the bot
    const heroRows = await db.select().from(heroes).where(eq(heroes.playerId, req.player!.id)).limit(1);
    const heroLevel = heroRows.length > 0 ? heroRows[0].level : 1;

    // Add bot
    const bot = partyService.addBot(req.player!.id, parsed.data.role as CombatRole);
    // Scale bot to leader's level
    partyService.updateBotLevel(bot.heroId, heroLevel);

    // Get updated party
    const party = partyService.getPartyByPlayer(req.player!.id);
    if (!party) {
      res.status(400).json({ error: "No party found" });
      return;
    }
    const playerNames: Record<string, string> = { [req.player!.id]: req.player!.username };
    res.json({ party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/party/bot/:botId — remove a bot from the party
router.delete("/bot/:botId", requireAuth, async (req, res) => {
  try {
    partyService.removeBot(req.player!.id, String(req.params.botId));

    const party = partyService.getPartyByPlayer(req.player!.id);
    if (!party) {
      res.json({ success: true, party: null });
      return;
    }
    const playerNames: Record<string, string> = { [req.player!.id]: req.player!.username };
    res.json({ success: true, party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/party/role — update party member's combat role
router.put("/role", requireAuth, async (req, res) => {
  try {
    const { role } = z.object({ role: z.enum(["tank", "dps", "healer"]) }).parse(req.body);

    const party = partyService.getPartyByPlayer(req.player!.id);
    if (!party) { res.status(404).json({ error: "Not in a party" }); return; }

    partyService.setMemberRole(party.id, req.player!.id, role as CombatRole);
    const playerNames: Record<string, string> = { [req.player!.id]: req.player!.username };
    res.json({ success: true, party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/party/key-share — toggle whether this player's keys can be used by the party
router.post("/key-share", requireAuth, async (req, res) => {
  try {
    const optedIn = partyService.toggleKeyShare(req.player!.id);

    const party = partyService.getPartyByPlayer(req.player!.id);
    if (!party) {
      res.json({ optedIn });
      return;
    }
    const playerNames: Record<string, string> = { [req.player!.id]: req.player!.username };
    res.json({ optedIn, party: await partyService.getPartyResponse(party, playerNames) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
