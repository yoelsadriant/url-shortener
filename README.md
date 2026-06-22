# URL Shortener

**Jump to:** [Quick Start](#quick-start) · [Services](#services) · [Architecture](#architecture) · [Design choices](#design-choices) · [API](#api) · [Schema](#schema) · [Testing](#testing) · [Deploy plan](#deploy-plan-aws)

Production-style URL shortener monorepo. React frontend, NestJS API, DynamoDB.

## Quick Start

Needs **Node ≥ 24**, **Docker**, and **make**.

```bash
make install        # once
make init           # .env + DynamoDB Local + tables
make backend        # this shell
make frontend       # another shell
```

Open [http://localhost:5173](http://localhost:5173), sign up, shorten a link. `make` with no args lists every target.

Optional: install [mise](https://mise.jdx.dev) and run `mise trust` in `services/backend/`. The committed `mise.toml` pins Node 24 and auto-loads `.env` whenever you `cd` there — no `set -a; . .env; set +a` ritual before raw `npm` commands.

## Services

| Directory | What it is | Docs |
| --- | --- | --- |
| [`services/backend`](services/backend) | NestJS API + DynamoDB access | [README](services/backend/README.md) |
| [`services/frontend`](services/frontend) | React + Vite UI | [README](services/frontend/README.md) |
| [`tests`](tests) | k6 load + canary | [Testing](#testing) |

## Architecture

![Architecture diagram](url_shortener_flow.png)

## Design choices

- **React + shadcn/ui** — chosen for simplicity; no Figma design step.
- **NestJS over Express** — DI + opinionated module layout keeps team code consistent; Express lets every contributor invent their own structure.
- **DynamoDB over Postgres/Mongo + Redis** — single-digit-ms reads, no idle cost, scales without re-sharding. Add DAX if a viral link hot-partitions.
- **Conditional writes, not locks** — code collisions handled with `attribute_not_exists(code)`; rename is a single `TransactWriteItems` (put new + delete old). No app-level locking, no read-modify-write races.
- **JWT in localStorage** — stateless tokens over server sessions/cookies. Trades CSRF immunity for XSS exposure; acceptable here, would revisit for a production SaaS (`HttpOnly` cookies + CSRF tokens).
- **Local auth over OAuth** — OAuth needs provider app registration (Google etc.), out of scope and belongs in its own service.

## API

Base URL `http://localhost:3000`.

| Method   | Path                              | Body                          | Response                          |
| -------- | --------------------------------- | ----------------------------- | --------------------------------- |
| `GET`    | `/health`                         | —                             | `{ status, uptimeSeconds, ... }`  |
| `POST`   | `/auth/register`                  | `{ username, password }`      | `{ token }`                       |
| `POST`   | `/auth/login`                     | `{ username, password }`      | `{ token }`                       |
| `GET`    | `/auth/me`                        | Bearer                        | `{ userId, username, createdAt }` |
| `POST`   | `/url`                            | `{ url, userId, customUrl? }` | `{ shortUrl }`                    |
| `GET`    | `/url?user=:userId`               | —                             | `Url[]`                           |
| `PUT`    | `/url/:code/rename?user=:userId`  | `{ newCode }`                 | `{ shortUrl }`                    |
| `DELETE` | `/url/:code?user=:userId`         | —                             | `204`                             |
| `GET`    | `/:code`                          | —                             | `302 → originUrl`                 |

Validation: `username` 3–20 `[a-zA-Z0-9_]`, `password` 8–64, `customUrl` 1–32 `[a-zA-Z0-9_-]`. Passwords stored as `salt:hash` (16 hex bytes salt, `SHA-256(salt + password)`).

## Schema

- **`urls`** — PK `code`, GSI `user-index` on `userId`. Plus `originUrl`, `createdAt`.
- **`users`** — PK `userId` (UUID v4), GSI `username-index` on `username`. Plus `password`, `createdAt`.

## Testing

| Command | Scope |
| --- | --- |
| `make test` | Backend + frontend unit / integration |
| `make test-e2e` | Backend e2e (boots DDB Local + seeds tables, then runs) |
| `npm --prefix services/frontend run test:e2e` | Playwright (needs running stack) |
| `k6 run tests/redirect-load.js` | Load — 5000 req/s redirects, p95 < 200 ms |
| `k6 run tests/redirect-canary.js` | Canary — single register → create → redirect probe |

Both k6 scripts honour `BASE_URL` and `SEED_COUNT` env overrides.

## Deploy plan (AWS)

> The CDK implementation isn't in this repo yet — the section below captures the intended topology and a cost estimate so it can be re-added when ready.

Three stacks:

| Stack                  | What it would create |
| ---------------------- | -------------------- |
| `UrlShortenerData`     | DynamoDB tables (PAY_PER_REQUEST, PITR, `RETAIN`). |
| `UrlShortenerBackend`  | Fargate (0.25 vCPU / 0.5 GB) + ALB in default VPC. JWT in Secrets Manager. IAM least-privilege (Get/Put/Delete/Query on the two tables only). |
| `UrlShortenerFrontend` | Private S3 + CloudFront (OAC, SPA fallback). Uploads `services/frontend/dist/`. |

Rough deploy flow (once the stacks exist):

```bash
cd infra && npm install
npx cdk bootstrap aws://<ACCOUNT_ID>/ap-southeast-1   # once per account/region
npx cdk deploy UrlShortenerData UrlShortenerBackend   # outputs BackendUrl

VITE_API_URL=http://<BackendUrl> npm --prefix ../services/frontend run build
npx cdk deploy UrlShortenerFrontend
```

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
