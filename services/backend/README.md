# Backend (NestJS)

URL-shortener API. NestJS + DynamoDB. JWT auth.

## Quick start

Requires **Node ≥ 20**, **Docker** (for DynamoDB Local), and the **`aws` CLI** (for the init script).

```bash
# 1. Install deps
npm install

# 2. Create .env from the template
cp .env.example .env

# 3. Start DynamoDB Local
docker compose -f compose.yml --profile dev up -d dynamodb-local

# 4. Seed tables (one-off; idempotent — safe to re-run)
set -a; . ./.env; set +a
./scripts/init-tables.sh

# 5. Run the API in watch mode
npm run start:dev
```

API is at `http://localhost:3000`. Stop DDB with `docker compose -f compose.yml --profile dev down`. The container runs `-inMemory`, so a `down` wipes the data — rerun step 4 to recreate the tables.

## Scripts

| Command | Effect |
| --- | --- |
| `npm run start:dev` | Nest watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled bundle |
| `npm test` | Unit + integration |
| `npm run test:e2e` | E2E (stubbed DDB — no Docker) |
| `npm run lint` | ESLint + Prettier autofix |

One-off operational scripts live in [`scripts/`](scripts) and run directly (not via npm) — currently just `init-tables.sh`, which seeds the DynamoDB tables.

## Layout

```
src/
  auth/        JWT register / login / me
  users/       User entity + service
  urls/        Shorten / list / rename / delete / redirect
  config/      Env schema + DynamoDB client
  health/      /health endpoint
tests/
  unit/        Jest unit
  integration/ Jest integration
  e2e/         Jest e2e (in-memory DDB stub, no Docker needed)
scripts/
  init-tables.sh   One-off seed: creates the urls/users tables via the aws CLI
```

## Environment

`.env` is the single source of truth — see [`.env.example`](.env.example). The same file works for both the dockerised prod image and the host-run dev process. When `AWS_ENDPOINT` is set, the AWS SDK points at DynamoDB Local instead of real AWS; in prod the variable is unset and the SDK picks up the standard AWS credential chain.

## Testing strategy

- **Unit / integration** — fast, no DB, mocks the SDK boundary.
- **E2E** — an in-memory `InMemoryDdb` stub in `tests/e2e/helpers/app.fixture.ts` impersonates the SDK. Covers `PutCommand`, `GetCommand`, `QueryCommand`, `DeleteCommand`, and `TransactWriteCommand` with the condition expressions the service actually uses. No container needed; runs in ~1 s.

## Production image

Dockerfile has two stages — `build` (compiles TS) and `prod` (slim runtime, runs as `node`, baked-in `HEALTHCHECK`). Compose `--profile prod` builds and runs it.
