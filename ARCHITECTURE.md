# Jake Idler — Architecture

## Overview

A monorepo idle RPG with an Express.js backend (`apps/server`) and a pure TypeScript game logic library (`packages/game`). The game is a turn-based dungeon crawler where heroes form parties, fight monsters in auto-battling combat, collect loot, and progress through floors.

- **Language:** TypeScript
- **Backend:** Express.js + SQLite (Drizzle ORM)
- **Frontend:** Vanilla HTML/CSS/JS (single-page served by Express)
- **Build:** Turborepo + tsc
- **Database:** SQLite via better-sqlite3

## Directory Structure

```
apps/server/src/
├── auth/          # JWT token generation, verification, middleware
├── config/        # Server configuration
├── db/            # Database connection, schema, migrations
├── routes/        # REST API route handlers (10 files)
├── scripts/       # Utility scripts
├── services/      # Business logic services
├── socket/        # Socket.IO (legacy Godot client support)
├── store/         # Data access stores
└── index.ts       # Server entry point

packages/game/src/
├── combat-engine.ts   # Core combat mechanics
├── dungeon.ts         # Floor/monster generation
├── hero-stats.ts      # Hero stat computation, equipment stats
├── loot.ts            # Loot generation, crafting
├── types/             # Shared type definitions
└── index.ts           # Package exports
```

## Functional Areas

| Area | Files | Responsibility |
|------|-------|----------------|
| **Auth** | `auth.ts`, `jwt.ts`, `middleware.ts` | Player registration, login, JWT (7-day expiry), route guards |
| **Heroes** | `heroes.ts`, `hero-service.ts` | CRUD + delete, ownership verification, equipment equip/unequip |
| **Combat** | `combat.ts`, `combat-service.ts` | Floor run lifecycle, round processing, tick loop, damage/block/heal |
| **Party** | `party.ts`, `party-service.ts` | Party CRUD, invite/join/leave, bot generation, role assignments |
| **Dungeons** | `dungeon.ts`, `dungeon.ts` (game pkg) | Floor generation, monster queue, bracket bosses |
| **Loot & Crafting** | `loot.ts`, `loot-service.ts`, `loot.ts` (game pkg) | Equipment generation, shard drops, crafting, salvage |
| **Friends** | `friends.ts`, `friend-service.ts` | Friend requests, friend list, pending requests |
| **Leaderboard** | `leaderboard.ts`, `leaderboard-service.ts` | Top players, leaderboard updates |
| **Web Client** | `web.ts` | Vanilla HTML/CSS/JS SPA: login/register, hero select, dungeon combat, equipment, party |
| **Socket** | `socket/index.ts` | Legacy Godot client WebSocket + Socket.IO support |
| **Game Engine** | `combat-engine.ts` (game pkg) | processCombat, processRound, calculateCrit, calculateDamage, generateMonster |

## Key Execution Flows

### 1. Server Startup
```
index.ts::main()
  → initDatabase()       [db/connection.ts]
  → initSocketIO()       [socket/index.ts]
  → startGameLoop()      [1s tick loop]
  → HTTP server on :3000
```

### 2. Combat Tick Loop (Core Gameplay)
```
startGameLoop()                     [index.ts, 1s interval]
  → CombatService.tick()            [combat-service.ts:259]
    → processRound()                [combat-engine.ts:74]
      → processCombat()             [heroes attack monsters]
      → calculateCrit()
      → calculateDamage()
    → finaliseRound()               [apply results, check deaths]
    → makeHeroData()                [build round response]
```

### 3. Floor Run (Entering Dungeon)
```
POST /api/heroes/:id/combat/start   [combat.ts:10]
  → verifyOwnership()
  → getPartyByPlayer()
  → syncBotLevels()
  → CombatService.startFloorRun()   [combat-service.ts:137]
    → generateMonsterQueue()        [scale monsters by party size]
    → computeHeroStats()            [per party member]
  → return { heroes, monsters }
```

### 4. Loot Pipeline
```
generateFloorLoot()                 [loot.ts:169]
  → generateEquipment()             [roll rarity, slot, stats]
  → computeEquipmentStats()         [apply stat blocks]
  → getSlotCategory()
processMonsterLoot()                [loot.ts:96]
  → rollShardDrops()
  → getAdjustedDropRate()
```

### 5. Party & Bot System
```
PartyService.addBot()               [party-service.ts]
  → generateBotEquipment()          [create weapon/armour/accessory]
    → makeWeapon()
    → makeArmour()
    → makeAccessory()
PartyService.updateBotLevel()       [regenerate equipment at level]
```

### 6. Web Client Flow
```
GET /game                            → Login/Register screen
  → POST /api/auth/register|login    → JWT token
  → GET /api/heroes                  → Load hero list
  → GET /game/:heroId                → Full game SPA
    → Tabs: Dungeon | Equipment | Party
    → Dungeon: select floor → combat start → poll status (1.5s)
    → Combat renders: Boss → Trash → Tank → DPS → Healer rows
```

## Mermaid Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Web Client (Vanilla JS SPA)"]
        Login["Login / Register"]
        HeroSelect["Hero Select"]
        GameUI["Game Page"]
        CombatUI["Combat Arena"]
        EquipUI["Equipment Tab"]
        PartyUI["Party Tab"]
        Login --> HeroSelect --> GameUI
        GameUI --> CombatUI & EquipUI & PartyUI
    end

    subgraph Server["Express.js Backend (:3000)"]
        HTTP["HTTP Server"]
        Auth["Auth Module<br/>JWT / Register / Login"]
        Routes["Route Handlers"]
        Services["Service Layer"]
        DB["SQLite Database<br/>(Drizzle ORM)"]
        GameLoop["Game Loop<br/>(1s tick)"]
        
        HTTP --> Routes
        Routes --> Auth
        Routes --> Services
        Services --> DB
        GameLoop --> Services
    end

    subgraph GameLib["packages/game (Pure TS)"]
        CombatEngine["Combat Engine<br/>processRound, crit, damage"]
        DungeonGen["Dungeon Generator<br/>floors, monsters, bosses"]
        HeroStats["Hero Stats<br/>computeHeroStats, equipment"]
        LootGen["Loot System<br/>craft, salvage, shards"]
    end

    subgraph Services["Server Services"]
        CS["CombatService<br/>tick, startFloorRun, finaliseRound"]
        HS["HeroService<br/>CRUD, equip/unequip"]
        PS["PartyService<br/>create, invite, bots"]
        LS["LootService<br/>processKillLoot, craft, salvage"]
        FS["FriendService<br/>requests, list"]
        LB["LeaderboardService<br/>top players"]
    end

    subgraph Routes["API Routes"]
        AR["/api/auth/*"]
        HR["/api/heroes/*"]
        CR["/api/heroes/:id/combat/*"]
        DR["/api/dungeon/*"]
        LR["/api/loot/*"]
        PR["/api/party/*"]
        FR["/api/friends/*"]
        LBR["/api/leaderboard/*"]
        WR["/game, /game/:heroId<br/>(serves SPA)"]
    end

    Client -- REST polling --> HTTP
    Services -- uses --> GameLib
    Routes -- delegates to --> Services
    CS -- tick loop --> CombatEngine
    CS -- floor setup --> DungeonGen
    HS -- compute stats --> HeroStats
    LS -- loot generation --> LootGen
    PS -- bot equipment --> LootGen & HeroStats
```

## Data Flow

```
Player → Auth (JWT) → Hero (owns multiple)
  Hero joins Party → Other heroes (player or bot)
  Party enters Dungeon → CombatService.startFloorRun()
    → Generate monsters (scaled by party size)
    → Tick loop: heroes auto-attack → process round
    → Monster dies → Loot drop → Hero gains XP/gold
    → Floor complete → Next floor or repeat
```

## Notes

- **No WebSocket for gameplay** — REST polling only (1.5s interval for combat status)
- **No React/Vue** — Vanilla HTML/CSS/JS served as a single template from `web.ts`
- **Bot heroes** — Auto-generated with equipment when added to a party; synced to the initiating hero's level
- **Role system** — Tank (front, block), DPS (middle, damage), Healer (rear, heal); positions affect targeting
- **Equipment** — 12 slot types across weapon, armour, accessory categories; stats are BigNumber-based
- **Legacy Godot client** — Socket.IO support still present but deprecated; all active development is on the web client
