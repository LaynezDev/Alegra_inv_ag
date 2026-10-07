"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Scale, 
  Receipt, 
  Tag, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Sparkles,
  Image as ImageIcon,
  Upload,
  X,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Printer
} from "lucide-react";
import BarcodeDisplay from "@/components/BarcodeDisplay";
import BarcodePrintModal from "@/components/BarcodePrintModal";
import { formatCurrency, formatWeight, calculateCostByWeight } from "@/lib/utils";

interface Product {
  id: number | string;
  barcode: string;
  name: string;
  weight: number | null;
  calculatedCost: number | null;
  salePrice: number;
  photos: string | null;
  status: string;
  createdAt: string;
}

interface PackageDetail {
  id: number | string;
  code: string;
  name?: string | null;
  packageType: string;
  costPrice: number;
  invoiceNumber: string;
  totalWeight: number | null;
  status: string;
  notes: string | null;
  products: Product[];
  totalSold: number;
  totalTheoretical?: number;
  isRecovered: boolean;
  profit: number;
  recoveryPercent: number;
}

export default function PackageDetailPage() {
  const params = useParams();
  const packageId = params.id as string;

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Estado para editar información del paquete (referencia, factura, notas)
  const [editingPackage, setEditingPackage] = useState(false);
  const [pkgEditName, setPkgEditName] = useState("");
  const [pkgEditInvoice, setPkgEditInvoice] = useState("");
  const [pkgEditNotes, setPkgEditNotes] = useState("");
  const [savingPkgEdit, setSavingPkgEdit] = useState(false);

  // Formulario nuevo producto
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [customBarcode, setCustomBarcode] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado Modal de Edición de Producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editNewPreviews, setEditNewPreviews] = useState<string[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Visibilidad de prendas: ocultar vendidas por defecto
  const [showSold, setShowSold] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | string | null>(null);

  // Modal de impresión de códigos de barra
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSelectedIds, setPrintSelectedIds] = useState<(string | number)[]>([]);

  // Estado Lightbox / Visualizador de Imágenes en Grande
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchPackage = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/packages/${packageId}`);
      if (res.ok) {
        const data = await res.json();
        setPkg(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (packageId) {
      fetchPackage();
    }
  }, [packageId]);

  // Manejo de selección de archivos para nuevo producto
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      // Generar previews locales
      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Manejo de archivos para edición
  const handleEditFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setEditNewFiles((prev) => [...prev, ...newFiles]);

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setEditNewPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeEditNewFile = (index: number) => {
    setEditNewFiles((prev) => prev.filter((_, i) => i !== index));
    setEditNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingEditPhoto = (index: number) => {
    setEditPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Función para subir archivos al servidor
  const uploadFilesToServer = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al subir imágenes");
    }

    const data = await res.json();
    return data.urls || [];
  };

  // Cálculo en vivo del costo por peso en nuevo producto
  const currentItemWeight = parseFloat(weight) || 0;
  const estimatedCost =
    pkg && pkg.totalWeight && pkg.totalWeight > 0 && currentItemWeight > 0
      ? calculateCostByWeight(currentItemWeight, pkg.totalWeight, pkg.costPrice)
      : null;

  // Cálculo en vivo del costo por peso en edición
  const editItemWeightNum = parseFloat(editWeight) || 0;
  const editEstimatedCost =
    pkg && pkg.totalWeight && pkg.totalWeight > 0 && editItemWeightNum > 0
      ? calculateCostByWeight(editItemWeightNum, pkg.totalWeight, pkg.costPrice)
      : null;

  // Guardar Nuevo Producto
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      // 1. Subir imágenes si se seleccionaron archivos
      let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setUploadingImages(true);
        uploadedUrls = await uploadFilesToServer(selectedFiles);
        setUploadingImages(false);
      }

      // 2. Guardar producto
      const res = await fetch(`/api/packages/${packageId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          weight: weight ? parseFloat(weight) : null,
          salePrice: parseFloat(salePrice),
          photos: uploadedUrls.length > 0 ? uploadedUrls : null,
          customBarcode: customBarcode || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al agregar el producto");
      }

      // Limpiar formulario y recargar
      setName("");
      setWeight("");
      setSalePrice("");
      setCustomBarcode("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setShowAddForm(false);
      fetchPackage();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditWeight(prod.weight ? String(prod.weight) : "");
    setEditSalePrice(String(prod.salePrice));
    setEditBarcode(prod.barcode);
    setEditPhotos(prod.photos ? JSON.parse(prod.photos) : []);
    setEditNewFiles([]);
    setEditNewPreviews([]);
    setEditErrorMsg("");
  };

  // Guardar Cambios de Edición
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmittingEdit(true);
    setEditErrorMsg("");

    try {
      // Subir nuevos archivos si los hay
      let newlyUploadedUrls: string[] = [];
      if (editNewFiles.length > 0) {
        newlyUploadedUrls = await uploadFilesToServer(editNewFiles);
      }

      const allPhotos = [...editPhotos, ...newlyUploadedUrls];

      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          weight: editWeight ? parseFloat(editWeight) : null,
          salePrice: parseFloat(editSalePrice),
          barcode: editBarcode,
          photos: allPhotos.length > 0 ? allPhotos : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar el producto");
      }

      setEditingProduct(null);
      fetchPackage();
    } catch (err: any) {
      setEditErrorMsg(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Abrir Lightbox para ver imágenes en grande
  const handleOpenLightbox = (prod: Product, initialIndex = 0) => {
    const list = prod.photos ? JSON.parse(prod.photos) : [];
    if (list.length === 0) return;
    setLightboxProduct(prod);
    setLightboxImages(list);
    setActiveImageIndex(initialIndex);
    setLightboxOpen(true);
  };

  // Eliminar Prenda
  const handleDeleteProduct = async (prod: Product | null) => {
    if (!prod) return;
    if (prod.status === "apartado" || prod.status === "vendido") {
      alert(`No se puede eliminar la prenda "${prod.name}" porque ya fue ${prod.status === "vendido" ? "vendida" : "apartada"} en una orden.`);
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar la prenda "${prod.name}" (${prod.barcode})? Esta acción es irreversible.`)) {
      return;
    }

    try {
      setDeletingProductId(prod.id);
      const res = await fetch(`/api/products/${prod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar la prenda");
      }
      if (editingProduct && editingProduct.id === prod.id) {
        setEditingProduct(null);
      }
      fetchPackage();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingProductId(null);
    }
  };

  // Editar Información del Paquete
  const handleOpenEditPkg = () => {
    if (!pkg) return;
    setPkgEditName(pkg.name || "");
    setPkgEditInvoice(pkg.invoiceNumber || "");
    setPkgEditNotes(pkg.notes || "");
    setEditingPackage(true);
  };

  const handleSavePkgEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    try {
      setSavingPkgEdit(true);
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pkgEditName,
          invoiceNumber: pkgEditInvoice,
          notes: pkgEditNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar información del paquete");
      }
      setEditingPackage(false);
      fetchPackage();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPkgEdit(false);
    }
  };

  // Abrir Modal de Impresión
  const handleOpenPrintAll = () => {
    setPrintSelectedIds([]);
    setPrintModalOpen(true);
  };

  const handleOpenPrintSingle = (prod: Product) => {
    setPrintSelectedIds([prod.id]);
    setPrintModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "disponible":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Disponible
          </span>
        );
      case "apartado":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Apartado
          </span>
        );
      case "vendido":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Vendido
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-alegra-navy"></div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-semibold">Paquete no encontrado.</p>
        <Link href="/packages" className="mt-3 text-sm text-alegra-navy underline inline-block">
          Volver a paquetes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver y Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container-high">
        <div className="flex items-center gap-3">
          <Link
            href="/packages"
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-xl transition-colors border border-surface-container-high"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-primary">
                Paquete {pkg.code}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-secondary-fixed text-on-secondary-fixed border border-secondary/20 uppercase">
                {pkg.packageType}
              </span>
              <button
                type="button"
                onClick={handleOpenEditPkg}
                className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                title="Editar información del paquete (referencia, factura, notas)"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {pkg.name ? (
              <h2 className="text-sm sm:text-base font-bold text-secondary mt-0.5">
                {pkg.name}
              </h2>
            ) : (
              <button
                type="button"
                onClick={handleOpenEditPkg}
                className="text-xs text-on-surface-variant hover:text-secondary underline mt-0.5 cursor-pointer block"
              >
                + Agregar referencia o título al paquete
              </button>
            )}
            <p className="text-xs text-on-surface-variant flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 font-mono">
                <Receipt className="w-3.5 h-3.5 text-secondary" /> Factura: <b>{pkg.invoiceNumber}</b>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-secondary" /> Peso: <b>{formatWeight(pkg.totalWeight)}</b>
              </span>
            </p>
          </div>
        </div>

        {pkg.products.length > 0 && (
          <button
            type="button"
            onClick={handleOpenPrintAll}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-container-low hover:bg-surface-container-high text-primary text-xs font-bold rounded-xl border border-surface-container-high transition-all shadow-xs self-start sm:self-auto cursor-pointer"
            title="Imprimir todos o seleccionar códigos de barra"
          >
            <Printer className="w-4 h-4 text-secondary" />
            <span>Imprimir Códigos ({pkg.products.length})</span>
          </button>
        )}
      </div>

      {/* Tarjetas KPI de Resumen Financiero del Paquete */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Costo Invertido */}
        <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Costo Invertido</span>
          <span className="text-lg sm:text-xl font-bold font-display text-primary mt-1">
            {formatCurrency(pkg.costPrice)}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-0.5">Costo total de adquisición</span>
        </div>

        {/* 2. Total Teórico Estimado (NUEVO) */}
        <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-secondary/30 bg-secondary-fixed/10 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider" title="Suma de precios de venta de todas las prendas">
            Total Teórico (Est.)
          </span>
          <span className="text-lg sm:text-xl font-bold font-display text-primary mt-1">
            {formatCurrency(pkg.totalTheoretical || 0)}
          </span>
          <span className="text-[11px] text-secondary font-semibold mt-0.5">
            {pkg.costPrice > 0 ? `${Math.round(((pkg.totalTheoretical || 0) / pkg.costPrice) * 100)}%` : "0%"} potencial
          </span>
        </div>

        {/* 3. Total Vendido Real */}
        <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Vendido</span>
          <span className="text-lg sm:text-xl font-bold font-display text-emerald-700 mt-1">
            {formatCurrency(pkg.totalSold)}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {pkg.recoveryPercent}% Recuperado
          </span>
        </div>

        {/* 4. Estado Financiero */}
        <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Estado Financiero</span>
          <div className="mt-1">
            {pkg.isRecovered ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ¡Superávit! (+{formatCurrency(pkg.profit)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Faltan {formatCurrency(Math.max(0, pkg.costPrice - pkg.totalSold))}
              </span>
            )}
          </div>
          <span className="text-[11px] text-on-surface-variant mt-0.5">Punto de equilibrio</span>
        </div>

        {/* 5. Censo de Prendas */}
        <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Censo de Prendas</span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-container hover:bg-primary text-on-primary text-[10px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3 text-secondary-fixed" />
              <span>{showAddForm ? "Cerrar" : "+ Prenda"}</span>
            </button>
          </div>
          <span className="text-lg sm:text-xl font-bold font-display text-primary mt-1">
            {pkg.products.length} <span className="text-xs font-normal text-on-surface-variant">Totales</span>
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant mt-0.5">
            <span className="text-emerald-700 font-bold">{pkg.products.filter(p => p.status === 'disponible').length} disp</span> •
            <span className="text-amber-700 font-bold">{pkg.products.filter(p => p.status === 'apartado').length} apart</span> •
            <span className="text-blue-700 font-bold">{pkg.products.filter(p => p.status === 'vendido').length} vend</span>
          </div>
        </div>
      </div>

      {/* Barra Visual de Breakeven */}
      <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container-high space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-on-surface-variant gap-1">
          <span className="font-bold text-primary flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span>Progreso hacia Punto de Equilibrio (Breakeven)</span>
          </span>
          <span className="font-medium">
            {pkg.isRecovered ? "¡Inversión 100% Recuperada!" : `${pkg.recoveryPercent}% completado`}
          </span>
        </div>
        <div className="relative w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all rounded-full ${
              pkg.isRecovered ? "bg-emerald-600" : "bg-primary-container"
            }`}
            style={{ width: `${Math.min(pkg.recoveryPercent, 100)}%` }}
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between text-[11px] text-on-surface-variant font-mono font-medium gap-1 pt-1 border-t border-surface-container-high/40">
          <span>Inversión: <b>{formatCurrency(pkg.costPrice)}</b></span>
          <span className="text-secondary">
            Teórico Potencial: <b>{formatCurrency(pkg.totalTheoretical || 0)}</b>
            {(pkg.totalTheoretical || 0) > pkg.costPrice && (
              <span className="text-emerald-700 font-sans ml-1">
                (+{formatCurrency((pkg.totalTheoretical || 0) - pkg.costPrice)} ganancia est.)
              </span>
            )}
          </span>
          <span className="text-emerald-700">Vendido Real: <b>{formatCurrency(pkg.totalSold)}</b></span>
        </div>
      </div>

      {/* Formulario para Agregar Producto con Subida de Archivos */}
      {showAddForm && (
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-5 sm:p-6 shadow-xs space-y-4 transition-all">
          <div className="flex justify-between items-center border-b border-surface-container-high pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              <h3 className="font-bold text-sm text-primary font-display">
                Estación de Ingesta: Registrar Prenda al Lote
              </h3>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-on-surface-variant hover:text-primary"
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={handleAddProduct} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-error-container text-on-error-container border border-error/20 rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-primary mb-1">
                  Nombre o Descripción de la Prenda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Vestido casual estampado floral talla M"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Precio de Venta (Q) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ej. 150.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface font-bold focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Peso Individual (lb) (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 0.85"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                />
                {estimatedCost !== null && (
                  <p className="text-[11px] text-emerald-800 mt-1 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Costo prorrateado por peso: <b>{formatCurrency(estimatedCost)}</b>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1">
                  Código de Barras Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generado si se deja vacío"
                  value={customBarcode}
                  onChange={(e) => setCustomBarcode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface font-mono focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Subida de Fotos Directa (Archivos) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-primary">
                Fotografías de la Prenda
              </label>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-surface-container-low hover:bg-surface-container text-primary rounded-xl border border-surface-container-high transition-colors"
                >
                  <Upload className="w-4 h-4 text-secondary" />
                  <span>Seleccionar o Tomar Fotos</span>
                </button>
                <span className="text-xs text-on-surface-variant">
                  {selectedFiles.length === 0
                    ? "Sin imágenes seleccionadas"
                    : `${selectedFiles.length} imagen(es) seleccionada(s)`}
                </span>
              </div>

              {/* Previews de imágenes seleccionadas */}
              {previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded-xl border border-surface-container-high overflow-hidden shadow-xs"
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-high">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-container text-on-primary rounded-xl disabled:opacity-50 transition-all shadow-xs flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {uploadingImages
                    ? "Subiendo imágenes..."
                    : submitting
                    ? "Guardando..."
                    : "Guardar Producto"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de Productos del Paquete */}
      {(() => {
        const activeProducts = pkg.products.filter((p) => p.status !== "vendido");
        const soldProducts = pkg.products.filter((p) => p.status === "vendido");
        const soldCount = soldProducts.length;
        const displayedProducts = showSold ? pkg.products : activeProducts;

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <h2 className="text-base font-bold font-display text-primary flex items-center gap-2">
                <Tag className="w-4 h-4 text-secondary" />
                <span>Manifiesto de Prendas ({activeProducts.length} activas)</span>
              </h2>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {pkg.products.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenPrintAll}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-secondary/30 bg-secondary-fixed/30 hover:bg-secondary-fixed/50 text-on-secondary-fixed transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Imprimir todos o seleccionar códigos de barra"
                  >
                    <Printer className="w-3.5 h-3.5 text-secondary" />
                    <span>Imprimir Códigos</span>
                  </button>
                )}

                {soldCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSold(!showSold)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low text-on-surface transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {showSold ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span>Ocultar vendidas ({soldCount})</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-secondary" />
                        <span>Mostrar vendidas ({soldCount})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {pkg.products.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-xs">
                <Tag className="w-10 h-10 text-outline-variant mx-auto mb-2" />
                <p className="text-sm font-bold text-primary">No se han desglosado prendas aún</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Haz clic en "+ Prenda" arriba para registrar la primera prenda de este paquete.
                </p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-primary">¡Todas las prendas de este lote han sido vendidas!</p>
                <p className="text-xs text-on-surface-variant mt-0.5 mb-3">
                  No hay prendas activas en stock actualmente para este lote.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSold(true)}
                  className="text-xs font-bold text-primary bg-secondary-fixed hover:bg-secondary-fixed-dim px-3.5 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver las {soldCount} prendas vendidas</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedProducts.map((prod) => {
                  const photoList: string[] = prod.photos ? JSON.parse(prod.photos) : [];
                  const primaryPhoto = photoList.length > 0 ? photoList[0] : null;

                  return (
                    <div
                      key={prod.id}
                      className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-4 shadow-xs flex flex-col justify-between hover:border-secondary transition-all space-y-3"
                    >
                      <div className="space-y-3">
                        {/* Foto, Nombre y Botón de Visualización en Grande */}
                        <div className="flex gap-3 items-start">
                          <div
                            onClick={() => photoList.length > 0 && handleOpenLightbox(prod, 0)}
                            className={`relative w-20 h-20 rounded-xl bg-surface-container-low border border-surface-container-high overflow-hidden shrink-0 flex items-center justify-center ${
                              photoList.length > 0 ? "cursor-pointer group" : ""
                            }`}
                            title={photoList.length > 0 ? "Haz clic para ver fotos en grande" : "Sin foto"}
                          >
                            {primaryPhoto ? (
                              <>
                                <img
                                  src={primaryPhoto}
                                  alt={prod.name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                                {photoList.length > 1 && (
                                  <span className="absolute bottom-1 right-1 bg-primary/80 text-white text-[10px] font-bold px-1.5 rounded-md">
                                    +{photoList.length - 1}
                                  </span>
                                )}
                              </>
                            ) : (
                              <ImageIcon className="w-7 h-7 text-outline-variant" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              {getStatusBadge(prod.status)}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenPrintSingle(prod)}
                                  className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                                  title="Imprimir código de barra de esta prenda"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(prod)}
                                  className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors"
                                  title="Editar prenda"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod)}
                                  disabled={deletingProductId === prod.id}
                                  className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors disabled:opacity-50"
                                  title="Eliminar prenda"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-primary truncate" title={prod.name}>
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="font-bold text-primary font-display">
                                {formatCurrency(prod.salePrice)}
                              </span>
                              {prod.weight && (
                                <span className="text-on-surface-variant text-[11px]">
                                  • {formatWeight(prod.weight)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Costo Prorrateado */}
                        {prod.calculatedCost !== null && Number(prod.calculatedCost) > 0 && (
                          <div className="text-[11px] text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-lg flex items-center justify-between">
                            <span>Costo base:</span>
                            <b className="text-primary font-mono">{formatCurrency(prod.calculatedCost)}</b>
                          </div>
                        )}

                        {/* Código de Barras con botón de impresión directa */}
                        <div className="flex justify-center pt-1">
                          <BarcodeDisplay
                            value={prod.barcode}
                            label={prod.name}
                            showPrintButton={true}
                            height={34}
                          />
                        </div>
                      </div>

                      {/* Acciones Rápidas */}
                      <div className="pt-2 border-t border-surface-container-high flex items-center justify-between text-xs">
                        {photoList.length > 0 ? (
                          <button
                            onClick={() => handleOpenLightbox(prod, 0)}
                            className="inline-flex items-center gap-1 text-secondary hover:text-primary font-bold transition-colors text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Fotos ({photoList.length})</span>
                          </button>
                        ) : (
                          <span className="text-outline-variant text-[11px] italic">Sin fotos</span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-semibold text-[11px] transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            disabled={deletingProductId === prod.id}
                            className="inline-flex items-center gap-1 text-error hover:text-error/80 font-semibold text-[11px] transition-colors disabled:opacity-50"
                            title="Eliminar prenda"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Borrar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal Editar Producto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-alegra-border overflow-hidden my-6">
            <div className="bg-alegra-navy p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Editar Prenda</h3>
                <p className="text-xs text-alegra-sand">{editingProduct.barcode}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-gray-300 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {editErrorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {editErrorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre o Descripción *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Precio de Venta (Q) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Peso Individual (lb)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                  {editEstimatedCost !== null && (
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                      Costo estimado: {formatCurrency(editEstimatedCost)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Código de Barras *
                </label>
                <input
                  type="text"
                  required
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy font-mono"
                />
              </div>

              {/* Gestión de Fotos en Edición */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700">
                  Fotos de la Prenda
                </label>

                {/* Fotos Existentes */}
                {editPhotos.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 block">Fotos actuales:</span>
                    <div className="flex flex-wrap gap-2">
                      {editPhotos.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden group shadow-xs"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingEditPhoto(idx)}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subir Fotos Adicionales */}
                <div className="pt-2">
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleEditFilesSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-alegra-navy rounded-lg border border-gray-300 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-alegra-sand-dark" />
                    <span>Agregar Nuevas Fotos</span>
                  </button>

                  {editNewPreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {editNewPreviews.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-lg border border-emerald-300 overflow-hidden group shadow-xs"
                        >
                          <img
                            src={url}
                            alt={`Nueva foto ${idx}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditNewFile(idx)}
                            className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    if (editingProduct) {
                      handleDeleteProduct(editingProduct);
                    }
                  }}
                  disabled={editingProduct?.status === "apartado" || editingProduct?.status === "vendido"}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent"
                  title={editingProduct?.status === "apartado" || editingProduct?.status === "vendido" ? "No se puede eliminar porque está en una orden" : "Eliminar esta prenda"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Prenda
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-5 py-2 text-xs font-semibold bg-alegra-navy text-white rounded-lg hover:bg-alegra-navy-light disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
                  >
                    {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {submittingEdit ? "Guardando Cambios..." : "Guardar Cambios"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Modal de Visualización de Imágenes en Grande */}
      {lightboxOpen && lightboxProduct && lightboxImages.length > 0 && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-alegra-navy/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header del Lightbox */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 text-white">
              <div>
                <h3 className="font-bold text-base truncate max-w-md">
                  {lightboxProduct.name}
                </h3>
                <span className="text-xs text-alegra-sand font-mono">
                  {lightboxProduct.barcode} • {formatCurrency(lightboxProduct.salePrice)}
                </span>
              </div>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Imagen Principal en Grande */}
            <div className="relative flex items-center justify-center p-4 min-h-[400px] max-h-[70vh] bg-black/40">
              <img
                src={lightboxImages[activeImageIndex]}
                alt={lightboxProduct.name}
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
              />

              {/* Botón Anterior */}
              {lightboxImages.length > 1 && (
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === 0 ? lightboxImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Botón Siguiente */}
              {lightboxImages.length > 1 && (
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === lightboxImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md"
                  title="Foto siguiente"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Tiras de Miniaturas y Contador */}
            {lightboxImages.length > 1 && (
              <div className="p-3 bg-black/50 border-t border-white/10 flex items-center justify-between">
                <div className="flex gap-2 overflow-x-auto">
                  {lightboxImages.map((imgUrl, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === i
                          ? "border-alegra-sand scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumb ${i}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-300 font-mono pl-3 shrink-0">
                  {activeImageIndex + 1} / {lightboxImages.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Impresión Masiva y Selectiva de Códigos de Barra */}
      {pkg && (
        <BarcodePrintModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          products={pkg.products}
          packageCode={pkg.code}
          initialSelectedIds={printSelectedIds}
        />
      )}

      {/* Modal para Editar Información del Paquete */}
      {editingPackage && pkg && (
        <div
          onClick={() => setEditingPackage(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high overflow-hidden"
          >
            <div className="bg-primary-container p-4 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm font-display">Editar Paquete {pkg.code}</h3>
                <p className="text-[11px] text-secondary-fixed">Actualiza la referencia, factura o notas del lote</p>
              </div>
              <button
                onClick={() => setEditingPackage(false)}
                className="text-on-primary-container hover:text-on-primary text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePkgEdit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1">
                  Referencia o Título del Paquete *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ropa Dama Verano Zara, Fardo Suéteres..."
                  value={pkgEditName}
                  onChange={(e) => setPkgEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary text-on-surface font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">
                  Número de Factura
                </label>
                <input
                  type="text"
                  value={pkgEditInvoice}
                  onChange={(e) => setPkgEditInvoice(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary text-on-surface font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-primary mb-1">
                  Notas o Descripción
                </label>
                <textarea
                  rows={2}
                  value={pkgEditNotes}
                  onChange={(e) => setPkgEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-xl border border-surface-container-high focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary text-on-surface resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setEditingPackage(false)}
                  className="px-4 py-2 font-semibold text-on-surface-variant hover:text-on-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPkgEdit}
                  className="px-5 py-2 font-bold bg-primary hover:bg-primary-container text-on-primary rounded-xl disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
                >
                  {savingPkgEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingPkgEdit ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
