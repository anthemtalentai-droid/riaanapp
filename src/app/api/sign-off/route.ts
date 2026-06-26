export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const body = await req.json();

  const signOff = await prisma.clientSignOff.create({
    data: {
      jobId: body.jobId,
      signedByName: body.signedByName,
      notes: body.notes || null,
    },
  });

  // Mark job complete
  await prisma.job.update({ where: { id: body.jobId }, data: { status: "COMPLETE", completedAt: new Date() } });

  return NextResponse.json(signOff, { status: 201 });
}

