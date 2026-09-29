import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const barcode = searchParams.get("barcode")?.trim();

    if (barcode) {
      const product = await prisma.product.findUnique({
        where: { barcode },
        include: {
          package: {
            select: { code: true, packageType: true },
          },
        },
      });

      if (!product) {
        return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      }

      return NextResponse.json(product);
    }

    if (!query) {
      const products = await prisma.product.findMany({
        where: { status: "disponible" },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          package: { select: { code: true, packageType: true } },
        },
      });
      return NextResponse.json(products);
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { barcode: { contains: query } },
          { name: { contains: query } },
        ],
      },
      take: 20,
      include: {
        package: { select: { code: true, packageType: true } },
      },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
