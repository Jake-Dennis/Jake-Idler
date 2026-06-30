import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { balancingService } from "../services/balancing-service.js";
import { applyConfigOverrides, computeEquipmentStats } from "@jake-idler/game";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

const router = Router();

// Admin-only middleware (simple check)
function requireAdmin(req: any, res: any, next: any) {
  // For now, any authenticated user can access admin
  // In production, check for admin role
  if (!req.player) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// GET /api/admin/balancing — full config (always reads fresh from disk)
router.get("/balancing", requireAuth, requireAdmin, (_req, res) => {
  // reset() re-reads balancing.json from disk so the admin panel always
  // sees the latest file contents, even after a rename or manual edit.
  const config = balancingService.reset();
  res.json(config);
});

// PUT /api/admin/balancing — update a key
const updateSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

router.put("/balancing", requireAuth, requireAdmin, (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (parsed.success) {
      // Single-key update: { key: "MONSTER_BASE_HP", value: 12345 }
      const { key, value } = parsed.data;
      const config = balancingService.update({ [key]: value });
      applyConfigOverrides(config);
      return res.json({ success: true, config });
    }
    // Full config update: entire body is a map of key→value pairs
    const config = balancingService.update(req.body);
    applyConfigOverrides(config);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/admin/balancing/nested — update a nested key (e.g. BASE_DROP_RATES → legendary)
const nestedUpdateSchema = z.object({
  key: z.string().min(1),
  subKey: z.string().min(1),
  value: z.any(),
});

router.put("/balancing/nested", requireAuth, requireAdmin, (req, res) => {
  try {
    const parsed = nestedUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { key, subKey, value } = parsed.data;
    const config = balancingService.updateNested(key, subKey, value);
    applyConfigOverrides(config);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/balancing/reset — reset to defaults
router.post("/balancing/reset", requireAuth, requireAdmin, (_req, res) => {
  const config = balancingService.reset();
  applyConfigOverrides(config);
  res.json({ success: true, config });
});

// POST /api/admin/balancing/recalculate-gear — recalculate all existing gear stats
router.post("/balancing/recalculate-gear", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const allHeroes = await db.select().from(heroes);
    let updated = 0, totalItems = 0;

    for (const hero of allHeroes) {
      let changed = false;
      const equipped: Record<string, any> = (hero.equipped as any) || {};
      const inventory: any[] = (hero.inventory as any) || [];

      // Recalculate equipped gear
      for (const slot of Object.keys(equipped)) {
        const item = equipped[slot];
        if (!item) continue;
        totalItems++;
        const newStats = computeEquipmentStats(item.slot, item.level, item.rarity);
        if (JSON.stringify(item.stats) !== JSON.stringify(newStats)) {
          item.stats = newStats;
          item.effectiveLevel = item.level;
          changed = true;
          updated++;
        }
      }

      // Recalculate inventory gear
      for (const item of inventory) {
        if (!item || !item.slot) continue;
        totalItems++;
        const newStats = computeEquipmentStats(item.slot, item.level, item.rarity);
        if (JSON.stringify(item.stats) !== JSON.stringify(newStats)) {
          item.stats = newStats;
          item.effectiveLevel = item.level;
          changed = true;
          updated++;
        }
      }

      if (changed) {
        await db.update(heroes)
          .set({ equipped: equipped as any, inventory: inventory as any })
          .where(eq(heroes.id, hero.id));
      }
    }

    res.json({ success: true, updated, totalItems, heroesProcessed: allHeroes.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
