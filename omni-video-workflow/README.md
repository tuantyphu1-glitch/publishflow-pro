# Omni Video Workflow

A modular AI video production engine: script → storyboard → images → image-to-video
clips → voiceover → subtitles → rendered MP4. One reusable workflow engine, many
content workflows (e-commerce, fashion, food review, storytelling, stickman,
finance, documentary), interchangeable AI providers (LLM, image, video, TTS).

This is **Phase 1** of the build (see `ARCHITECTURE.md` for the full phase plan):
project CRUD, the provider abstraction layer, mock providers for every capability,
the workflow config registry, and the app shell. The full mock pipeline
(script → images → video → voice → subtitles → render) lands in later phases.

## Quick start (zero paid APIs required)

Requirements: Node 20+, PostgreSQL, Redis, FFmpeg.

```bash
# 1. Install dependencies
npm install

# 2. Point .env at your local Postgres/Redis (see .env.example)
cp .env.example .env
# edit DATABASE_URL / REDIS_URL if needed

# 3. Create the schema
npx prisma migrate dev

# 4. Seed workflow profiles + default (mock) provider config
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`. Every provider defaults
to **mock** (no API key needed): the sidebar footer and the Assets page both label
mock-generated media so it's never confused with real output.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / start |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed workflow profiles + default provider config |

## Documentation

- `ARCHITECTURE.md` — system design, provider abstraction, phase plan
- `PROVIDERS.md` — how to add/configure an AI provider
- `WORKFLOWS.md` — how to add a new content workflow
- `DEVELOPMENT.md` — environment setup, troubleshooting
