# IFNOTGOD TECH team dashboard

The internal tool our team uses to manage clients, subscriptions and the website's content. It stores no data: everything goes through the backend API. See `CLAUDE.md` for the rules and `implementation_plan.md` for progress.

## Getting started

Staff log in uses the real backend, so run it first (see `backend/README.md`) and create yourself a
staff account there with `uv run python manage.py create_staff --email you@ifnotgod.com --name "Your Name"`.

```bash
npm ci
cp .env.example .env.local   # local values are in the file
npm run dev                  # http://localhost:3001
```

Locally, the backend writes emails to files instead of sending them. Your log in code is in the newest
file in `backend/.outbox/`.

Without `DASHBOARD_API_URL`, log in shows that the server can't be reached.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DASHBOARD_API_URL` | Yes | The backend API's address. Used only on the server, never sent to the browser. |
| `DASHBOARD_APP_KEY` | Yes | The dashboard's own key for the backend. Must match the backend's `DASHBOARD_APP_KEY`. |
| `DASHBOARD_SESSION_SECRET` | On Vercel | A long random string that encrypts the staff session cookie, which holds the backend's token. Local development uses a built-in one. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the dashboard locally on port 3001 |
| `npm run build` | Builds for production |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit and component tests with Vitest |
| `npm run test:e2e` | Runs browser tests against the production build and a real backend. Run `npm run build` first. |

The browser tests start a throwaway backend themselves, with `backend/scripts/serve_for_e2e.sh`: a fresh
`ifnotgod_backend_e2e` database, one staff account, the clients and plans the stand-in used to show, and
emails written to `backend/.outbox-e2e/`, where the tests read log in codes. The tests run one at a time,
because they share that data. They need PostgreSQL running and the backend repo next to this one, or
`BACKEND_DIR` pointing at it.

## The live site

Every screen uses the real backend. On the live site every page returns "not found" until `DASHBOARD_LIVE` is
`true` in Vercel's production environment (see `src/lib/live.ts`). Previews and local runs always work.
