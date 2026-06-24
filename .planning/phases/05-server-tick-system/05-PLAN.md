# Phase 5: Server-Authoritative Tick System

## Goal
Replace the client-driven poll-and-advance combat model with a server-authoritative tick loop that processes all active combats autonomously and pushes state to all clients via Socket.IO, eliminating sync issues, duplicate popups, and the complexity of six different polling/fallback systems.

## Why
The current architecture has:
- 3 separate combat polling systems (leader `pollCombat`, member `checkPartyCombat`, `pollPartyCombat`)
- A `party-status` read-only REST endpoint
- Socket.IO broadcasts that try to keep everyone in sync but fail because the underlying model is fundamentally client-driven
- Race conditions, duplicate popups, missed rounds, and state-loss on page refresh

A server-authoritative tick system solves all of these with one unified loop.

## Architecture

```
Server tick loop (1000ms)
  ↓
For each active combat run:
  1. processOneRound()
  2. Broadcast round state to party room via Socket.IO
  3. If completed/failed → broadcast finished state
  ↓
Client receives `party:tick` event
  ↓
animateTransition(prevState, state) ← identical to current code
updateHeroBars()
renderMonsters() / updateMonsterBars()
If finished → showResult()
```

## Files to Modify

### `apps/server/src/services/combat-service.ts`
- Add `startTickLoop()` method that runs `setInterval` every 1000ms
- Iterate `this.partyFloors`, skip completed/failed runs
- Call `processOneRound()` for each active run
- Add a callback/event emitter system so routes can listen for ticks
- Store callback function `onTick: (runId, roundState) => void`

### `apps/server/src/routes/combat.ts`
- Remove the `processOneRound()` call from `GET /combat/status`
- The status endpoint now just returns current state without advancing
- Register tick callback: when tick produces round state, emit to Socket.IO party room
- Import `getIO()` from socket module
- On tick → `getIO().to(`party:${runId}`).emit('party:combat-update', state)`

### `apps/server/src/routes/web.ts`
- Remove `pollCombat()` entirely
- Remove `checkPartyCombat()` entirely  
- Remove `pollPartyCombat()` entirely
- Remove `partyCombatInterval`, `partyCombatActive`, `partyPrevState`
- Remove `combatInterval`, `prevState`
- Remove `var combatInterval = null` and all related scheduling
- Remove `var prevState = null`
- Remove `var isLooping = false` (handled server-side or restructured)
- Remove `var loopCount = 0, totalGoldEarned = 0`
- Remove `var showingResult = false, combatGen = 0`
- Keep socket.io connection and `party:combat-update` listener
- The socket handler receives tick state and runs `animateTransition`
- When combat finishes → `showResult(state)`

### Client-side Socket handler (replacement)
```
socket.on('party:combat-update', function(state) {
  if (state.finished) {
    showResult(state);
    return;
  }
  if (prevState) {
    await animateTransition(prevState, state);
  }
  if (state.monsters) renderMonsters(state.monsters);
  updateHeroBars(state.round?.partyHeroes);
  prevState = state;
});
```

## Task Breakdown

### Task 1: Server Tick Loop
- Add `tickInterval: Timer | null` to `CombatService`
- Add `onTick: ((runId: string, state: any) => void) | null` callback
- `startTickLoop()`: clear existing, set `setInterval(tick, 1000)`
- `tick()`: iterate `partyFloors`, skip completed/failed, call `processOneRound`, emit via callback
- `stopTickLoop()`: clear interval
- Start tick loop in constructor or via `initCombatTick()` called from `index.ts`

### Task 2: Remove poll-based advancement from combat route
- `GET /:id/combat/status` → remove `processOneRound()`, just return current state
- Register tick callback in combat route init: when tick fires, emit to party room
- Keep the route for initial state fetch (page refresh recovery)

### Task 3: Register tick callback in combat routes
- In `combat.ts`, after import, register `combatService.onTick = (runId, state) => { ... emit to room ... }`
- Emit `party:combat-update` with full round state + monsters + finished flag

### Task 4: Rewrite client-side combat handler
- Remove ALL polling: `pollCombat`, `checkPartyCombat`, `pollPartyCombat`
- Remove all interval variables: `combatInterval`, `partyCombatInterval`
- Remove `prevState`, `showingResult`, `combatGen`, `isLooping`, `loopCount`, `totalGoldEarned`
- Socket `party:combat-update` handler calls `animateTransition` + rendering
- Initial state fetch on page load: one-time `GET /combat/status` to get current state
- Keep `enterDungeon()` for starting combat (but without setting up polling)
- Keep `loopRetry()` for re-entering (but without setting up polling)

### Task 5: Clean up
- Remove dead code: `pollCombat()`, `checkPartyCombat()`, `pollPartyCombat()`
- Remove dead variables: `prevMonsterIds`, `inCombat`
- Remove the `party-status` endpoint
- Remove the `combatGen` variable and all its usages
- Remove all `setTimeout(pollCombat, ...)` calls from `enterDungeon` and `loopRetry`
- Remove `var combatInterval` from game script

## Must Haves
- Server tick loop processes one round per active run every 1000ms
- Tick broadcasts to Socket.IO party room without crashing
- Client renders combat state from socket events
- Client recovers state on page refresh via one-time `GET /combat/status`
- All polling code removed (no intervals, no timeouts for combat)
- No duplicate popups or race conditions
- Tests pass: `npm test` in packages/game

## Verification
1. Start combat as party leader → server ticks every 1s → both clients see rounds
2. Refresh party member browser → one-time GET /status catches up → socket continues
3. Complete floor → both clients see result overlay simultaneously
4. `npm test` passes in packages/game
5. No `pollCombat` or `combatInterval` references remain in web.ts
