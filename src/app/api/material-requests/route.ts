export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET  /api/material-requests            — Admin: all requests (optionally
//      ?status=PENDING). Foreman: pass ?jobId= for their own job's requests.
// POST /api/material-requests            — Foreman creates a restock ask.
//      Needs Admin approval before it's "dispatched to site" as pending.

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const jobId = searchParams.get("jobId");

  const where: any = {};
  if (u.role === "ADMIN") {
    where.tenantId = u.tenantId;
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
  } else if (u.role === "FOREMAN") {
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id } });
    if (!job) return forbidden();
    where.jobId = jobId;
  } else {
    return forbidden();
  }

  const requests = await prisma.materialRequest.findMany({
    where,
    include: {
      job: { select: { siteAddress: true } },
      catalog: { select: { name: true, unit: true } },
      jobSiteItem: { select: { name: true } },
      requestedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();

  const body = await req.json();
  const jobId = String(body.jobId ?? "");
  const requestedQty = Number(body.requestedQty);

  const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!requestedQty || requestedQty <= 0) return NextResponse.json({ error: "requestedQty must be > 0" }, { status: 400 });
  if (!body.jobSiteItemId && !body.catalogId && !String(body.customItemName ?? "").trim()) {
    return NextResponse.json({ error: "Need jobSiteItemId, catalogId, or customItemName" }, { status: 400 });
  }

  const request = await prisma.materialRequest.create({
    data: {
      tenantId: u.tenantId,
      jobId,
      jobSiteItemId: body.jobSiteItemId || null,
      catalogId: body.catalogId || null,
      customItemName: body.customItemName?.trim() || null,
      requestedQty,
      unit: body.unit || null,
      note: body.note?.trim() || null,
      requestedById: u.id,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
