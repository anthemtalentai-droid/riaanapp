import { prisma } from "./prisma";

// Day-over-day consumable quantity anomaly check (Objective 1b, Phase 2 doc).
//
// MaterialUsed.quantity for a CONSUMABLE reading is a *stock reading* — "how
// much of this is on site right now" — not a usage log, mirroring the old
// Daily Report App's tools tally. Riaan's ask: flag ANY change from the prior
// day's reading, in EITHER direction, unless it's fully explained by an
// approved-and-delivered MaterialRequest for that same item since the prior
// reading. An unexplained rise usually means paint arrived off-book; an
// unexplained drop usually means the foreman isn't actually measuring/
// checking the material — both are worth a human looking at, per his own
// wording ("flag ALL anomalies, both directions").
//
// This is inherently a judgement call with no single "correct" formula —
// flagged as such in the build summary for Riaan to confirm/adjust.

export async function checkConsumableAnomaly(
  jobSiteItemId: string,
  newQuantity: number,
  currentReportId: string
): Promise<{ anomalyFlag: boolean; anomalyNote: string | null }> {
  const prior = await prisma.materialUsed.findFirst({
    where: { jobSiteItemId, reportId: { not: currentReportId } },
    include: { report: { select: { reportDate: true } } },
    orderBy: { report: { reportDate: "desc" } },
  });

  if (!prior) {
    // First reading for this item on this job — nothing to compare against.
    return { anomalyFlag: false, anomalyNote: null };
  }

  const delta = newQuantity - prior.quantity;
  if (delta === 0) return { anomalyFlag: false, anomalyNote: null };

  // Does an approved+delivered request explain a rise since the prior reading?
  const deliveredSince = await prisma.materialRequest.aggregate({
    where: {
      jobSiteItemId,
      status: "DELIVERED",
      deliveredConfirmedAt: { gt: prior.report.reportDate },
    },
    _sum: { deliveredQty: true },
  });
  const deliveredQty = deliveredSince._sum.deliveredQty ?? 0;

  if (delta > 0 && Math.abs(delta - deliveredQty) < 0.01) {
    return { anomalyFlag: false, anomalyNote: null };
  }

  const note =
    delta > 0
      ? `Reading went up from ${prior.quantity} to ${newQuantity} (+${delta.toFixed(2)}) with no matching delivered restock request — please explain.`
      : `Reading went down from ${prior.quantity} to ${newQuantity} (${delta.toFixed(2)}) — please explain.`;

  return { anomalyFlag: true, anomalyNote: note };
}
