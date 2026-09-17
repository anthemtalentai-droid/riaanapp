export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// PATCH /api/foremen-pin/:userId — { pin?: "1234", pinEnabled?: boolean }
// Setting a new pin does NOT itself enable it — Admin still has to flip
// pinEnabled on separately, matching Riaan's "test solo first" rollout ask.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();
  const { userId } = await params;

  const target = await prisma.user.findFirst({ where: { id: userId, tenantId: u.tenantId, role: "FOREMAN" } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};

  if (body.pin !== undefined) {
    if (!/^\d{4}$/.test(String(body.pin))) return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
    data.pinHash = await bcrypt.hash(String(body.pin), 10);
  }
  if (body.pinEnabled !== undefined) {
    if (body.pinEnabled && !data.pinHash && !target.pinHash) {
      return NextResponse.json({ error: "Set a PIN before enabling PIN login." }, { status: 400 });
    }
    data.pinEnabled = !!body.pinEnabled;
  }

  const updated = await prisma.user.update({ where: { id: userId }, data, select: { id: true, name: true, pinEnabled: true, pinHash: true } });
  return NextResponse.json({ id: updated.id, name: updated.name, pinEnabled: updated.pinEnabled, hasPin: !!updated.pinHash });
}
