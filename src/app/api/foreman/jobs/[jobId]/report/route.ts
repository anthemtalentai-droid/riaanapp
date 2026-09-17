export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";
import { checkConsumableAnomaly } from "@/lib/anomalyCheck";

// POST /api/foreman/jobs/:jobId/report — the Foreman Mode "Log Today's
// Report" submit. Append-only (a job can have several reports in a day —
// matches the existing DailySiteReport model, no special-casing needed).
//
// Body:
//   toolConfirmations: [{ jobSiteItemId, present }]   — existing roster tools
//   newTools:          [{ name }]                     — one-off tools typed in on site
//   consumables:       [{ jobSiteItemId, quantity, color? }] — existing roster consumables only;
//                                                               a brand-new consumable type goes
//                                                               through a Material Request instead
//   notes:  string
//   photos: [{ filename, contentType, base64 }]        — capped, stored inline for round 1
//
// Never accepts a price anywhere — that's the two-stage fill, Admin-only, later.

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

function approxBase64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const toolConfirmations: { jobSiteItemId: string; present: boolean }[] = Array.isArray(body.toolConfirmations) ? body.toolConfirmations : [];
  const newTools: { name: string }[] = Array.isArray(body.newTools) ? body.newTools : [];
  const consumables: { jobSiteItemId: string; quantity: number; color?: string }[] = Array.isArray(body.consumables) ? body.consumables : [];
  const notes: string = typeof body.notes === "string" ? body.notes.trim() : "";
  const photos: { filename?: string; contentType?: string; base64?: string }[] = Array.isArray(body.photos) ? body.photos : [];

  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos per report.` }, { status: 400 });
  }
  for (const p of photos) {
    if (p.base64 && approxBase64Bytes(p.base64) > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: `Photo "${p.filename ?? "unnamed"}" is too large.` }, { status: 400 });
    }
  }

  // Validate every referenced roster item up front — belongs to this job, is
  // the right type, and (for consumables) carries a colour when required —
  // before writing anything.
  const referencedIds = [...toolConfirmations.map((c) => c.jobSiteItemId), ...consumables.map((c) => c.jobSiteItemId)];
  const rosterItems = referencedIds.length
    ? await prisma.jobSiteItem.findMany({
        where: { id: { in: referencedIds }, jobId },
        include: { catalog: { select: { colorRequired: true } } },
      })
    : [];
  const rosterById = new Map(rosterItems.map((i) => [i.id, i]));

  for (const c of toolConfirmations) {
    const item = rosterById.get(c.jobSiteItemId);
    if (!item || item.type !== "TOOL") {
      return NextResponse.json({ error: `Invalid tool confirmation: ${c.jobSiteItemId}` }, { status: 400 });
    }
  }
  for (const c of consumables) {
    const item = rosterById.get(c.jobSiteItemId);
    if (!item || item.type !== "CONSUMABLE") {
      return NextResponse.json({ error: `Invalid consumable reading: ${c.jobSiteItemId}` }, { status: 400 });
    }
    if (typeof c.quantity !== "number" || Number.isNaN(c.quantity) || c.quantity < 0) {
      return NextResponse.json({ error: `Invalid quantity for ${item.name}.` }, { status: 400 });
    }
    if (item.catalog?.colorRequired && !c.color?.trim()) {
      return NextResponse.json({ error: `${item.name} needs a colour selected.` }, { status: 400 });
    }
  }

  const report = await prisma.dailySiteReport.create({
    data: { jobId, loggedById: u.id, notes: notes || null },
  });

  // New one-off tools — persistent from now on, auto-confirmed present today.
  for (const t of newTools) {
    const name = t.name?.trim();
    if (!name) continue;
    const created = await prisma.jobSiteItem.create({
      data: { jobId, type: "TOOL", name, addedById: u.id, foremanAdded: true },
    });
    await prisma.siteItemConfirmation.create({
      data: { reportId: report.id, jobSiteItemId: created.id, present: true },
    });
  }

  for (const c of toolConfirmations) {
    await prisma.siteItemConfirmation.create({
      data: { reportId: report.id, jobSiteItemId: c.jobSiteItemId, present: c.present },
    });
  }

  for (const c of consumables) {
    const item = rosterById.get(c.jobSiteItemId)!;
    const { anomalyFlag, anomalyNote } = await checkConsumableAnomaly(c.jobSiteItemId, c.quantity, report.id);
    await prisma.materialUsed.create({
      data: {
        reportId: report.id,
        jobSiteItemId: c.jobSiteItemId,
        description: item.name,
        quantity: c.quantity,
        color: c.color?.trim() || null,
        anomalyFlag,
        anomalyNote,
      },
    });
  }

  for (const p of photos) {
    if (!p.base64) continue;
    await prisma.sitePhoto.create({
      data: {
        reportId: report.id,
        url: `data:${p.contentType || "image/jpeg"};base64,${p.base64}`,
        caption: p.filename || null,
      },
    });
  }

  return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
}
