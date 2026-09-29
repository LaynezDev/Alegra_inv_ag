import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      include: {
        products: {
          include: {
            orderItems: {
              include: {
                order: {
                  select: { status: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let globalInvested = 0;
    let globalSold = 0;

    const packageReports = packages.map((pkg) => {
      const cost = Number(pkg.costPrice);
      globalInvested += cost;

      let packageSoldAmount = 0;
      let soldCount = 0;
      let availableCount = 0;
      let reservedCount = 0;
      let potentialRemainingValue = 0;

      pkg.products.forEach((prod) => {
        if (prod.status === "disponible") {
          availableCount++;
          potentialRemainingValue += Number(prod.salePrice);
        } else if (prod.status === "apartado") {
          reservedCount++;
        } else if (prod.status === "vendido") {
          soldCount++;
        }

        prod.orderItems.forEach((item) => {
          if (["pagado", "enviado", "entregado"].includes(item.order.status)) {
            packageSoldAmount += Number(item.finalPrice);
          }
        });
      });

      globalSold += packageSoldAmount;

      const isRecovered = packageSoldAmount >= cost && cost > 0;
      const profit = Math.max(0, packageSoldAmount - cost);
      const deficit = Math.max(0, cost - packageSoldAmount);
      const recoveryPercentage =
        cost > 0 ? Math.round((packageSoldAmount / cost) * 100) : 100;

      return {
        id: pkg.id,
        code: pkg.code,
        packageType: pkg.packageType,
        invoiceNumber: pkg.invoiceNumber,
        costPrice: cost,
        totalWeight: pkg.totalWeight ? Number(pkg.totalWeight) : null,
        createdAt: pkg.createdAt,
        totalItems: pkg.products.length,
        soldCount,
        availableCount,
        reservedCount,
        packageSoldAmount,
        isRecovered,
        recoveryPercentage,
        profit,
        deficit,
        potentialRemainingValue,
      };
    });

    const globalProfit = Math.max(0, globalSold - globalInvested);
    const globalDeficit = Math.max(0, globalInvested - globalSold);
    const globalRecoveryPercentage =
      globalInvested > 0
        ? Math.round((globalSold / globalInvested) * 100)
        : 100;

    return NextResponse.json({
      summary: {
        globalInvested,
        globalSold,
        globalProfit,
        globalDeficit,
        globalRecoveryPercentage,
        totalPackages: packages.length,
      },
      packages: packageReports,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
