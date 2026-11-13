import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeFirestoreOrderItem } from "@/lib/firestore-service";

async function handleRemoveItem(req: Request, params: { id: string }) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty if params passed in URL
    }

    const { searchParams } = new URL(req.url);
    const productId = body.productId || searchParams.get("productId") || undefined;
    const itemId = body.itemId || searchParams.get("itemId") || undefined;
    const barcode = body.barcode || searchParams.get("barcode") || undefined;

    if (!productId && !itemId && !barcode) {
      return NextResponse.json(
        { error: "Se requiere productId, itemId o barcode para eliminar la prenda de la orden" },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const result = await removeFirestoreOrderItem(params.id, {
        productId: productId ? String(productId) : undefined,
        itemId: itemId ? String(itemId) : undefined,
        barcode: barcode ? String(barcode) : undefined,
      });
      return NextResponse.json(result, { status: 200 });
    }

    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID de orden inválido" }, { status: 400 });
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
          `No se pueden eliminar productos de una orden en estado '${order.status}'.`
        );
      }

      // Localizar el item a eliminar
      let targetItem = null;
      if (itemId) {
        const parsedItemId = parseInt(String(itemId));
        if (!isNaN(parsedItemId)) {
          targetItem = order.items.find((i) => i.id === parsedItemId);
        }
      }

      if (!targetItem && productId) {
        const parsedProdId = parseInt(String(productId));
        if (!isNaN(parsedProdId)) {
          targetItem = order.items.find((i) => i.productId === parsedProdId);
        }
      }

      if (!targetItem && barcode) {
        const prod = await tx.product.findUnique({
          where: { barcode: String(barcode).trim() },
        });
        if (prod) {
          targetItem = order.items.find((i) => i.productId === prod.id);
        }
      }

      if (!targetItem) {
        throw new Error("La prenda que intentas eliminar no se encuentra en esta orden");
      }

      // Eliminar el OrderItem
      await tx.orderItem.delete({
        where: { id: targetItem.id },
      });

      // Liberar producto a disponible
      await tx.product.update({
        where: { id: targetItem.productId },
        data: { status: "disponible" },
      });

      // Recalcular montos de la orden sumando los items restantes
      const remainingItems = order.items.filter((i) => i.id !== targetItem!.id);
      const newSubtotal = remainingItems.reduce(
        (acc, it) => acc + Number(it.originalPrice || 0),
        0
      );
      const newTotalDiscount = remainingItems.reduce(
        (acc, it) => acc + Number(it.discountAmount || 0),
        0
      );
      const newTotalAmount = remainingItems.reduce(
        (acc, it) => acc + Number(it.finalPrice || 0),
        0
      );

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          totalDiscount: newTotalDiscount,
          totalAmount: newTotalAmount,
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      return {
        success: true,
        removedItemId: targetItem.id,
        removedProductId: targetItem.productId,
        remainingCount: remainingItems.length,
        subtotal: newSubtotal,
        totalDiscount: newTotalDiscount,
        totalAmount: newTotalAmount,
        order: updatedOrder,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handleRemoveItem(req, params);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handleRemoveItem(req, params);
}
