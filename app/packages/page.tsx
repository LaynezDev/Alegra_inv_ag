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
  id: number;
  code: string;
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
  isRecovered: boolean;
  profit: number;
  recoveryPercent: number;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
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

  const getPackageTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      caja: { label: "Caja", color: "bg-blue-100 text-blue-800 border-blue-200" },
      bolsa: { label: "Bolsa", color: "bg-purple-100 text-purple-800 border-purple-200" },
      costal: { label: "Costal", color: "bg-amber-100 text-amber-800 border-amber-200" },
      palet: { label: "Palet", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    };
    const t = types[type.toLowerCase()] || { label: type, color: "bg-gray-100 text-gray-800 border-gray-200" };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border uppercase tracking-wider ${t.color}`}>
        {t.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-alegra-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-alegra-navy">
            Ingreso y Control de Paquetes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Administra lotes adquiridos (cajas, bolsas, costales, palets), costos y desglose de prendas.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-alegra-navy text-white text-sm font-semibold rounded-lg hover:bg-alegra-navy-light shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-alegra-sand" />
          Nuevo Paquete
        </button>
      </div>

      {/* Grid de Paquetes */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-alegra-navy"></div>
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-alegra-border p-8">
          <PackageIcon className="w-12 h-12 text-alegra-sand mx-auto mb-3" />
          <h3 className="text-base font-semibold text-alegra-navy">No hay paquetes registrados</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Registra tu primer paquete (caja, bolsa, costal o palet) con el costo de adquisición y número de factura.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-alegra-sand text-alegra-navy font-semibold text-sm rounded-lg hover:bg-alegra-sand-dark/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear Primer Paquete
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl border border-alegra-border hover:border-alegra-sand transition-all shadow-xs flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-4">
                {/* Cabecera de la tarjeta */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-500 uppercase">
                      {pkg.code}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      {getPackageTypeBadge(pkg.packageType)}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5" />
                        {pkg.invoiceNumber}
                      </span>
                    </div>
                  </div>
                  {pkg.isRecovered ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Recuperado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3" />
                      {pkg.recoveryPercent}%
                    </span>
                  )}
                </div>

                {/* Métricas de Costo y Peso */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Costo Adquisición:</span>
                    <span className="font-semibold text-alegra-navy">
                      {formatCurrency(pkg.costPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Peso Total:</span>
                    <span className="font-medium text-gray-700 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-gray-400" />
                      {formatWeight(pkg.totalWeight)}
                    </span>
                  </div>
                </div>

                {/* Barra de Recuperación Financiera */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Vendido a la fecha:</span>
                    <span className="font-semibold text-alegra-navy">
                      {formatCurrency(pkg.totalSold)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pkg.isRecovered ? "bg-emerald-500" : "bg-alegra-navy"
                      }`}
                      style={{ width: `${Math.min(pkg.recoveryPercent, 100)}%` }}
                    />
                  </div>
                  {pkg.isRecovered && (
                    <div className="text-[11px] text-emerald-600 font-medium text-right">
                      Ganancia Neta: +{formatCurrency(pkg.profit)}
                    </div>
                  )}
                </div>

                {/* Resumen de Inventario */}
                <div className="flex items-center justify-between text-xs text-gray-500 bg-alegra-bg p-2.5 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-alegra-navy" />
                    <span>Total Prendas: <b>{pkg.totalProducts}</b></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-600 font-medium">{pkg.availableProducts} disp.</span>
                    <span className="text-amber-600 font-medium">{pkg.reservedProducts} apart.</span>
                    <span className="text-blue-600 font-medium">{pkg.soldProducts} vend.</span>
                  </div>
                </div>
              </div>

              {/* Botón de Acceso al Desglose */}
              <Link
                href={`/packages/${pkg.id}`}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-alegra-sand/20 border-t border-alegra-border text-center text-xs font-semibold text-alegra-navy flex items-center justify-center gap-1.5 transition-colors group"
              >
                <span>Desglosar y Administrar Prendas</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-alegra-sand-dark" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Paquete */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-alegra-border overflow-hidden">
            <div className="bg-alegra-navy p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Registrar Nuevo Paquete</h3>
                <p className="text-xs text-alegra-sand">Ingresa los datos de compra del lote</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tipo de Contenedor *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["caja", "bolsa", "costal", "palet"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, packageType: t })}
                      className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${
                        formData.packageType === t
                          ? "bg-alegra-navy text-white border-alegra-navy shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Peso Total (lb)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Opcional (Ej. 50)"
                    value={formData.totalWeight}
                    onChange={(e) => setFormData({ ...formData, totalWeight: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Número de Factura *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. FAC-2026-9810"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notas o Descripción del Lote
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Ropa de mujer americana temporada verano..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-alegra-navy text-white rounded-lg hover:bg-alegra-navy-light disabled:opacity-50 transition-colors shadow-xs"
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
