export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, tenantId: u.tenantId },
    include: {
      lead: true,
      acceptedQuote: { include: { lineItems: true } },
      salesman: { select: { id: true, name: true } },
      foreman: { select: { id: true, name: true } },
      invoices: { include: { companyEntity: { select: { tradingAs: true, legalName: true } } } },
      dailyReports: {
        include: { materials: true, photos: true, loggedBy: { select: { name: true } } },
        orderBy: { reportDate: "desc" },
      },
      timeEntries: {
        include: { worker: true },
        orderBy: { clockIn: "desc" },
      },
      clientSignOff: true,
      worksheet: true,
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "FOREMAN" && job.foremanId !== u.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const allowedFields = ["status", "foremanId", "salesmanId", "startDate", "endDate", "completedAt", "serviceCategory", "siteAddress"];
  const data: any = {};
  for (const f of allowedFields) {
    if (body[f] !== undefined) {
      data[f] = ["startDate", "endDate", "completedAt"].includes(f) && body[f] ? new Date(body[f]) : body[f];
    }
  }

  const job = await prisma.job.update({ where: { id }, data });
  return NextResponse.json(job);
}
