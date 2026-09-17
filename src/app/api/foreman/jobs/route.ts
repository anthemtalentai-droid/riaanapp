export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET /api/foreman/jobs — the foreman's own active job cards for the /foreman
// landing screen. No money fields anywhere in this response, by design.

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();

  const jobs = await prisma.job.findMany({
    where: { foremanId: u.id, status: { in: ["PENDING", "IN_PROGRESS", "ON_HOLD"] } },
    select: {
      id: true,
      siteAddress: true,
      status: true,
      serviceCategory: true,
      lead: { select: { clientName: true } },
      startDate: true,
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(jobs);
}
