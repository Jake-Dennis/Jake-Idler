import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { combatService } from "../services/combat-service.js";
import { heroService } from "../services/hero-service.js";
import { partyService } from "../services/party-service.js";
import { createChildLogger } from "../observability/logger.js";

const log = createChildLogger("combat-route");

const router = Router();

// Per-hero cooldown: prevent spamming start-stop to burn through floors.
// Players must wait N seconds between combat starts.
const COMBAT_COOLDOWN_MS = 5_000;
const lastCombatStart = new Map<string, number>();

// POST /:id/combat/start — simulate an entire floor run instantly
router.post("/:id/combat/start", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;

  const now = Date.now();
  const lastStart = lastCombatStart.get(heroId);
  if (lastStart && (now - lastStart) < COMBAT_COOLDOWN_MS) {
    const remaining = Math.ceil((COMBAT_COOLDOWN_MS - (now - lastStart)) / 1000);
    res.status(429).json({ error: `Please wait ${remaining}s before starting another floor` });
    return;
  }
  lastCombatStart.set(heroId, now);

  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }

  const floor = req.body?.floor ? parseInt(String(req.body.floor), 10) : hero.currentFloor;
  if (isNaN(floor) || floor < 1) { res.status(400).json({ error: "Invalid floor number" }); return; }
  if (floor > hero.currentFloor) { res.status(403).json({ error: "Floor not yet unlocked" }); return; }

  // Build party member list from player's party (or solo as party of one)
  const party = partyService.getPartyByPlayer(req.player!.id);

  if (party) {
    // Sync all bots to the initiator hero's level and gear
    for (const memberId of party.memberIds) {
      if (partyService.isBot(memberId)) {
        partyService.updateBotLevel(memberId, hero.level); // regenerates equipment at that level
      }
    }

    const memberData: Array<{
      heroId: string;
      name: string;
      role: import("@jake-idler/game").CombatRole;
      position: import("@jake-idler/game").CombatPosition;
      level: number;
      equipped: Record<string, import("@jake-idler/game").Equipment | null>;
      photoUrl: string | null;
    }> = [];

    for (const memberId of party.memberIds) {
      const role = party.memberRoles[memberId] || "dps" as import("@jake-idler/game").CombatRole;
      const position = role === "tank" ? "front" as import("@jake-idler/game").CombatPosition
        : role === "healer" ? "rear" as import("@jake-idler/game").CombatPosition
        : "middle" as import("@jake-idler/game").CombatPosition;

      if (partyService.isBot(memberId)) {
        const bot = partyService.getBot(memberId);
        if (bot) {
          memberData.push({ heroId: bot.heroId, name: bot.name, role, position, level: bot.level, equipped: bot.equipped, photoUrl: null });
        }
      } else {
        const playerHeroes = await heroService.getHeroesByPlayer(memberId);
        if (playerHeroes.length > 0) {
          const h = playerHeroes[0];
          memberData.push({ heroId: h.id, name: h.name, role, position, level: h.level, equipped: h.equipped, photoUrl: h.photoUrl ?? null });
        }
      }
    }

    const result = await combatService.simulateFloorRun(party.id, heroId, floor, memberData);
    res.status(201).json({ ...result, partyCombat: true });
    return;
  }

  // Solo — party of one
  const role = "dps" as import("@jake-idler/game").CombatRole;
  const position = "middle" as import("@jake-idler/game").CombatPosition;
  const result = await combatService.simulateFloorRun(`solo_${heroId}`, heroId, floor, [{
    heroId, name: hero.name, role, position, level: hero.level, equipped: hero.equipped, photoUrl: hero.photoUrl ?? null,
  }]);
  res.status(201).json({ ...result, partyCombat: false });
});

// GET /:id/combat/status — kept for initial page load catch-up
// With instant combat there is no active run state; always returns not in combat.
router.get("/:id/combat/status", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }

  res.json({
    inCombat: false,
    finished: false,
    floorCompleted: false,
    floorFailed: false,
    partyCombat: false,
    monsters: [],
    round: null,
    events: [],
    floorProgress: {
      monstersDefeated: 0,
      totalMonsters: 0,
      currentMonsterName: "",
      currentMonsterIsBoss: false,
    },
  });
});

// GET /:id/combat/monster — get current monster details
// With instant combat there is no active encounter; always 404s.
router.get("/:id/combat/monster", requireAuth, async (req, res) => {
  res.status(404).json({ error: "No active combat encounter" });
});

export default router;
