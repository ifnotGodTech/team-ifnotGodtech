# Dashboard Implementation Plan

Builds `dashboard`, the IFNOTGOD TECH team's internal tool, from the approved [dashboard mock](https://claude.ai/artifact/RKxKZeccB6sn6dV5ajQ1SE), following `dashboard/CLAUDE.md`. Business rules come from `plan.md`.

**Architecture:** a Next.js app with TypeScript, used only by our team. It stores no data: everything goes through the Django `backend` API, which owns data, login and the rules. The screens are built first, against a stand-in backend in `src/lib/api`, as `WEB` did for its account screens. When the backend starts, each screen is connected to the real API in vertical slices (phase 7), without changing the screens.

**Status:** phases 1 to 5 are pushed. Phase 6 is built and tested on `feat/site-content`, not yet committed. Phase 7 needs the backend. Tick items only after they're confirmed working.

## Decided

- [x] **Repo:** its own repo, `ifnotGodTech/team-ifnotGodtech`, separate from `WEB` (8 November 2026). It's currently public, not private as first planned. Revisit before real client data or backend details go in.
- [x] **Address:** `team.ifnotgod.com` (8 November 2026).
- [x] **Sessions with the backend** (8 November 2026): the dashboard's server calls the API with its own app key. The API returns a token after the emailed code, which the dashboard keeps inside its own secure cookie. Log out revokes it. See `backend/CLAUDE.md`.
- [x] **Hosting:** Vercel, like `WEB` (8 November 2026).
- [x] **Staff sessions:** a secure cookie the browser's scripts can't read, ending after 1 hour without activity (8 November 2026).
- [x] **Two-step verification:** required for every staff member from launch, with a code sent to their work email for now (8 November 2026). An authenticator app can replace it later.
- [x] One level of access for now: every staff member can do everything. Roles and permissions come later (8 November 2026).
- [x] Staff accounts are created by the backend for now, not from the dashboard (8 November 2026).
- [x] Business rules the dashboard must follow and explain, all enforced by the backend (7 and 8 November 2026):
  - Plans renew automatically, with a reminder before each renewal.
  - Plan changes start at the next renewal, with nothing to pay on the day.
  - No refunds. After cancelling, everything keeps working until the end of the paid period, then automations stop and the client keeps their website.
  - Each service swap uses one of the plan's monthly changes. Services chosen at sign-up don't count.
  - A new price applies to new subscribers straight away, and to existing subscribers from their next renewal, with the new price in their renewal reminder.
  - A service taken off the website keeps running for clients who already have it, until we let them know and move them on.

## Working rules (from `CLAUDE.md`)

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.
- Server Components by default. Load data on the server through `src/lib/api`, never from the browser.
- Every page and action checks the staff session on the server, through one helper in `src/lib/auth`.
- Server actions check the session themselves, because they can be called directly.
- Ask for confirmation before anything hard to undo, and say exactly what will happen.
- Handle loading, empty, error and success states, and keep what was typed when a save fails.
- No personal data in the browser console, no trackers, and `private, no-store` on every signed-in page.
- A phase is done only when its tests pass and it's been checked at desktop, tablet and phone widths.
- Work on a branch and merge through a pull request.

## Phase 1: Foundations

No backend needed.

- [x] Create the Next.js and TypeScript project as its own git repo (the private GitHub repo still needs creating and connecting), with ESLint, Vitest and Playwright, matching `WEB`'s tooling.
- [x] Add theme tokens for the brand colours and the Manrope and Public Sans fonts, as in `WEB`, and check text contrast meets WCAG AA.
- [x] Add the signed-in layout from the mock: the dark sidebar with Overview, Clients, Subscriptions and Site content, the signed-in email and Log out. It stacks above the content on a phone.
- [x] Add shared UI parts: buttons, inputs, a table that scrolls inside its own box, status badges that use words as well as colour, an inline confirm panel, and empty, loading and error states.
- [x] Add security headers: a strict content security policy, no framing, `noindex` on every page, `robots.txt` disallowing everything, and `private, no-store` on signed-in pages.
- [x] Add `src/lib/api`: one client for the backend that turns every failure into a normalized error with a plain message. Keep server-only settings, such as the API address, out of the browser bundle.
- [x] Tests: the API client's failure handling, the headers, and the layout at desktop, tablet and phone widths.
- [x] Until phase 2, every page returns "not found" on the live site, so it can't be opened if deployed early.

## How phases 2 to 6 work

Each screen talks only to functions in `src/lib/api`. Until phase 7, those functions use a stand-in with made-up example clients, subscriptions and content, following the same rules the backend will. The stand-in refuses to run on the live site, and every page stays hidden there until phase 7. Each phase lists the API its screens will need, which becomes the backend's to-do list.

## Phase 2: Staff log in

The API it will need: staff log in, log out, and "who is signed in", with the session cookie ending after 1 hour without activity, lockouts after repeated failures, and two-step verification by email: sending a 6-digit code to the staff member's work email, checking it, letting it expire after 10 minutes, and limiting resends and wrong guesses.

- [x] Add the stand-in to `src/lib/api`, starting with staff log in. Clients, subscriptions, payments and site content are added in the phases that need them. It refuses to run on the live site.
- [x] Build **Log in** from the mock: work email and password, no sign-up, and a note to ask for access.
- [x] Add `src/lib/auth` with one helper that every page and action uses to get the signed-in staff member, or send them to log in. This is where roles will go later.
- [x] Add **two-step verification**: after the password, ask for the 6-digit code emailed to the staff member's work email, with "Send a new code". Say which address it went to and that it expires in 10 minutes.
- [x] Log out, and send expired sessions back to log in, returning to the page they were on. Warn a few minutes before the hour runs out, so unsaved changes aren't lost.
- [x] Show the backend's messages for wrong details and lockouts.
- [x] Tests: every page and action refuses signed-out visitors and staff who haven't finished two-step verification; a changed or expired session is refused; and browser tests for log in with an emailed code, a wrong or expired code, log out and the redirect back. No test sends a real email.

## Phase 3: Clients

The API it will need: search clients, and one client's details and account history. Sending a password reset email.

- [x] Build **Clients** from the mock: search by name, business or email, run on the server, with paging for long lists.
- [x] Build **Client details**: account details, how they sign in, when they joined, and their history with who made each change.
- [x] Add "Send a password reset email", with a confirmation.
- [x] Show only what each task needs, with no exports.
- [x] Tests: search and empty results, the details page's states, and the reset email flow.

## Phase 4: Subscriptions

The API it will need: list and filter subscriptions; one client's subscription, services and payments; and cancelling, keeping a cancelled plan, changing services and changing plan on a client's behalf, under the same rules as clients.

- [x] Build **Subscriptions** from the mock, with the filters All, Active, Renewing in 7 days, and Cancelled, still running.
- [x] Add the subscription panel to **Client details**: plan, status, renewal date and reminder, changes left this month, setup fee, services, a waiting plan change, and payments.
- [x] **Cancel on a client's behalf:** confirm first, saying what happens, then show the cancelled state. Add "Keep the plan" to undo it while the paid period is running.
- [x] **Change services on a client's behalf**, within the plan's limits, showing the changes left.
- [x] **Change plan on a client's behalf**, starting at the next renewal.
- [x] Show payments from Flutterwave through the backend, never card details.
- [x] Tests: each filter, each action's confirmation and result, refusals explained by the backend, and keeping what was typed when a save fails.

## Phase 5: Overview

The API it will need: counts of active subscriptions and monthly income, renewals in the next 7 days with reminder status, cancelled plans still running, clients without a plan, and recent changes with who made them.

- [x] Build **Overview** from the mock, with each count linking to the filtered list behind it. Clients gained a "without a plan" filter for this.
- [x] Tests: the counts' links, empty states, and the backend being unreachable.

## Phase 6: Site content

The API it will need: reading and saving plans, services, service groups and site text, and telling `WEB` to refresh its cached pages after a save. Services, groups and plan lines are records staff can add and edit, not fixed fields.

Agreed on 8 November 2026, from the updated mock: staff can add services and groups and change what each plan lists without a developer. Adding a whole new plan comes later, because it needs its own prices and payment setup.

- [x] Build **Plans and prices** from the mock: price, changes a month, how many services each plan includes from each group, the plan's other lines (add, reorder, remove), and "recommended" (one plan at a time). Before saving a price, say that new subscribers pay it straight away and existing subscribers from their next renewal. Custom stays quoted after the audit.
- [x] Build **Services**: add and edit a service's name, the problem it solves, its group, and tick boxes for which plans include it. Warn, without blocking, when a lower plan includes a service but a higher plan doesn't. When a plan is unticked, say that clients on it who already have the service keep it until we let them know and move them on.
- [x] Keep **showing and hiding a service** on the website. Hiding one asks first, saying it keeps running for clients who already have it until we let them know and move them on.
- [x] Build **Service groups**: rename groups and add new ones, with the words used for one and several ("1 website or app"). A group appears on the website once a plan includes one of its services.
- [x] Build **Site text**: the home page headline, introduction and closing call to action, with more added as `WEB` reads them from the API.
- [x] Say when saved changes will appear on the website.
- [x] Tests: validation of prices, limits and text, each warning and confirmation, and adding a service and a group. A saved change appearing on a `WEB` preview is checked in phase 7, when `WEB` reads from the API.

## Phase 7: Connect to the backend

Needs `backend`. One vertical slice at a time, following `backend/implementation_plan.md`: catalogue (backend phase 2), staff log in (3), clients (4), subscriptions (5 and 6), overview (7) and site content (8). The backend writes and documents each API, then the matching functions in `src/lib/api` switch from the stand-in to it.

- [x] Staff log in, sessions and emailed codes (backend phase 3, 9 November 2026). The session cookie is now encrypted and holds the backend's token. Every page confirms it with the backend, and log out revokes it, so the logged-out marker from phase 6 is gone. The stand-in's log in is removed. Browser tests run against a real backend started by `backend/scripts/serve_for_e2e.sh`, and read codes from its email files. Signed-in pages need JavaScript: they stream in behind the loading screen once the backend confirms the session. Log in still works without it.
- [x] Clients, with subscriptions (backend phases 5 and 6, 10 November 2026).
- [x] Subscriptions, including actions on a client's behalf. Browser tests run one at a time against a backend seeded with the stand-in's clients and plans.
- [x] Overview figures (backend phase 7, 10 November 2026).
- [x] Site content (backend phase 8, 10 November 2026). With `WEB`: switch its `src/lib/catalogue` from the content files to the API, with cached pages that refresh after a save and keep the last good version if the API is down. `WEB` then lists each plan's lines and services from the data, with services naming the plans that include them instead of a lowest plan, and shows new service groups.
- [x] Remove the stand-in (10 November 2026).
- [ ] Remove the "not found on the live site" guard (backend phase 10, at launch).
- [ ] Tests: each function against the real API's responses, including its errors.

## Phase 8: Final checks and launch

- [ ] Unit tests, browser tests, lint, type check and production build all pass.
- [ ] Every page refuses signed-out visitors, checked in a browser.
- [ ] Keyboard-only use and a screen reader check pass on the main flows.
- [ ] Desktop, tablet and phone widths checked, with nothing overflowing or clipped.
- [ ] The security headers and `noindex` checked on the deployed preview.
- [ ] Staff accounts created by the backend for everyone who needs access, and each person has logged in once with an emailed code.
- [ ] Check the preview, open the pull request and deploy.

## Later, not in this plan

- [x] **Leads:** audit requests from the website (backend phase 9, 11 November 2026), from the approved mock.
- **Authenticator app codes** in place of email codes, which are safer if a staff email account is ever compromised.
- **Roles and permissions,** such as view-only staff or content-only editors, added in `src/lib/auth`.
- **Managing staff accounts** from the dashboard.
