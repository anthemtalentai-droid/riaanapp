export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const leads = await prisma.lead.findMany({
    where: { tenantId: u.tenantId },
    include: { loggedBy: { select: { name: true } }, job: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const lead = await prisma.lead.create({
    data: {
      tenantId: u.tenantId,
      loggedById: u.id,
      clientName: body.clientName,
      clientEmail: body.clientEmail || null,
      clientPhone: body.clientPhone || null,
      source: body.source,
      status: body.status || "NEW",
      address: body.address || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}

