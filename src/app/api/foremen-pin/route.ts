export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// GET /api/foremen-pin — Admin's "Foreman Access" settings list: every
// FOREMAN user, whether they have a PIN set, and whether PIN login is
// enabled for them. Riaan wants this off for everyone until he's tested
// Foreman Mode solo, so pinEnabled defaults false per user (see schema).

export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();

  const foremen = await prisma.user.findMany({
    where: { tenantId: u.tenantId, role: "FOREMAN" },
    select: { id: true, name: true, email: true, pinEnabled: true, pinHash: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(foremen.map((f) => ({ id: f.id, name: f.name, email: f.email, pinEnabled: f.pinEnabled, hasPin: !!f.pinHash })));
}
