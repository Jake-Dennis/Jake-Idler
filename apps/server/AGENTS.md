# apps/server — Express Backend

OVERVIEW
Express + Drizzle/SQLite + Socket.IO backend for Jake-Idler idle game. Serves SPA on /game and REST API on /api/*.

STRUCTURE
- src/game/ — Multiplayer runtime: tick scheduler, event bus, session manager, serializers, validators
- src/routes/ — 10 Express routers: auth, heroes, combat, dungeon, loot, party, friends, leaderboard, hero-photo, web
- src/services/ — 7 singleton services: combat, hero, party, loot, dungeon, friend, leaderboard
- src/auth/ — JWT (7-day), bcrypt, requireAuth/optionalAuth middleware
- src/db/ — Drizzle ORM + better-sqlite3; schema lives at db/schema/ + combat_events + party_state tables
- src/socket/ — Socket.IO + legacy Godot WebSocket on /godot (subscribes to gameEvents for combat)
- src/store/ — In-memory player cache (player-store.ts, 1 file)
- src/animation/ — Client-side CSS/WAAPI animation FSM (dead code, zero runtime callers)
- src/config/ — dotenv loader
- src/middleware/ — Rate-limit middleware (express-rate-limit)
- src/observability/ — Pino structured logger
- src/scripts/ — Empty dir (documented in ARCHITECTURE.md but not populated)
- static/css/ — game.css (26KB), login.css (8KB)

WHERE TO LOOK
- Add route → src/routes/*.ts + register in src/index.ts
- Change business logic → src/services/*.ts
- Change auth → src/auth/
- Change DB schema → src/db/schema/schema.ts + run drizzle-kit
- Change tick behavior → src/game/tick-scheduler.ts
- Add socket handler → src/socket/index.ts + validate in src/game/validators/socket.ts

CONVENTIONS
- Each service exports singleton: export const xxxService = new XxxService()
- Routes export default Router()
- ESM .js extension on relative imports
- initDatabase() is called inside server.listen callback (server accepts traffic before DB ready)
- Tick loop started in index.ts via combatScheduler.start() (not in route file)
- Socket events validated via Zod schemas in game/validators/
- Combat state broadcast via gameEvents (typed event bus), not direct service callback

ANTI-PATTERNS (FIXED)
- catch (_) {} in combat.ts and party.ts — replaced with pino error logging (d3f539d)
- leaderboardService.updateLeaderboard() no-op — setInterval removed (d3f539d)
- Socket rooms trust the client — party:join-room now validates via partyService (d3f539d)
- Tick loop started in route file — moved to index.ts boot (d3f539d)
- Duplicate combat state serialize — centralized in combat-serializer.ts (1f8c3ac)

NOTES
- .env.example documents PostgreSQL/Redis but app uses SQLite; ignore it
- Live DB is apps/server/data/jake_idler.db, not root data/
- animation/ is browser-side code misplaced in the server package
