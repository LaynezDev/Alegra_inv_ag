import { NextRequest, NextResponse } from "next/server";
import { getStoreSettings, updateStoreSettings } from "@/lib/firestore-service";

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Error al obtener configuración:", error);
    return NextResponse.json(
      { error: "Error al cargar configuración", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await updateStoreSettings(body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error al guardar configuración:", error);
    return NextResponse.json(
      { error: "Error al guardar configuración", details: error.message },
      { status: 500 }
    );
  }
}
