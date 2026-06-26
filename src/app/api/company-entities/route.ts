export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;

  const entities = await prisma.companyEntity.findMany({
    where: { tenantId: u.tenantId },
    orderBy: { legalName: "asc" },
  });

  return NextResponse.json(entities);
}

