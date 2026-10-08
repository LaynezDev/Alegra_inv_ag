import { NextRequest, NextResponse } from "next/server";
import { 
  validatePin, 
  createSessionToken, 
  SESSION_COOKIE_NAME, 
  SESSION_MAX_AGE_SECONDS 
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, error: "El PIN es requerido" },
        { status: 400 }
      );
    }

    // Pequeño retardo de seguridad contra fuerza bruta
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (!validatePin(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN incorrecto. Inténtalo de nuevo." },
        { status: 401 }
      );
    }

    const token = await createSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "Acceso autorizado",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error en login de PIN:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al verificar credenciales" },
      { status: 500 }
    );
  }
}
