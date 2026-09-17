# CW Painters — Job & Quoting System: Company Handbook
**Ritriwill Holdings (Pty) Ltd, trading as CW Painters**
Living reference document — update this alongside the app as things change. Last updated 17 Sept 2026.

---

## 1. What this system is

The Job & Quoting System is CW Painters' single home for the whole job lifecycle:

**Lead → Quote → Job → Foreman Worksheet → Site Reports → Invoice → Profitability**

It's a private web app — not a public website. Log in at your site's login page with an email and password (office staff) or, on site, with a 4-digit PIN (crew).

**Live URL:** https://cw-painters-job-system.netlify.app

### How it fits with CW Painters' other two apps

| App | What it's for | Status |
|---|---|---|
| **This system** (Job & Quoting) | The full pipeline: quoting, jobs, invoicing, profitability, and (new) Foreman Mode for on-site daily reports | Live, actively growing |
| **CW Roof Estimator** (`cw-roof-estimator.netlify.app`) | Public-facing instant roof quote wizard for the website/ads | Live, feeds leads via Make.com |
| **Daily Report App** (`cw-painters-daily-report.netlify.app`) | The original standalone paper-replacement daily report tool | Live, but this system's **Foreman Mode is its intended replacement** once Riaan has tested it thoroughly. Don't retire the old one until he says so. |

The Roof Estimator's leads and this system's Lead table are **not yet connected** — a homeowner's online estimate request doesn't automatically appear here. That's planned (see §13).

---

## 2. Roles & who can do what

| Role | Can see | Typical user |
|---|---|---|
| **Admin** | Everything — leads, quotes, jobs, invoices, profitability, all Settings | Riaan, or anyone he delegates admin duties to |
| **Salesman** | Leads, quotes, job overview — **no** invoices or profitability, no money on jobs they don't own | Office/sales staff logging leads and building quotes |
| **Foreman** | Only their own assigned jobs. On the desktop, a read-only worksheet, site reports, and time clock. On a phone/tablet via **Foreman Mode**, the same plus material requests and the uplift workflow — never any pricing, quote value, or invoice data | Site foremen |

A Foreman can log in two ways:
- **Desktop, email + password** — the original way. Still works, but shows the older tabbed interface, which testing showed is too fiddly for on-site use.
- **Foreman Mode, PIN, at `/foreman`** — the one built for actual site use. Tap your name, enter a 4-digit PIN, land straight on your job. **This is what should be rolled out to the crew** once Riaan is happy with it (see §8).

---

## 3. The core office workflow: Lead → Quote → Job

### 3.1 Log a lead
**Leads** page (Admin/Salesman). Capture the client's name, contact details, where the enquiry came from (phone, WhatsApp, email, website, referral), the site address, and any notes. Status starts at **New** and moves through Contacted → Site Visit Booked → Quote Sent → Accepted/Lost as things progress.

### 3.2 Build a quote
From a lead (or directly), open the **Quote Builder**. Fill in the client and site details, then add line items two ways:
- **From a template** — the right-hand panel lists every priced item CW Painters offers, grouped by category (Painting, Waterproofing, Damp Proofing, Rubberising, Renovations, Maintenance, Construction). Click one to add it.
- **Custom line** — anything not in the template list. Type your own description, quantity, unit, and price.

**Mixed-scope jobs are fully supported.** If a job needs both waterproofing and painting, just add items from both categories — the picker shows everything at once now, you don't need to switch anything to browse a different category. The **"Primary Category"** field at the top only decides which invoice draw schedule (payment stages) applies later — it doesn't limit what you can put in the quote.

VAT (currently 15% — see §11) is added automatically. **Save as Draft** to come back later, or **Accept & Create Job** to lock it in and automatically:
- Create the Job record
- Generate the read-only Foreman Worksheet from the accepted line items
- Mark the Lead as Accepted

### 3.3 Assign the job
On the Job page, Admin/Salesman can set the **Foreman** and **Salesman**, the **status** (Pending → In Progress → On Hold → Complete → Invoiced → Cancelled), and **start date**. A job only shows up in a foreman's Foreman Mode once they're assigned to it.

### 3.4 Plan the site — Site Items (Admin only)
Before the foreman's first visit, go to the Job's **Site Items** tab and add:
- **Tools & Equipment** expected on site (ladders, spray machines, etc.)
- **Materials** expected (pick from the Material Catalog — see §9)

This is the list the foreman's daily report is checked against — see §5. It's worth doing this before day one so the foreman is just confirming a pre-built list, not starting from a blank sheet.

---

## 4. Daily site reports (desktop)

Still available on the Job page's **Site Reports** tab for Admin/Salesman/Foreman on desktop — log notes and a materials-used list with a price attached directly. This is the original flow; Foreman Mode (§5) is the better fit for someone actually standing on site.

**Two-stage pricing:** any material logged through Foreman Mode arrives with a quantity but **no price** — Admin fills in the unit cost and invoice number afterwards from this same tab (look for "Set price" next to a line with "no price yet"). This keeps a foreman from ever having to know or enter a Rand figure.

**Anomaly flags:** if a material's logged quantity changes from its last reading on the same job — in *either* direction — without a matching delivered restock request explaining it, the line shows up highlighted red with a note like *"Reading went down from 12 to 9 — please explain."* This is deliberate: it usually means either stock moved off-book, or the foreman isn't actually checking the material. Follow up with the foreman rather than ignoring it.

---

## 5. Foreman Mode — the on-site app

Reached at **`/foreman`** on a phone or tablet. Built for one-handed use in bright daylight — big buttons, minimal typing.

### 5.1 Logging in
Tap your name card, then enter your 4-digit PIN. If you land on more than one active job, pick one from the list; with only one, it opens straight away.

### 5.2 The job hub — four buttons
1. **Log Today's Report** — see §5.3
2. **Clock In / Out** — see §5.4
3. **View Worksheet** — read-only scope of work for this job, no pricing
4. **Uplift Site** — end-of-job pack-up, see §5.5

### 5.3 Log Today's Report
- **Tools & Equipment** — everything Admin planned for this job shows up pre-listed. Tap anything that's **not** actually here today to flag it; everything else is assumed present. Found something extra on site that wasn't planned? Type it in under "Tool not on the list" — it becomes part of the roster from then on.
- **Materials on Site** — each expected material shows a quantity stepper, pre-filled with the last reading. Update it to today's actual count. **Paint always needs a colour** — pick White or Custom (type the name).
- **Need More Material?** — request a restock: pick or type what's needed and how much. This goes to the office for approval (§9). Once approved, come back here to **Confirm Delivered** with the actual quantity that arrived — that's what logs it to the job.
- **Notes** and **Photos** — free text and camera photos, both optional.

### 5.4 Clock In / Out
Shows your crew (the site labourers, not system logins). Tap a name to clock in; tap again to clock out, which asks for optional **kilometres travelled** and a **reason/note** — neither is ever mandatory. Live GPS tracking is not built (deliberately deferred — see §13).

### 5.5 Uplift Site
Use this when the job's finishing and everything's coming off site. It's **locked until today's report is logged** — every tool and material needs a same-day confirmation first. Then:
- **Uplift All** — one tap, marks everything as leaving with you.
- Or untick anything that's *not* actually leaving (still needed, lost, etc.) before submitting.

This goes to the office for a final check (§10) — nothing disappears from the active roster until Admin confirms it.

---

## 6. Invoicing

From a Job's **Invoices** tab (Admin only): pick which company entity to invoice from, the invoice type (Deposit/Stage/Final/Variation), and a draw stage from the schedule tied to the job's primary category (e.g. Painting is 30/30/40 — deposit/progress/final). VAT and the invoice total compute automatically; invoice numbers are sequential per entity.

## 7. Profitability

Admin-only tab on each Job: on-site profit, profit per day, profit %, and realised profit (based on what's actually been paid), computed from real logged materials and labour hours. **If any material lines are still awaiting a price (§4), the tab tells you how many** — treat the profit figure as understated until those are filled in.

---

## 8. Settings (Admin only)

Four sections, reached from the **Settings** link in the sidebar:

### Foreman Access
List of every foreman user, whether they have a PIN set, and a toggle for whether PIN login actually works for them. **Leave this off for the crew until Riaan has personally tested Foreman Mode and is happy with it** — that's the agreed rollout plan. Click "Set/Change PIN" to give someone a 4-digit code, then flip the toggle on when ready.

### Material Catalog
The master list of materials, their unit, whether a colour is required, and the **current price**. Edit a price here (e.g. Painters Mate R22 → R23/L) and every report from that point on uses the new price — it's also logged to a price history. This is also what feeds the picker on the Job's Site Items tab and the "Need More Material?" request form in Foreman Mode.

### Material Requests
Every restock request from every job, pending ones first. **Approve** or **Reject** (with a reason) — the foreman only sees "Confirm Delivered" once you've approved it.

### Uplift Reconciliation
Every uplift batch a foreman has submitted, waiting on your sign-off. For each tool/material, mark it **Present** (accounted for — it comes off that job's active roster), **Missing** (a real loss — needs a reason), or **Exception** (a specific issue, e.g. "still on site, must go fetch" — needs a reason). Hit **Complete Reconciliation** to close it out. Anything not marked Present stays on the job's roster as an open item until it's resolved.

---

## 9. The restock cycle, end to end

1. Foreman requests more of something (Foreman Mode, "Need More Material?")
2. Admin approves or rejects it (Settings → Material Requests)
3. Foreman confirms what actually arrived (Foreman Mode, "Confirm Delivered")
4. That creates a costless material line on the job — Admin fills in the price later (§4)

---

## 10. Numbers Riaan needs to confirm before this runs on real money

These are placeholder values seeded during the build — check them before relying on them for real invoices or profitability:

| Value | Where | Current placeholder |
|---|---|---|
| VAT rate | Quote creation | 15% |
| Draw schedule — Painting | Company/Draw Schedules | 30% / 30% / 40% |
| Draw schedule — Waterproofing | Company/Draw Schedules | 60% / 40% |
| Draw schedule — Renovations | Company/Draw Schedules | 25/25/25/25% |
| Base wage rate | Worker pay | R55/hr flat, no overtime modelled yet |
| Company VAT number, bank details | Company Entity | dummy placeholder values |
| Material catalog prices | Settings → Material Catalog | estimated, not Riaan's real supplier prices |
| **"Strontium Chromate"** paint name | Material Catalog | carried over from the original Daily Report App's own open item — the source doc cut the name off, needs Riaan's confirmation |
| Profitability formulas | — | provisional definitions, confirm the exact calculation makes sense to Riaan |

---

## 11. What's deliberately not built yet

- **Live GPS vehicle tracking** — mileage is manually entered at clock-out. A future round could pull this from the Cartrack units already on CW Painters' vehicles, once API access is confirmed.
- **Lead sources feeding in automatically** — Meta Ads, the Roof Estimator, and the website contact form all run their own Make.com automations today; none of them create a Lead in this system yet. This is intentionally on hold until Riaan has thoroughly tested and is satisfied with the rest of the system.
- **Photo storage at scale** — photos currently store directly in the database, which is fine for testing but should move to proper file storage (Netlify Blobs) before real day-to-day photo volume.
- **A custom domain** — currently on the `.netlify.app` address; can point a real subdomain at it whenever that's wanted.

---

## 12. If something looks wrong

- **A number looks off** (price, VAT, draw %, wage rate) — check §10 first; several are still placeholders.
- **A material's flagged red on a Site Report** — that's the anomaly checker; it means a quantity changed unexpectedly. Ask the foreman, don't just clear it.
- **A job/material/tool seems stuck** — check Settings → Material Requests and Uplift Reconciliation for anything awaiting Admin action.
- **Can't log in** — Admin/Salesman/desktop-Foreman use email + password; site Foreman Mode uses the PIN screen at `/foreman/login`, and only works if PIN access is switched on for that person (Settings → Foreman Access).

---

## Appendix — for whoever builds on this next

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind + Prisma 7 + NextAuth (JWT, credentials), Postgres (Neon) in production.
- **Source:** `E:\riaanapp` (git repo, remote `github.com/anthemtalentai-droid/riaanapp`).
- **Key docs alongside this one:** `CW_Painters_Job_Quoting_Phase2.md` (the brief this round was built from), `CW_Painters_Phase2_Build_Summary.md` (exactly what was built, what was tested, and how).
- **Data model:** see `prisma/schema.prisma` — it's the clearest single source of truth for how everything relates.
- **Hosting:** Netlify project `cw-painters-job-system`, deployed via upload (not git-linked yet) — `netlify.toml` declares the Next.js Runtime plugin, which is required for API routes/SSR to work on this deploy path.
- **Multi-tenant structure exists in the schema** (every table has a `tenantId`) but is hard-coded to one tenant (Ritriwill) for now — a deliberate simplification, not a bug.
