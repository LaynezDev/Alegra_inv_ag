import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error("Orden no encontrada");
      }

      if (order.status === "cancelado") {
        throw new Error("La orden ya se encuentra cancelada");
      }

      if (["enviado", "entregado"].includes(order.status)) {
        throw new Error("No se puede cancelar una orden que ya fue enviada o entregada");
      }

      // 1. Actualizar orden a 'cancelado'
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: "cancelado" },
      });

      // 2. Liberar productos: regresan a 'disponible' (dejan de estar apartados/vendidos)
      const productIds = order.items.map((i) => i.productId);
      if (productIds.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { status: "disponible" },
        });
      }

      return updatedOrder;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
