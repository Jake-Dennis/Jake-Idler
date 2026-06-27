# Jake-Idler — Project Knowledge Base

**Generated:** 2026-06-27
**Commit:** ff406c1
**Branch:** main

## OVERVIEW

Incremental/idle web game (TypeScript, Express, Drizzle/SQLite). Monorepo with Turborepo + npm workspaces: `apps/server` (Express backend + SPA) and `packages/game` (pure-TS game logic). Pre-compute combat model — all rounds simulated server-side instantly, client plays back as cutscene.

## STRUCTURE

```
./
├── apps/server/          # Express :3000 — routes, services, auth, DB, config
│   └── src/
│       ├── index.ts          # Entry point (Express boot, route wiring, DB init, presence sweeper)
│       ├── routes/           # 14 REST routers → /api/{auth,heroes,combat,guilds,chat,admin,…}
│       ├── services/         # 12 singletons — combat, hero, party, loot, guild, chat, presence, …
│       ├── auth/             # JWT (7-day), bcrypt, middleware (requireAuth)
│       ├── db/               # Drizzle ORM + better-sqlite3, schema (includes guilds, chat_messages)
│       ├── game/             # Combat serializers, socket validators, __tests__
│       ├── middleware/       # Rate-limit middleware (express-rate-limit)
│       ├── observability/    # Pino structured logger
│       ├── socket/           # Legacy stub — only exports onlinePlayers + partyMembers Maps
│       ├── store/            # In-memory player cache (player-store.ts)
│       └── config/           # dotenv loader + balancing.json
├── apps/client/          # Client SPA (HTML, CSS, JS) — served by Express via /client route
├── packages/game/        # Pure-TS game engine (no I/O) — combat, loot, dungeon, hero-stats
│   └── src/
│       ├── index.ts          # Barrel export
│       ├── combat-engine.ts  # Damage calc, processCombat, monster gen
│       ├── dungeon.ts        # Floor gen, bracket bosses
│       ├── hero-stats.ts     # Stat computation, equipment stat assembly
│       ├── loot.ts           # Drop tables, salvage, crafting, shards
│       └── types/            # GameConfig, enums, equipment/hero/monster/floor/social
├── admin/                # Standalone desktop balance editor (HTML, no server needed)
├── config/               # balancing.json (runtime-editable balance knobs)
├── docs/                 # GEAR-BALANCE.md
├── Jake-Assets/          # Game art (not yet wired into source)
└── ARCHITECTURE.md       # Design doc (significant drift vs on-disk layout)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add a route | `apps/server/src/routes/` + register in `index.ts` | `export default Router()` |
| Add business logic | `apps/server/src/services/` | Singleton pattern |
| Change game balance | `packages/game/src/` or `apps/server/config/balancing.json` | Runtime via admin editor |
| Change DB schema | `apps/server/src/db/schema/` + raw SQL in `connection.ts` | Drizzle ORM, SQLite |
| Fix auth | `apps/server/src/auth/` | JWT in `jwt.ts`, guard in `middleware.ts` |
| Change UI | `apps/client/` | SPA in HTML + vanilla JS |
| Edit CSS | `apps/client/css/` | `game.css` (29KB), `login.css` (8KB) |
| Add game logic tests | `packages/game/tests/` | Vitest |
| Add server tests | `apps/server/src/**/__tests__/` | Vitest, co-located |
| Edit balance | `admin/editor.html` | Standalone, open `balancing.json` directly |
| Deploy | No CI/CD exists | Manual; no Docker, no workflow files |

## CONVENTIONS

| Concern | Standard | Enforced? |
|---------|----------|-----------|
| TypeScript | Strict mode, ES2022, ESNext modules, bundler resolution | tsc --noEmit |
| Imports | `.js` ext on relative paths, `import type` for types, external first | Convention |
| File names | `kebab-case` | Convention |
| Classes/Types | `PascalCase`, functions `camelCase`, const tables `SCREAMING_SNAKE` | Convention |
| Strings | Double quotes | Convention |
| Indentation | 2 spaces | Convention |
| Tests | Vitest, co-located `*.test.ts` in server; `tests/` dir in game | Framework |
| Services | Singleton: `export const xxxService = new XxxService()` | Convention |
| No linter/formatter | Only `tsc --noEmit` | Known gap |

## ANTI-PATTERNS (THIS PROJECT)

- **`as any` / `as any[]`** — 27+ casts across 8 files. Drizzle row types are `any`; define `EquipmentRow` etc.
- **Empty catch blocks** — 8 in client JS, mostly fire-and-forget fetches (heartbeat, photo upload).
- **Dead infrastructure** — `CombatRole`/`CombatPosition` enums (all heroes are DPS/Middle), `spd` field on equipment.
- **Mutation of DB rows** — `toResponse()` mutates Drizzle row object instead of copying.
- **No Node engine pin** — `packageManager` set, but no `engines` block or `.nvmrc`.
- **Doc drift** — ARCHITECTURE.md references old tick-scheduler and Socket.IO; check source for actual current state.
- **Live SQLite DB tracked in git** — `apps/server/data/jake_idler.db` not in `.gitignore`.
- **Vitest version mismatch** — server `^2.1.0`, game `^4.1.9`.
- **Client JS in one file** — `app.js` is ~106KB; no bundler, no modules.

## COMMANDS

```bash
turbo dev          # Dev — tsx watch + turborepo
turbo build        # Build — tsc all packages
turbo lint         # Type-check only (tsc --noEmit)
turbo clean        # Remove dist/ + *.tsbuildinfo
cd apps/server && npm test  # Server tests (vitest)
cd packages/game && npm test  # Game tests (vitest)
npm run build:server  # Build server after turbo
```

## NOTES

- **DB drift:** `.env.example` documents PostgreSQL + Redis — it's SQLite. Ignore it.
- **Two DB files:** `data/jake_idler.db` (root, orphan) and `apps/server/data/jake_idler.db` (live). Only root is gitignored.
- **`packages/game` types** point to `./src/index.ts` (source, not dist). Works without project references.
- **Combat model:** Pre-compute (AFK Arena style). All rounds simulated server-side in <50ms. No tick loop, no WebSocket.
- **`run.bat` kills ALL node processes** — not just this project's. Use `turbo dev` instead.
