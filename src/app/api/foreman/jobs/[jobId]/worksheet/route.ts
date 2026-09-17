export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET /api/foreman/jobs/:jobId/worksheet — read-only scope of work. The
// ForemanWorksheet.content JSON only ever contains description/quantity
// strings + special instructions (see api/jobs/route.ts POST) — no pricing.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id }, include: { worksheet: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!job.worksheet) return NextResponse.json({ error: "No worksheet yet" }, { status: 404 });

  let data: any = {};
  try {
    data = JSON.parse(job.worksheet.content);
  } catch {
    /* leave data empty if content isn't valid JSON */
  }

  return NextResponse.json(data);
}
