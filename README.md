# URL Shortener

**Jump to:** [Quick Start](#quick-start) · [Services](#services) · [Architecture](#architecture) · [Design choices](#design-choices) · [API](#api) · [Schema](#schema) · [Testing](#testing) · [Deploy](#deploy-to-aws-cdk)

A production-style URL shortener monorepo. React frontend, NestJS API, DynamoDB.

## Quick Start

Needs **Node ≥ 20**, **Docker**, and **make**.

```bash
make install        # deps for both services (once)
make init           # .env + DynamoDB Local + create tables
make backend        # run backend in this shell
make frontend       # run frontend in another shell
```

Open [http://localhost:5173](http://localhost:5173), sign up, shorten a link. `make help` lists every target. `make down` stops the dev stack.

Prefer to skip `make`? Each service has its own README with step-by-step instructions — see below.

## Services

The monorepo holds three independent pieces. Each has its own `package.json`, lockfile, README, and tests.

| Directory | What it is | Docs |
| --- | --- | --- |
| [`services/backend`](services/backend) | NestJS API + DynamoDB access | [backend/README.md](services/backend/README.md) |
| [`services/frontend`](services/frontend) | React + Vite UI | [frontend/README.md](services/frontend/README.md) |
| [`infra`](infra) | AWS CDK stacks (Fargate, S3+CloudFront, DDB) | [Deploy](#deploy-to-aws-cdk) |
| [`tests`](tests) | k6 load + canary | [Testing](#testing) |

The root [`Makefile`](Makefile) orchestrates the local-dev loop — it just calls into each service's own scripts (no magic). DynamoDB Local runs in Docker via [`services/backend/compose.yml`](services/backend/compose.yml); table creation is a one-shot Node script (`services/backend/scripts/init-tables.mjs`) — no extra container image to pull.

## Architecture

```mermaid
graph TD
    Browser["Frontend\n(React + Vite · :5173)"]
    Backend["Backend\n(NestJS · :3000)"]
    DDB_urls[("urls table")]
    DDB_users[("users table")]

    Browser -->|"POST /auth/{register,login}\nPOST /url\nGET  /url?user=\nPUT  /url/:code/rename\nDELETE /url/:code\nGET  /:code (redirect)"| Backend
    Backend --> DDB_urls
    Backend --> DDB_users
```

## Design choices

- **React + shadcn/ui** — chosen for simplicity; no Figma design step.
- **NestJS over Express** — DI + opinionated module layout keep code consistent across the team; Express invites per-contributor structure that hurts context-switching.
- **Fargate over Lambda** — bursty traffic with idle gaps would hit Lambda cold starts (even with a lambdalith). Fargate stays warm.
- **DynamoDB over Postgres/Mongo + Redis** — less config, lower cost, consistent 4–8 ms latency regardless of item count. Good fit for read-heavy workloads; enable DAX if a viral link >10k QPS creates a hot partition.
- **Local auth over OAuth** — OAuth needs provider app registration (Google etc.), out of scope and belongs in its own service.
- **S3 + CloudFront** — Vite runs natively on the host in dev, prod ships to S3 + CloudFront via CDK (see [Deploy](#deploy-to-aws-cdk)). Redirect requests still hit the backend, which keeps the door open for analytics.
- **Analytics (future)** — clickstream goes to Kinesis Firehose → Parquet in S3 → Athena, not through the app service.

## API

Base URL `http://localhost:3000`. Authenticated endpoints take `Authorization: Bearer <token>`.

| Method   | Path                          | Body / Header                 | Response                            |
| -------- | ----------------------------- | ----------------------------- | ----------------------------------- |
| `GET`    | `/health`                     | —                             | `{ status, uptimeSeconds, ... }`    |
| `POST`   | `/auth/register`              | `{ username, password }`      | `{ token }`                         |
| `POST`   | `/auth/login`                 | `{ username, password }`      | `{ token }`                         |
| `GET`    | `/auth/me`                    | Bearer                        | `{ userId, username, createdAt }`   |
| `POST`   | `/url`                        | `{ url, userId, customUrl? }` | `{ shortUrl }`                      |
| `GET`    | `/url?user=:userId`           | —                             | `Url[]`                             |
| `PUT`    | `/url/:code/rename?user=:userId` | `{ newCode }`              | `{ shortUrl }`                      |
| `DELETE` | `/url/:code?user=:userId`     | —                             | `204` (no content)                  |
| `GET`    | `/:code`                      | —                             | `302 → originUrl` (short link)      |

Validation: `username` 3–20 `[a-zA-Z0-9_]`, `password` 8–64, `customUrl` 1–32 `[a-zA-Z0-9_-]`. Passwords stored as `salt:hash` (`salt` = 16 hex bytes, `hash` = `SHA-256(salt + password)`).

## Schema

- **`urls`** — PK `code`, GSI `user-index` on `userId`. Plus `originUrl`, `createdAt`.
- **`users`** — PK `userId` (UUID v4), GSI `username-index` on `username`. Plus `password`, `createdAt`.

## Testing

| Command | Scope |
| --- | --- |
| `make test` | Backend + frontend unit / integration |
| `make test-e2e` | Backend e2e (in-memory DDB stub — no Docker) |
| `npm --prefix services/frontend run test:e2e` | Playwright (needs running stack) |
| `k6 run tests/redirect-load.js` | Load test (needs running stack) |

**Load test** ([`tests/redirect-load.js`](tests/redirect-load.js)) ramps redirects to 5000 req/s with a 20 req/s writer, p95 < 200 ms, error < 1%. Override with `BASE_URL` / `SEED_COUNT`. **Canary** ([`tests/redirect-canary.js`](tests/redirect-canary.js)) is a single-iteration probe of register → create → redirect; add a `schedule:` trigger to [`canary.yml`](.github/workflows/canary.yml) to wire it to prod.

## Deploy to AWS (CDK)

Three stacks in [`infra/`](infra/):

| Stack                  | What it creates |
| ---------------------- | --------------- |
| `UrlShortenerData`     | DynamoDB tables (PAY_PER_REQUEST, PITR, `RETAIN`). |
| `UrlShortenerBackend`  | Fargate (0.25 vCPU / 0.5 GB) + ALB in default VPC. JWT in Secrets Manager. IAM least-privilege. |
| `UrlShortenerFrontend` | Private S3 + CloudFront (OAC, SPA fallback). Uploads `services/frontend/dist/`. |

```bash
cd infra && npm install
npx cdk bootstrap aws://<ACCOUNT_ID>/ap-southeast-1   # once per account/region
npx cdk deploy UrlShortenerData UrlShortenerBackend   # ~10 min, outputs BackendUrl

export VITE_API_URL=http://<BackendUrl>
npm --prefix ../services/frontend run build
npx cdk deploy UrlShortenerFrontend
```

Redeploy backend: `cdk deploy UrlShortenerBackend`. Tear down: `cdk destroy UrlShortenerFrontend UrlShortenerBackend` (tables are `RETAIN`ed).

**Cost (Singapore, idle):**

| Service                              | Monthly  |
| ------------------------------------ | -------- |
| Fargate (0.25 vCPU / 0.5 GB)         | ~$10     |
| ALB                                  | ~$16     |
| DynamoDB on-demand (low)             | <$1      |
| S3 + CloudFront (low, often free)    | <$1      |
| Secrets Manager + ECR + CloudWatch   | <$2      |
| **Floor**                            | **~$28** |

**Caveats:** plain HTTP on ALB (add ACM + Route53 for prod); single task, no autoscaling; default VPC; tables retained on destroy.
