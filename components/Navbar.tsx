"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Package, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Radio
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/pos",
      label: "POS Live",
      icon: Radio,
      highlight: true,
    },
    {
      href: "/packages",
      label: "Paquetes",
      icon: Package,
    },
    {
      href: "/customers",
      label: "Clientes",
      icon: Users,
    },
    {
      href: "/orders",
      label: "Pedidos y Cobros",
      icon: ClipboardList,
    },
    {
      href: "/reports",
      label: "Reportes ROI",
      icon: BarChart3,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-alegra-navy text-white shadow-md border-b border-alegra-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre */}
          <Link href="/pos" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-alegra-sand flex items-center justify-center text-alegra-navy font-bold shadow-sm transition-transform group-hover:scale-105">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider text-white">
                ALEGRA
              </span>
              <span className="block text-[10px] tracking-widest uppercase text-alegra-sand font-medium -mt-1">
                Inventario & POS Live
              </span>
            </div>
          </Link>

          {/* Navegación Principal */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/pos" && pathname.startsWith(link.href));

              if (link.highlight) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-alegra-sand text-alegra-navy shadow-xs"
                        : "bg-alegra-sand/20 text-alegra-sand hover:bg-alegra-sand hover:text-alegra-navy"
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white font-semibold"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
