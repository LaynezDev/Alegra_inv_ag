import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFirestorePackages, createFirestorePackage } from "@/lib/firestore-service";

export async function GET() {
  try {
    if (process.env.DATABASE_PROVIDER === "firestore") {
      const packages = await getFirestorePackages();
      return NextResponse.json(packages);
    }

    const packages = await prisma.package.findMany({
      include: {
        products: {
          select: {
            id: true,
            status: true,
            salePrice: true,
            calculatedCost: true,
            orderItems: {
              select: {
                finalPrice: true,
                order: {
                  select: { status: true }
                }
              }
            }
          }
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = packages.map((pkg) => {
      const totalProducts = pkg.products.length;
      const soldProducts = pkg.products.filter((p) => p.status === "vendido").length;
      const reservedProducts = pkg.products.filter((p) => p.status === "apartado").length;
      const availableProducts = pkg.products.filter((p) => p.status === "disponible").length;

      // Calcular total vendido y total teórico
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

      return {
        id: pkg.id,
        code: pkg.code,
        name: (pkg as any).name || null,
        packageType: pkg.packageType,
        costPrice: cost,
        invoiceNumber: pkg.invoiceNumber,
        totalWeight: pkg.totalWeight ? Number(pkg.totalWeight) : null,
        status: pkg.status,
        notes: pkg.notes,
        createdAt: pkg.createdAt,
        totalProducts,
        soldProducts,
        reservedProducts,
        availableProducts,
        totalSold,
        totalTheoretical,
        isRecovered,
        profit,
        recoveryPercent,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, reference, title, packageType, costPrice, invoiceNumber, totalWeight, notes } = body;

    if (!packageType || costPrice === undefined || !invoiceNumber) {
      return NextResponse.json(
        { error: "Tipo de paquete, costo y número de factura son obligatorios" },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const newPackage = await createFirestorePackage(body);
      return NextResponse.json(newPackage, { status: 201 });
    }

    const count = await prisma.package.count();
    const code = `PKG-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
    const pkgName = (name || reference || title || "").trim() || null;

    const newPackage = await prisma.package.create({
      data: {
        code,
        packageType,
        costPrice: Number(costPrice),
        invoiceNumber,
        totalWeight: totalWeight ? Number(totalWeight) : null,
        notes: pkgName ? `[${pkgName}] ${notes || ""}`.trim() : (notes || null),
        status: "recibido",
      },
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
