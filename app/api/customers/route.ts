import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFirestoreCustomers, createFirestoreCustomer } from "@/lib/firestore-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const customers = await getFirestoreCustomers(q);
      return NextResponse.json(customers);
    }

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

    if (!fullName || !phonePrimary || !fullAddress) {
      return NextResponse.json(
        {
          error:
            "Nombre completo, teléfono principal y dirección son obligatorios",
        },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const customer = await createFirestoreCustomer({
        ...body,
        departmentName: body.departmentName || "Guatemala",
        municipalityName: body.municipalityName || "Guatemala",
      });
      return NextResponse.json(customer, { status: 201 });
    }

    if (!departmentId || !municipalityId) {
      return NextResponse.json(
        {
          error: "Departamento y municipio son obligatorios",
        },
        { status: 400 }
      );
    }

    const count = await prisma.customer.count();
    const barcode = `CLI-${String(count + 1).padStart(5, "0")}`;

    const numDeptId = parseInt(String(departmentId).replace("dept_", "")) || 1;
    const numMuniId = parseInt(String(municipalityId).replace("muni_", "")) || 1;

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
        departmentId: numDeptId,
        municipalityId: numMuniId,
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
