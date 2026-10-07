import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFirestorePackageById, updateFirestorePackage } from "@/lib/firestore-service";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.DATABASE_PROVIDER === "firestore") {
      const pkg = await getFirestorePackageById(params.id);
      if (!pkg) {
        return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
      }
      return NextResponse.json(pkg);
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: "desc" },
          include: {
            orderItems: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }

    let totalSold = 0;
    let totalTheoretical = 0;
    pkg.products.forEach((p) => {
      totalTheoretical += Number(p.salePrice || 0);
      p.orderItems.forEach((item) => {
        if (["pagado", "enviado", "entregado"].includes(item.order.status)) {
          totalSold += Number(item.finalPrice);
        }
      });
    });

    const cost = Number(pkg.costPrice);
    const isRecovered = totalSold >= cost && cost > 0;
    const profit = Math.max(0, totalSold - cost);
    const recoveryPercent = cost > 0 ? Math.min(100, Math.round((totalSold / cost) * 100)) : 100;

    return NextResponse.json({
      ...pkg,
      costPrice: cost,
      totalWeight: pkg.totalWeight ? Number(pkg.totalWeight) : null,
      totalSold,
      totalTheoretical,
      isRecovered,
      profit,
      recoveryPercent,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const updated = await updateFirestorePackage(params.id, body);
      return NextResponse.json(updated);
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const pkgName = (body.name || body.reference || body.title || "").trim();
    const updateData: any = {};
    if (body.packageType !== undefined) updateData.packageType = body.packageType;
    if (body.costPrice !== undefined) updateData.costPrice = Number(body.costPrice);
    if (body.invoiceNumber !== undefined) updateData.invoiceNumber = body.invoiceNumber;
    if (body.totalWeight !== undefined) updateData.totalWeight = body.totalWeight ? Number(body.totalWeight) : null;
    if (body.notes !== undefined || pkgName) {
      updateData.notes = pkgName ? `[${pkgName}] ${body.notes || ""}`.trim() : body.notes;
    }

    const updated = await prisma.package.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
