export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, forbidden } from "@/lib/session";

// PATCH /api/material-catalog/:id — Admin updates a catalog item, most often
// its price (e.g. Painters Mate R22 -> R23/L). Every price change is logged
// to MaterialCatalogPriceHistory; new report entries pick up the new price
// automatically since they always read currentUnitPrice live.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();
  const u = session.user as any;
  if (u.role !== "ADMIN") return forbidden();
  const { id } = await params;

  const existing = await prisma.materialCatalog.findFirst({ where: { id, tenantId: u.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.unit !== undefined) data.unit = body.unit || null;
  if (body.colorRequired !== undefined) data.colorRequired = !!body.colorRequired;
  if (body.active !== undefined) data.active = !!body.active;

  const priceChanging = body.currentUnitPrice !== undefined && Number(body.currentUnitPrice) !== existing.currentUnitPrice;
  if (body.currentUnitPrice !== undefined) data.currentUnitPrice = body.currentUnitPrice != null ? Number(body.currentUnitPrice) : null;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.materialCatalog.update({ where: { id }, data });
    if (priceChanging) {
      await tx.materialCatalogPriceHistory.create({
        data: { catalogId: id, oldPrice: existing.currentUnitPrice, newPrice: item.currentUnitPrice, changedById: u.id },
      });
    }
    return item;
  });

  return NextResponse.json(updated);
}
