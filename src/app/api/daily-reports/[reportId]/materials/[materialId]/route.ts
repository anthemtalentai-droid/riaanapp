export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// PATCH /api/daily-reports/:reportId/materials/:materialId — the two-stage
// fill (Objective 1b): Admin attaches unitCost + invoiceNumber to a material
// line the foreman logged with quantity only. Foreman never sees or sets
// either field.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ reportId: string; materialId: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();
  const { reportId, materialId } = await params;

  const material = await prisma.materialUsed.findFirst({
    where: { id: materialId, reportId, report: { job: { tenantId: u.tenantId } } },
  });
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const unitCost = body.unitCost != null ? Number(body.unitCost) : material.unitCost;
  const totalCost = unitCost != null ? Math.round(unitCost * material.quantity * 100) / 100 : null;

  const updated = await prisma.materialUsed.update({
    where: { id: materialId },
    data: {
      unitCost: unitCost ?? null,
      totalCost,
      invoiceNumber: body.invoiceNumber !== undefined ? body.invoiceNumber?.trim() || null : material.invoiceNumber,
    },
  });

  return NextResponse.json(updated);
}
