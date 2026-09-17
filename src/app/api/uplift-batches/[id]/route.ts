export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// PATCH /api/uplift-batches/:id — Admin's reconciliation pass.
// Body: { items: [{ id, status, exceptionReason? }], complete: boolean }
// Any item confirmed PRESENT flips its JobSiteItem to UPLIFTED (off the
// active roster). MISSING/EXCEPTION items stay ON_SITE — still an open
// concern until someone resolves them (re-run reconciliation later).
// complete:true closes the batch even if some items are still open
// exceptions — those just remain visible as unresolved JobSiteItems.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();
  const { id } = await params;

  const batch = await prisma.upliftBatch.findFirst({ where: { id, job: { tenantId: u.tenantId } }, include: { items: true } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const itemUpdates: { id: string; status: "PRESENT" | "MISSING" | "EXCEPTION"; exceptionReason?: string }[] = Array.isArray(body.items) ? body.items : [];
  const batchItemIds = new Set(batch.items.map((i) => i.id));

  for (const upd of itemUpdates) {
    if (!batchItemIds.has(upd.id)) continue;
    if ((upd.status === "MISSING" || upd.status === "EXCEPTION") && !upd.exceptionReason?.trim()) {
      return NextResponse.json({ error: "A reason is required for a MISSING or EXCEPTION item." }, { status: 400 });
    }

    const item = await prisma.upliftBatchItem.update({
      where: { id: upd.id },
      data: { status: upd.status, exceptionReason: upd.status === "PRESENT" ? null : upd.exceptionReason?.trim() },
    });

    await prisma.jobSiteItem.update({
      where: { id: item.jobSiteItemId },
      data:
        upd.status === "PRESENT"
          ? { status: "UPLIFTED", upliftedAt: new Date() }
          : { status: "ON_SITE" },
    });
  }

  if (body.complete) {
    const updatedBatch = await prisma.upliftBatch.update({
      where: { id },
      data: { status: "RECONCILED", officeReconciledAt: new Date(), officeReconciledById: u.id },
      include: { items: { include: { jobSiteItem: { select: { name: true, type: true } } } } },
    });
    return NextResponse.json(updatedBatch);
  }

  const updatedBatch = await prisma.upliftBatch.findUnique({
    where: { id },
    include: { items: { include: { jobSiteItem: { select: { name: true, type: true } } } } },
  });
  return NextResponse.json(updatedBatch);
}
