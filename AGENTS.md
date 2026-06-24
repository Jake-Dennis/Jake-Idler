# Jake-Idler — Project Knowledge Base

**Generated:** 2026-06-25 04:30 UTC
**Commit:** d3f539d
**Branch:** main

## OVERVIEW

Incremental/idle web game (TypeScript, Express, Drizzle/SQLite). Monorepo with Turborepo + npm workspaces: `apps/server` (Express backend + SPA) and `packages/game` (pure-TS game logic library).

## STRUCTURE

```
./
├── apps/server/          # Express :3000 — routes, services, auth, socket, DB
│   └── src/
│       ├── index.ts          # Entry point (Express boot, route wiring, socket init)
│       ├── game/             # Multiplayer runtime: tick scheduler, event bus, session manager, serializers, validators, rate-limit
│       ├── routes/           # 10 REST routers → /api/{auth,heroes,combat,…}
│       ├── services/         # 7 singletons — combat, hero, party, loot, dungeon, friend, leaderboard
│       ├── auth/             # JWT (7-day), bcrypt, middleware (requireAuth)
│       ├── db/               # Drizzle ORM + better-sqlite3, schema
│       ├── socket/           # Socket.IO + legacy Godot WebSocket (subscribes to gameEvents)
│       ├── animation/        # Client-side CSS animation FSM (dead code — misplaced)
│       ├── store/            # In-memory player cache (1 file)
│       └── middleware/       # Rate-limit middleware
├── packages/game/        # Pure-TS game engine (no I/O)
│   └── src/
│       ├── index.ts          # Barrel export: types, combat, dungeon, loot, hero-stats
│       ├── combat-engine.ts  # Damage calc, crit, round processing
│       ├── dungeon.ts        # Floor generation, bracket bosses
│       ├── hero-stats.ts     # Stat computation, equipment stat assembly
│       ├── loot.ts           # Drop tables, salvage, crafting
│       └── types/            # Config, enums, equipment/hero/monster/floor/social
├── docs/                 # GEAR-BALANCE.md
├── data/                 # SQLite DB (orphan — live DB is in apps/server/data/)
├── Jake-Assets/          # Game art (not yet wired into source)
└── ARCHITECTURE.md       # Design doc (minor doc drift vs on-disk layout)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add a route | `apps/server/src/routes/` + register in `index.ts` | `export default Router()` |
| Add business logic | `apps/server/src/services/` | Singleton pattern |
| Change game balance | `packages/game/src/` | Tuning in `config.ts` constants |
| Change DB schema | `apps/server/src/db/schema/` | Drizzle, SQLite, migration in `drizzle/` |
| Fix auth | `apps/server/src/auth/` | JWT in `jwt.ts`, guard in `middleware.ts` |
| Change UI | `apps/server/src/routes/web.ts` | 2.3K-line SPA — extract if large changes |
| Edit CSS | `apps/server/static/css/` | `game.css` (26KB), `login.css` (8KB) |
| Add game logic tests | `packages/game/tests/` | Vitest |
| Deploy | No CI/CD exists | Manual; no Docker, no workflow files |

## CONVENTIONS

| Concern | Standard | Enforced? |
|---------|----------|-----------|
| TypeScript | Strict mode, ES2022, ESNext modules, bundler resolution | tsc --noEmit |
| Imports | `.js` ext on relative paths, `import type` for types, external first | Convention |
| File names | `kebab-case` (except `animation/` — PascalCase legacy) | Convention |
| Classes/Types | `PascalCase`, functions `camelCase`, const tables `SCREAMING_SNAKE` | Convention |
| Strings | Double quotes | Convention |
| Indentation | 2 spaces | Convention |
| Tests | Vitest, co-located `*.test.ts` in server; separate `tests/` in game | Framework |
| Services | Singleton pattern: `export const xxxService = new XxxService()` | Convention |
| No linter/formatter | Only `tsc --noEmit` for lint | Known gap |

## ANTI-PATTERNS (THIS PROJECT)

- **`as any` / `as any[]`** — 30+ casts across `hero-service`, `party-service`. Drizzle row types are `any`; define `HeroRow` etc. instead.
- **Empty catch blocks** — `catch (_) {}` in `combat.ts`, `party.ts`. Socket.io emission failures are silently swallowed. **(Fixed in d3f539d — replaced with pino logging)** 
- **No-op called on timer** — `leaderboardService.updateLeaderboard()` runs every 10s but does nothing. **(Removed in d3f539d)**
- **Dead infrastructure** — `CombatRole`/`CombatPosition` enums (all heroes are DPS/Middle), `spd` field on equipment, half-finished animation reorg.
- **Mutation of DB rows** — `toResponse()` mutates the Drizzle row object instead of copying.
- **No Node engine pin** — `packageManager` set, but no `engines` block or `.nvmrc`.
- **Socket rooms trust the client** — `party:join-room` had no membership check. **(Fixed in d3f539d — now validates via partyService)**
- **Tick loop in route file** — `combatService.startTickLoop()` was called as a side-effect on route import. **(Fixed in d3f539d — moved to index.ts boot)**
- **Duplicate combat state serialize** — `routes/combat.ts` inlined the same JSON shape in 2 places. **(Fixed in 1f8c3ac — centralized in combat-serializer)**

## COMMANDS

```bash
turbo dev          # Dev — tsx watch + turborepo
turbo build        # Build — tsc all packages
turbo lint         # Type-check only (tsc --noEmit)
turbo clean        # Remove dist/ + *.tsbuildinfo
npm test           # Only runs if in packages/game (vitest)
cd apps/server && npm test  # Server tests (vitest)
```

## NOTES

- **DB drift:** `.env.example` documents PostgreSQL + Redis — it's SQLite. Ignore it.
- **Two DB files:** `data/jake_idler.db` (root, orphan) and `apps/server/data/jake_idler.db` (live). `.gitignore` covers root but not server.
- **`packages/game` types** point to `./src/index.ts` (source, not dist). Works because no project references.
- **`animation/` is dead code** — browser-side CSS/WAAPI code sitting in the server package with zero runtime callers.
- **`run.bat` kills ALL node processes** before launch. Use `turbo dev` instead.
