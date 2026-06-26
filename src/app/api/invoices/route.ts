export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  const invoices = await prisma.invoice.findMany({
    where: { ...(jobId ? { jobId } : { job: { tenantId: u.tenantId } }) },
    include: {
      companyEntity: { select: { tradingAs: true, legalName: true, vatNumber: true } },
      job: { select: { siteAddress: true, lead: { select: { clientName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Forbidden â€” Admin only" }, { status: 403 });

  const body = await req.json();

  // Generate sequential invoice number scoped to company entity
  const entity = await prisma.companyEntity.findUnique({ where: { id: body.companyEntityId } });
  if (!entity) return NextResponse.json({ error: "Company entity not found" }, { status: 404 });

  const invoiceNumber = `${entity.invoicePrefix}-${String(entity.invoiceSequence).padStart(5, "0")}`;

  const vatRate = 0.15;
  const subtotal = body.subtotal;
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  const [invoice] = await prisma.$transaction([
    prisma.invoice.create({
      data: {
        jobId: body.jobId,
        companyEntityId: body.companyEntityId,
        invoiceNumber,
        type: body.type,
        status: "DRAFT",
        drawStageLabel: body.drawStageLabel || null,
        drawPercentage: body.drawPercentage || null,
        subtotal,
        vatAmount,
        total,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
      },
    }),
    prisma.companyEntity.update({
      where: { id: body.companyEntityId },
      data: { invoiceSequence: { increment: 1 } },
    }),
  ]);

  return NextResponse.json(invoice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...data } = body;

  const invoice = await prisma.invoice.update({ where: { id }, data });
  return NextResponse.json(invoice);
}

