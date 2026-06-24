# apps/server/src/game/ — Multiplayer Game Runtime

## Overview

This module replaces the ad-hoc combat tick loop in `routes/combat.ts` and `services/combat-service.ts` with a structured, server-authoritative multiplayer runtime. The four components are independent and communicate via the typed event bus.

## Files

| File | Purpose |
|---|---|
| `tick-scheduler.ts` | Self-correcting 1Hz loop (`setInterval` with drift tracking, budget alarm at 80%, spiral-of-death guard). Replaces `combatService.startTickLoop()`. |
| `event-bus.ts` | Typed `EventEmitter` singleton (`gameEvents`) for decoupling combat logic from socket emission. Events: `round:processed`, `run:started`, `run:completed`, `run:failed`, `loot:dropped`, `hero:leveled`. |
| `session-manager.ts` | Single owner of `Map<runId, PartyFloorRunState>`. Handles lifecycle, emits events on state transitions. |
| `checkpoint-store.ts` | In-process FIFO write queue for DB persistence. Flushes every 100ms or 10 events. (DB writes deferred to Wave 3 — currently logs.) |
| `serializers/combat-serializer.ts` | Single source of truth for `PartyFloorRunState` → `CombatViewState` JSON. DRY: replaces duplicate serialization in `routes/combat.ts`. |
| `validators/socket.ts` | Zod schemas for every client→server socket event. `parseSocketEvent()` helper with typed errors. |

## Event Bus

```typescript
import { gameEvents } from "./event-bus.js";

// Subscribe
gameEvents.on("round:processed", (payload) => {
  // payload: { runId, round, state: PartyFloorRunState }
});

// Emit
gameEvents.emit("round:processed", { runId, round, state });
```

## Adding a new tick handler

```typescript
import { combatScheduler } from "../game/tick-scheduler.js";

combatScheduler.subscribe(async () => {
  // called every 1s
}, "my-handler-name");
```

## Adding a new socket validator

1. Add the Zod schema to `validators/socket.ts`
2. Use it in `socket/index.ts`:
```typescript
import { parseSocketEvent, mySchema } from "../game/validators/socket.js";
socket.on("my:event", (payload) => {
  const data = parseSocketEvent("my:event", payload, mySchema);
  // ...
});
```

## Rate Limits

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login`, `/api/auth/guest` | 5 req / 15 min |
| `POST /api/heroes/:id/combat/start` | 10 req / min |
| `POST /api/party/create` | 5 req / hour |
| `POST /api/heroes/:id/loot/craft` | 20 req / min |
