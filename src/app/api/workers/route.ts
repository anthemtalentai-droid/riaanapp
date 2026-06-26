export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const workers = await prisma.worker.findMany({
    where: { tenantId: u.tenantId, active: true },
    include: { wageRates: { orderBy: { effectiveFrom: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(workers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const worker = await prisma.worker.create({
    data: { tenantId: u.tenantId, name: body.name, phone: body.phone || null, idNumber: body.idNumber || null },
  });

  if (body.ratePerHour) {
    await prisma.wageRate.create({
      data: { tenantId: u.tenantId, workerId: worker.id, ratePerHour: body.ratePerHour },
    });
  }

  return NextResponse.json(worker, { status: 201 });
}

