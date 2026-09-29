import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { fullName: { contains: q } },
        { phonePrimary: { contains: q } },
        { phoneSecondary: { contains: q } },
        { tiktokUsername: { contains: q } },
        { instagramUsername: { contains: q } },
        { facebookUsername: { contains: q } },
        { barcode: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        department: true,
        municipality: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      tiktokUsername,
      instagramUsername,
      facebookUsername,
      phonePrimary,
      phoneSecondary,
      fullAddress,
      addressReference,
      departmentId,
      municipalityId,
    } = body;

    if (!fullName || !phonePrimary || !fullAddress || !departmentId || !municipalityId) {
      return NextResponse.json(
        {
          error:
            "Nombre completo, teléfono principal, dirección, departamento y municipio son obligatorios",
        },
        { status: 400 }
      );
    }

    const count = await prisma.customer.count();
    const barcode = `CLI-${String(count + 1).padStart(5, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        barcode,
        fullName: fullName.trim(),
        tiktokUsername: tiktokUsername?.trim() || null,
        instagramUsername: instagramUsername?.trim() || null,
        facebookUsername: facebookUsername?.trim() || null,
        phonePrimary: phonePrimary.trim(),
        phoneSecondary: phoneSecondary?.trim() || null,
        fullAddress: fullAddress.trim(),
        addressReference: addressReference?.trim() || null,
        departmentId: parseInt(departmentId),
        municipalityId: parseInt(municipalityId),
      },
      include: {
        department: true,
        municipality: true,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
