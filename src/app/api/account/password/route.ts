export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

// POST /api/account/password — a signed-in user changes their own password.
// Needs the current password (so a left-open phone can't be used to lock the
// owner out) and a new one of at least 8 characters.
export async function POST(req: Request) {
  const session = await getSession();
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const current = String(body.currentPassword ?? "").trim();
  const next = String(body.newPassword ?? "").trim();

  if (next.length < 8) {
    return NextResponse.json({ error: "Your new password needs at least 8 characters." }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: "Please choose a password different from your current one." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return unauthorized();

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Your current password isn't right. Please check it and try again." }, { status: 400 });
  }

  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return NextResponse.json({ ok: true });
}
