# Dashboard - IFNOTGOD TECH LTD

Engineering standards for `dashboard`: a simple internal tool where the IFNOTGOD TECH team logs in to manage users, subscriptions and the public website's content.

This spec covers `dashboard` only. The other projects are built separately, with their own specs:
- `WEB`: the public website, plus the account area where clients subscribe and manage their own subscription.
- `backend`: the Django APIs used by `WEB` and `dashboard`. It owns all data, login and permissions.

The dashboard stores no data of its own. Everything it shows or changes goes through the backend API.

## Who uses it, and what it does
- Only our team uses it. There's no public sign-up, no client access and no public pages.
- **Users:** find a client, see their details and how they sign in, and help with access problems.
- **Subscriptions:** see each client's plan, status, renewal date, chosen services, changes left this month and payments. Make changes on a client's behalf, such as cancelling, keeping a cancelled plan or swapping services, under the same rules clients follow on `WEB`.
- **Site content:** plans, prices, services (including taking a service off the site with its `available` flag) and site text. `WEB` shows saved changes after its cached pages refresh.
- **Leads:** audit requests from the website, once lead capture moves to the backend.

## Engineering Standards
- Use TypeScript for all code in this project.
- Use Next.js App Router (`src/app`) for all route definitions.
- Validate data at both boundaries: in the form, and again on the server before calling the backend.
- Favor explicit types for domain entities, and keep them matching the backend's published API schema, which is the contract.
- All modules must be thoroughly tested. Minimum expectation:
  - unit tests for validation, formatting and any rules shown in the UI
  - tests for the API client, including every failure it can return
  - tests that every page and action refuses signed-out visitors
  - UI tests for each form's states: idle, submitting, success and error
  - browser tests in `e2e` for the main flows at desktop and tablet widths

## Folder Structure
- `src/app/(auth)` (log in and log out, with no dashboard navigation)
- `src/app/(dashboard)` (every signed-in page, behind one layout with the navigation; one folder per area: `users`, `subscriptions`, `content`, and later `leads`)
- `src/components` (screens and their parts, grouped by area, plus shared `ui` primitives: buttons, inputs, tables, badges, confirm dialogs, and `forms` helpers that keep what was typed when a save fails)
- `src/lib/api` (the only route to the backend: one client, typed responses, failures turned into normalized errors; `staffAuth.ts`, `clients.ts`, `subscriptions.ts` and `overview.ts` on the real API, and the stand-in for site content until backend phase 8)
- `src/lib/auth` (the encrypted staff session cookie, log in actions, and the one place where access is checked, confirming the token with the backend)
- `src/lib/actions` (server actions that change data, each checking the session itself)
- `src/lib/loaders` (data loading shared by several pages)
- `src/proxy.ts` (restarts the 1-hour session on each request and sends signed-out visitors to log in; pages and actions still check the session themselves)
- `src/shared` (validators, formatting for naira and dates, constants)
- `src/types` (types matching the backend's API schema)
- `e2e` (Playwright browser tests, against a real backend started by `backend/scripts/serve_for_e2e.sh`)

## Next.js Architecture Rules
- Prefer Server Components. Use Client Components only for real interactivity, such as filters, forms and confirm dialogs.
- Load data on the server through `src/lib/api`. Don't call the backend from the browser.
- Use server actions or route handlers for every change, and check the session inside each one: they can be called directly with a POST, whatever the page showed.
- Keep pages thin: compose them from components, with data shaping in `src/lib` or `src/shared`.

## Later, not now
Keep the first version simple. These are planned but not built yet:
- Roles and permissions, such as staff who can only view, or only edit site content.
- Creating and managing staff accounts from the dashboard. Until then, the backend creates them.

## Delivery Approach
- Build the screens first, in this order: staff login, clients, subscriptions, overview, site content. Leads come later.
- Until the backend exists, screens use a stand-in in `src/lib/api`, with made-up example data that follows the real rules. The stand-in refuses to run in production, and every page stays hidden on the live site until the real API is connected.
- Screens never hold data themselves. They call functions in `src/lib/api`, so switching from the stand-in to the real API changes no screen.
- When the backend starts, connect it in vertical slices: the backend writes and documents each API, then the matching functions switch over.

## Security Rules
- Every page and action needs a signed-in staff member. Check on the server, never only by hiding things in the UI.
- For now, every staff member can do everything: there are no roles or permissions yet. They come later, so every page and action checks access through one helper in `src/lib/auth`, where roles can be added without changing each page.
- The backend still has the final say. If it refuses something, show a clear message.
- Keep the session in a secure cookie that scripts in the browser can't read, ending after 1 hour without activity. Log out revokes the backend's token, then clears it. Warn before it ends, so unsaved changes aren't lost.
- Never put secrets or API keys in the browser bundle. Keep server-only environment variables separate from public ones.
- Set a strict content security policy, forbid framing, and send `noindex` on every page, with `robots.txt` disallowing everything.
- Rate limiting and lockouts for login are the backend's job. Show their messages clearly.
- Every staff member uses two-step verification from launch: after the password, a 6-digit code sent to their work email, which expires after 10 minutes. No page or action works until it's complete. An authenticator app may replace email codes later.

## Personal Data Rules
The dashboard shows clients' personal data, so the Nigeria Data Protection Act applies to how it's handled:
- Show only what the task needs. Don't add exports, downloads or bulk copying without agreeing why.
- Never log personal data to the browser console or to client-side tools, and add no third-party analytics or trackers.
- Never cache one person's page for another: send `Cache-Control: private, no-store` on every signed-in page.
- Never see, handle or store card details. Payments come from Flutterwave through the backend.
- Changes to a client's account should be recorded by the backend with who made them and when.

## Changing Live Data
Edits here change what clients pay and what the public site shows, so:
- Ask for confirmation before anything hard to undo, such as cancelling a subscription, changing a price or taking a service off the site. Say exactly what will happen.
- Prefer reversible actions, such as switching a service off, to deleting.
- Apply the same rules as `WEB`. Plan changes start at the next renewal, there are no refunds, each service swap uses one of the plan's monthly changes, and cancelling keeps everything working to the end of the paid period. The backend enforces these, and the dashboard explains them.
- A price change applies to new subscribers straight away, and to existing subscribers from their next renewal, with the new price in their renewal reminder. Say so before saving.
- Taking a service off the site hides it from new clients only. It keeps running for clients who already have it, until the team lets them know and moves them on. Say so before hiding it.
- After saving site content, say when it will appear on the website.
- Never edit automation workflow logic here. Under n8n's licence, workflows stay in n8n, managed by our team only.

## Error Handling Rules
- Turn every backend failure into a clear message in plain words, and never show raw errors.
- Keep what was typed when a save fails, so it can be retried.
- Handle loading, empty, error and success states on every screen, including empty tables, such as "No subscriptions yet".
- If the backend is unreachable, say so plainly and let the person retry.

## UI and Responsive Rules
- Design for desktop and tablet first, because most work happens at a desk. Make every page usable on a phone too, with wide tables scrolling inside their own box.
- Keep screens calm and dense enough for work: clear tables, filters and search, with consistent buttons, inputs and status badges.
- Every control must be reachable and usable by keyboard, with visible focus.
- Text must stay readable under zoom and larger text settings.
- Keep motion to a minimum and respect reduced-motion preferences.
- Before marking any phase complete, test its flows at desktop, tablet and phone widths, and confirm nothing overflows or is clipped.

## Brand and Colour Rules
- Use the same palette as `WEB`, defined as theme tokens, not hard-coded colours in components:
  - Maroon `#6B1F2A`: primary buttons and key accents.
  - Ink `#0B0706`: dark navigation and headers.
  - Paper `#F7F1EC`: page backgrounds and text on dark surfaces.
  - Orange `#E07B2A`: small highlights only. It fails contrast as text on light backgrounds.
- Status colours (active, cancelled, ended, error) must differ in more than colour, for example with a label, and meet WCAG AA contrast.

## UI File Size and Composition Rules
- Split UI files approaching about 250 to 300 lines, especially when they mix concerns.
- Keep presentation in components and validation, parsing and mapping in `src/lib` or `src/shared`.
- Extract repeated parts, such as table rows and form sections, into components.
- Keep component props explicit and typed.

## Resource Cleanup Rules
- Clean up subscriptions, timers, event listeners and observers on unmount and when dependencies change.
- Abort stale requests, such as an earlier search when a new one starts.
- Prevent state updates after unmount.

## Definition of Done (Feature Level)
A feature is done when:
- It does what the task says, matches the agreed design, and works with the real backend API.
- The staff session is checked on the server for every page and action.
- Validation runs in the form and on the server.
- Loading, empty, error and success states are handled.
- Tests are written and passing.
- This file is updated if structure or rules change.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
