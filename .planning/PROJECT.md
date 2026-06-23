# Jake Idler

## What This Is

A dark gothic idle RPG where heroes auto-battle through dungeon floors, collect loot, form parties, and progress through increasingly difficult content. Browser-based with a vanilla HTML/CSS/JS frontend and Express.js backend.

## Core Value

Combat feels visceral and rewarding — smooth animations, satisfying feedback, and clear progression that keeps players engaged.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Better UI** — Dark gothic theme refinement across all screens (hero select, dungeon, equipment, party)
- [ ] **Better combat animations** — Heroes and enemies have polished attack/hit/death animations
- [ ] **Improved enemy visual feedback** — Monsters show damage, blocking, and death more clearly

### Out of Scope

- Mobile responsive layout — Desktop-only game
- React/Vue/framework migration — Vanilla JS stays
- WebSocket real-time — REST polling only
- Audio/SFX — Visual-only game

## Context

Existing codebase at `apps/server/src/routes/web.ts` serves the full game client (2000+ lines of embedded HTML/CSS/JS). Combat uses CSS animations (lunge, projectile, flash, shield glow). Current animations are basic — hero melee uses a translateX lunge, mage uses a projectile, range uses an arc. Monsters only flash white on hit. Gothic dark theme recently applied but needs refinement.

## Constraints

- **Stack**: Express.js + SQLite backend, vanilla HTML/CSS/JS frontend
- **Port**: Server runs on :3000
- **Build**: Turborepo + tsc
- **Fonts**: Cinzel (Google Fonts) for gothic typography

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS over framework | No build step needed for client, simpler deployment | — Pending |
| REST polling over WebSocket | Simpler implementation for turn-based combat | — Pending |
| Cinzel font | Gothic serif matches Dark Souls/Diablo aesthetic | — Pending |
| Lucide icons | Professional SVGs replace emoji icons | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-24 after initialization*
