export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET  /api/jobs/:id/site-items — the job's current roster (tools + expected
//      consumable types), each consumable annotated with its most recent
//      quantity/colour reading so the report screen can show a sensible
//      default. Available to Admin/Salesman and the job's own assigned
//      Foreman (Objective 1b — this is what both the Admin "Site Items" tab
//      and the Foreman Mode report screen read from).
// POST /api/jobs/:id/site-items — add an item to the roster. Admin-only for
//      planning ahead; a Foreman may add a TOOL only (foremanAdded: true) —
//      documenting something physically on site, not requesting stock (that's
//      /api/foreman/jobs/:jobId/material-requests).

async function loadJobForUser(jobId: string, u: any) {
  const job = await prisma.job.findFirst({ where: { id: jobId, tenantId: u.tenantId } });
  if (!job) return null;
  if (u.role === "FOREMAN" && job.foremanId !== u.id) return null;
  return job;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  const { id } = await params;

  const job = await loadJobForUser(id, u);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await prisma.jobSiteItem.findMany({
    where: { jobId: id, status: "ON_SITE" },
    include: {
      catalog: { select: { unit: true, colorRequired: true, currentUnitPrice: true } },
      materialsUsed: { orderBy: { createdAt: "desc" }, take: 1, select: { quantity: true, color: true, createdAt: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const shaped = items.map((it) => ({
    id: it.id,
    type: it.type,
    name: it.name,
    catalogId: it.catalogId,
    unit: it.catalog?.unit ?? null,
    colorRequired: it.catalog?.colorRequired ?? false,
    foremanAdded: it.foremanAdded,
    lastQuantity: it.materialsUsed[0]?.quantity ?? null,
    lastColor: it.materialsUsed[0]?.color ?? null,
    lastReadingAt: it.materialsUsed[0]?.createdAt ?? null,
  }));

  return NextResponse.json(shaped);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  const { id } = await params;

  const job = await loadJobForUser(id, u);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const type = body.type === "CONSUMABLE" ? "CONSUMABLE" : "TOOL";

  // A Foreman may only add a TOOL, and only as a self-documented one-off —
  // never a consumable/catalog item (that goes through Material Requests).
  if (u.role === "FOREMAN" && type !== "TOOL") return forbidden();
  if (u.role !== "ADMIN" && u.role !== "FOREMAN") return forbidden();

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const item = await prisma.jobSiteItem.create({
    data: {
      jobId: id,
      type,
      catalogId: type === "CONSUMABLE" ? body.catalogId ?? null : null,
      name,
      addedById: u.id,
      foremanAdded: u.role === "FOREMAN",
    },
  });

  return NextResponse.json(item, { status: 201 });
}
