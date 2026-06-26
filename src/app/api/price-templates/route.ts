export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const templates = await prisma.priceTemplate.findMany({
    where: { tenantId: u.tenantId, active: true, ...(category ? { serviceCategory: category as any } : {}) },
    orderBy: { description: "asc" },
  });

  return NextResponse.json(templates);
}

