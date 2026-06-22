# Infra (AWS CDK)

CloudFormation stacks for the url-shortener. Three deploys:

| Stack | What it creates |
| --- | --- |
| `UrlShortenerData` | DynamoDB tables (PAY_PER_REQUEST, PITR, `RETAIN`). |
| `UrlShortenerBackend` | Fargate (0.25 vCPU / 0.5 GB) + ALB in the default VPC. JWT in Secrets Manager. IAM least-privilege. |
| `UrlShortenerFrontend` | Private S3 + CloudFront (OAC, SPA fallback). Uploads `services/frontend/dist/`. |

## Quick start

Needs **Node ≥ 20** and AWS credentials (any source — env vars, `AWS_PROFILE`, SSO).

```bash
npm install
npm test                          # offline assertions
npm run synth                     # offline: emit CloudFormation
npx cdk bootstrap aws://<acct>/ap-southeast-1   # once per account/region
npx cdk deploy UrlShortenerData UrlShortenerBackend
VITE_API_URL=http://<BackendUrl> npm --prefix ../services/frontend run build
npx cdk deploy UrlShortenerFrontend
```

## Scripts

| Command | Effect |
| --- | --- |
| `npm test` | Jest assertions against synthesised templates (offline) |
| `npm run synth` | `cdk synth` → CloudFormation to `cdk.out/` (offline) |
| `npm run build` | `tsc` — type-check |
| `npm run diff` | `cdk diff` against the deployed templates |
| `npm run deploy` | `cdk deploy --all` |
| `npm run destroy` | `cdk destroy` — tables are `RETAIN`ed |

## Layout

```
bin/
  app.ts             CDK entry point — instantiates the three stacks
lib/
  data-stack.ts      DynamoDB tables + GSIs
  backend-stack.ts   Fargate + ALB + IAM + Secrets Manager
  frontend-stack.ts  S3 + CloudFront + bucket deploy
test/
  *.test.ts          aws-cdk-lib/assertions tests — no AWS calls
cdk.json             CDK app config + feature flags
cdk.context.json     Cached lookups (default VPC) — checked in
```

## Offline testing

All tests run against the synthesised CloudFormation, not real AWS:

- `Template.fromStack(stack)` synthesises in-process.
- `BackendStack` accepts an optional `vpc` prop so tests inject a fake VPC instead of calling `Vpc.fromLookup`. The default path (production) still uses the lookup.
- `FrontendStack` requires `services/frontend/dist/` to exist; tests create a stub on first run.

## Notes

- **JWT secret** is created by CDK (Secrets Manager, 48-char random). The backend reads it via the ECS task execution role — don't put it in `.env` for prod.
- **VPC lookup** is cached in `cdk.context.json`. If you deploy to a new account, delete that file and rerun `cdk synth` while authenticated.
- **Frontend build** must happen *before* `cdk deploy UrlShortenerFrontend` — the stack uploads `services/frontend/dist/` as-is.
- **Costs** for the deployed stack (Singapore, idle) sit around $28/mo floor — see [../README.md#deploy-to-aws-cdk](../README.md#deploy-to-aws-cdk) for the breakdown and caveats.
