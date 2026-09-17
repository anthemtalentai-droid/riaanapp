export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// PATCH /api/material-requests/:id
//   { action: "approve" }                     — Admin only, PENDING -> APPROVED
//   { action: "reject", rejectionReason }      — Admin only, PENDING -> REJECTED
//   { action: "deliver", deliveredQty }        — Foreman only, the requesting
//        job's foreman confirms what actually arrived (checklist: requested 5
//        -> delivered 5). This is the step that adds the quantity to job cost —
//        it creates the MaterialUsed reading (price still unset, two-stage
//        fill happens later by Admin) and tops up / creates the roster entry.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  const { id } = await params;

  const existing = await prisma.materialRequest.findUnique({
    where: { id },
    include: { jobSiteItem: true, catalog: true, job: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.action === "approve" || body.action === "reject") {
    if (u.role !== "ADMIN") return forbidden();
    if (existing.status !== "PENDING") return NextResponse.json({ error: "Only a PENDING request can be approved/rejected." }, { status: 409 });

    const updated = await prisma.materialRequest.update({
      where: { id },
      data:
        body.action === "approve"
          ? { status: "APPROVED", approvedById: u.id, approvedAt: new Date() }
          : { status: "REJECTED", approvedById: u.id, approvedAt: new Date(), rejectionReason: body.rejectionReason?.trim() || "No reason given" },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "deliver") {
    if (u.role !== "FOREMAN") return forbidden();
    if (existing.job.foremanId !== u.id) return forbidden();
    if (existing.status !== "APPROVED") return NextResponse.json({ error: "Only an APPROVED request can be confirmed delivered." }, { status: 409 });

    const deliveredQty = Number(body.deliveredQty);
    if (!deliveredQty || deliveredQty <= 0) return NextResponse.json({ error: "deliveredQty must be > 0" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      let jobSiteItemId = existing.jobSiteItemId;

      // No existing roster line for this item — the approval effectively
      // authorises adding it, since an Admin already signed off.
      if (!jobSiteItemId) {
        const name = existing.catalog?.name ?? existing.customItemName ?? "Delivered material";
        const created = await tx.jobSiteItem.create({
          data: {
            jobId: existing.jobId,
            type: "CONSUMABLE",
            catalogId: existing.catalogId,
            name,
            addedById: existing.approvedById ?? u.id,
            foremanAdded: false,
          },
        });
        jobSiteItemId = created.id;
      }

      const priorReading = await tx.materialUsed.findFirst({
        where: { jobSiteItemId },
        orderBy: { createdAt: "desc" },
        select: { quantity: true },
      });
      const newQuantity = (priorReading?.quantity ?? 0) + deliveredQty;

      // Needs a report row to hang off (schema requirement) — a lightweight
      // one tagged as a delivery confirmation, not a full site visit log.
      const report = await tx.dailySiteReport.create({
        data: {
          jobId: existing.jobId,
          loggedById: u.id,
          notes: `Material delivery confirmed: ${existing.customItemName ?? existing.catalog?.name ?? "item"} x${deliveredQty}`,
        },
      });

      const materialUsed = await tx.materialUsed.create({
        data: {
          reportId: report.id,
          jobSiteItemId,
          materialRequestId: existing.id,
          description: existing.catalog?.name ?? existing.customItemName ?? "Delivered material",
          quantity: newQuantity,
        },
      });

      const updated = await tx.materialRequest.update({
        where: { id },
        data: {
          status: "DELIVERED",
          deliveredQty,
          deliveredConfirmedById: u.id,
          deliveredConfirmedAt: new Date(),
          jobSiteItemId,
        },
      });

      return { updated, materialUsed };
    });

    return NextResponse.json(result.updated);
  }

  return NextResponse.json({ error: "action must be approve, reject, or deliver" }, { status: 400 });
}
