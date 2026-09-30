import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCostByWeight } from "@/lib/utils";
import { createFirestoreProduct } from "@/lib/firestore-service";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, weight, salePrice, photos, customBarcode } = body;

    if (!name || salePrice === undefined) {
      return NextResponse.json(
        { error: "El nombre y el precio de venta son obligatorios" },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const photosArray = photos ? (Array.isArray(photos) ? photos : [photos]) : [];
      const newProduct = await createFirestoreProduct(params.id, {
        name,
        weight: weight ? parseFloat(weight) : null,
        salePrice: parseFloat(salePrice),
        photos: photosArray,
        customBarcode,
      });
      return NextResponse.json(newProduct, { status: 201 });
    }

    const packageId = parseInt(params.id);
    if (isNaN(packageId)) {
      return NextResponse.json({ error: "ID de paquete inválido" }, { status: 400 });
    }

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: { _count: { select: { products: true } } },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }

    // Calcular costo aproximado por peso si ambos pesos existen
    let calculatedCost = 0;
    const itemWeight = weight ? Number(weight) : null;
    const pkgWeight = pkg.totalWeight ? Number(pkg.totalWeight) : null;
    const pkgCost = Number(pkg.costPrice);

    if (itemWeight && pkgWeight && pkgWeight > 0) {
      calculatedCost = calculateCostByWeight(itemWeight, pkgWeight, pkgCost);
    }

    // Generar código de barras si no se proporcionó uno personalizado
    let barcode = customBarcode?.trim();
    if (!barcode) {
      const nextIndex = pkg._count.products + 1;
      barcode = `PRD-${String(packageId).padStart(3, "0")}-${String(nextIndex).padStart(3, "0")}`;
    }

    // Verificar si el código de barras ya existe
    const existing = await prisma.product.findUnique({ where: { barcode } });
    if (existing) {
      barcode = `${barcode}-${Date.now().toString().slice(-4)}`;
    }

    const product = await prisma.product.create({
      data: {
        packageId,
        barcode,
        name,
        weight: itemWeight,
        calculatedCost,
        salePrice: Number(salePrice),
        photos: photos ? (typeof photos === "string" ? photos : JSON.stringify(photos)) : null,
        status: "disponible",
      },
    });

    // Actualizar estado de paquete a 'en_desglose' si era 'recibido'
    if (pkg.status === "recibido") {
      await prisma.package.update({
        where: { id: packageId },
        data: { status: "en_desglose" },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
