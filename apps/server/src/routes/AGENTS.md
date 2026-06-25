# apps/server/src/routes — REST API Routers

13 Express routers. Each exports `default router`. Registered in `src/index.ts`.

## ROUTE REFERENCE

| Router | Mount | Endpoints |
|--------|-------|-----------|
| `auth.ts` | `/api/auth` | POST login, register, guest |
| `heroes.ts` | `/api/heroes` | CRUD heroes |
| `combat.ts` | `/api/heroes` | POST `/:id/combat/start`, GET `/:id/combat/status` |
| `dungeon.ts` | `/api/heroes` | POST `/:id/dungeon/progress` |
| `loot.ts` | `/api/heroes` | POST `/:id/shop/craft`, `/shop/salvage`, `/shop/salvage-shard` |
| `hero-photo.ts` | `/api/heroes` | POST `/:id/photo` |
| `party.ts` | `/api/party` | POST create, invite, join, leave; GET /; PUT role |
| `friends.ts` | `/api/friends` | GET /; POST add, accept, remove; GET /requests |
| `guilds.ts` | `/api/guilds` | GET /, /mine; POST /, /:id/join, /:id/leave, /:id/kick, /party, /party/leave, /heartbeat; DELETE /:id |
| `chat.ts` | `/api/chat` | POST /send; GET /messages?channel= |
| `admin.ts` | `/api/admin` | GET/PUT /balancing, PUT /balancing/nested, POST /balancing/reset |
| `leaderboard.ts` | `/api/leaderboard` | GET / |
| `web.ts` | `/game` | GET /, /:heroId (SSR SPA with hero data injection) |

## PATTERNS

- All routes use `requireAuth` from `../auth/middleware.js`
- Zod validation on POST bodies with `safeParse` + `flatten().fieldErrors`
- async/await pattern with try/catch, always return 400 on error
- Rate limiters applied inline as middleware on specific routes, not on path prefixes
- Combat cooldown (5s per hero) in `combat.ts` via in-memory Map
- Guild create rate limited (5/hr), join/leave/kick/disband not rate limited

## NOTES

- No integration tests exist for any route handler.
- The `web.ts` route reads `apps/client/index.html` and injects hero data at server-side.
- `chat.ts` and `admin.ts` and `guilds.ts` are not documented in the root AGENTS.md (doc drift).
