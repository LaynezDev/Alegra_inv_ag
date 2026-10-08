import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alegra - Catálogo de Prendas Seleccionadas",
  description: "Catálogo exclusivo de prendas en Alegra Boutique",
};

export default function PublicCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
