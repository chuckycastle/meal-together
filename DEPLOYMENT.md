# MealTogether Deployment Guide

Production runs on Cloudflare: one Worker serves the built frontend and the JSON API, with a D1 database.

- **URL**: https://mealtogether.chuckycastle.io
- **Worker**: `mealtogether` (source in `worker/`)
- **Database**: D1 `mealtogether` (schema in `worker/migrations/`)
- **Static files**: `frontend/dist`, served by the Worker's assets binding
- **Secret**: `JWT_SECRET` (signs access and refresh tokens)

The Flask app in `backend/` is not deployed. It remains for local reference and holds the recipe seed data (`backend/family_recipes.py`).

## Deploy

```bash
cd worker
npm install
unset CLOUDFLARE_API_TOKEN   # use the `wrangler login` session; see Authentication
npm run deploy
```

`npm run deploy` type-checks the Worker, runs its tests, builds the frontend with `npm run build:cloudflare`, and runs `wrangler deploy`.

`build:cloudflare` sets the API base to the same origin and turns off the Supabase and recipe-import feature flags, so values in `frontend/.env.local` do not reach the production bundle.

## Authentication

Wrangler needs `workers (write)` and `d1 (write)`. The saved `wrangler login` session has both. A `CLOUDFLARE_API_TOKEN` in the shell environment takes precedence over that session; if the token lacks those permissions, commands fail with `Authentication error [code: 10000]`. Unset the variable for the command.

## Database migrations

Add a numbered SQL file to `worker/migrations/`, then:

```bash
cd worker
npm run migrate:local    # local D1 used by `wrangler dev`
npm run migrate:remote   # production
```

Apply the migration before deploying code that depends on it.

## Secrets

```bash
cd worker
openssl rand -hex 48 | wrangler secret put JWT_SECRET
```

Changing `JWT_SECRET` signs every user out. For local development, put `JWT_SECRET=<any value>` in `worker/.dev.vars` (not committed).

## Load the family recipes

After an account exists and has a family:

```bash
cd worker
python3 scripts/make_seed_sql.py --email you@example.com --timezone America/Los_Angeles > /tmp/seed.sql
wrangler d1 execute mealtogether --remote --file /tmp/seed.sql
```

The script adds eight holiday recipes and the Thanksgiving 2026 schedule to the family that the account belongs to. It adds only missing rows.

## Local development

```bash
cd frontend && npm run build:cloudflare
cd ../worker
npm run migrate:local
wrangler dev --port 8787          # http://localhost:8787
python3 scripts/smoke_test.py --base http://localhost:8787
```

`scripts/smoke_test.py` creates throwaway accounts and exercises every route. It refuses to run against a non-local address.

## Verify a deployment

```bash
curl -s https://mealtogether.chuckycastle.io/api/health        # {"status":"healthy"}
curl -s -o /dev/null -w '%{http_code}\n' https://mealtogether.chuckycastle.io/api/families   # 401
```

Then sign in and check the Kitchen, Plan, Recipes, and Shopping pages.

## Logs

```bash
cd worker
wrangler tail
```

Observability is enabled in `wrangler.jsonc`; logs also appear in the Cloudflare dashboard under the Worker.

## Rollback

```bash
cd worker
wrangler deployments list
wrangler rollback <version-id>
```

A rollback restores Worker code and static files. It does not undo D1 migrations. D1 Time Travel restores the database to an earlier point within the retention window of the plan:

```bash
wrangler d1 time-travel restore mealtogether --timestamp <unix-seconds>
```

## Not available on Cloudflare

- Recipe import from a link (`POST /recipes/import` returns 501). The Flask implementation depends on an LLM service and server-side fetches.
- Cooking session routes. The timer board (`/api/families/{id}/timers`) replaces them.
- Socket.IO events. Pages poll: timers every 5 seconds, shopping every 10, the meal sheet every 15.

## Previous hosting

Until 2026 the app ran on an AWS Lightsail instance (nginx, Flask under systemd, PostgreSQL). That server is no longer reachable. `deploy.sh` and `backend/*.service` describe that setup and are not used.
