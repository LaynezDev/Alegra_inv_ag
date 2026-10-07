"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatWeight, formatDate } from "@/lib/utils";

interface PackageReport {
  id: number | string;
  code: string;
  name?: string | null;
  packageType: string;
  invoiceNumber: string;
  costPrice: number;
  totalWeight: number | null;
  createdAt: string;
  totalItems: number;
  soldCount: number;
  availableCount: number;
  reservedCount: number;
  packageSoldAmount: number;
  totalTheoretical?: number;
  isRecovered: boolean;
  recoveryPercentage: number;
  profit: number;
  deficit: number;
  potentialRemainingValue: number;
}

interface ReportData {
  summary: {
    globalInvested: number;
    globalSold: number;
    globalProfit: number;
    globalDeficit: number;
    globalRecoveryPercentage: number;
    totalPackages: number;
  };
  packages: PackageReport[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/roi");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Rendimiento por Tipo de Formato / Contenedor
  const formatStats = useMemo(() => {
    if (!data?.packages) return [];
    const formats = ["costal", "caja", "bolsa", "palet"];
    const labels: Record<string, string> = {
      costal: "Costales Ropa Premium",
      caja: "Cajas Calzado & Carteras",
      bolsa: "Bolsas Selección Vintage",
      palet: "Palets Mixtos Mayoristas",
    };

    return formats.map((type) => {
      const pkgs = data.packages.filter(
        (p) => p.packageType.toLowerCase() === type.toLowerCase()
      );
      const invested = pkgs.reduce((acc, p) => acc + Number(p.costPrice || 0), 0);
      const sold = pkgs.reduce((acc, p) => acc + Number(p.packageSoldAmount || 0), 0);
      const roi = invested > 0 ? Math.round((sold / invested) * 100) : 0;
      return {
        type,
        label: labels[type] || type,
        count: pkgs.length,
        invested,
        sold,
        roi,
      };
    });
  }, [data]);

  // Cantidad de lotes recuperados
  const recoveredCount = useMemo(() => {
    return data?.packages.filter((p) => p.isRecovered).length || 0;
  }, [data]);

  const pendingCount = (data?.summary.totalPackages || 0) - recoveredCount;

  // Filtrado de lotes
  const filteredPackages = useMemo(() => {
    if (!data?.packages) return [];
    return data.packages.filter((p) => {
      if (typeFilter === "breakeven" && !p.isRecovered) return false;
      if (typeFilter === "pendientes" && p.isRecovered) return false;
      if (
        typeFilter !== "todos" &&
        typeFilter !== "breakeven" &&
        typeFilter !== "pendientes" &&
        p.packageType.toLowerCase() !== typeFilter.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          p.code.toLowerCase().includes(q) ||
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.packageType.toLowerCase().includes(q) ||
          (p.name && p.name.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [data, typeFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. ENCABEZADO DE SECCIÓN */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-xs uppercase tracking-wider font-bold">
              Inteligencia de Negocio &amp; ROI en Vivo
            </span>
            <span className="text-outline text-xs">•</span>
            <span className="text-xs text-outline font-medium">Moneda: Quetzal (GTQ)</span>
          </div>
          <h1 className="font-headline-xl text-2xl lg:text-3xl font-extrabold text-primary tracking-tight">
            Dashboard Financiero y Reportes de Rentabilidad
          </h1>
          <p className="text-sm text-outline leading-relaxed">
            Monitoreo de capital invertido en lotes, punto de equilibrio (breakeven) por
            flete/costal, tasa de retorno y proyección de utilidades netas en tiempo real.
          </p>
        </div>

        {/* Acciones Superiores */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container transition-all text-xs font-semibold border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-secondary text-base">download</span>
            <span>Descargar Informe Contable (PDF)</span>
          </button>
          <Link
            href="/packages"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary shadow-sm hover:bg-primary/90 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-secondary-fixed text-base">
              inventory_2
            </span>
            <span>Ver Lotes y Paquetes</span>
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-surface-container-lowest rounded-2xl border border-surface-container-high">
          <span className="material-symbols-outlined text-4xl text-secondary animate-spin">
            progress_activity
          </span>
          <p className="text-sm font-semibold text-outline">
            Calculando análisis financiero y punto de equilibrio...
          </p>
        </div>
      ) : !data ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-8 shadow-sm">
          <p className="text-sm text-error font-medium">
            Error al sincronizar datos financieros de la tienda.
          </p>
        </div>
      ) : (
        <>
          {/* 2. FILA DE 4 KPIS GLOBALES */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Total Invertido */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between gap-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Total Invertido en Lotes
                  </span>
                  <span className="font-financial-lg text-2xl font-extrabold text-primary tracking-tight">
                    {formatCurrency(data.summary.globalInvested)}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-outline">
                <span>{data.summary.totalPackages} paquetes adquiridos</span>
                <span>•</span>
                <span>Costo flete + mercadería</span>
              </div>
            </div>

            {/* Card 2: Total Vendido */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between gap-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Total Vendido (Ingresos Brutos)
                  </span>
                  <span className="font-financial-lg text-2xl font-extrabold text-primary tracking-tight">
                    {formatCurrency(data.summary.globalSold)}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">payments</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-outline">
                  {data.summary.globalSold >= data.summary.globalInvested
                    ? `+${(
                        ((data.summary.globalSold - data.summary.globalInvested) /
                          (data.summary.globalInvested || 1)) *
                        100
                      ).toFixed(1)}% sobre inversión`
                    : "En proceso de amortización"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-low text-xs font-bold text-primary font-mono">
                  {data.summary.globalSold >= data.summary.globalInvested ? "+" : ""}
                  {formatCurrency(data.summary.globalSold - data.summary.globalInvested)}
                </span>
              </div>
            </div>

            {/* Card 3: Ganancia Neta Real (Superávit) */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between gap-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Ganancia Neta Real (Superávit)
                  </span>
                  <span className="font-financial-lg text-2xl font-extrabold text-secondary tracking-tight">
                    +{formatCurrency(data.summary.globalProfit)}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-lg">trending_up</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-outline truncate mr-1">
                  {data.summary.globalDeficit > 0
                    ? `Faltan ${formatCurrency(data.summary.globalDeficit)} p/ Breakeven`
                    : "Superávit libre tras costos"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold whitespace-nowrap">
                  ROI: +{data.summary.globalRecoveryPercentage}%
                </span>
              </div>
            </div>

            {/* Card 4: Tasa de Recuperación Global */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between gap-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Tasa de Recuperación Global
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-financial-lg text-2xl font-extrabold text-primary tracking-tight">
                      {data.summary.globalRecoveryPercentage}%
                    </span>
                    {data.summary.globalRecoveryPercentage >= 100 && (
                      <span className="text-[10px] text-secondary uppercase font-bold bg-secondary-container px-2 py-0.5 rounded-full">
                        SUPERADO
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">price_check</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{
                      width: `${Math.min(data.summary.globalRecoveryPercentage, 100)}%`,
                    }}
                    title="Breakeven Inversión Base"
                  ></div>
                  {data.summary.globalRecoveryPercentage > 100 && (
                    <div
                      className="bg-secondary h-full transition-all"
                      style={{
                        width: `${Math.min(data.summary.globalRecoveryPercentage - 100, 100)}%`,
                      }}
                      title="Superávit Utilidad Real"
                    ></div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-outline">
                  <span>
                    {recoveredCount} de {data.summary.totalPackages} lotes en breakeven
                  </span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                    {data.summary.globalRecoveryPercentage >= 100
                      ? "100% BASE + UTILIDAD"
                      : "AMORTIZANDO CAPITAL"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. SECCIÓN DE ANÁLISIS Y EFICIENCIA (12 Cols: 8 / 4) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Columna Izquierda: Métricas de Amortización (8 Cols) */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                    Rendimiento Temporal Consolidado
                  </span>
                  <h2 className="font-headline-md text-base font-bold text-primary">
                    Curva de Retorno de Inversión vs Capital Colocado
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-outline">
                    <span className="w-3 h-3 rounded-xs bg-primary inline-block"></span>
                    <span>Invertido</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-outline">
                    <span className="w-3 h-3 rounded-xs bg-secondary inline-block"></span>
                    <span>Recuperado</span>
                  </div>
                </div>
              </div>

              {/* Comparativa por lotes destacados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.packages.slice(0, 3).map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-primary">{pkg.code}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          pkg.isRecovered
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container text-outline"
                        }`}
                      >
                        {pkg.recoveryPercentage}% Retorno
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 text-xs">
                      <div>
                        <div className="flex justify-between text-outline text-[11px] mb-1">
                          <span>Invertido:</span>
                          <span className="font-mono">{formatCurrency(pkg.costPrice)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-full"></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-outline text-[11px] mb-1">
                          <span>Recuperado:</span>
                          <span className="font-mono font-bold text-primary">
                            {formatCurrency(pkg.packageSoldAmount)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              pkg.isRecovered ? "bg-secondary" : "bg-primary/50"
                            }`}
                            style={{
                              width: `${Math.min(pkg.recoveryPercentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-outline italic">
                      {pkg.isRecovered
                        ? `Superávit: +${formatCurrency(pkg.profit)}`
                        : `Faltan ${formatCurrency(pkg.deficit)} para breakeven`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Detalle Sparkline / Indicador de Velocidad */}
              <div className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-xl text-outline border border-surface-container-high/60">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-xl">
                    trending_up
                  </span>
                  <span className="text-xs">
                    Velocidad promedio de liquidación:{" "}
                    <strong className="text-primary font-bold">14.2 días</strong> por lote tras
                    ingreso al catálogo.
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                    Retorno General
                  </span>
                  <span className="font-mono text-xs font-bold text-primary">
                    +{data.summary.globalRecoveryPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Rendimiento por Formato (4 Cols) */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Eficiencia de Adquisición
                </span>
                <h2 className="font-headline-md text-base font-bold text-primary mt-0.5">
                  Rendimiento por Formato
                </h2>
              </div>

              <div className="flex flex-col gap-2.5">
                {formatStats.map((stat) => (
                  <div
                    key={stat.type}
                    className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors border border-surface-container-high/60"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-primary">{stat.label}</span>
                      <span className="font-mono text-xs font-bold text-secondary">
                        {stat.roi}% ROI
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(stat.roi, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-outline">
                      <span>{formatCurrency(stat.sold)} vendidos</span>
                      <span>{stat.count} lotes reg.</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1">
                <Link
                  href="/packages"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                >
                  <span>Ver desglose de costos y fletes de paquetes</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 4. BARRA DE FILTROS Y SEGMENTACIÓN POR LOTE */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-2xl shadow-xs border border-surface-container-high">
              {/* Píldoras de filtro */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setTypeFilter("todos")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "todos"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  Todos ({data.summary.totalPackages})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("costal")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "costal"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  Costales
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("caja")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "caja"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  Cajas
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("bolsa")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "bolsa"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  Bolsas
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("palet")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "palet"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  Palets
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("breakeven")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "breakeven"
                      ? "bg-secondary text-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  En Breakeven ({recoveredCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("pendientes")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                    typeFilter === "pendientes"
                      ? "bg-secondary text-primary shadow-xs"
                      : "bg-surface-container-low hover:bg-surface-container text-outline"
                  }`}
                >
                  Pendientes ({pendingCount})
                </button>
              </div>

              {/* Buscador */}
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Código PKG, factura o formato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-primary rounded-xl text-xs placeholder:text-outline border border-surface-container-high focus:outline-hidden focus:ring-2 focus:ring-secondary/50"
                />
              </div>
            </div>
          </section>

          {/* 5. DESGLOSE BESPOKE POR LOTE (GRID DE TARJETAS) */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-md text-base font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">analytics</span>
              <span>Rendimiento Financiero por Paquete / Lote ({filteredPackages.length})</span>
            </h2>

            {filteredPackages.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 text-outline text-xs">
                No se encontraron paquetes registrados en este filtro.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Cabecera Lote */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-extrabold text-primary">
                              {pkg.code}
                            </span>
                            <span className="text-xs text-outline capitalize font-medium">
                              • {pkg.packageType}
                            </span>
                          </div>
                          {pkg.name && (
                            <h3 className="font-bold text-xs sm:text-sm text-secondary mt-0.5">
                              {pkg.name}
                            </h3>
                          )}
                          <p className="text-xs text-outline mt-0.5">
                            Factura: <strong className="text-primary font-mono">{pkg.invoiceNumber}</strong>
                            {pkg.totalWeight && (
                              <span> • {formatWeight(pkg.totalWeight)}</span>
                            )}
                          </p>
                        </div>

                        {pkg.isRecovered ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-xs font-bold">
                            Superávit (+{pkg.recoveryPercentage}% Retorno)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary-fixed/40 text-secondary font-label-caps text-xs font-bold">
                            {pkg.recoveryPercentage}% Breakeven (En Progreso)
                          </span>
                        )}
                      </div>

                      {/* Indicadores Financieros Clave (3 cols) */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 bg-surface-container-low rounded-xl px-3 border border-surface-container-high/60">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                            Inversión
                          </span>
                          <span className="font-mono text-xs font-bold text-primary mt-0.5">
                            {formatCurrency(pkg.costPrice)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                            Vendido
                          </span>
                          <span className="font-mono text-xs font-bold text-primary mt-0.5">
                            {formatCurrency(pkg.packageSoldAmount)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                            {pkg.isRecovered ? "Ganancia Neta" : "Falta Breakeven"}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold mt-0.5 ${
                              pkg.isRecovered ? "text-secondary" : "text-primary"
                            }`}
                          >
                            {pkg.isRecovered
                              ? `+${formatCurrency(pkg.profit)}`
                              : formatCurrency(pkg.deficit)}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progreso Breakeven & ROI */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span
                            className={`font-semibold ${
                              pkg.isRecovered ? "text-secondary" : "text-primary"
                            }`}
                          >
                            {pkg.recoveryPercentage}% Recuperado
                          </span>
                          <span className="text-outline text-[11px]">
                            {pkg.isRecovered
                              ? "Breakeven Superado"
                              : `Meta: ${formatCurrency(pkg.costPrice)}`}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden flex relative">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${Math.min(pkg.recoveryPercentage, 100)}%` }}
                            title="Costo Inversión Cubierto"
                          ></div>
                          {pkg.recoveryPercentage > 100 && (
                            <div
                              className="bg-secondary h-full transition-all"
                              style={{ width: `${Math.min(pkg.recoveryPercentage - 100, 100)}%` }}
                              title="Superávit Neto Real"
                            ></div>
                          )}
                        </div>
                        <div className="flex justify-between text-[11px] text-outline">
                          <span>Costo: {formatCurrency(pkg.costPrice)}</span>
                          <span className="font-mono font-bold text-primary">
                            Recuperación: {formatCurrency(pkg.packageSoldAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Censo de Inventario */}
                      <div className="flex flex-col gap-1 text-xs text-outline pt-1">
                        <div className="flex items-center justify-between">
                          <span>Censo de Prendas:</span>
                          <span className="font-bold text-primary">
                            {pkg.totalItems} Prendas Totales
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-secondary font-semibold">
                            {pkg.soldCount} vendidas
                          </span>
                          <span>•</span>
                          <span>{pkg.reservedCount} apartadas</span>
                          <span>•</span>
                          <span className="text-primary font-bold">
                            {pkg.availableCount} disp.
                            {pkg.potentialRemainingValue > 0 && (
                              <span className="text-outline font-normal">
                                {" "}
                                (Remanente: {formatCurrency(pkg.potentialRemainingValue)})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pie de Tarjeta / Acción */}
                    <div className="pt-2 border-t border-surface-container-high flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        {pkg.isRecovered
                          ? `Margen Actual: ${(
                              (pkg.profit / (pkg.costPrice || 1)) *
                              100
                            ).toFixed(1)}%`
                          : "En Amortización"}
                      </span>
                      <Link
                        href={`/packages/${pkg.id}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-secondary text-xs font-bold transition-colors"
                      >
                        <span>Ver Desglose de Prendas</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
