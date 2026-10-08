import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Archivos estáticos o imágenes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/images") ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Rutas públicas de catálogo/pedidos compartidos con clientes
  if (
    pathname.startsWith("/p/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/catalogo/") ||
    pathname.startsWith("/api/public/")
  ) {
    return NextResponse.next();
  }

  // 3. Ruta explícita de 404
  if (pathname === "/not-found") {
    return NextResponse.next();
  }

  // 4. Endpoints de autenticación
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout"
  ) {
    return NextResponse.next();
  }

  // Obtener y verificar cookie de sesión
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(sessionCookie);

  // 5. Pantalla de Acceso con PIN (/acceso)
  if (pathname === "/acceso") {
    // Si ya está autenticado, redirigir automáticamente a /pos
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
    return NextResponse.next();
  }

  // 6. Si el usuario está autenticado, permitir acceso a cualquier ruta privada
  if (isAuthenticated) {
    return NextResponse.next();
  }

  // 7. Si NO está autenticado:
  // - Para llamadas API: responder 404 Not Found en JSON
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // - Para páginas (ej. /pos, /packages, /, etc.): reescribir a 404 Not Found
  // Esto mantiene la URL que el usuario escribió pero le muestra un Error 404 real
  const notFoundUrl = new URL("/not-found", request.url);
  return NextResponse.rewrite(notFoundUrl, { status: 404 });
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto recursos estáticos directos
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
