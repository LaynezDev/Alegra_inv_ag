import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Alegra - Plataforma de Inventario, POS Live y Control de Inversión",
  description: "Sistema de gestión integral para paquetes, transmisiones en vivo, comandas y cobranza para la tienda Alegra",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Navbar />
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
