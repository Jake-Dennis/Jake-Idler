# Jake Idler — Agent Instructions

## Repo Overview

Monorepo (Turborepo + npm workspaces) with two packages:

| Package | Path | Role |
|---------|------|------|
| `@jake-idler/server` | `apps/server` | Express.js + SQLite (Drizzle ORM) + Socket.IO, serves SPA at `:3000` |
| `@jake-idler/game` | `packages/game` | Pure TS game logic (combat, loot, hero stats) |

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | `turbo dev` — runs `tsx watch src/index.ts` for server |
| `npm run build` | `turbo build` — compiles both packages (order: game → server) |
| `npm test --prefix packages/game` | 35 vitest tests in game package |
| `npm run dev --prefix apps/server` | Dev mode for server only (hot reload via tsx watch) |
| `node dist/index.js` | Run built server from `apps/server/` |
| `run.bat` | Kill old node.exe, turbo build server, start production |

## Architecture

### Server entrypoint
`apps/server/src/index.ts` — mounts routes, initializes DB, starts leaderboard refresh (10s interval). No game tick loop at startup; combat tick loop starts per-run via `combat-service.ts`.

### Routes (10 files in `apps/server/src/routes/`)
- `/game`, `/game/:heroId` → `web.ts` (vanilla JS SPA template, ~2300 lines)
- `/api/auth/*` → `auth.ts`
- `/api/heroes/*` → `heroes.ts`, `hero-photo.ts`
- `/api/heroes/:id/combat/*` → `combat.ts`
- `/api/heroes/:id/dungeon/*` → `dungeon.ts`
- `/api/heroes/:id/loot/*` → `loot.ts`
- `/api/party/*` → `party.ts`
- `/api/friends/*` → `friends.ts`
- `/api/leaderboard/*` → `leaderboard.ts`

### Combat flow (server-authoritative)
```
POST /combat/start → CombatService.startFloorRun() → tick loop
  → every 1s: processRound() [combat-engine.ts] → finaliseRound() → broadcast via Socket.IO
  → client: socket handler (animateTransition) + polling fallback (GET /status, 1s)
  → status endpoint returns run.lastRound — does NOT process rounds
```

### Web client (vanilla JS SPA)
- Single file (`web.ts`) serves HTML template string + embedded `<script>` with all JS
- Styles: `apps/server/static/css/game.css` (dark gothic) and `login.css`
- Lucide icons loaded from CDN (`unpkg.com/lucide`)
- Combat animations via `animateTransition()` with CSS classes + `animSleep()`

### Database
- SQLite via `better-sqlite3` + Drizzle ORM
- Schema: `apps/server/src/db/schema/schema.ts` — players, heroes, parties, etc.
- Shards stored as JSON `{rarity}_{bracketLevel}` keys (e.g. `rare_10`)

### Game package (`packages/game`)
- `combat-engine.ts` — pure math (damage, crit, processCombat, monster generation)
- `loot.ts` — loot generation, crafting costs, salvage values
- `hero-stats.ts` — stat formula: per-slot = BASE + level + rarityFlat
- `dungeon.ts` — floor/monster generation, bracket equipment levels
- Uses `break_infinity.js` (BigNumber) for stats; all UI values displayed as integers

## Conventions & Gotchas

- **Dark gothic theme**: bg `#0a0a14`, card `#12122a`, border `#1a1a3e`, gold `#fbbf24`, purple `#7c3aed`, green `#22c55e`, red `#ef4444`
- **Desktop-first** — no mobile responsive support; 4 breakpoints exist (1400/900/899/480)
- **All numbers displayed as integers** — Math.round() all display values
- **Equipment**: 12 slots (2 weapon, 5 armor, 5 accessory); formula: additive BASE + level + rarityFlat (tier × 10)
- **Monster HP scaling**: 1500 × floor^0.3 × bossMultiplier; party HP multiplier: 1 + (sqrt(N)-1) × 0.5
- **LOOP mode**: auto-repeats only on victory, stops on manual STOP or page close
- **Gold penalty**: deducted once on wipe (guarded by `goldPenaltyApplied` flag)
- **Hero photos**: uploaded via multer, served from `/uploads/`, square avatars
- **Custom monster images**: `Jake-Assets/Trash-Mobs/` and `Jake-Assets/Boss/`, served at `/assets/`
- **Socket.IO rooms**: solo → `hero:{heroId}`, party → `party:{partyId}`

## Known Stale Facts (ARCHITECTURE.md is outdated)

- ARCHITECTURE.md says "No WebSocket for gameplay — REST polling only" — WRONG. Server uses Socket.IO for combat broadcasts + 1s polling fallback.
- ARCHITECTURE.md says "1.5s interval" — WRONG. Current polling interval is 1000ms.
- `apps/server/src/animation/` (EntityAnimFSM, AnimationQueue, CombatDiff) was deleted — dead code removed.
- Gold penalty has `goldPenaltyApplied` guard — not an infinite drain.

## Known Issues

- Socket.IO connections are inconsistent — client often falls back to polling only (animations drop, HP bars still sync)
- Server crashes from unhandled rejections — global handlers added in `index.ts`
- Tick loop processes runs every 1s regardless of activity — idle loops remain in memory

## GitNexus

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Jake-Idler** (537 symbols, 1164 relationships, 23 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Jake-Idler/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Jake-Idler/clusters` | All functional areas |
| `gitnexus://repo/Jake-Idler/processes` | All execution flows |
| `gitnexus://repo/Jake-Idler/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Services area (32 symbols) | `.claude/skills/generated/services/SKILL.md` |
| Work in the Socket area (7 symbols) | `.claude/skills/generated/socket/SKILL.md` |
| Work in the Cluster_62 area (6 symbols) | `.claude/skills/generated/cluster-62/SKILL.md` |
| Work in the Cluster_60 area (4 symbols) | `.claude/skills/generated/cluster-60/SKILL.md` |
| Work in the Cluster_61 area (4 symbols) | `.claude/skills/generated/cluster-61/SKILL.md` |
| Work in the Cluster_67 area (4 symbols) | `.claude/skills/generated/cluster-67/SKILL.md` |
| Work in the Cluster_68 area (4 symbols) | `.claude/skills/generated/cluster-68/SKILL.md` |

<!-- gitnexus:end -->

Note: skill files under `.claude/skills/generated/` are GitNexus-generated and may reference deleted code (e.g. Animation area, 14 symbols — code was removed). Re-run `node .gitnexus/run.cjs analyze` to refresh.
