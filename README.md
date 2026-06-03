# Stickman Studio

AI-powered 2D stickman animation editor built as a Turborepo monorepo.

<p align="center">
  <video src="apps/web/public/landing/stickman_animation_1779616259633.webm" width="600" autoplay loop muted playsinline></video>
</p>

## Stack

- **Frontend:** Next.js 15, React, Tailwind, Zustand
- **Engine:** PixiJS (rendering), GSAP (tweens), ECS architecture
- **Timeline:** `@stickman/timeline` package
- **API:** Hono (Node)
- **Renderer worker:** FFmpeg export service
- **Database:** Drizzle ORM + PostgreSQL (Supabase-compatible)
- **Auth:** Better Auth (Postgres) — dev mode uses in-memory sessions

## Quick start

```bash
pnpm install
pnpm sprites:manifest
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Renderer: http://localhost:4001

Sign up with email/password or Google. Set `DATABASE_URL` and `BETTER_AUTH_SECRET` in `.env`.

## Project structure

```
apps/web          Next.js editor UI
apps/api          Hono REST API
apps/renderer     FFmpeg export worker
packages/engine   PixiJS ECS animation engine (no React)
packages/timeline Keyframe evaluation + player
packages/shared   Types, commands, sprite manifest
packages/ai         AI JSON schema + compiler
packages/physics    Matter.js wrappers
packages/database   Drizzle schemas
packages/auth       Better Auth config
```

## Sprites

250 PNG stickman sprites live in `assets/sprites/` (fighter, pistol, sword, extras).
Run `pnpm sprites:manifest` after adding assets.

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL` for production Postgres.
Without `DATABASE_URL`, the API uses an in-memory dev store.

## Contributions

Contributions are welcome!


