import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateFirestoreCustomer, resolveCustomerDocRef } from "@/lib/firestore-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "ID de cliente requerido" }, { status: 400 });
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const custRef = await resolveCustomerDocRef(id);
      const snap = await custRef.get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      }
      const data = snap.data()!;
      return NextResponse.json({
        id: custRef.id,
        ...data,
        department: { id: 1, name: data.departmentName },
        municipality: { id: 1, name: data.municipalityName },
      });
    }

    const numId = parseInt(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: numId },
      include: { department: true, municipality: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error("Error al obtener cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "ID de cliente requerido" }, { status: 400 });
    }

    const body = await req.json();
    const {
      fullName,
      phonePrimary,
      fullAddress,
      departmentId,
      municipalityId,
      departmentName,
      municipalityName,
    } = body;

    if (!fullName || !phonePrimary || !fullAddress) {
      return NextResponse.json(
        { error: "Nombre completo, teléfono principal y dirección son requeridos" },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_PROVIDER === "firestore") {
      const updated = await updateFirestoreCustomer(id, {
        ...body,
        departmentName: departmentName || "Guatemala",
        municipalityName: municipalityName || "Guatemala",
      });
      return NextResponse.json(updated);
    }

    const numId = parseInt(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const numDeptId = departmentId ? parseInt(String(departmentId).replace("dept_", "")) : undefined;
    const numMuniId = municipalityId ? parseInt(String(municipalityId).replace("muni_", "")) : undefined;

    const updated = await prisma.customer.update({
      where: { id: numId },
      data: {
        fullName: fullName.trim(),
        tiktokUsername: body.tiktokUsername?.trim() || null,
        instagramUsername: body.instagramUsername?.trim() || null,
        facebookUsername: body.facebookUsername?.trim() || null,
        phonePrimary: phonePrimary.trim(),
        phoneSecondary: body.phoneSecondary?.trim() || null,
        fullAddress: fullAddress.trim(),
        addressReference: body.addressReference?.trim() || null,
        ...(numDeptId ? { departmentId: numDeptId } : {}),
        ...(numMuniId ? { municipalityId: numMuniId } : {}),
      },
      include: {
        department: true,
        municipality: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
