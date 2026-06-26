export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const where: any = { tenantId: u.tenantId };
  if (u.role === "FOREMAN") where.foremanId = u.id;

  const jobs = await prisma.job.findMany({
    where,
    include: {
      lead: { select: { clientName: true } },
      acceptedQuote: { select: { total: true, quoteNumber: true } },
      salesman: { select: { name: true } },
      foreman: { select: { name: true } },
      _count: { select: { invoices: true, dailyReports: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const job = await prisma.job.create({
    data: {
      tenantId: u.tenantId,
      leadId: body.leadId || null,
      acceptedQuoteId: body.acceptedQuoteId || null,
      salesmanId: body.salesmanId || u.id,
      foremanId: body.foremanId || null,
      serviceCategory: body.serviceCategory,
      status: "PENDING",
      siteAddress: body.siteAddress,
      startDate: body.startDate ? new Date(body.startDate) : null,
    },
  });

  // Auto-generate foreman worksheet if acceptedQuote provided
  if (body.acceptedQuoteId) {
    const quote = await prisma.quote.findUnique({
      where: { id: body.acceptedQuoteId },
      include: { lineItems: true },
    });
    if (quote) {
      await prisma.foremanWorksheet.create({
        data: {
          jobId: job.id,
          content: JSON.stringify({
            jobId: job.id,
            clientName: quote.clientName,
            siteAddress: job.siteAddress,
            scope: quote.lineItems.map((li) => ({
              description: li.description,
              quantity: `${li.quantity} ${li.unit ?? ""}`.trim(),
            })),
            specialInstructions: quote.notes,
          }),
        },
      });
    }
  }

  // Update lead status
  if (body.leadId) {
    await prisma.lead.update({ where: { id: body.leadId }, data: { status: "ACCEPTED" } });
  }

  return NextResponse.json(job, { status: 201 });
}

