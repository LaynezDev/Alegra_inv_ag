"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Package, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Radio,
  Layers,
  Lock,
  LogOut,
  SlidersHorizontal
} from "lucide-react";
import { StoreSettings, DEFAULT_STORE_SETTINGS } from "@/lib/settings";

export default function Navbar() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  useEffect(() => {
    if (
      pathname === "/acceso" ||
      pathname === "/not-found" ||
      pathname.startsWith("/p/") ||
      pathname.startsWith("/c/")
    ) {
      return;
    }

    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {});
  }, [pathname]);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/acceso";
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      window.location.href = "/acceso";
    }
  };

  // Ocultar Navbar por completo en pantalla de acceso, páginas de error o vistas públicas
  if (
    pathname === "/acceso" ||
    pathname === "/not-found" ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/catalogo/")
  ) {
    return null;
  }

  return (
    <>
      {/* Top Header Desktop & Tablet */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Marca */}
            <Link href="/pos" className="flex items-center gap-3 group">
              {settings.logoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-white border border-surface-container-high flex items-center justify-center p-1 overflow-hidden shadow-sm transition-transform group-hover:scale-105">
                  <img
                    src={settings.logoUrl}
                    alt={settings.storeName || "Logo"}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-secondary-fixed shadow-sm transition-transform group-hover:scale-105">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg tracking-widest text-primary leading-tight">
                  {settings.storeName || "ALEGRA"}
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-secondary leading-tight">
                  {settings.tagline || "Inventario & Live POS"}
                </span>
              </div>
            </Link>

            {/* Navegación Desktop */}
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== "/pos" && pathname.startsWith(link.href));

                if (link.highlight) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isActive
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "bg-surface-container text-primary hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                      </span>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-extrabold uppercase tracking-wide">
                        Live
                      </span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-primary-container text-on-primary font-bold shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Acciones de Cabecera (Status y Bloqueo) */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-surface-container text-xs text-on-surface-variant font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Sistema Conectado</span>
              </div>

              {/* Acceso a Configuración de la Tienda */}
              <Link
                href="/configuracion"
                title="Configuración de la Tienda"
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                  pathname === "/configuracion"
                    ? "bg-primary text-on-primary border-primary"
                    : "border-surface-container text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-surface-container"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Config</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Bloquear terminal (Cerrar sesión)"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-surface-container text-xs font-semibold text-on-surface-variant hover:text-error hover:border-error/30 hover:bg-error-container/20 transition-all shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bloquear</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Bar para Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container-high shadow-lg md:hidden flex justify-around items-center px-2 py-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/pos" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? "text-primary font-bold scale-105"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "text-primary stroke-[2.5]" : "text-on-surface-variant"}`} />
                {link.highlight && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                  </span>
                )}
              </div>
              <span className="mt-0.5">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
