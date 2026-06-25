# apps/client — Client SPA

Served by Express at `/client`. Vanilla HTML + CSS + JS (no framework).

## STRUCTURE

- `index.html` — Game UI template (tabs: Dungeon, Equipment, Crafting, Friends, Party, Guild, Chat)
- `css/game.css` — Main game styles (29KB)
- `css/login.css` — Login/hero select styles (8KB)
- `js/app.js` — All game logic (enter dungeon, crafting, friends, guild, chat, party)
- `js/combat-animations.js` — Cutscene playback engine (hero attacks, monster hits, deaths)

## WHERE TO LOOK

| Task | File |
|------|------|
| Add a tab | `index.html` + `js/app.js` tab switch handler |
| Change combat cutscene | `js/combat-animations.js` |
| Add guild feature | `js/app.js` (Guild section) + `index.html` |
| Add chat feature | `js/app.js` (Chat section) + `index.html` |
| Change CSS | `css/game.css` |

## NOTES

- js/app.js is ~90KB — all game features in one file. Heavy but no build step.
- Server has duplicate files at `apps/server/static/` — client dir is the source of truth.
- No bundler, no framework, no npm dependencies. Pure vanilla JS.
- Functions exposed via `window.*` for inline `onclick=` in HTML.
- 30s auto-refresh for equipment/crafting tabs; 5s for party tab; 3s for chat.
