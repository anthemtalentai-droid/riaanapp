export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET  /api/material-catalog — any signed-in tenant user (Foreman Mode's
//      report/request screens need to read this list, just never its price).
// POST /api/material-catalog — Admin only.

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const items = await prisma.materialCatalog.findMany({
    where: { tenantId: u.tenantId, active: true },
    orderBy: { name: "asc" },
    // Foreman Mode never needs/sees currentUnitPrice — strip it for that role
    // at the source rather than trusting every caller to ignore the field.
    select: {
      id: true,
      name: true,
      unit: true,
      colorRequired: true,
      currentUnitPrice: u.role !== "FOREMAN",
    },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const item = await prisma.materialCatalog.create({
    data: {
      tenantId: u.tenantId,
      name,
      unit: body.unit || null,
      currentUnitPrice: body.currentUnitPrice != null ? Number(body.currentUnitPrice) : null,
      colorRequired: !!body.colorRequired,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
