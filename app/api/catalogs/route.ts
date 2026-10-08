import { NextRequest, NextResponse } from "next/server";
import { createPublicCatalog } from "@/lib/firestore-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, productIds, notes } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos un producto" },
        { status: 400 }
      );
    }

    const catalog = await createPublicCatalog({
      title,
      productIds,
      notes,
    });

    return NextResponse.json(catalog, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear catálogo:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear catálogo" },
      { status: 500 }
    );
  }
}
