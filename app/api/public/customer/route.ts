import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicFirestoreCustomerByCode } from "@/lib/firestore-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim() || "";

    if (!code) {
      return NextResponse.json(
        { error: "Ingresa un código de cliente" },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const customer = await getPublicFirestoreCustomerByCode(code);
      if (!customer) {
        return NextResponse.json(
          { error: "Código de cliente no encontrado" },
          { status: 404 }
        );
      }
      return NextResponse.json(customer);
    }

    const upper = code.toUpperCase();
    const candidates = new Set<string>([upper]);
    const digitsOnly = upper.replace(/^CLI-?/i, "").replace(/\D/g, "");
    if (digitsOnly) {
      candidates.add(`CLI-${digitsOnly.padStart(5, "0")}`);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        barcode: { in: Array.from(candidates) },
      },
      include: {
        department: true,
        municipality: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Código de cliente no encontrado" },
        { status: 404 }
      );
    }

    const addressParts: string[] = [];
    if (customer.fullAddress) addressParts.push(customer.fullAddress.trim());
    if (customer.addressReference) addressParts.push(`Ref: ${customer.addressReference.trim()}`);
    const locParts = [customer.municipality?.name, customer.department?.name]
      .filter(Boolean)
      .map((s) => String(s).trim());
    if (locParts.length > 0) {
      const locStr = locParts.join(", ");
      if (!addressParts.join(" ").toLowerCase().includes(locStr.toLowerCase())) {
        addressParts.push(locStr);
      }
    }

    return NextResponse.json({
      barcode: customer.barcode,
      fullName: customer.fullName,
      phonePrimary: customer.phonePrimary,
      fullAddress: addressParts.join(" — "),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al consultar código de cliente" },
      { status: 500 }
    );
  }
}
