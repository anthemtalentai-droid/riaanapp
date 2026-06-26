export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

// TODO â€” offline queue: this route should accept queued reports from IndexedDB (log now / sync later)
// For now it requires a live connection. Near-term: add a batch endpoint that accepts an array of reports.

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const body = await req.json();

  // Verify the foreman is assigned to this job
  const job = await prisma.job.findFirst({ where: { id: body.jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (u.role === "FOREMAN" && job.foremanId !== u.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const report = await prisma.dailySiteReport.create({
    data: {
      jobId: body.jobId,
      loggedById: u.id,
      reportDate: body.reportDate ? new Date(body.reportDate) : new Date(),
      notes: body.notes || null,
      materials: {
        create: (body.materials ?? []).map((m: any) => ({
          description: m.description,
          quantity: m.quantity,
          unit: m.unit || null,
          unitCost: m.unitCost,
          totalCost: m.quantity * m.unitCost,
        })),
      },
    },
    include: { materials: true },
  });

  return NextResponse.json(report, { status: 201 });
}

