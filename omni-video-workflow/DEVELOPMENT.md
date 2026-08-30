# Development

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (a local `postgresql-16` cluster is fine for dev)
- Redis 7 (job queue, wired in from Phase 2 onward)
- FFmpeg (real, not a stub — the mock video/TTS providers actually invoke it)

## First-time setup

```bash
# start local Postgres + Redis (adjust to your OS's service manager)
pg_ctlcluster 16 main start   # or: sudo service postgresql start
service redis-server start    # or: redis-server &

# create a dev database + role once
sudo -u postgres psql -c "CREATE USER omni WITH PASSWORD 'omni_dev_pw' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE omni_video_dev OWNER omni;"

cp .env.example .env   # then edit DATABASE_URL/REDIS_URL to match the above

npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Visit http://localhost:3000. It redirects to `/dashboard`. Create a project from
the sidebar's "Create Video" link — every provider defaults to `mock`, so this
works with zero API keys.

## Running checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four must pass before considering a change complete.

## Switching a provider to a real vendor

1. Set the matching key in `.env` (`LLM_API_KEY`, `IMAGE_API_KEY`,
   `VIDEO_API_KEY`, `TTS_API_KEY`).
2. Open the Providers page in the app and select the real provider as primary
   for that capability.
3. If the adapter is still a 🚧 stub (see `PROVIDERS.md`), it will throw a clear
   error naming what needs implementing — this is intentional, not a bug.

## Troubleshooting

- **"Invalid environment configuration"** at boot — `DATABASE_URL` or
  `REDIS_URL` is missing from `.env`. Provider API keys are allowed to be blank.
- **Prisma migration fails to connect** — confirm Postgres is running
  (`pg_lsclusters`) and `DATABASE_URL` matches the role/database you created.
- **Mock video/TTS generation throws an ffmpeg error** — confirm `ffmpeg` is on
  `PATH` (`ffmpeg -version`); set `FFMPEG_PATH` in `.env` if it's installed
  somewhere non-standard.
- **A real provider throws "is not yet wired up"** — expected; that adapter is
  a deliberate stub until Phase 7. Switch back to `mock` on the Providers page,
  or implement the adapter per `PROVIDERS.md`.
