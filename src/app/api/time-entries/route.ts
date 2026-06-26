export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  const entries = await prisma.timeEntry.findMany({
    where: jobId ? { jobId } : {},
    include: { worker: true },
    orderBy: { clockIn: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const body = await req.json();

  if (body.action === "clock-in") {
    // Prevent duplicate open entries
    const existing = await prisma.timeEntry.findFirst({
      where: { jobId: body.jobId, workerId: body.workerId, clockOut: null },
    });
    if (existing) return NextResponse.json({ error: "Worker already clocked in" }, { status: 409 });

    const entry = await prisma.timeEntry.create({
      data: {
        jobId: body.jobId,
        workerId: body.workerId,
        clockIn: new Date(),
        verificationMethod: "MANUAL", // stub â€” future kiosk integration slots in here
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (body.action === "clock-out") {
    const entry = await prisma.timeEntry.findFirst({
      where: { jobId: body.jobId, workerId: body.workerId, clockOut: null },
    });
    if (!entry) return NextResponse.json({ error: "No open clock-in found" }, { status: 404 });

    const clockOut = new Date();
    const ms = clockOut.getTime() - entry.clockIn.getTime();
    const hoursWorked = Math.round((ms / 3600000) * 100) / 100;

    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { clockOut, hoursWorked },
      include: { worker: true },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be clock-in or clock-out" }, { status: 400 });
}

