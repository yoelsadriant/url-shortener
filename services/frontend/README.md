# Frontend (React + Vite)

URL-shortener UI. React 18 + Vite + Tailwind + shadcn/ui + react-router.

## Quick start

Requires **Node ≥ 20**. Backend should be running at `http://localhost:3000` — see [../backend/README.md](../backend/README.md).

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

| Var | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL; also used to build the short links shown in the UI |

Set inline (`VITE_API_URL=... npm run dev`) or in `.env.local`. Production builds bake it in:

```bash
VITE_API_URL=https://api.example.com npm run build
```

Output goes to `dist/`. Deploy it wherever you host static SPAs (S3 + CloudFront, Netlify, Vercel, etc.).

## Scripts

| Command | Effect |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production bundle to `dist/` |
| `npm run preview` | Preview the built bundle |
| `npm test` | Vitest (`-- --run` for CI / one-shot) |
| `npm run test:e2e` | Playwright (needs running stack) |

## Layout

```
src/
  pages/      Route components (HomePage, LoginPage, DashboardPage)
  components/ Header, AuthForm, UrlList, ui/* (shadcn primitives)
  context/    AuthContext (token in localStorage)
  hooks/      useUrlShortener
  actions/    Fetch wrappers: shortenUrl, getMyUrls, deleteUrl, renameUrl, authActions
  types/      Shared types
```
