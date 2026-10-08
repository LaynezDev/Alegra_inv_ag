import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alegra - Fotos y Detalle de tu Pedido",
  description: "Revisa las prendas de tu pedido en Alegra Boutique",
};

export default function PublicOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
