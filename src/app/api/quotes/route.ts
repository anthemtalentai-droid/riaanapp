export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

async function nextQuoteNumber(tenantId: string) {
  const count = await prisma.quote.count();
  return `CWP-Q-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const leadId = searchParams.get("leadId");

  const quotes = await prisma.quote.findMany({
    where: { ...(jobId ? { jobId } : {}), ...(leadId ? { leadId } : {}) },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Recompute totals server-side from line items
  const lineItems: { description: string; unit?: string; quantity: number; unitPrice: number; isCustom: boolean; templateId?: string }[] =
    body.lineItems ?? [];

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const vatRate = 0.15;
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  const quote = await prisma.quote.create({
    data: {
      jobId: body.jobId || null,
      leadId: body.leadId || null,
      quoteNumber: await nextQuoteNumber(u.tenantId),
      serviceCategory: body.serviceCategory,
      status: body.status || "DRAFT",
      clientName: body.clientName,
      clientEmail: body.clientEmail || null,
      clientPhone: body.clientPhone || null,
      siteAddress: body.siteAddress,
      notes: body.notes || null,
      vatRate,
      subtotal,
      vatAmount,
      total,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      lineItems: {
        create: lineItems.map((li) => ({
          description: li.description,
          unit: li.unit || null,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.quantity * li.unitPrice,
          isCustom: li.isCustom,
          templateId: li.templateId || null,
        })),
      },
    },
    include: { lineItems: true },
  });

  return NextResponse.json(quote, { status: 201 });
}

