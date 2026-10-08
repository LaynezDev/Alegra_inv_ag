import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Alegra - Plataforma de Inventario, POS Live y Control de Inversión",
  description: "Sistema de gestión integral para paquetes, transmisiones en vivo, comandas y cobranza para la tienda Alegra",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(sessionToken);

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-on-surface antialiased flex flex-col">
        {isAuthenticated && <Navbar />}
        <main className={`flex-1 w-full max-w-[1600px] mx-auto ${isAuthenticated ? "p-3 sm:p-5 lg:p-6 pb-20 md:pb-6" : "p-4"}`}>
          {children}
        </main>
      </body>
    </html>
  );
}
