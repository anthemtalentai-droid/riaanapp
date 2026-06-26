import { PrismaClient, Role, ServiceCategory, LeadSource, LeadStatus, VerificationMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

function createClient() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgresql") || url.startsWith("postgres")) {
    const { PrismaPg } = require("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter } as any);
  }
  const path = require("path");
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter } as any);
}

const prisma = createClient();

async function main() {
  console.log("Seeding database...");

  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_ritriwill" },
    update: {},
    create: {
      id: "tenant_ritriwill",
      name: "Ritriwill Holdings (Pty) Ltd",
    },
  });

  // ── Company entities ─────────────────────────────────────────────────────────
  const cwPainters = await prisma.companyEntity.upsert({
    where: { id: "entity_cwpainters" },
    update: {},
    create: {
      id: "entity_cwpainters",
      tenantId: tenant.id,
      legalName: "Ritriwill Holdings (Pty) Ltd",
      tradingAs: "CW Painters",
      vatNumber: "4XXXXXXXXX", // PLACEHOLDER — confirm with Riaan
      bankName: "FNB", // PLACEHOLDER
      bankAccount: "XXXXXXXXXX", // PLACEHOLDER
      bankBranch: "250655", // PLACEHOLDER
      invoicePrefix: "CWP",
      invoiceSequence: 1,
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin = await prisma.user.upsert({
    where: { email: "riaan@cwpainters.co.za" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "riaan@cwpainters.co.za",
      passwordHash: hash("admin123"),
      name: "Riaan Willemse",
      role: Role.ADMIN,
    },
  });

  const salesman = await prisma.user.upsert({
    where: { email: "sales@cwpainters.co.za" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "sales@cwpainters.co.za",
      passwordHash: hash("sales123"),
      name: "Johan du Plessis",
      role: Role.SALESMAN,
    },
  });

  const foreman = await prisma.user.upsert({
    where: { email: "foreman@cwpainters.co.za" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "foreman@cwpainters.co.za",
      passwordHash: hash("foreman123"),
      name: "Thabo Mokoena",
      role: Role.FOREMAN,
    },
  });

  // ── Draw schedules ───────────────────────────────────────────────────────────
  // PLACEHOLDER — percentages below are illustrative; confirm with Riaan before go-live
  const drawConfigs: { category: ServiceCategory; stages: { label: string; pct: number; order: number }[] }[] = [
    {
      category: ServiceCategory.PAINTING,
      stages: [
        { label: "Deposit", pct: 30, order: 1 },
        { label: "Progress", pct: 30, order: 2 },
        { label: "Final", pct: 40, order: 3 },
      ],
    },
    {
      category: ServiceCategory.WATERPROOFING,
      stages: [
        { label: "Deposit", pct: 60, order: 1 },
        { label: "Final", pct: 40, order: 2 },
      ],
    },
    {
      category: ServiceCategory.RENOVATIONS,
      stages: [
        { label: "Deposit", pct: 25, order: 1 },
        { label: "First Progress", pct: 25, order: 2 },
        { label: "Second Progress", pct: 25, order: 3 },
        { label: "Final", pct: 25, order: 4 },
      ],
    },
  ];

  for (const dc of drawConfigs) {
    const existing = await prisma.drawSchedule.findUnique({
      where: { tenantId_serviceCategory: { tenantId: tenant.id, serviceCategory: dc.category } },
    });
    if (!existing) {
      await prisma.drawSchedule.create({
        data: {
          tenantId: tenant.id,
          serviceCategory: dc.category,
          stages: {
            create: dc.stages.map((s) => ({ label: s.label, percentage: s.pct, order: s.order })),
          },
        },
      });
    }
  }

  // ── Price templates ──────────────────────────────────────────────────────────
  const templateItems = [
    { cat: ServiceCategory.PAINTING, desc: "Interior walls — 2 coats", unit: "m²", price: 28 },
    { cat: ServiceCategory.PAINTING, desc: "Exterior walls — 2 coats", unit: "m²", price: 35 },
    { cat: ServiceCategory.PAINTING, desc: "Ceiling — 2 coats", unit: "m²", price: 22 },
    { cat: ServiceCategory.PAINTING, desc: "Doors — both sides", unit: "each", price: 450 },
    { cat: ServiceCategory.PAINTING, desc: "Window frames", unit: "each", price: 280 },
    { cat: ServiceCategory.PAINTING, desc: "Steelwork / balustrade", unit: "lm", price: 95 },
    { cat: ServiceCategory.WATERPROOFING, desc: "Flat roof waterproofing", unit: "m²", price: 185 },
    { cat: ServiceCategory.WATERPROOFING, desc: "Parapet capping", unit: "lm", price: 120 },
    { cat: ServiceCategory.DAMP_PROOFING, desc: "Damp-proofing injection", unit: "lm", price: 340 },
    { cat: ServiceCategory.RUBBERISING, desc: "Rubberised coating", unit: "m²", price: 145 },
    { cat: ServiceCategory.MAINTENANCE, desc: "Crack repairs & fill", unit: "each", price: 250 },
  ];

  for (const t of templateItems) {
    await prisma.priceTemplate.create({
      data: { tenantId: tenant.id, serviceCategory: t.cat, description: t.desc, unit: t.unit, unitPrice: t.price },
    });
  }

  // ── Workers ──────────────────────────────────────────────────────────────────
  const workers = await Promise.all(
    [
      { name: "Sipho Dlamini", phone: "081 000 0001" },
      { name: "Petrus van Wyk", phone: "082 000 0002" },
      { name: "Lungelo Nkosi", phone: "083 000 0003" },
    ].map((w) =>
      prisma.worker.create({
        data: { tenantId: tenant.id, name: w.name, phone: w.phone },
      })
    )
  );

  // PLACEHOLDER — R55/hr base rate; confirm overtime rules with Riaan
  for (const w of workers) {
    await prisma.wageRate.create({
      data: { tenantId: tenant.id, workerId: w.id, ratePerHour: 55 },
    });
  }

  // ── Sample lead + quote + job ─────────────────────────────────────────────────
  const sampleLead = await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      loggedById: salesman.id,
      clientName: "Mrs. Patricia Venter",
      clientEmail: "pventer@example.com",
      clientPhone: "083 555 1234",
      source: LeadSource.REFERRAL,
      status: LeadStatus.ACCEPTED,
      address: "12 Jacaranda Ave, Centurion, 0157",
      notes: "Full exterior repaint + roof waterproofing. Urgent, wants done before December.",
    },
  });

  const sampleQuote = await prisma.quote.create({
    data: {
      leadId: sampleLead.id,
      quoteNumber: "CWP-Q-0001",
      serviceCategory: ServiceCategory.PAINTING,
      status: "ACCEPTED",
      clientName: sampleLead.clientName,
      clientEmail: sampleLead.clientEmail ?? undefined,
      clientPhone: sampleLead.clientPhone ?? undefined,
      siteAddress: sampleLead.address ?? "",
      notes: "Includes all materials and labour.",
      subtotal: 28750,
      vatAmount: 4312.5,
      total: 33062.5,
      lineItems: {
        create: [
          { description: "Exterior walls — 2 coats", unit: "m²", quantity: 620, unitPrice: 35, lineTotal: 21700, isCustom: false },
          { description: "Window frames", unit: "each", quantity: 14, unitPrice: 280, lineTotal: 3920, isCustom: false },
          { description: "Fascia boards — sand & repaint", unit: "lm", quantity: 35, unitPrice: 33, lineTotal: 1155, isCustom: true },
          { description: "Custom — scaffold hire allowance", unit: "item", quantity: 1, unitPrice: 1975, lineTotal: 1975, isCustom: true },
        ],
      },
    },
  });

  const sampleJob = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      leadId: sampleLead.id,
      acceptedQuoteId: sampleQuote.id,
      salesmanId: salesman.id,
      foremanId: foreman.id,
      serviceCategory: ServiceCategory.PAINTING,
      status: "IN_PROGRESS",
      siteAddress: sampleLead.address ?? "",
      startDate: new Date("2026-06-20"),
    },
  });

  // Foreman worksheet generated from the accepted quote
  await prisma.foremanWorksheet.create({
    data: {
      jobId: sampleJob.id,
      content: JSON.stringify({
        jobId: sampleJob.id,
        clientName: sampleLead.clientName,
        siteAddress: sampleJob.siteAddress,
        scope: [
          { description: "Exterior walls — 2 coats", quantity: "620 m²" },
          { description: "Window frames", quantity: "14 each" },
          { description: "Fascia boards — sand & repaint", quantity: "35 lm" },
          { description: "Custom — scaffold hire allowance", quantity: "1 item" },
        ],
        specialInstructions: sampleQuote.notes,
      }),
    },
  });

  // Sample daily report
  const report = await prisma.dailySiteReport.create({
    data: {
      jobId: sampleJob.id,
      loggedById: foreman.id,
      reportDate: new Date("2026-06-23"),
      notes: "Completed east & south elevations. 3 coats needed on south face (heavy staining).",
      materials: {
        create: [
          { description: "Plascon WeatherGuard Smooth — Merino", quantity: 20, unit: "L", unitCost: 85, totalCost: 1700 },
          { description: "Plascon Primer", quantity: 5, unit: "L", unitCost: 60, totalCost: 300 },
        ],
      },
    },
  });

  // Sample time entries
  for (const w of workers) {
    await prisma.timeEntry.create({
      data: {
        jobId: sampleJob.id,
        workerId: w.id,
        clockIn: new Date("2026-06-23T07:00:00"),
        clockOut: new Date("2026-06-23T16:30:00"),
        hoursWorked: 9.5,
        verificationMethod: VerificationMethod.MANUAL,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo credentials:");
  console.log("  Admin:    riaan@cwpainters.co.za   / admin123");
  console.log("  Salesman: sales@cwpainters.co.za   / sales123");
  console.log("  Foreman:  foreman@cwpainters.co.za / foreman123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
