import { NextRequest, NextResponse } from "next/server";
import { getPublicOrder } from "@/lib/firestore-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const order = await getPublicOrder(token);
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Error al obtener pedido público:", error);
    return NextResponse.json({ error: "Error al cargar pedido" }, { status: 500 });
  }
}
