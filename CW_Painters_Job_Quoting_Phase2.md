# CW Painters — Job & Quoting System: Phase 2 Plan + Claude Code Prompt
**Prepared by:** Anthem Creative Agency (Ian Hadfield) for Riaan Willemse / Ritriwill Holdings
**Date:** 14 September 2026 (Objective 1b added 15 September 2026, from Riaan's own voice note on his ideal workflow)
**Status:** Findings + build brief. Second half is ready to paste into Claude Code, run from inside the existing project folder.

---

## Part A — What I found

**Location:** `E:\riaanapp` (the project itself is internally named `cwpainters` — that's the name in its `package.json` and what its own docs refer to it as, even though the folder on disk is `riaanapp`). It's a git repository with its own `AGENTS.md`/`CLAUDE.md` files, meaning it was already set up to be worked on by a coding agent directly in place — so the build below should be run **inside this existing folder**, not scaffolded fresh.

**What it actually is:** a genuinely comprehensive prototype — **"CW Painters — Job & Quoting System"** — not just a form. Tech: Next.js 16 + TypeScript + Tailwind + Prisma 7 (SQLite locally, schema already written in Postgres-compatible form) + NextAuth (email/password, role-based).

**Built and working end-to-end already:**
- **Lead → Quote → Job pipeline** — log a lead, build a quote (template line items + custom line items), accept it and a Job is auto-created
- **Quote Builder** — service-category-aware (Painting, Waterproofing, Damp Proofing, Rubberising, Renovations, Maintenance, Construction), editable line items
- **Foreman Worksheet** — auto-generated read-only summary of the accepted quote
- **Daily Site Report** — notes + a materials-used log per job, per day
- **Time Clock** — manual clock-in/out per worker, hours computed on clock-out
- **Invoice Generator** — pick company entity, pick a draw stage (e.g. 30/30/40 for exteriors) from a configurable schedule, VAT computed, sequential invoice numbers
- **Job Profitability** — on-site profit, profit/day, profit %, realised profit, all computed from real cost data
- **Role-based access** — Admin (Riaan) sees everything; Salesman sees leads/quotes/jobs (no money data); Foreman sees only their assigned jobs' worksheet, site reports and time clock

**Demo logins already seeded:** `riaan@cwpainters.co.za` / `admin123`, `sales@cwpainters.co.za` / `sales123`, `foreman@cwpainters.co.za` / `foreman123`.

**What it is not, yet:** deployed anywhere. It only runs locally (`npm run dev`, SQLite file on disk, hard-coded to a single tenant). A handful of business numbers are still flagged `// PLACEHOLDER` in the code pending Riaan's confirmation (VAT rate 15%, draw-schedule percentages, R55/hr base wage, company banking details).

**Why Riaan found it "too complicated for foreman use" — this checks out, and it's fixable, not a dead end.** Even though the Foreman role correctly hides Quotes/Invoices/Profitability, a foreman still has to: log in with email + password on a generic login screen → land on a general dashboard → find their job in a list → open it → pick the right tab out of four → fill in a desktop-style form (materials are entered in a cramped 4-column grid built for a mouse, not a thumb). That's real friction for someone standing on scaffolding with paint on their hands. The underlying data model and business logic are solid — this is a UI/access problem on one specific screen, not a rebuild.

**How this connects to what else exists for Riaan:**
- `cw-roof-estimator` (Netlify, live) — the customer-facing quote wizard that feeds Meta/website leads into Make.com. This should feed straight into this system's `Lead` table instead of (or as well as) the Make.com flow, so a homeowner's online estimate request shows up as a Lead ready for Riaan/his salesman to turn into a formal Quote.
- `cw-painters-daily-report` (Netlify + Airtable, live) — the standalone daily report form Riaan has actually been using, and the one that prompted the "too complicated" feedback in its own right too (it has a ~35-item collapsible equipment checklist). Its `Config` table (paint types, equipment list) is worth porting into this system's `PriceTemplate`/seed data rather than re-typing it. Once the new Foreman Mode below ships, this Netlify/Airtable app can be retired so Riaan and his crew aren't maintaining two separate systems.

---

## Part B — The path forward

1. **Build a dedicated Foreman Mode** — not a fix to the existing tabs, a genuinely separate, mobile-first flow: PIN-style quick login (no typing an email on a phone keyboard), one job at a time, one task at a time, big touch targets, no financial data ever reachable. Detailed in the prompt below.
2. **Migrate hosting to Netlify + a free Postgres tier (Neon, via Netlify's native DB integration)** instead of a paid Node host (Railway/Render/Fly.io, as the README currently suggests). The Prisma schema is already written in Postgres-compatible form and the seed script already swaps adapters based on `DATABASE_URL` — so this is a config change, not a rebuild. This keeps ongoing hosting cost at effectively zero, consistent with every other Netlify-hosted client site, which directly answers the "no budget" problem for infrastructure at least.
3. **Wire the Roof Estimator's leads into this system's `Lead` table** so the whole pipeline — online estimate request → lead → quote → job → foreman worksheet → invoice — is one system instead of three disconnected ones.
4. **Confirm the placeholder business numbers with Riaan** before go-live (VAT, draw-schedule splits, wage rate, banking details) — flagged in the prompt, don't guess these.
5. **Pricing this round of work is your call to make with Riaan** — I haven't assumed a figure here, unlike the earlier Daily Report round (R2,000/R500 per iteration), since this is a materially bigger scope than that agreement covered.

---

## Part C — Claude Code Prompt

Run this from inside `E:\riaanapp` (open that folder in Claude Code — its `AGENTS.md`/`CLAUDE.md` are already there and apply automatically).

> **Context:** This is an existing Next.js 16 + Prisma 7 + NextAuth prototype called the CW Painters Job & Quoting System, for a painting/waterproofing contractor (Ritriwill Holdings, trading as CW Painters). Read `README.md`, `SETUP.md`, and `prisma/schema.prisma` first to understand what already exists before changing anything — this is an extension, not a rewrite.
>
> **Objective 1 — Foreman Mode (highest priority):** The client tested the existing Foreman-role experience (login → dashboard → jobs list → job detail → tab) and found it too complicated for on-site use. Build a genuinely separate, mobile-first flow for the FOREMAN role only:
> - **Quick login:** replace email/password with a 4-digit PIN per foreman (add a `pin` field to `User` or a new `ForemanPin` model). Big numeric keypad, one screen, no keyboard.
> - **Landing screen:** shows only the foreman's currently assigned, in-progress job(s) as large tappable cards — nothing else. If they have exactly one active job, skip straight to it.
> - **One task at a time, not tabs:** three big buttons — "Log Today's Report," "Clock In/Out," "View Worksheet" — each opens a single full-screen flow, not a tabbed page.
> - **Site report entry redesigned for touch:** replace the 4-column grid materials form with a chip/list picker of common materials (sourced from `PriceTemplate` / a new simple `MaterialCatalog` seeded from the existing Daily Report app's Config list — see Part A) plus quantity steppers (+/- buttons), and only fall back to free-text entry for something not on the list. Notes field stays, but keep it short and optional. Photo capture should be one tap to the phone camera.
> - Every screen: large touch targets (min 48px), high contrast, works one-handed, and must be fully usable on a low-end Android phone in daylight (bold color, minimal grey-on-grey text).
> - Foreman Mode must never expose quote values, invoices, or profitability — enforce this server-side in the API routes, not just by hiding UI.
>
> **Objective 1b — Daily report detail & the "Uplift" workflow (from Riaan's own voice note, 15 Sept 2026 — this is the real operational detail behind Objective 1, not optional polish):**
> - **Office seeds the job, foreman only confirms.** The very first daily report on a job is not a blank form — the office (Admin) creates the initial tool/material list for that site before the foreman ever opens the app. Day one, the foreman's screen shows that preset list and he just confirms each line is present ("yes, yes, yes"); he never starts from a blank sheet. If something planned didn't make it to site, Admin removes it from the list first, office-side, before the foreman ever sees it.
> - **Two item types, handled differently:** TOOLS/equipment (drills, ladders, extension leads, including one-off custom tools a foreman types in once) are **persistent** — they carry over onto every subsequent daily report automatically and the foreman just re-confirms them, until someone uplifts them off site. CONSUMABLES (paint etc.) are logged fresh each report, with the new quantity checked against the prior day's figure for that same item (see anomaly flag below).
> - **Admin-only edit rights on a site's item list.** Only an Admin-role user (any admin, not hardcoded to Riaan specifically — he's sometimes off/sick) can add or remove items from what's on site. A foreman requesting more of something (e.g. "5 more Painters Mate") creates a request that requires Admin approval before it's dispatched to site as a pending item; once delivered, the foreman confirms quantity received (checklist: requested 5 → delivered 5), which then adds that quantity to job cost.
> - **The "Uplift" workflow — a genuinely new two-stage feature, not represented anywhere in the current schema:**
>   1. *Foreman side:* every item has an uplift control (dropdown/checkbox), plus one master "Uplift All" button at job end — gated behind the foreman first confirming every tool/material still on site and the current paint quantities.
>   2. *Office side:* once uplifted, an Admin does a final reconciliation pass — checks off each item against what was expected, and can either confirm the whole batch as "all uplifted," or flag individual items with an exception (e.g. "extension lead still on site — must go fetch") that stays open until resolved.
>   Needs its own model (e.g. `UpliftBatch` with per-item status PRESENT/MISSING/EXCEPTION, an exception reason, submittedAt, and a separate officeReconciledAt/officeReconciledById).
> - **Day-over-day quantity anomaly flag — flag ALL anomalies, both directions.** If a consumable's logged quantity moves in a way that doesn't match deliveries/usage (e.g. paint reading goes *up* from 10L to 12L with no delivery, or drops unexpectedly), flag it in red to the office as something the foreman needs to explain — it usually means he isn't actually measuring/checking the material. Compare each material line against its own prior-day entry on the same job.
> - **Mandatory color capture on paint.** Every paint line requires a color selection — dropdown starting with **White + Custom** (Custom requires a typed color name; extend the preset list later as real color names come up) — never leave it optional or blank.
> - **Two-stage fill on the same material line.** The foreman logs description + quantity only, no pricing. Admin comes back later and attaches the invoice number and unit cost to that same line, asynchronously. `MaterialUsed.unitCost`/`totalCost` need to become nullable/admin-fillable-after-creation rather than required at creation, and the model needs an `invoiceNumber` field the foreman never sees or sets.
> - **Editable, propagating price catalog.** Admin needs a simple screen to update a catalog material's unit price (e.g. Painters Mate R22→R23/L) and have new entries use the new price going forward. This is a `MaterialCatalog` model (name, unit, currentUnitPrice, colorRequired flag, price history) distinct from the quote-facing `PriceTemplate` — it drives the report material picker, not quotes.
> - **Timesheet:** add a `mileage` field and an optional (not mandatory) `reason` field to every `TimeEntry` — reason should always be available to fill in, never forced. Data should sync to the office in real time as it's entered, not batch at day's end. Live GPS tracking is Riaan's ideal but he's explicitly fine deferring it if a tracker is too costly — treat GPS as a future/budget-gated enhancement, not part of this build.
> - **UX constraint, applies to every screen in this objective, not just the original three:** keep it simple, minimal, big touch targets — this was reiterated explicitly and should be treated as a hard constraint on the Uplift and reconciliation screens too, not just the daily report screen.
> - **Rollout note (process, not a build item):** Riaan wants to test the app solo himself for a few weeks before any foreman gets access — keep Foreman Mode/PIN access togglable per-user so it can stay off for the crew until he's ready to flip it on.
>
> **Objective 2 — Production hosting migration:**
> - Confirm the app deploys cleanly to Netlify (Next.js 16 App Router — use Netlify's Next.js Runtime).
> - Provision a free-tier Neon Postgres database via Netlify's native DB integration, point `DATABASE_URL` at it, run `prisma db push` + the seed script against it. Do not touch `schema.prisma`'s datasource — it's already Postgres-shaped.
> - Move `SitePhoto.url` off local file paths onto a real storage target (Netlify Blobs is the simplest fit here — free tier, no separate account needed).
> - Set a real `NEXTAUTH_SECRET` and `NEXTAUTH_URL` for the production domain.
>
> **Objective 3 — Connect all three existing lead sources:** Riaan already has three separate Make.com automations live — "CW Painters — Meta Lead Automation," "CW Roof Estimator — Lead Automation," and "CW Painters — Website Lead Form Automation" (see `[[cw_painters_ops]]` for scenario/webhook IDs). None of them currently write into this system. Add a shared `/api/leads/intake` endpoint that each of the three Make scenarios also POSTs to (one more module added to each existing scenario — don't remove their existing notification steps), creating a `Lead` record per submission. Extend the `LeadSource` enum from the generic buckets it has today to three specific values — `META_ADS`, `ROOF_ESTIMATOR`, `WEBSITE_FORM` — instead of lumping them under `WEBSITE`/`OTHER`, so Riaan can see which channel is actually converting to real jobs, not just which one generates enquiries.
>
> **Objective 4 — Don't touch yet / confirm with Riaan first:** every value marked `// PLACEHOLDER` in the codebase (VAT rate, draw-schedule percentages, base wage rate, company banking details, overtime rules). List them out at the end of the build rather than guessing at real numbers.
>
> **Constraints:** Keep Admin and Salesman experiences as they are (they're desktop-appropriate and untested-as-a-problem so far) — this build is additive for Foreman Mode plus the hosting/integration work, not a redesign of the whole app. Preserve the existing multi-tenant structure even though only one tenant (Ritriwill) exists today.
>
> **Deliverable:** a working Foreman Mode reachable at a distinct route (e.g. `/foreman`), deployed to a Netlify preview URL on Postgres, with the Roof Estimator wired in, and a clear written list of the outstanding placeholder values that need Riaan's sign-off before this goes live for real money.
