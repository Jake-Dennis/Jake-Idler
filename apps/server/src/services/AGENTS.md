# apps/server/src/services — Business Logic

11 singleton services. Each exported as `export const xxxService = new XxxService()`.

## SERVICE REFERENCE

| Service | File | Purpose |
|---------|------|---------|
| `heroService` | `hero-service.ts` | CRUD heroes, load equipment stats |
| `combatService` | `combat-service.ts` | Pre-compute floor runs, simulate all rounds |
| `partyService` | `party-service.ts` | In-memory parties (invite, join, leave, bots) |
| `lootService` | `loot-service.ts` | Equipment generation, crafting, salvage, shards |
| `dungeonService` | `dungeon-service.ts` | Floor progression, keys |
| `friendService` | `friend-service.ts` | Friend requests, list online friends |
| `guildService` | `guild-service.ts` | Guild CRUD (create, join, leave, kick, disband) |
| `presenceService` | `presence-service.ts` | Heartbeat tracking, stale sweeper, onlinePlayers map |
| `chatService` | `chat-service.ts` | Send/get messages (global, guild, party, whisper) |
| `leaderboardService` | `leaderboard-service.ts` | Player rankings |
| `balancingService` | `balancing-service.ts` | Read/write/update balancing.json |

## PATTERNS

- All use synchronous better-sqlite3 via Drizzle ORM (no async needed except for friend-service which uses async/await)
- Guild/presence/chat services are synchronous
- `partyService` and `botHeroes` are in-memory only (ephemeral parties)
- Error pattern: throw `GuildError` with status code (guild), plain `Error` (others)

## NOTES

- Zero services have tests (biggest coverage gap).
- `combatService` is the most complex (670 lines, floor simulation + event building).
- `friendService` uses `onlinePlayers` map from `src/socket/index.ts` for presence.
