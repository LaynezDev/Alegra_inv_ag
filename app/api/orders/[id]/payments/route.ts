import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addFirestoreOrderPayment } from "@/lib/firestore-service";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { referenceNumber, paymentMethod, amount, notes, markAsPaid } = body;

    if (!referenceNumber || amount === undefined || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Número de referencia y monto válido son requeridos" },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const payment = await addFirestoreOrderPayment(params.id, {
        referenceNumber,
        paymentMethod,
        amount: Number(amount),
        notes,
        markAsPaid: markAsPaid ?? true,
      });
      return NextResponse.json(payment, { status: 201 });
    }

    const orderId = parseInt(params.id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: true,
        },
      });

      if (!order) {
        throw new Error("Orden no encontrada");
      }

      if (order.status === "cancelado") {
        throw new Error("No se pueden registrar pagos en una orden cancelada");
      }

      // 1. Crear el registro de pago
      const payment = await tx.orderPayment.create({
        data: {
          orderId,
          referenceNumber: referenceNumber.trim(),
          paymentMethod: paymentMethod || "transferencia",
          amount: Number(amount),
          notes: notes?.trim() || null,
        },
      });

      // 2. Calcular total pagado acumulado
      const previousPaid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const newTotalPaid = previousPaid + Number(amount);
      const shouldMarkPaid = markAsPaid || newTotalPaid >= Number(order.totalAmount);

      // Si se pasa a pagado (o ya estaba pagado):
      if (shouldMarkPaid && order.status === "pendiente_pago") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "pagado" },
        });

        // Actualizar todos los productos de esta orden a 'vendido'
        const productIds = order.items.map((i) => i.productId);
        await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { status: "vendido" },
        });
      }

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
