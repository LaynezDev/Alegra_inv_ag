import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { status, notes } = body;

    const allowedStatuses = ["pendiente_pago", "pagado", "enviado", "entregado", "cancelado"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado no permitido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // Si pasa a enviado o entregado, verificar que todos los productos estén en estado 'vendido'
    if (["enviado", "entregado"].includes(status)) {
      const productIds = order.items.map((i) => i.productId);
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { status: "vendido" },
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        notes: notes !== undefined ? notes : order.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
