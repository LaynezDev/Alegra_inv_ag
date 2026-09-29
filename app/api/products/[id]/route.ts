import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCostByWeight } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        package: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { package: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const { name, weight, salePrice, photos, barcode, status } = body;

    if (!name || salePrice === undefined) {
      return NextResponse.json(
        { error: "Nombre y precio de venta son obligatorios" },
        { status: 400 }
      );
    }

    // Validar código de barras único si cambió
    const newBarcode = barcode ? barcode.trim() : existingProduct.barcode;
    if (newBarcode !== existingProduct.barcode) {
      const duplicate = await prisma.product.findUnique({
        where: { barcode: newBarcode },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: "El código de barras ya está asignado a otro producto" },
          { status: 400 }
        );
      }
    }

    // Recalcular costo prorrateado si el peso cambió
    const itemWeight = weight !== undefined && weight !== null && weight !== "" ? Number(weight) : null;
    let calculatedCost = existingProduct.calculatedCost;

    const pkgWeight = existingProduct.package.totalWeight
      ? Number(existingProduct.package.totalWeight)
      : null;
    const pkgCost = Number(existingProduct.package.costPrice);

    if (itemWeight !== null && pkgWeight && pkgWeight > 0) {
      calculatedCost = calculateCostByWeight(itemWeight, pkgWeight, pkgCost) as any;
    } else if (itemWeight === null) {
      calculatedCost = 0 as any;
    }

    const photosStr = photos
      ? typeof photos === "string"
        ? photos
        : JSON.stringify(photos)
      : null;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        weight: itemWeight,
        calculatedCost,
        salePrice: Number(salePrice),
        barcode: newBarcode,
        photos: photosStr,
        status: status || existingProduct.status,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
