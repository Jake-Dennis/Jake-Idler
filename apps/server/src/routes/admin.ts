import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { balancingService } from "../services/balancing-service.js";

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

// GET /api/admin/balancing — full config
router.get("/balancing", requireAuth, requireAdmin, (_req, res) => {
  const config = balancingService.load();
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
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const { key, value } = parsed.data;
    const config = balancingService.update({ [key]: value });
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
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/balancing/reset — reset to defaults
router.post("/balancing/reset", requireAuth, requireAdmin, (_req, res) => {
  const config = balancingService.reset();
  res.json({ success: true, config });
});

export default router;
