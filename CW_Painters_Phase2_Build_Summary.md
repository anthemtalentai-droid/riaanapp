# CW Painters — Job & Quoting System: Phase 2 Build Summary
**Built 15–17 Sept 2026, from `CW_Painters_Job_Quoting_Phase2.md`.** Objective 1 + 1b (Foreman Mode) is fully built **and now live** on real Postgres. Objective 2's hosting piece is effectively done as a side-effect of unblocking this; Objective 3 (lead-source wiring) is still not started — see "What's next" below.

## 🟢 It's live

| | |
|---|---|
| **URL** | https://cw-painters-job-system.netlify.app |
| **Admin** | riaan@cwpainters.co.za / admin123 |
| **Salesman** | sales@cwpainters.co.za / sales123 |
| **Foreman (desktop login)** | foreman@cwpainters.co.za / foreman123 |
| **Foreman Mode** (`/foreman`) | PIN login is **enabled** for the demo foreman (Thabo Mokoena), PIN `1234` — flip it off in Settings → Foreman Access once you're done poking at it, per Riaan's "let me test it solo first" ask |
| Database | Neon Postgres (your project) |
| Netlify project | `cw-painters-job-system`, team anthemtalentai, site id `2ff680f0-f6d2-47f3-bd3c-75dd7be6e085` |

Verified for real against the live site: admin login + session, foreman PIN login, the full daily-report → anomaly-flag → uplift → office-reconciliation cycle, and the material-request approve → deliver → two-stage price fill cycle — all exercised end to end against the actual database, not just code-reviewed. See "What I tested" below for the blow-by-blow.

**Heads up:** that verification pass left some visible test data in the demo job (a "Smoke test from CLI" report, a delivered Bonding Liquid request, a reconciled uplift batch, a Cordless Drill added to the roster, and — from verifying the git push below — one job titled "Push-verify test address"). All harmless and clearly labelled, but if you want a pristine demo before showing Riaan, say so and I'll clear it out (needs a scoped cleanup pass, not a full reset — my sandbox correctly blocks a mass database wipe without you confirming it directly).

## 17 Sept, later — multi-category quotes fixed, pushed to GitHub

- **Quote Builder now shows every service category's templates at once** (grouped), not just whichever one the job is primarily filed under — a mixed-scope job (e.g. waterproofing + painting) no longer needs the category dropdown flipped back and forth to find items. The "category" field is relabelled "Primary Category — for invoicing & reporting" to make clear it's not a hard limit on what the quote can contain.
- **Pushed to GitHub** — and in doing so, found `origin/main` had **diverged**: 6 commits existed on GitHub that were never pulled into this local checkout (from an earlier pre-Phase-2 attempt at deploying to Railway, before the brief moved hosting to Netlify). Inspected them rather than force-pushing over them: three small, genuinely useful, non-overlapping fixes —
  1. `package.json`: `start` no longer runs `prisma db push` + reseed on every server start (was risky for a live app)
  2. `src/lib/prisma.ts`: lazy Prisma client via a Proxy, avoids instantiating at module-load time
  3. `src/app/jobs/page.tsx`: **redirects straight to the Quote Builder right after creating a job** — this is the exact fix for the "I created a waterproofing job, how do I add more?" friction from earlier.
  Merged cleanly (zero file overlap with this round's changes), rebuilt clean, pushed, redeployed, verified live.
- Also added a `CW_Painters_Handbook.md` — an operations reference for the whole system (roles, workflows, Foreman Mode, Settings, the restock/uplift cycles, placeholder numbers to confirm, what's not built yet).

---

## What's built — Objective 1 + 1b: Foreman Mode

A genuinely separate mobile flow at `/foreman`, distinct from the desktop app:

- **PIN quick login** (`/foreman/login`) — tap your name card, then a 4-digit keypad. No email keyboard. Reuses NextAuth under the hood (a second `foreman-pin` credentials provider in `src/lib/auth.ts`), so every existing session check in the app keeps working unchanged.
- **Landing screen** (`/foreman`) — the foreman's own active job cards; skips straight to the job if there's only one.
- **Job hub** (`/foreman/jobs/[jobId]`) — four big buttons, one task each: **Log Today's Report**, **Clock In/Out**, **View Worksheet**, **Uplift Site**.
- **Daily report** — tools/equipment shown as a pre-populated confirm-or-flag list (office seeds it, foreman just taps anything NOT there); consumables shown with a +/− quantity stepper pre-filled from yesterday's reading, colour required on any paint-type item; a "Need more material?" panel to request + later confirm delivery; notes; one-tap camera photos.
- **Clock In/Out** — same crew-list pattern as the desktop Time Clock tab, rebuilt with big touch targets; clock-out adds optional kilometres + reason.
- **Worksheet** — read-only scope of work, big text, no pricing (never was in the underlying data).
- **Uplift Site** — gated behind today's report being logged; foreman confirms everything leaving site (or flags what isn't) and it goes to Admin for reconciliation.
- **Never exposes money** — enforced server-side, not just hidden UI: every `/api/foreman/*` route omits pricing entirely, and the existing `/api/jobs` + `/api/jobs/:id` routes now strip `acceptedQuote`/`invoices` for a FOREMAN session too (this was a real pre-existing gap — the old desktop Overview tab showed quote value to every role, foreman included). `src/proxy.ts` also now hard-redirects any FOREMAN session away from the desktop app entirely.

### Objective 1b's operational detail — all built

- **Office seeds, foreman confirms** — new **Site Items** tab on the desktop Job page (Admin-only) lets Admin plan a job's tool/material roster before the foreman's first visit.
- **Tools persist, consumables are fresh readings each report** — `JobSiteItem` (the roster) + `SiteItemConfirmation` (per-report tool tick) + `MaterialUsed` (per-report consumable reading), matching the schema shape described in the brief.
- **Foreman can add a one-off tool on site** — becomes a persistent roster item, flagged `foremanAdded` so Admin can see the provenance. **Only Admin can add/remove consumables** (or approve a request for a new one) — a foreman can't invent a new material type mid-report.
- **Material Requests → Admin approval → foreman confirms delivery → cost added** — `MaterialRequest` model + full approve/reject/deliver flow (`Settings → Material Requests` for Admin, the report screen for the foreman). Confirming delivery is what actually creates the `MaterialUsed` cost line (still priceless until Admin's two-stage fill).
- **Uplift — two-stage, new models** — `UpliftBatch`/`UpliftBatchItem` (PRESENT/MISSING/EXCEPTION), foreman submission gated behind today's confirmations, `Settings → Uplift Reconciliation` for Admin's final pass.
- **Day-over-day anomaly flag, both directions** — `src/lib/anomalyCheck.ts`. **This is a judgement call, not a fixed formula from the brief — please sanity-check it:** a consumable's new reading is flagged unless the change is fully explained by an approved-and-delivered Material Request since the prior reading. Any unexplained rise *or* fall gets flagged red on the Site Reports tab with a note, exactly per your "flag ALL anomalies, both directions" instruction.
- **Mandatory colour on paint** — `MaterialCatalog.colorRequired`, enforced both client-side (report screen won't submit without it) and server-side (report route rejects it).
- **Two-stage fill** — `MaterialUsed.unitCost`/`totalCost`/`invoiceNumber` are all nullable now; the foreman's report never carries a price. Admin fills them in later from the (existing, now-editable) Site Reports tab — a "Set price" link appears on any unpriced line.
- **Editable, propagating price catalog** — `Settings → Material Catalog`: Admin edits a price, it's logged to `MaterialCatalogPriceHistory`, and every future report reads the live price.
- **Timesheet** — `TimeEntry.mileage` + `.reason`, both optional, captured at clock-out on the Foreman Mode clock screen; both now shown on the desktop Time Clock tab's table too. Live GPS is explicitly deferred, as you said was fine.
- **PIN rollout toggle** — `Settings → Foreman Access`: every foreman defaults to PIN **disabled**, so you can trial it yourself before flipping it on for the crew. Demo foreman is seeded with PIN `1234`, disabled.

### A call I made that's worth you weighing in on
Section 1b says tools are foreman-addable but the roster is otherwise "Admin-only edit rights." I read that as: Admin controls the *planned* roster and all *consumables*; a foreman can still note a physically-present one-off tool without needing sign-off first (he can't un-see a drill that's there). If you want foreman-added tools to also need Admin approval before they count, that's a small change.

---

## Objective 4 — placeholder business numbers (unchanged, still pending your sign-off)

Nothing new introduced here — this is the same list SETUP.md already had, repeated per the brief's Objective 4 ask:

| Value | Current placeholder | Where |
|---|---|---|
| VAT rate | 15% | `src/app/api/quotes/route.ts` |
| Draw schedule — Painting | 30/30/40 | `prisma/seed.ts` |
| Draw schedule — Waterproofing | 60/40 | `prisma/seed.ts` |
| Draw schedule — Renovations | 25/25/25/25 | `prisma/seed.ts` |
| Base wage rate | R55/hr flat, no overtime rules modelled | `prisma/seed.ts`, `api/profitability/[jobId]/route.ts` |
| Company VAT number, bank details | dummy values | `prisma/seed.ts` |
| Profitability formulas | provisional (on-site profit, realised profit definitions) | `src/lib/profitability.ts` |

New from this round — **material catalog starting prices** (`prisma/seed.ts`) are estimates, not Riaan's real supplier prices; check them in `Settings → Material Catalog` before relying on any cost/profitability number. And the **"Strontium Chromate"** name (carried over from the standalone Daily Report App's own open item) still needs Riaan's confirmation.

---

## ✅ Resolved 17 Sept — local dev + hosting

Both blockers from the 15 Sept build are now cleared:

- **DATABASE_URL** — pointed at a real Neon Postgres database (yours, connected 17 Sept). `.env.local` updated locally; set as a Netlify env var (`DATABASE_URL`, `NEXTAUTH_SECRET` — a real generated one, not the dev placeholder — and `NEXTAUTH_URL`) on the live site.
- **`prisma.config.ts` / `prisma/seed.ts` not loading `.env.local`** — same root cause as before, now also fixed in the seed script (it has its own Node process, separate from Next.js's own env loading).
- **New issue found during deploy**: the live site built successfully but 404'd everywhere — Netlify's upload-based deploy path doesn't auto-install the Next.js Runtime plugin the way a git-linked site does, so the app was serving as a static, function-less shell. Fixed with an explicit `netlify.toml` declaring `@netlify/plugin-nextjs`, plus adding that package as a devDependency. Second deploy came up fully functional.
- Also hit two flaky spots worth knowing about if you deploy again yourself: the upload step 500'd twice in a row after I added the plugin (payload/timeout related, not a code problem — third attempt with `--no-wait` went through fine), and Netlify's Neon "one-click database" integration turned out to be **discontinued** mid-session — that's why I asked you for a connection string directly instead of doing it in one command.

## What I tested (all against the real Neon database, not mocked)

Ran the full stack for real via the Netlify Deploy MCP + direct API calls (cookie-based NextAuth sessions, not just code review):

1. Admin email/password login → session → `/api/jobs` returns real seeded data (correct client name, quote total).
2. Enabled the demo foreman's PIN via `Settings → Foreman Access`, then a real PIN login (`foreman-pin` provider) → correct FOREMAN session, `/api/foreman/jobs` returns the assigned job with **no money fields**.
3. Foreman job hub, site roster read — matched the seeded 3 tools + 1 paint (with its last reading).
4. **Uplift blocked correctly** before today's report exists (400, names the missing items).
5. Submitted a real report: confirmed 2 tools present / 1 not, added a one-off tool ("Cordless Drill" — now persistent on the roster), logged a paint reading that dropped 12L→9L with no matching delivery → **anomaly correctly flagged** ("Reading went down from 12 to 9 (-3.00) — please explain").
6. Uplift now allowed → submitted → **office reconciliation** (marked all PRESENT, completed) → roster correctly emptied (everything flipped to UPLIFTED).
7. Material request cycle: admin approved a pending "Bonding Liquid" request → foreman confirmed delivery of 10L → correctly created a new roster item + priceless `MaterialUsed` row → admin's **two-stage price fill** (R55/L + invoice number) → total cost auto-computed (R550).
8. Repeated the admin login + a couple of these checks against the **live Netlify URL**, not just localhost, to confirm the deploy itself (not just the database) works.

This is the most thoroughly live-tested piece of work in this project so far — every new model and workflow in the 1b spec got exercised for real, not just read through.

## ⚠ Historical note — local dev was broken before 17 Sept, unrelated to this round's changes (kept for reference)

`prisma.config.ts` and `src/lib/prisma.ts` are written to auto-switch between a Postgres adapter (production) and a SQLite adapter (local dev) based on `DATABASE_URL`. In practice this **never actually worked**: `schema.prisma`'s `datasource` block is hard-set to `provider = "postgresql"`, and a Postgres-generated Prisma Client refuses to run against a SQLite adapter at all — it throws `PrismaClientInitializationError: The Driver Adapter @prisma/adapter-better-sqlite3 ... is not compatible with the provider postgres`. I hit this trying to verify my own changes locally (`next build` compiles and type-checks clean, but fails at the database-connection step for exactly this reason) and it isn't anything I introduced — the schema's provider was already `postgresql` before I touched anything, and I didn't change it.

**Practical effect: right now, nobody can run `npm run dev` (or `next build`, or `npm run setup`) against local SQLite on this machine.** The moment any page touches the database — logging in included — it'll hit this same error.

I also found and fixed a smaller, related bug on the way: `prisma.config.ts` never loaded `.env.local` at all (only Next.js itself does that), so raw `prisma db push`/`prisma studio` commands couldn't see `DATABASE_URL` even before the adapter mismatch. Fixed that half — the CLI now sees your env vars correctly — but it doesn't unblock the core issue above.

(As of 17 Sept this whole section is resolved — see above. Kept for the record since it explains several of the fixes now in the codebase.)

---

## What's next

- **Objective 2 — mostly done.** Hosting + a real Postgres database is live. Still open: photo storage is currently base64-in-a-database-column (fine for a prototype/demo, not for real volume) — should move to Netlify Blobs before this carries real job-site photo traffic.
- **Objective 3 — wiring the three lead sources in.** Not started. Needs the real Make.com scenario IDs/webhook URLs for "CW Painters — Meta Lead Automation," "CW Roof Estimator — Lead Automation," and "CW Painters — Website Lead Form Automation" — I don't have those in this environment (the brief points at a `[[cw_painters_ops]]` reference that doesn't exist here). Once I have them, adding a shared `/api/leads/intake` endpoint and the `LeadSource` enum split (`META_ADS`/`ROOF_ESTIMATOR`/`WEBSITE_FORM`) is a contained piece of work.
- **Demo data cleanup** — optional, see the note at the top.
- **Custom domain** — currently on the `.netlify.app` subdomain; happy to wire up a real domain/subdomain once Riaan has one in mind, same as the other two CW Painters sites.

---

## Files touched/added

Schema: `prisma/schema.prisma` (10 new models/enums, 3 existing models extended), `prisma/seed.ts` (material catalog, sample roster, demo PIN).
Config fix: `prisma.config.ts`.
Auth: `src/lib/auth.ts`, `src/proxy.ts`.
New lib: `src/lib/anomalyCheck.ts`.
New API routes: `src/app/api/foreman/**`, `src/app/api/foreman-login-roster`, `src/app/api/foremen-pin/**`, `src/app/api/material-catalog/**`, `src/app/api/material-requests/**`, `src/app/api/uplift-batches/**`, `src/app/api/jobs/[id]/site-items/**`, `src/app/api/daily-reports/[reportId]/materials/[materialId]`.
Existing API routes patched: `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/route.ts`, `src/app/api/profitability/[jobId]/route.ts`.
New pages: `src/app/foreman/**` (7 pages), `src/app/settings/page.tsx`.
Existing page extended: `src/app/jobs/[id]/page.tsx` (new Site Items tab, two-stage price fill + anomaly display on Site Reports, mileage/reason columns on Time Clock).
New component: `src/components/foreman/ui.tsx`.
Nav: `src/components/AppShell.tsx` (Settings link, Admin only).
Deploy config: `netlify.toml` (new), `.netlifyignore` (new), `prisma/seed.ts` (env loading fix), `package.json`/`package-lock.json` (`@netlify/plugin-nextjs` devDependency).

Nothing has been committed — working tree only, your call on when to commit.
