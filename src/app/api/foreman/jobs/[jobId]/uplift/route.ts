export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// POST /api/foreman/jobs/:jobId/uplift — starts an uplift batch. Gated: every
// current ON_SITE item on the roster must already have today's confirmation
// (tools) or today's quantity reading (consumables) — i.e. the foreman must
// have logged today's report before he can uplift, per Objective 1b ("gated
// behind the foreman first confirming every tool/material still on site and
// the current paint quantities").
//
// Body: { items: [{ jobSiteItemId, present: boolean }] } — one entry per
// current ON_SITE roster item. "Uplift All" on the client just sends every
// item as present: true.

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "FOREMAN") return forbidden();
  const { jobId } = await params;

  const job = await prisma.job.findFirst({ where: { id: jobId, foremanId: u.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existingOpen = await prisma.upliftBatch.findFirst({ where: { jobId, status: "SUBMITTED" } });
  if (existingOpen) return NextResponse.json({ error: "An uplift batch is already awaiting office reconciliation." }, { status: 409 });

  const roster = await prisma.jobSiteItem.findMany({ where: { jobId, status: "ON_SITE" } });
  if (roster.length === 0) return NextResponse.json({ error: "Nothing on the roster to uplift." }, { status: 400 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [toolConfirmedToday, consumableReadToday] = await Promise.all([
    prisma.siteItemConfirmation.findMany({
      where: { jobSiteItemId: { in: roster.filter((r) => r.type === "TOOL").map((r) => r.id) }, report: { reportDate: { gte: startOfToday } } },
      select: { jobSiteItemId: true },
    }),
    prisma.materialUsed.findMany({
      where: { jobSiteItemId: { in: roster.filter((r) => r.type === "CONSUMABLE").map((r) => r.id) }, report: { reportDate: { gte: startOfToday } } },
      select: { jobSiteItemId: true },
    }),
  ]);
  const confirmedIds = new Set([...toolConfirmedToday.map((c) => c.jobSiteItemId), ...consumableReadToday.map((c) => c.jobSiteItemId)]);
  const notYetConfirmed = roster.filter((r) => !confirmedIds.has(r.id));
  if (notYetConfirmed.length > 0) {
    return NextResponse.json(
      { error: "Log today's report first — every item needs today's confirmation before an uplift.", missing: notYetConfirmed.map((r) => r.name) },
      { status: 400 }
    );
  }

  const body = await req.json();
  const items: { jobSiteItemId: string; present: boolean }[] = Array.isArray(body.items) ? body.items : [];
  const rosterIds = new Set(roster.map((r) => r.id));
  for (const it of items) {
    if (!rosterIds.has(it.jobSiteItemId)) return NextResponse.json({ error: `${it.jobSiteItemId} is not on the current roster.` }, { status: 400 });
  }
  const coveredIds = new Set(items.map((i) => i.jobSiteItemId));
  if (roster.some((r) => !coveredIds.has(r.id))) {
    return NextResponse.json({ error: "Every roster item needs an uplift status." }, { status: 400 });
  }

  const batch = await prisma.upliftBatch.create({
    data: {
      jobId,
      submittedByForemanId: u.id,
      items: {
        create: items.map((i) => ({ jobSiteItemId: i.jobSiteItemId, status: i.present ? "PRESENT" : "MISSING" })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(batch, { status: 201 });
}
