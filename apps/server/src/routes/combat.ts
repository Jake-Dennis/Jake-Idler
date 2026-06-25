import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { combatService } from "../services/combat-service.js";
import { heroService } from "../services/hero-service.js";
import { partyService } from "../services/party-service.js";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq, sql } from "drizzle-orm";
import { getIO } from "../socket/index.js";
import { combatSerializer } from "../game/serializers/combat-serializer.js";
import { createChildLogger } from "../observability/logger.js";

const log = createChildLogger("combat-route");

const router = Router();

// POST /:id/combat/start — start floor combat with party members
router.post("/:id/combat/start", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }
  if (combatService.isInCombat(heroId)) { res.status(409).json({ error: "Hero is already in combat" }); return; }

  const floor = req.body?.floor ? parseInt(String(req.body.floor), 10) : hero.currentFloor;
  if (isNaN(floor) || floor < 1) { res.status(400).json({ error: "Invalid floor number" }); return; }
  if (floor > hero.currentFloor) { res.status(403).json({ error: "Floor not yet unlocked" }); return; }

  // Build party member list from player's party (or solo as party of one)
  const party = partyService.getPartyByPlayer(req.player!.id);

  if (party) {
    if (combatService.isPartyInCombat(party.id)) { res.status(409).json({ error: "Party is already in combat" }); return; }

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
    }> = [];

    for (const memberId of party.memberIds) {
      const role = party.memberRoles[memberId] || "dps" as import("@jake-idler/game").CombatRole;
      const position = role === "tank" ? "front" as import("@jake-idler/game").CombatPosition
        : role === "healer" ? "rear" as import("@jake-idler/game").CombatPosition
        : "middle" as import("@jake-idler/game").CombatPosition;

      if (partyService.isBot(memberId)) {
        const bot = partyService.getBot(memberId);
        if (bot) {
          memberData.push({ heroId: bot.heroId, name: bot.name, role, position, level: bot.level, equipped: bot.equipped });
        }
      } else {
        const playerHeroes = await heroService.getHeroesByPlayer(memberId);
        if (playerHeroes.length > 0) {
          const h = playerHeroes[0];
          memberData.push({ heroId: h.id, name: h.name, role, position, level: h.level, equipped: h.equipped });
        }
      }
    }

    const floorInfo = await combatService.startFloorRun(party.id, heroId, floor, memberData);
    res.status(201).json({ ...floorInfo, partyCombat: true });
    return;
  }

  // Solo — party of one
  const role = "dps" as import("@jake-idler/game").CombatRole;
  const position = "middle" as import("@jake-idler/game").CombatPosition;
  const floorInfo = await combatService.startFloorRun(`solo_${heroId}`, heroId, floor, [{
    heroId, name: hero.name, role, position, level: hero.level, equipped: hero.equipped,
  }]);
  res.status(201).json({ ...floorInfo, partyCombat: false });
});

// GET /:id/combat/status — check combat progress
router.get("/:id/combat/status", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }

  const runId = combatService.getPartyIdForHero(heroId);
  if (!runId) {
    res.json({ inCombat: false, finished: false, floorCompleted: false, floorFailed: false });
    return;
  }

  const run = combatService.getPartyFloorRun(runId);
  if (!run) {
    res.json({ inCombat: false, finished: false, floorCompleted: false, floorFailed: false });
    return;
  }

  // Deduct floor gold on wipe (only once)
  if (run.floorFailed && run.floorGoldValue > 0 && !run.goldPenaltyApplied) {
    run.goldPenaltyApplied = true;
    await db
      .update(heroes)
      .set({
        gold: sql`MAX(0, ${heroes.gold} - ${run.floorGoldValue})`,
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId));
  }

  const isPartyCombat = !runId.startsWith("solo_");

  if (!run.floorCompleted && !run.floorFailed) {
    // State broadcast to party room is handled by onTick callback — not here
    res.json(combatSerializer.toView(run, heroId));
    return;
  }

  const heroAfter = await heroService.getHero(heroId);

  // Broadcast finished state to party members
  if (isPartyCombat) {
    try {
      getIO().to(`party:${runId}`).emit('party:combat-update', combatSerializer.toView(run, null));
    } catch (err) {
      log.error({ runId, err }, "party:combat-update emit failed");
    }
  }

  res.json({
    ...combatSerializer.toView(run, heroId),
    hero: heroAfter,
  });
});

// GET /:id/combat/monster — get current monster details
router.get("/:id/combat/monster", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const runId = combatService.getPartyIdForHero(heroId);
  if (!runId) { res.status(404).json({ error: "No active combat encounter" }); return; }
  const run = combatService.getPartyFloorRun(runId);
  if (!run || run.floorCompleted || run.floorFailed) { res.status(404).json({ error: "No active combat encounter" }); return; }
  const currentMonster = run.monsters[run.currentMonsterIndex];
  if (!currentMonster) { res.status(404).json({ error: "No current monster" }); return; }
  res.json({
    monster: {
      id: currentMonster.data.id,
      name: currentMonster.data.name,
      isBoss: currentMonster.data.isBoss,
      floor: currentMonster.data.floor,
      stats: {
        atk: currentMonster.data.stats.atk.toNumber(),
        def: currentMonster.data.stats.def.toNumber(),
        hp: currentMonster.currentHp,
        maxHp: currentMonster.maxHp,
      },
    },
  });
});

export default router;
