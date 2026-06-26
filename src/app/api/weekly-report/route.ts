export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role === "FOREMAN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [newLeads, jobsInProgress, jobsAwaitingInvoice, recentReports] = await Promise.all([
    prisma.lead.count({ where: { tenantId: u.tenantId, createdAt: { gte: weekAgo } } }),
    prisma.job.count({ where: { tenantId: u.tenantId, status: "IN_PROGRESS" } }),
    prisma.job.count({ where: { tenantId: u.tenantId, status: "COMPLETE", invoices: { none: { status: { in: ["SENT", "PAID"] } } } } }),
    prisma.dailySiteReport.count({ where: { job: { tenantId: u.tenantId }, createdAt: { gte: weekAgo } } }),
  ]);

  const leadsThisWeek = await prisma.lead.findMany({
    where: { tenantId: u.tenantId, createdAt: { gte: weekAgo } },
    select: { id: true, clientName: true, source: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const activeJobs = await prisma.job.findMany({
    where: { tenantId: u.tenantId, status: "IN_PROGRESS" },
    select: { id: true, siteAddress: true, serviceCategory: true, lead: { select: { clientName: true } } },
  });

  return NextResponse.json({
    period: { from: weekAgo, to: now },
    stats: { newLeads, jobsInProgress, jobsAwaitingInvoice, recentReports },
    leadsThisWeek,
    activeJobs,
  });
}

