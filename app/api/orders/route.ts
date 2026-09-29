import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status && status !== "todos") {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: {
          include: {
            department: true,
            municipality: true,
          },
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
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((o) => {
      const totalPaid = o.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balanceDue = Math.max(0, Number(o.totalAmount) - totalPaid);

      return {
        ...o,
        subtotal: Number(o.subtotal),
        totalDiscount: Number(o.totalDiscount),
        totalAmount: Number(o.totalAmount),
        totalPaid,
        balanceDue,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, items, notes } = body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un cliente y al menos un producto para crear la comanda" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar que todos los productos existan y estén en estado 'disponible'
      const productIds = items.map((i: any) => i.productId);
      const existingProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (existingProducts.length !== productIds.length) {
        throw new Error("Uno o más productos seleccionados no existen");
      }

      for (const prod of existingProducts) {
        if (prod.status !== "disponible") {
          throw new Error(
            `El producto '${prod.name}' (${prod.barcode}) ya no está disponible (Estado: ${prod.status})`
          );
        }
      }

      // 2. Calcular montos
      let subtotal = 0;
      let totalDiscount = 0;
      let totalAmount = 0;

      const itemsData = items.map((i: any) => {
        const origPrice = Number(i.originalPrice);
        const disc = Math.max(0, Number(i.discountAmount || 0));
        const finalP = Math.max(0, origPrice - disc);

        subtotal += origPrice;
        totalDiscount += disc;
        totalAmount += finalP;

        return {
          productId: i.productId,
          originalPrice: origPrice,
          discountAmount: disc,
          finalPrice: finalP,
        };
      });

      // 3. Generar número de comanda
      const count = await tx.order.count();
      const orderNumber = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      // 4. Crear la comanda con estado 'pendiente_pago'
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: parseInt(customerId),
          status: "pendiente_pago",
          subtotal,
          totalDiscount,
          totalAmount,
          notes: notes || null,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: {
            include: { department: true, municipality: true },
          },
          items: {
            include: { product: true },
          },
        },
      });

      // 5. Apartar los productos
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { status: "apartado" },
      });

      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
