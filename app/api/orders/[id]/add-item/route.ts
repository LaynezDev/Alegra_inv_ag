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

    const body = await req.json();
    const { productId, discountAmount = 0 } = body;

    if (!productId) {
      return NextResponse.json({ error: "ID del producto requerido" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error("Orden no encontrada");
      }

      if (["enviado", "entregado", "cancelado"].includes(order.status)) {
        throw new Error(
          `No se pueden agregar productos a una orden en estado '${order.status}'. Solo antes de ser enviada o entregada.`
        );
      }

      const product = await tx.product.findUnique({
        where: { id: parseInt(productId) },
      });

      if (!product) {
        throw new Error("Producto no encontrado");
      }

      if (product.status !== "disponible") {
        throw new Error(
          `El producto no está disponible (Estado: ${product.status})`
        );
      }

      const origPrice = Number(product.salePrice);
      const disc = Math.max(0, Number(discountAmount));
      const finalP = Math.max(0, origPrice - disc);

      // Crear OrderItem
      const orderItem = await tx.orderItem.create({
        data: {
          orderId,
          productId: product.id,
          originalPrice: origPrice,
          discountAmount: disc,
          finalPrice: finalP,
        },
      });

      // Recalcular montos de la orden
      const newSubtotal = Number(order.subtotal) + origPrice;
      const newTotalDiscount = Number(order.totalDiscount) + disc;
      const newTotalAmount = Number(order.totalAmount) + finalP;

      // Si la orden ya estaba pagada, el nuevo producto queda apartado hasta que se cubra el saldo pendiente
      // O si se requiere pago adicional, la orden puede mantenerse en 'pagado' con saldo por cobrar o 'pendiente_pago'
      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          totalDiscount: newTotalDiscount,
          totalAmount: newTotalAmount,
        },
      });

      // Marcar producto como 'apartado'
      await tx.product.update({
        where: { id: product.id },
        data: { status: order.status === "pagado" ? "apartado" : "apartado" },
      });

      return orderItem;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
