# Phase 01: Foundation — Asset Extraction - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

Extract CSS styles and animation asset directories from the monolithic `apps/server/src/routes/web.ts` into separate static files with zero behavioral change. This unblocks all subsequent animation refactoring phases.

## Implementation Decisions

### CSS Extraction
- Extract all game template CSS (from `generateGameHtml`) into `apps/server/static/css/game.css`
- Extract login template CSS into `apps/server/static/css/login.css`
- Reference via `<link>` tags in the HTML templates
- NO behavioral changes — same CSS, same selectors, same values

### HTML/JS Structure
- The HTML template stays inline in `web.ts` — only CSS is extracted
- JS remains inline in the template (extraction deferred to later phases)
- Font and Lucide CDN links remain in the HTML `<head>`

### File Organization
- `apps/server/static/css/game.css` — game page styles
- `apps/server/static/css/login.css` — login/register styles
- `apps/server/static/` — served via Express `express.static`

### Express Server
- Add `app.use("/static", express.static(...))` to index.ts
- Update template `<link>` tags to point to `/static/css/game.css`

## Deferred Ideas

- JS extraction from web.ts — deferred to Phase 2 or later
- HTML template extraction — deferred (inline is acceptable for now)
