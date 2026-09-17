export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET /api/foreman/jobs/:jobId — everything the Foreman Mode hub screen needs
// for its 3-4 big buttons: whether a report was already logged today, whether
// anyone's currently clocked in, whether a worksheet exists, and whether
// there's an open (not-yet-reconciled) uplift batch. No money fields.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({
    where: { id: jobId, foremanId: u.id },
    select: {
      id: true,
      siteAddress: true,
      status: true,
      serviceCategory: true,
      lead: { select: { clientName: true } },
      worksheet: { select: { id: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayReport, openTimeEntry, openUpliftBatch] = await Promise.all([
    prisma.dailySiteReport.findFirst({
      where: { jobId, loggedById: u.id, reportDate: { gte: startOfToday } },
      select: { id: true },
    }),
    prisma.timeEntry.findFirst({
      where: { jobId, clockOut: null },
      select: { id: true, workerId: true },
    }),
    prisma.upliftBatch.findFirst({
      where: { jobId, status: "SUBMITTED" },
      select: { id: true, submittedAt: true },
    }),
  ]);

  return NextResponse.json({
    id: job.id,
    siteAddress: job.siteAddress,
    status: job.status,
    serviceCategory: job.serviceCategory,
    clientName: job.lead?.clientName ?? null,
    hasWorksheet: !!job.worksheet,
    loggedReportToday: !!todayReport,
    someoneClockedIn: !!openTimeEntry,
    openUpliftBatch: !!openUpliftBatch,
  });
}
