# Frontend (React + Vite)

URL-shortener UI. React 18 + Vite + Tailwind + shadcn/ui + react-router.

## Quick start

Requires **Node ≥ 20**. The backend should already be running on `http://localhost:3000` — see [../backend/README.md](../backend/README.md).

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL — also used to build short links shown in the UI |

Set it inline (`VITE_API_URL=... npm run dev`) or in a `.env.local`.

## Scripts

| Command | Effect |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + Vite production build to `dist/` |
| `npm run preview` | Preview the built bundle |
| `npm test` / `test:run` | Vitest watch / one-shot |
| `npm run test:e2e` | Playwright e2e (needs running stack) |

## Layout

```
src/
  pages/      Top-level route components (HomePage, LoginPage, DashboardPage)
  components/ Header, AuthForm, UrlList, ui/* (shadcn primitives)
  context/    AuthContext (token + user, localStorage-persisted)
  hooks/      useUrlShortener
  actions/    Fetch wrappers: shortenUrl, getMyUrls, deleteUrl, renameUrl, authActions
  types/      Shared types
```

## Production build

```bash
VITE_API_URL=https://api.example.com npm run build
```

Outputs static assets to `dist/`. The CDK `UrlShortenerFrontend` stack uploads this folder to S3 and fronts it with CloudFront — see [../../README.md#deploy-to-aws-cdk](../../README.md#deploy-to-aws-cdk).
