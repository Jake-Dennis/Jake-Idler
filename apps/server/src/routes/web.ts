import { Router } from "express";
import { readFileSync } from "fs";
import path from "path";
import { heroService, type HeroResponse } from "../services/hero-service.js";

const router = Router();

const htmlPath = path.resolve(import.meta.dirname, "..", "..", "..", "client", "index.html");

function buildPage(hero: HeroResponse | null): string {
  const html = readFileSync(htmlPath, "utf-8");
  const dataScript = hero
    ? `<script>window.__INITIAL_HERO__ = ${JSON.stringify(hero)};</script>`
    : `<script>window.__INITIAL_HERO__ = null;</script>`;
  return html.replace("<body>", `<body>\n  ${dataScript}`);
}

// GET / — serve login/hero select page
router.get("/", (_req, res) => {
  res.type("html").send(buildPage(null));
});

// GET /:heroId — serve game page with injected hero data
router.get("/:heroId", async (req, res) => {
  const hero = await heroService.getHero(req.params.heroId);
  if (!hero) {
    res.status(404).type("html").send("<h1>Hero Not Found</h1>");
    return;
  }
  res.type("html").send(buildPage(hero));
});

export default router;
