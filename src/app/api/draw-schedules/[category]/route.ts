export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET(_: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  const { category } = await params;

  const schedule = await prisma.drawSchedule.findUnique({
    where: { tenantId_serviceCategory: { tenantId: u.tenantId, serviceCategory: category as any } },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(schedule);
}
