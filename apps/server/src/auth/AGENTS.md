# apps/server/src/auth — Authentication (JWT + bcrypt)

3 files. JWT token auth with bcrypt password hashing. Global Express type augmentation.

## FILE REFERENCE

| File | Exports | Purpose |
|------|---------|---------|
| `jwt.ts` | `generateToken()`, `verifyToken()`, `JwtPayload` | JWT sign/verify (7-day expiry) |
| `middleware.ts` | `requireAuth`, `optionalAuth` | Express middleware — attaches `req.player` |
| `password.ts` | `hashPassword()`, `verifyPassword()` | bcrypt (12 salt rounds) |

## WHERE TO LOOK

| Task | File |
|------|------|
| Change token expiry | `jwt.ts` — `TOKEN_EXPIRY` |
| Change auth header format | `middleware.ts` — Bearer token + ?token fallback |
| Change password hashing | `password.ts` — `SALT_ROUNDS` |

## CONVENTIONS

- `requireAuth` returns 401 with `{ error }` JSON on failure
- `optionalAuth` silently no-ops if no valid token
- `req.player` typed via global `Express.Request` augmentation
- JWT secret falls back to `"dev-secret-change-in-production"` when `JWT_SECRET` env var not set
- Token also accepted via `?token=` query param (for WebSocket/SSE fallback — legacy path)

## NOTES

- No refresh token mechanism — 7-day tokens only
- No role/permission system — any authenticated player can access all routes
