"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Package as PackageIcon, 
  Plus, 
  Receipt, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Layers
} from "lucide-react";
import { formatCurrency, formatWeight, formatDate } from "@/lib/utils";

interface PackageItem {
  id: number | string;
  code: string;
  name?: string | null;
  packageType: string;
  costPrice: number;
  invoiceNumber: string;
  totalWeight: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  totalProducts: number;
  soldProducts: number;
  reservedProducts: number;
  availableProducts: number;
  totalSold: number;
  totalTheoretical?: number;
  isRecovered: boolean;
  profit: number;
  recoveryPercent: number;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    packageType: "caja",
    costPrice: "",
    invoiceNumber: "",
    totalWeight: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear el paquete");
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        packageType: "caja",
        costPrice: "",
        invoiceNumber: "",
        totalWeight: "",
        notes: "",
      });
      fetchPackages();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getPackageTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      caja: { label: "Caja", color: "bg-blue-100 text-blue-900 border-blue-200" },
      bolsa: { label: "Bolsa", color: "bg-purple-100 text-purple-900 border-purple-200" },
      costal: { label: "Costal", color: "bg-amber-100 text-amber-900 border-amber-200" },
      palet: { label: "Palet", color: "bg-secondary-fixed text-on-secondary-fixed border-secondary/20" },
    };
    const t = types[type.toLowerCase()] || { label: type, color: "bg-surface-container text-on-surface border-surface-container-high" };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${t.color}`}>
        {t.label}
      </span>
    );
  };

  // Filtrado
  const filteredPackages = packages.filter((pkg) => {
    const matchesType = filterType === "all" || pkg.packageType.toLowerCase() === filterType.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      pkg.code.toLowerCase().includes(query) || 
      pkg.invoiceNumber.toLowerCase().includes(query) ||
      (pkg.name && pkg.name.toLowerCase().includes(query)) ||
      (pkg.notes && pkg.notes.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  // KPIs
  const totalInvested = packages.reduce((acc, p) => acc + Number(p.costPrice || 0), 0);
  const totalTheoretical = packages.reduce((acc, p) => acc + Number(p.totalTheoretical || 0), 0);
  const totalSold = packages.reduce((acc, p) => acc + Number(p.totalSold || 0), 0);
  const totalNetProfit = packages.reduce((acc, p) => acc + (p.isRecovered ? Number(p.profit || 0) : 0), 0);
  const totalGarments = packages.reduce((acc, p) => acc + Number(p.totalProducts || 0), 0);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-container-high">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-primary">
            Ingreso y Control de Paquetes
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Administra lotes adquiridos (cajas, bolsas, costales, palets), costos y desglose de prendas.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-container hover:bg-primary text-on-primary text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-secondary-fixed" />
          <span>Nuevo Paquete</span>
        </button>
      </div>

      {/* Métricas Resumen KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Total Invertido
            </span>
            <span className="p-1.5 rounded-lg bg-surface-container-low text-primary">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold font-display text-primary leading-tight">
              {formatCurrency(totalInvested)}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              En {packages.length} lotes registrados
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-secondary/30 bg-secondary-fixed/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
              Total Teórico Est.
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
              Potencial
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold font-display text-primary leading-tight">
              {formatCurrency(totalTheoretical)}
            </div>
            <div className="text-[11px] text-secondary font-semibold mt-0.5">
              {totalInvested > 0 ? `${Math.round((totalTheoretical / totalInvested) * 100)}%` : "0%"} recuperación est.
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Total Vendido
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold font-display text-emerald-700 leading-tight">
              {formatCurrency(totalSold)}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              Recuperado de ventas
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Superávit Real
            </span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
              Ganancia
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold font-display text-secondary leading-tight">
              +{formatCurrency(totalNetProfit)}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              De lotes con breakeven
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Prendas Ingresadas
            </span>
            <span className="p-1.5 rounded-lg bg-surface-container-low text-primary">
              <PackageIcon className="w-4 h-4 text-secondary" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-bold font-display text-primary leading-tight">
              {totalGarments}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              Prendas catalogadas
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest p-2 rounded-2xl border border-surface-container-high shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: `Todos (${packages.length})` },
            { id: "caja", label: "Cajas" },
            { id: "bolsa", label: "Bolsas" },
            { id: "costal", label: "Costales" },
            { id: "palet", label: "Palets" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                filterType === tab.id
                  ? "bg-primary-container text-on-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-xl border border-surface-container-high">
          <PackageIcon className="w-3.5 h-3.5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar código o factura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant outline-none w-full sm:w-48"
          />
        </div>
      </div>

      {/* Grid de Paquetes */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-on-surface-variant">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-8 shadow-xs">
          <PackageIcon className="w-12 h-12 text-secondary mx-auto mb-3" />
          <h3 className="text-base font-bold text-primary font-display">No hay paquetes que coincidan</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
            {packages.length === 0
              ? "Registra tu primer paquete (caja, bolsa, costal o palet) con el costo de adquisición y factura."
              : "Prueba ajustando el término de búsqueda o el tipo de contenedor."}
          </p>
          {packages.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary font-bold text-xs rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 text-secondary-fixed" />
              <span>Crear Primer Paquete</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPackages.map((pkg) => (
            <article
              key={pkg.id}
              className="bg-surface-container-lowest rounded-2xl border border-surface-container-high hover:border-secondary transition-all shadow-xs flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-4">
                {/* Cabecera de la tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary uppercase bg-surface-container-low px-2 py-0.5 rounded-md border border-surface-container-high">
                        {pkg.code}
                      </span>
                      {getPackageTypeBadge(pkg.packageType)}
                    </div>
                    {pkg.name ? (
                      <h3 className="font-bold text-sm text-primary mt-1.5 truncate" title={pkg.name}>
                        {pkg.name}
                      </h3>
                    ) : (
                      <h3 className="text-xs italic text-on-surface-variant mt-1.5">
                        Sin título de referencia
                      </h3>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant font-mono">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-secondary" />
                        {pkg.invoiceNumber}
                      </span>
                      {pkg.totalWeight && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Scale className="w-3 h-3 text-secondary" />
                            {formatWeight(pkg.totalWeight)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {pkg.isRecovered ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Recuperado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {pkg.recoveryPercent}%
                    </span>
                  )}
                </div>

                {/* Métricas de Inversión, Teórico y Vendido */}
                <div className="grid grid-cols-3 gap-2 bg-surface-container-low p-2.5 rounded-xl text-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Inversión</span>
                    <span className="font-bold text-xs text-primary mt-0.5">
                      {formatCurrency(pkg.costPrice)}
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-surface-container-high">
                    <span className="text-[10px] text-secondary font-bold uppercase tracking-wider" title="Total teórico: suma de precios de venta de todas las prendas">
                      Teórico Est.
                    </span>
                    <span className="font-bold text-xs text-secondary mt-0.5 font-display">
                      {formatCurrency(pkg.totalTheoretical || 0)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Vendido Real</span>
                    <span className="font-bold text-xs text-emerald-700 mt-0.5">
                      {formatCurrency(pkg.totalSold)}
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso de Breakeven y Estimación */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant font-medium">Recuperación de Lote:</span>
                    <span className="font-bold text-primary">
                      {pkg.recoveryPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className={`h-full transition-all rounded-full ${
                        pkg.isRecovered ? "bg-emerald-600" : "bg-primary-container"
                      }`}
                      style={{ width: `${Math.min(pkg.recoveryPercent, 100)}%` }}
                    />
                  </div>
                  {pkg.isRecovered ? (
                    <div className="text-[11px] text-emerald-700 font-bold text-right">
                      Ganancia Neta: +{formatCurrency(pkg.profit)}
                    </div>
                  ) : pkg.totalTheoretical && pkg.totalTheoretical > 0 ? (
                    <div className="flex justify-between items-center text-[11px] bg-secondary-fixed/20 text-on-secondary-fixed px-2.5 py-1 rounded-lg font-medium">
                      <span>Recuperación potencial est.:</span>
                      <b className="font-bold font-mono">
                        {pkg.costPrice > 0 ? `${Math.round((pkg.totalTheoretical / pkg.costPrice) * 100)}%` : "0%"}
                        {" "}(+{formatCurrency(Math.max(0, pkg.totalTheoretical - pkg.costPrice))})
                      </b>
                    </div>
                  ) : null}
                </div>

                {/* Resumen de Inventario */}
                <div className="flex items-center justify-between text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Prendas: <b className="text-primary">{pkg.totalProducts}</b></span>
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    <span className="text-emerald-700 font-bold">{pkg.availableProducts} disp.</span>
                    <span className="text-amber-700 font-bold">{pkg.reservedProducts} apart.</span>
                    <span className="text-blue-700 font-bold">{pkg.soldProducts} vend.</span>
                  </div>
                </div>
              </div>

              {/* Botón de Acceso al Desglose */}
              <Link
                href={`/packages/${pkg.id}`}
                className="w-full py-3 px-4 bg-surface-container-low hover:bg-surface-container border-t border-surface-container-high text-center text-xs font-bold text-primary flex items-center justify-center gap-2 transition-colors"
              >
                <span>Desglosar y Administrar Prendas</span>
                <ArrowRight className="w-3.5 h-3.5 text-secondary group-hover:translate-x-1 transition-transform" />
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* Modal Nuevo Paquete */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-primary-container p-5 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base font-display">Registrar Nuevo Paquete</h3>
                <p className="text-xs text-secondary-fixed">Ingresa los datos de compra del lote</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-primary-container hover:text-on-primary text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-error-container text-on-error-container border border-error/20 rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Referencia o Título del Paquete *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lote Ropa Dama Verano Zara, Fardo Suéteres..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary text-on-surface font-medium placeholder:text-outline-variant"
                />
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  Nombre descriptivo para identificar rápidamente el contenido del paquete.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  Tipo de Contenedor *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["caja", "bolsa", "costal", "palet"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, packageType: t })}
                      className={`py-2 text-xs font-bold rounded-xl border capitalize transition-all ${
                        formData.packageType === t
                          ? "bg-primary-container text-on-primary border-primary-container shadow-xs"
                          : "bg-surface-container-low text-on-surface border-surface-container-high hover:bg-surface-container"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1">
                    Costo Total (Q) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ej. 1200.00"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary mb-1">
                    Peso Total (lb)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Opcional (Ej. 50)"
                    value={formData.totalWeight}
                    onChange={(e) => setFormData({ ...formData, totalWeight: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Número de Factura *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. FAC-2026-9810"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Notas o Descripción del Lote
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Ropa de mujer americana temporada verano..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-container text-on-primary rounded-xl disabled:opacity-50 transition-all shadow-xs"
                >
                  {submitting ? "Guardando..." : "Crear Paquete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
