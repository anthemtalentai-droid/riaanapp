export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/foreman-login-roster — PUBLIC, unauthenticated on purpose: the
// name-card grid on /foreman/login needs to know which foremen to show
// BEFORE anyone is signed in. Only ever returns id + name for foremen who
// have PIN login switched on — never email, never anything else.

export async function GET() {
  const foremen = await prisma.user.findMany({
    where: { role: "FOREMAN", pinEnabled: true, pinHash: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(foremen);
}
