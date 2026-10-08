import { NextRequest, NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/firestore-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const catalog = await getPublicCatalog(token);
    if (!catalog) {
      return NextResponse.json({ error: "Catálogo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(catalog);
  } catch (error: any) {
    console.error("Error al obtener catálogo público:", error);
    return NextResponse.json({ error: "Error al cargar catálogo" }, { status: 500 });
  }
}
