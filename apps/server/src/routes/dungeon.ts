import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { dungeonService } from "../services/dungeon-service.js";
import { heroService } from "../services/hero-service.js";

const router = Router();

router.get("/:id/dungeon", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }
  const floorState = await dungeonService.getFloorState(heroId, req.player!.id);
  if (!floorState) { res.status(404).json({ error: "Floor not found" }); return; }
  res.json({ floor: floorState });
});

router.get("/:id/dungeon/floor/:floorNumber", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const floorNumber = parseInt(String(req.params.floorNumber), 10);
  if (isNaN(floorNumber) || floorNumber < 1) { res.status(400).json({ error: "Invalid floor number" }); return; }
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }
  if (floorNumber > hero.currentFloor) { res.status(403).json({ error: "Floor not yet unlocked" }); return; }
  const floorState = await dungeonService.getFloorPreview(req.player!.id, floorNumber, hero.level);
  res.json({ floor: floorState });
});

router.post("/:id/dungeon/advance", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }
  const result = await dungeonService.advanceFloor(heroId, req.player!.id);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.json({ newFloor: result.newFloor });
});

router.post("/:id/dungeon/key-drop", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }
  const result = await dungeonService.tryKeyDrop(heroId, req.player!.id);
  res.json(result);
});

router.get("/:id/keys", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;
  const hero = await heroService.getHero(heroId);
  if (!hero) { res.status(404).json({ error: "Hero not found" }); return; }
  if (hero.playerId !== req.player!.id) { res.status(403).json({ error: "Not your hero" }); return; }
  const playerKeys = await dungeonService.getPlayerKeys(req.player!.id);
  res.json({ keys: playerKeys });
});

export default router;
