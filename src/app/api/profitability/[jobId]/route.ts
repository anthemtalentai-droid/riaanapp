export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";
import { computeProfitability } from "@/lib/profitability";

export async function GET(_: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  const { jobId } = await params;

  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId: u.tenantId },
    include: {
      acceptedQuote: true,
      dailyReports: { include: { materials: true } },
      timeEntries: { include: { worker: { include: { wageRates: { orderBy: { effectiveFrom: "desc" }, take: 1 } } } } },
      invoices: true,
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const revenue = job.acceptedQuote?.total ?? 0;

  const materialsTotal = job.dailyReports.reduce(
    (sum, r) => sum + r.materials.reduce((s, m) => s + m.totalCost, 0),
    0
  );

  const labourTotal = job.timeEntries.reduce((sum, te) => {
    const rate = te.worker.wageRates[0]?.ratePerHour ?? 55; // PLACEHOLDER fallback rate
    return sum + (te.hoursWorked ?? 0) * rate;
  }, 0);

  const startDate = job.startDate ?? job.createdAt;
  const endDate = job.completedAt ?? new Date();
  const daysOnSite = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));

  const invoicesTotal = job.invoices.reduce((s, i) => s + i.total, 0);
  const amountPaid = job.invoices.reduce((s, i) => s + i.amountPaid, 0);

  const result = computeProfitability({ revenue, materialsTotal, labourTotal, daysOnSite, invoicesTotal, amountPaid });

  return NextResponse.json({
    jobId,
    revenue,
    materialsTotal,
    labourTotal,
    daysOnSite,
    invoicesTotal,
    amountPaid,
    ...result,
  });
}
