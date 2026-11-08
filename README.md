# IFNOTGOD TECH team dashboard

The internal tool our team uses to manage clients, subscriptions and the website's content. It stores no data: everything goes through the backend API. See `CLAUDE.md` for the rules and `implementation_plan.md` for progress.

## Getting started

```bash
npm ci
cp .env.example .env.local   # then set DASHBOARD_API_URL
npm run dev                  # http://localhost:3001
```

Without `DASHBOARD_API_URL`, every screen shows that the server can't be reached.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DASHBOARD_API_URL` | Yes | The backend API's address. Used only on the server, never sent to the browser. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the dashboard locally on port 3001 |
| `npm run build` | Builds for production |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit and component tests with Vitest |
| `npm run test:e2e` | Runs browser tests against the production build. Run `npm run build` first. |

## Before staff log in exists

Until phase 2, every page returns "not found" on the live Vercel site (`VERCEL_ENV=production`), so the dashboard can't be opened if it's deployed early. Previews and local runs work as normal.
