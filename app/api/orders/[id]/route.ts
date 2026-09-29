import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          include: { department: true, municipality: true },
        },
        items: {
          include: {
            product: {
              include: {
                package: { select: { code: true, packageType: true } },
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const totalPaid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const balanceDue = Math.max(0, Number(order.totalAmount) - totalPaid);

    return NextResponse.json({
      ...order,
      subtotal: Number(order.subtotal),
      totalDiscount: Number(order.totalDiscount),
      totalAmount: Number(order.totalAmount),
      totalPaid,
      balanceDue,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
