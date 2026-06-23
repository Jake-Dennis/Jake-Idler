import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { heroService } from "../services/hero-service.js";

const router = Router();

// GET /api/heroes — list all heroes for the authenticated player
router.get("/", requireAuth, async (req, res) => {
  const heroes = await heroService.getHeroesByPlayer(req.player!.id);
  res.json({ heroes });
});

// POST /api/heroes — create a new hero
const createSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(20, "Name must be at most 20 characters")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Name must be alphanumeric with spaces, hyphens, or underscores"),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const hero = await heroService.createHero(req.player!.id, parsed.data.name);
  res.status(201).json({ hero });
});

// GET /api/heroes/:id — get a specific hero with computed stats
router.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const hero = await heroService.getHero(id);
  if (!hero) {
    res.status(404).json({ error: "Hero not found" });
    return;
  }
  // Ensure the hero belongs to the requesting player
  if (hero.playerId !== req.player!.id) {
    res.status(403).json({ error: "Not your hero" });
    return;
  }
  res.json({ hero });
});

// POST /api/heroes/:id/equip — equip an item from inventory
const equipSchema = z.object({
  equipmentId: z.string().min(1, "equipmentId is required"),
  slot: z.string().min(1, "slot is required"),
});

router.post("/:id/equip", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const heroCheck = await heroService.getHero(id);
  if (!heroCheck) {
    res.status(404).json({ error: "Hero not found" });
    return;
  }
  if (heroCheck.playerId !== req.player!.id) {
    res.status(403).json({ error: "Not your hero" });
    return;
  }

  const parsed = equipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // Find the equipment in inventory
  const equipment = heroCheck.inventory.find(
    (i: any) => i.id === parsed.data.equipmentId,
  );
  if (!equipment) {
    res.status(400).json({ error: "Equipment not found in inventory" });
    return;
  }

  const hero = await heroService.equipItem(id, equipment, parsed.data.slot);
  if (!hero) {
    res.status(500).json({ error: "Failed to equip item" });
    return;
  }
  res.json({ hero });
});

// POST /api/heroes/:id/unequip — unequip an item from a slot
const unequipSchema = z.object({
  slot: z.string().min(1, "slot is required"),
});

router.post("/:id/unequip", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const heroCheck = await heroService.getHero(id);
  if (!heroCheck) {
    res.status(404).json({ error: "Hero not found" });
    return;
  }
  if (heroCheck.playerId !== req.player!.id) {
    res.status(403).json({ error: "Not your hero" });
    return;
  }

  const parsed = unequipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const hero = await heroService.unequipItem(id, parsed.data.slot);
  if (!hero) {
    res.status(500).json({ error: "Failed to unequip item" });
    return;
  }
  res.json({ hero });
});

// DELETE /api/heroes/:id — delete a hero
router.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const deleted = await heroService.deleteHero(id, req.player!.id);
  if (!deleted) {
    res.status(404).json({ error: "Hero not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
