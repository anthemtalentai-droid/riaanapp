export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET /api/uplift-batches — Admin's reconciliation queue. ?status=SUBMITTED
// for what still needs a pass (the default view).

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const batches = await prisma.upliftBatch.findMany({
    where: { job: { tenantId: u.tenantId }, ...(status ? { status: status as any } : {}) },
    include: {
      job: { select: { siteAddress: true, lead: { select: { clientName: true } } } },
      submittedByForeman: { select: { name: true } },
      officeReconciledBy: { select: { name: true } },
      items: { include: { jobSiteItem: { select: { name: true, type: true } } } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(batches);
}
