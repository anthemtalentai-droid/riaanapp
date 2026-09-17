export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET /api/foreman/jobs/:jobId/workers — crew list for the Clock In/Out
// screen. Deliberately excludes wage rate (money) — Foreman Mode's API
// surface never carries a Rand figure, not even an hourly rate.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [workers, openEntries] = await Promise.all([
    prisma.worker.findMany({ where: { tenantId: u.tenantId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.timeEntry.findMany({ where: { jobId, clockOut: null }, select: { workerId: true, clockIn: true } }),
  ]);

  const clockedIn = new Map(openEntries.map((e) => [e.workerId, e.clockIn]));

  return NextResponse.json(
    workers.map((w) => ({ id: w.id, name: w.name, clockedIn: clockedIn.has(w.id), clockInAt: clockedIn.get(w.id) ?? null }))
  );
}
