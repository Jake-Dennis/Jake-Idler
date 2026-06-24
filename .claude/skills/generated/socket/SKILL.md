---
name: socket
description: "Skill for the Socket area of Jake-Idler. 7 symbols across 3 files."
---

# Socket

7 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `apps/`
- Understanding how verifyToken, requireAuth, optionalAuth work
- Modifying socket-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/socket/index.ts` | initGodotWebSocket, handleGodotMessage, sendToParty, initSocketIO |
| `apps/server/src/auth/middleware.ts` | requireAuth, optionalAuth |
| `apps/server/src/auth/jwt.ts` | verifyToken |

## Entry Points

Start here when exploring this area:

- **`verifyToken`** (Function) — `apps/server/src/auth/jwt.ts:16`
- **`requireAuth`** (Function) — `apps/server/src/auth/middleware.ts:12`
- **`optionalAuth`** (Function) — `apps/server/src/auth/middleware.ts:34`
- **`initGodotWebSocket`** (Function) — `apps/server/src/socket/index.ts:28`
- **`initSocketIO`** (Function) — `apps/server/src/socket/index.ts:119`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `verifyToken` | Function | `apps/server/src/auth/jwt.ts` | 16 |
| `requireAuth` | Function | `apps/server/src/auth/middleware.ts` | 12 |
| `optionalAuth` | Function | `apps/server/src/auth/middleware.ts` | 34 |
| `initGodotWebSocket` | Function | `apps/server/src/socket/index.ts` | 28 |
| `initSocketIO` | Function | `apps/server/src/socket/index.ts` | 119 |
| `handleGodotMessage` | Function | `apps/server/src/socket/index.ts` | 78 |
| `sendToParty` | Function | `apps/server/src/socket/index.ts` | 106 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `InitSocketIO → SendToParty` | intra_community | 4 |
| `InitSocketIO → VerifyToken` | intra_community | 3 |

## How to Explore

1. `context({name: "verifyToken"})` — see callers and callees
2. `query({search_query: "socket"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
