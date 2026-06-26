# CW Painters — Job & Quoting System
## Ritriwill Holdings (Pty) Ltd — Prototype

---

## Quick start

```bash
cd cwpainters

# Install dependencies (already done)
npm install

# Generate Prisma client, create SQLite DB, seed demo data
npm run setup

# Start dev server
npm run dev
```

Open **http://localhost:3000**

---

## Demo credentials

| Role     | Email                        | Password   |
|----------|------------------------------|------------|
| Admin    | riaan@cwpainters.co.za       | admin123   |
| Salesman | sales@cwpainters.co.za       | sales123   |
| Foreman  | foreman@cwpainters.co.za     | foreman123 |

---

## What's built

### Core flow (demoable end-to-end)
1. **Lead → Quote → Job** — Log a lead, build a quote with template + custom line items, accept it → Job is auto-created
2. **Quote Builder** — Service-category-aware, editable line items, LiDAR stub button (disabled, pending iPad rollout)
3. **Foreman Worksheet** — Auto-generated from accepted quote; read-only foreman view
4. **Daily Site Report** — Foreman logs materials, hours, notes per day against a job
5. **Time Clock** — Manual clock-in/out per worker (stub for future kiosk integration)
6. **Invoice Generator** — Pick company entity, pick draw stage from schedule, VAT computed, sequential invoice number
7. **Job Profitability** — Four computed figures: on-site profit, profit/day, profit %, realised profit
8. **Weekly Report** — Dashboard summary of leads, active jobs, and site activity

### Role-based access
- **Admin (Riaan)** — full access to all features
- **Salesman** — leads, quotes, job overview (no invoices or profitability)
- **Foreman** — only sees assigned jobs' worksheets, site reports, time clock

---

## Tech stack

| Layer        | Choice                            |
|--------------|-----------------------------------|
| Framework    | Next.js 16 (App Router)           |
| Language     | TypeScript                        |
| Styling      | Tailwind CSS v4                   |
| ORM          | Prisma 7 + better-sqlite3 adapter |
| Database     | SQLite (swap to PostgreSQL for prod) |
| Auth         | NextAuth v4 (JWT, credentials)    |
| Hosting      | Any Node host — Railway / Render / Fly.io |

---

## Key files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full data model |
| `prisma/seed.ts` | Demo data + placeholder configs |
| `src/lib/profitability.ts` | Isolated profit calculation module |
| `src/proxy.ts` | Auth-guard proxy (Next.js 16 convention) |
| `src/lib/auth.ts` | NextAuth config + role callbacks |

---

## Placeholders to confirm with Riaan before go-live

Search the codebase for `// PLACEHOLDER` to find all values needing confirmation:

- **VAT rate** — currently 15%, see `src/app/api/quotes/route.ts`
- **Draw schedule percentages** — PAINTING: 30/30/40, WATERPROOFING: 60/40, RENOVATIONS: 25/25/25/25 — `prisma/seed.ts`
- **Base wage rate** — R55/hr fallback, see `src/app/api/profitability/[jobId]/route.ts`
- **Overtime rules** — not yet modelled in WageRate
- **Profitability formulas** — see `src/lib/profitability.ts` for exact definitions
- **Company entity details** — VAT number, bank account — `prisma/seed.ts`

---

## Pending integrations (out of scope for prototype)

| Feature | Status | Hook |
|---------|--------|------|
| Facial-recognition time clock | Stub | `TimeEntry.verificationMethod` field |
| LiDAR/ARKit measurement | Stub button | Quote Builder `unitPrice` field |
| WhatsApp/SMS confirmation | Stub (console.log) | `api/leads` and `api/jobs` |
| Payment gateway (Yoco/PayFast) | Not started | `Invoice.amountPaid` field |
| Email invoices (Resend/nodemailer) | Not started | `api/invoices` route |
| Offline site reports (IndexedDB) | TODO comment | `api/daily-reports` route |

---

## Production deployment checklist

- [ ] Replace SQLite with PostgreSQL (update `prisma.config.ts` + `src/lib/prisma.ts`)
- [ ] Set `NEXTAUTH_SECRET` to a secure random value
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Configure file/photo storage (S3 or similar) — `SitePhoto.url` currently stores local path
- [ ] Set up email delivery for invoice sending
- [ ] Add proper error monitoring (Sentry)
- [ ] Multi-tenant onboarding flow (currently hard-coded to Ritriwill tenant)
