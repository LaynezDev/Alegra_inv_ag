import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFirestoreDepartments } from "@/lib/firestore-service";

export async function GET() {
  try {
    if (process.env.DATABASE_PROVIDER === "firestore") {
      const departments = await getFirestoreDepartments();
      return NextResponse.json(departments);
    }

    const departments = await prisma.department.findMany({
      include: {
        municipalities: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
