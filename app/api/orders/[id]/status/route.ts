import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateFirestoreOrderStatus } from "@/lib/firestore-service";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, notes } = body;

    const allowedStatuses = ["pendiente_pago", "pagado", "enviado", "entregado", "cancelado"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado no permitido" }, { status: 400 });
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const updated = await updateFirestoreOrderStatus(params.id, status);
      return NextResponse.json(updated);
    }

    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
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
