# apps/server — Express Backend

OVERVIEW
Express + Drizzle/SQLite backend for Jake-Idler idle game. Serves SPA on /game and REST API on /api/*.

STRUCTURE
- src/routes/ — 13 Express routers: auth, heroes, combat, dungeon, loot, party, friends, guilds, chat, admin, hero-photo, leaderboard, web
- src/services/ — 11 singleton services: combat, hero, party, loot, guild, chat, presence, dungeon, friend, leaderboard, balancing
- src/game/ — Combat serializers, socket validators
- src/auth/ — JWT (7-day), bcrypt, requireAuth/optionalAuth middleware
- src/db/ — Drizzle ORM + better-sqlite3; schema at schema/ + raw CREATE TABLE in connection.ts
- src/middleware/ — Rate-limit middleware (express-rate-limit)
- src/observability/ — Pino structured logger
- src/socket/ — Legacy stub, exports only onlinePlayers + partyMembers Maps
- src/store/ — In-memory player cache (player-store.ts, 1 file)
- src/config/ — dotenv loader
- config/balancing.json — Runtime-editable balance constants
- static/css/ — game.css, login.css (legacy — apps/client/ is the new SPA source)

WHERE TO LOOK
- Add route → src/routes/*.ts + register in src/index.ts
- Change business logic → src/services/*.ts
- Change auth → src/auth/
- Change DB schema → src/db/schema/schema.ts + add raw SQL to connection.ts
- Edit game balance → config/balancing.json (runtime, no restart needed)
- Add admin endpoints → src/routes/admin.ts

CONVENTIONS
- Each service exports singleton: export const xxxService = new XxxService()
- Routes export default Router()
- ESM .js extension on relative imports
- initDatabase() is called inside server.listen callback
- Rate limiters applied inline on specific routes, not mounted on path prefixes
- Heartbeat via POST /api/guilds/heartbeat (auth-only, no rate limit)

ANTI-PATTERNS (FIXED)
- catch (_) {} in combat.ts and party.ts — replaced with pino error logging
- leaderboardService.updateLeaderboard() no-op — setInterval removed
- Socket rooms trust the client — party:join-room now validates via partyService
- Tick loop started in route file — moved to index.ts boot
- Duplicate combat state serialize — centralized in combat-serializer.ts
- Guild rate limiter catching heartbeat — moved to inline route-specific limiters

NOTES
- .env.example documents PostgreSQL/Redis but app uses SQLite; ignore it
- Live DB is apps/server/data/jake_idler.db — NOT in .gitignore (known issue)
- Combat is pre-compute (AFK Arena style), no tick loop, no WebSocket
- SSE managers and tick scheduler were removed in pre-compute refactor
