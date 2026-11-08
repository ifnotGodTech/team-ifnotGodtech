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
| `DASHBOARD_SESSION_SECRET` | On Vercel | A long random string that signs the staff session cookie. Local development uses a built-in one. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the dashboard locally on port 3001 |
| `npm run build` | Builds for production |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit and component tests with Vitest |
| `npm run test:e2e` | Runs browser tests against the production build. Run `npm run build` first. |

## The stand-in backend

Until the real backend is connected (phase 7), the dashboard uses a stand-in with made-up data. It refuses to run on the live site, where every page returns "not found". Previews and local runs work as normal.

To log in to the stand-in, use any `@ifnotgod.com` email and any password. The emailed code is always `123456`, and no email is sent. These values show the errors:

| Value | Shows |
| --- | --- |
| Password `wrong-password` | A wrong email or password |
| Email `locked@ifnotgod.com` | Too many attempts |
| Any code but `123456` | A wrong code. Five wrong codes start the log in again. |

The example clients and subscriptions are made up. Renewal dates are counted from today, so "Renewing in 7 days" always has something to show.

Changes made on a client's behalf, such as cancelling or swapping services, are kept for a day in a cookie in your own browser. Nobody else sees them, and clearing your cookies starts afresh.
