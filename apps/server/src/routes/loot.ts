import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { heroService } from "../services/hero-service.js";
import { lootService } from "../services/loot-service.js";
import { Rarity, getBracketEquipmentLevel } from "@jake-idler/game";

const router = Router();

// POST /api/heroes/:id/shop/craft — craft an item from shards
const craftSchema = z.object({
  slot: z.string().min(1, "slot is required"),
  type: z.string().min(1, "type is required"),
  rarity: z.nativeEnum(Rarity),
});

router.post("/:id/shop/craft", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) {
    res.status(404).json({ error: "Hero not found" });
    return;
  }
  if (hero.playerId !== req.player!.id) {
    res.status(403).json({ error: "Not your hero" });
    return;
  }

  const parsed = craftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const bracketLevel = getBracketEquipmentLevel(hero.currentFloor);
  const result = await lootService.craftItem(
    heroId,
    parsed.data.slot,
    parsed.data.type,
    parsed.data.rarity,
    bracketLevel,
  );

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json({ equipment: result.equipment });
});

// POST /api/heroes/:id/shop/salvage — salvage an item for gold (alchemy)
const salvageSchema = z.object({
  equipmentId: z.string().min(1, "equipmentId is required"),
});

router.post("/:id/shop/salvage", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) {
    res.status(404).json({ error: "Hero not found" });
    return;
  }
  if (hero.playerId !== req.player!.id) {
    res.status(403).json({ error: "Not your hero" });
    return;
  }

  const parsed = salvageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const result = await lootService.salvageItem(heroId, parsed.data.equipmentId);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ gold: result.gold, shards: result.shards });
});

export default router;
