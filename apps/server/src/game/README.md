# apps/server/src/game/ — Combat Serialization & Validation

## Overview

This module contains combat state serialization and socket event validation. Combat simulation has moved to an instant pre-compute model in `services/combat-service.ts`.

## Files

| File | Purpose |
|---|---|
| `serializers/combat-serializer.ts` | Single source of truth for `CombatRoundState` → `CombatEventView[]` JSON. DRY: replaces duplicate serialization in `routes/combat.ts`. |
| `validators/socket.ts` | Zod schemas for every client→server socket event. `parseSocketEvent()` helper with typed errors. |

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
| `POST /api/party/create` | 5 req / hour |
| `POST /api/heroes/:id/loot/craft` | 20 req / min |
