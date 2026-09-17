export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// DELETE /api/jobs/:id/site-items/:itemId — Admin removes a planned item that
//        never should have been on the roster. If it already has history
//        (confirmations/readings), it's marked UPLIFTED instead of deleted so
//        past reports still resolve.
// PATCH  /api/jobs/:id/site-items/:itemId — Admin-only status correction
//        outside the formal Uplift workflow (e.g. undo an accidental uplift).

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();
  const { id, itemId } = await params;

  const item = await prisma.jobSiteItem.findFirst({ where: { id: itemId, jobId: id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [confirmCount, usedCount] = await Promise.all([
    prisma.siteItemConfirmation.count({ where: { jobSiteItemId: itemId } }),
    prisma.materialUsed.count({ where: { jobSiteItemId: itemId } }),
  ]);

  if (confirmCount > 0 || usedCount > 0) {
    await prisma.jobSiteItem.update({ where: { id: itemId }, data: { status: "UPLIFTED", upliftedAt: new Date() } });
    return NextResponse.json({ removed: false, upliftedInstead: true });
  }

  await prisma.jobSiteItem.delete({ where: { id: itemId } });
  return NextResponse.json({ removed: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();
  const { id, itemId } = await params;

  const body = await req.json();
  if (body.status !== "ON_SITE" && body.status !== "UPLIFTED") {
    return NextResponse.json({ error: "status must be ON_SITE or UPLIFTED" }, { status: 400 });
  }

  const item = await prisma.jobSiteItem.findFirst({ where: { id: itemId, jobId: id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.jobSiteItem.update({
    where: { id: itemId },
    data: { status: body.status, upliftedAt: body.status === "UPLIFTED" ? new Date() : null },
  });

  return NextResponse.json(updated);
}
