import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/firestore-service";
import { getGrammarTexts } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const settings = await getStoreSettings();
    const grammar = getGrammarTexts(settings);
    return NextResponse.json({
      ...settings,
      grammar,
    });
  } catch (error: any) {
    console.error("Error al obtener configuración pública:", error);
    return NextResponse.json(
      { error: "Error al cargar configuración", details: error.message },
      { status: 500 }
    );
  }
}
