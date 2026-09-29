"use client";

import { useEffect, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Receipt,
  Scale,
  Sparkles,
  Layers
} from "lucide-react";
import { formatCurrency, formatWeight, formatDate } from "@/lib/utils";

interface PackageReport {
  id: number;
  code: string;
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

  const getPackageTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      caja: { label: "Caja", color: "bg-blue-100 text-blue-800 border-blue-200" },
      bolsa: { label: "Bolsa", color: "bg-purple-100 text-purple-800 border-purple-200" },
      costal: { label: "Costal", color: "bg-amber-100 text-amber-800 border-amber-200" },
      palet: { label: "Palet", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    };
    const t = types[type.toLowerCase()] || { label: type, color: "bg-gray-100 text-gray-800 border-gray-200" };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border uppercase tracking-wider ${t.color}`}>
        {t.label}
      </span>
    );
  };

  const filteredPackages = data?.packages.filter((p) => {
    if (typeFilter === "todos") return true;
    return p.packageType.toLowerCase() === typeFilter.toLowerCase();
  }) || [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-alegra-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-alegra-navy">
            Reporte Financiero y Retorno de Inversión (ROI)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analiza lo invertido vs lo vendido y comprueba si cada paquete ya alcanzó su punto de equilibrio y generó ganancia.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-alegra-navy"></div>
        </div>
      ) : !data ? (
        <div className="text-center py-16 bg-white rounded-xl border border-alegra-border p-8">
          <p className="text-sm text-red-500">Error al cargar reportes financieros.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Invertido */}
            <div className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total Invertido
                </span>
                <span className="p-2 rounded-lg bg-red-50 text-red-600">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-alegra-navy">
                  {formatCurrency(data.summary.globalInvested)}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  En {data.summary.totalPackages} paquetes adquiridos
                </span>
              </div>
            </div>

            {/* Total Vendido */}
            <div className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total Vendido
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-600">
                  {formatCurrency(data.summary.globalSold)}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  En órdenes cobradas y despachadas
                </span>
              </div>
            </div>

            {/* Ganancia Global */}
            <div className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Ganancia Neta Obtenida
                </span>
                <span className="p-2 rounded-lg bg-alegra-sand-light text-alegra-sand-dark">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-alegra-navy">
                  +{formatCurrency(data.summary.globalProfit)}
                </span>
                <span className="text-xs text-gray-500 block mt-1">
                  {data.summary.globalDeficit > 0
                    ? `Faltan ${formatCurrency(data.summary.globalDeficit)} para breakeven global`
                    : "¡Inversión global 100% recuperada!"}
                </span>
              </div>
            </div>

            {/* Tasa de Recuperación Global */}
            <div className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Recuperación Global
                </span>
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-alegra-navy">
                  {data.summary.globalRecoveryPercentage}%
                </span>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-alegra-navy h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(data.summary.globalRecoveryPercentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtro por tipo de Contenedor */}
          <div className="flex items-center gap-2 pt-4">
            <span className="text-xs font-semibold text-gray-500">Filtrar por tipo:</span>
            {["todos", "caja", "bolsa", "costal", "palet"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize border transition-all ${
                  typeFilter === t
                    ? "bg-alegra-navy text-white border-alegra-navy shadow-xs"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tabla y Desglose Detallado por Paquete */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-alegra-navy flex items-center gap-2">
              <Package className="w-5 h-5 text-alegra-sand-dark" />
              Rendimiento Financiero por Paquete / Lote ({filteredPackages.length})
            </h2>

            {filteredPackages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-alegra-border p-6 text-gray-500 text-sm">
                No se encontraron paquetes registrados en esta categoría.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs hover:border-alegra-sand transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Cabecera del Paquete */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-bold text-gray-500 uppercase">
                            {pkg.code}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {getPackageTypeBadge(pkg.packageType)}
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Receipt className="w-3 h-3" />
                              {pkg.invoiceNumber}
                            </span>
                          </div>
                        </div>

                        {pkg.isRecovered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ¡Recuperado!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            {pkg.recoveryPercentage}% Recuperado
                          </span>
                        )}
                      </div>

                      {/* Comparativa Costo vs Vendido */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs">
                        <div>
                          <span className="text-gray-400 block">Costo Invertido:</span>
                          <span className="font-bold text-base text-alegra-navy">
                            {formatCurrency(pkg.costPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Total Vendido:</span>
                          <span className="font-bold text-base text-emerald-600">
                            {formatCurrency(pkg.packageSoldAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progreso y Estatus */}
                      <div className="space-y-1.5 pt-1">
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              pkg.isRecovered ? "bg-emerald-500" : "bg-alegra-navy"
                            }`}
                            style={{ width: `${Math.min(pkg.recoveryPercentage, 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          {pkg.isRecovered ? (
                            <span className="text-emerald-700 font-bold">
                              Ganancia Neta: +{formatCurrency(pkg.profit)}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">
                              Faltan: {formatCurrency(pkg.deficit)} para recuperar
                            </span>
                          )}
                          <span className="text-gray-400">
                            {pkg.recoveryPercentage}%
                          </span>
                        </div>
                      </div>

                      {/* Desglose de Prendas y Valor Remanente */}
                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs space-y-1">
                        <div className="flex justify-between text-gray-600">
                          <span>Prendas vendidas:</span>
                          <span className="font-semibold text-emerald-700">
                            {pkg.soldCount} de {pkg.totalItems}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Disponibles en tienda:</span>
                          <span className="font-semibold text-alegra-navy">
                            {pkg.availableCount} prendas
                          </span>
                        </div>
                        {pkg.availableCount > 0 && (
                          <div className="flex justify-between text-alegra-sand-dark pt-1 border-t border-gray-200 font-medium text-[11px]">
                            <span>Ganancia potencial remanente:</span>
                            <span className="font-bold">
                              {formatCurrency(pkg.potentialRemainingValue)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
