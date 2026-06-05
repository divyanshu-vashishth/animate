# Stickman Studio

AI-powered 2D stickman animation editor built as a Turborepo monorepo.

<p align="center">
  <video src="apps/web/public/landing/stickman_animation_1779616259633.webm" width="600" autoplay loop muted playsinline></video>
</p>

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

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL` for production Postgres.
Without `DATABASE_URL`, the API uses an in-memory dev store.

## Contributions

Contributions are welcome!



