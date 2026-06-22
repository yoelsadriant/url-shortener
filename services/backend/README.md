# Backend (NestJS)

URL-shortener API. NestJS + DynamoDB. JWT auth.

## Quick start

Requires **[mise](https://mise.jdx.dev)**, **Docker**, and the **`aws` CLI**. The committed `mise.toml` pins Node 24 and auto-loads `.env`.

```bash
mise trust                       # one-time, approves mise.toml
mise install                     # one-time, pulls Node 24
npm install
cp .env.example .env
docker compose -f compose.yml --profile dev up -d dynamodb-local
./scripts/init-tables.sh         # idempotent
npm run start:dev
```

API at `http://localhost:3000`. `docker compose ... down` wipes the in-memory DDB — rerun the init script to recreate tables.

## Scripts

| Command | Effect |
| --- | --- |
| `npm run start:dev` | Nest watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled bundle |
| `npm test` | Unit + integration |
| `npm run test:e2e` | E2E (needs DynamoDB Local running — see Testing strategy) |
| `npm run lint` | ESLint + Prettier autofix |

One-off ops scripts live in [`scripts/`](scripts) and run directly — currently just `init-tables.sh`.

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
  e2e/         Jest e2e with in-memory DDB stub
```

## Environment

`.env` is the single source of truth — see [`.env.example`](.env.example). When `AWS_ENDPOINT` is set, the SDK points at DynamoDB Local; in prod it's unset and picks up the standard AWS credential chain.

## Testing strategy

- **Unit / integration** — fast, no DB, mocks the SDK boundary.
- **E2E** — hits real DynamoDB Local. Start it with `make test-e2e` (boots DDB + seeds tables before the suite) or `make init && npm run test:e2e`. Each spec truncates tables in `beforeEach`. Fixture in `tests/e2e/helpers/app.fixture.ts` is now ~30 lines.

## Production image

Dockerfile has `build` + `prod` stages — slim runtime, runs as `node`, baked-in `HEALTHCHECK`. `docker compose --profile prod up` builds and runs it.
