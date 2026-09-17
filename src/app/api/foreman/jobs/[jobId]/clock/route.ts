export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// POST /api/foreman/jobs/:jobId/clock — { workerId, action, mileage?, reason? }
// mileage/reason are only meaningful (and only accepted) on clock-out —
// both optional, never mandatory, per Objective 1b's timesheet ask.

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const workerId = String(body.workerId ?? "");
  const worker = await prisma.worker.findFirst({ where: { id: workerId, tenantId: u.tenantId } });
  if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

  if (body.action === "clock-in") {
    const existing = await prisma.timeEntry.findFirst({ where: { jobId, workerId, clockOut: null } });
    if (existing) return NextResponse.json({ error: "Worker already clocked in" }, { status: 409 });

    const entry = await prisma.timeEntry.create({
      data: { jobId, workerId, clockIn: new Date(), verificationMethod: "MANUAL" },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (body.action === "clock-out") {
    const entry = await prisma.timeEntry.findFirst({ where: { jobId, workerId, clockOut: null } });
    if (!entry) return NextResponse.json({ error: "No open clock-in found" }, { status: 404 });

    const clockOut = new Date();
    const hoursWorked = Math.round(((clockOut.getTime() - entry.clockIn.getTime()) / 3600000) * 100) / 100;
    const mileage = body.mileage != null && body.mileage !== "" ? Number(body.mileage) : null;

    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        clockOut,
        hoursWorked,
        mileage: mileage != null && !Number.isNaN(mileage) ? mileage : null,
        reason: body.reason?.trim() || null,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be clock-in or clock-out" }, { status: 400 });
}
