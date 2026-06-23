import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../auth/middleware.js";
import { heroService } from "../services/hero-service.js";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve(import.meta.dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `hero_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg, png, gif, and webp files are allowed"));
    }
  },
});

// Helper: verify hero ownership
async function verifyOwnership(heroId: string, playerId: string): Promise<boolean> {
  const hero = await heroService.getHero(heroId);
  if (!hero) return false;
  return hero.playerId === playerId;
}

// POST /api/heroes/:id/photo — upload or replace hero photo
router.post("/:id/photo", requireAuth, (req, res) => {
  const heroId = req.params.id as string;

  upload.single("photo")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Max 5 MB." });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!(await verifyOwnership(heroId, req.player!.id))) {
      // Delete the uploaded file since ownership check failed
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: "Not your hero" });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    // Remove old photo file if it exists
    const existing = await db
      .select({ photoUrl: heroes.photoUrl })
      .from(heroes)
      .where(eq(heroes.id, heroId))
      .limit(1);

    if (existing.length > 0 && existing[0].photoUrl) {
      const oldPath = path.join(uploadsDir, path.basename(existing[0].photoUrl));
      fs.unlink(oldPath, () => {});
    }

    // Update DB
    await db.update(heroes).set({ photoUrl }).where(eq(heroes.id, heroId));

    res.json({ photoUrl });
  });
});

// DELETE /api/heroes/:id/photo — remove hero photo
router.delete("/:id/photo", requireAuth, async (req, res) => {
  const heroId = req.params.id as string;

  if (!(await verifyOwnership(heroId, req.player!.id))) {
    return res.status(403).json({ error: "Not your hero" });
  }

  const existing = await db
    .select({ photoUrl: heroes.photoUrl })
    .from(heroes)
    .where(eq(heroes.id, heroId))
    .limit(1);

  if (existing.length > 0 && existing[0].photoUrl) {
    const oldPath = path.join(uploadsDir, path.basename(existing[0].photoUrl));
    fs.unlink(oldPath, () => {});
  }

  await db.update(heroes).set({ photoUrl: null }).where(eq(heroes.id, heroId));

  res.json({ success: true });
});

export default router;
