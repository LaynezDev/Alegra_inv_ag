"use client";

import { useState, useMemo } from "react";
import { 
  X, 
  Share2, 
  Check, 
  Copy, 
  ExternalLink, 
  MessageCircle, 
  ShoppingBag, 
  CheckSquare, 
  Square,
  Search,
  Sparkles,
  Link2
} from "lucide-react";

interface ProductItem {
  id: string | number;
  name: string;
  barcode: string;
  salePrice: number;
  status: string;
  photos?: string[] | string | null;
}

interface CatalogShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  defaultTitle?: string;
  packageCode?: string;
}

export default function CatalogShareModal({
  isOpen,
  onClose,
  products,
  defaultTitle,
  packageCode,
}: CatalogShareModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(() => {
    // Por defecto seleccionar solo las disponibles
    const avail = products.filter((p) => p.status === "disponible").map((p) => p.id);
    return new Set(avail.length > 0 ? avail : products.map((p) => p.id));
  });

  const [title, setTitle] = useState(
    defaultTitle || (packageCode ? `Catálogo - Fardo ${packageCode}` : "Catálogo de Prendas Seleccionadas")
  );
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filtrar productos por búsqueda
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
    );
  }, [products, search]);

  if (!isOpen) return null;

  const handleToggleProduct = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleGenerateLink = async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setGeneratedUrl(null);

    try {
      const res = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          productIds: Array.from(selectedIds).map(String),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo generar el catálogo");
      }

      const data = await res.json();
      const origin = window.location.origin;
      const fullUrl = `${origin}/c/${data.shareToken || data.id}`;
      setGeneratedUrl(fullUrl);
    } catch (err: any) {
      alert(err.message || "Error al generar enlace");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappShareText = encodeURIComponent(
    `¡Hola! 💕 Mira este catálogo de prendas que seleccionamos para ti:\n👉 ${generatedUrl}\n\nPuedes ver las fotos y precios, y avisarme cuál te gusta.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl border border-surface-container-high shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-primary">Generar Catálogo para Clientes</h3>
              <p className="text-xs text-on-surface-variant">
                Comparte un enlace visual con fotos y precios de prendas seleccionadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Si ya se generó el enlace, mostrar tarjeta de éxito */}
          {generatedUrl ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-emerald-950">¡Catálogo Generado con Éxito!</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Se incluyeron <b>{selectedIds.size} prendas</b> con sus fotos y precios listos para compartir.
                </p>
              </div>

              {/* Caja de Enlace */}
              <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="w-full text-xs font-mono text-emerald-950 bg-transparent outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={`https://wa.me/?text=${whatsappShareText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </a>
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-4 rounded-xl border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver Catálogo</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setGeneratedUrl(null)}
                className="text-xs text-emerald-800 hover:underline pt-2 inline-block"
              >
                ← Modificar prendas o generar otro enlace
              </button>
            </div>
          ) : (
            <>
              {/* Configuración de Título y Notas */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Título del Catálogo
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Lote de Blusas y Vestidos de Verano"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Nota o Mensaje para el Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Prendas disponibles talla S y M, envíos a toda Guatemala"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Selección de Prendas */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface">Seleccionar Prendas:</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary-container text-on-primary">
                      {selectedIds.size} de {products.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Todas</span>
                    </button>
                    <span className="text-outline-variant">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] font-semibold text-on-surface-variant hover:underline flex items-center gap-1"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Ninguna</span>
                    </button>
                  </div>
                </div>

                {/* Buscador de prendas */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Buscar prenda por nombre o código de barras..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container-high text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Lista de Prendas */}
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-surface-container-high divide-y divide-surface-container-high bg-surface-container-lowest">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedIds.has(p.id);
                    let thumb: string | null = null;
                    if (Array.isArray(p.photos)) {
                      thumb = p.photos[0] || null;
                    } else if (typeof p.photos === "string") {
                      try {
                        const parsed = JSON.parse(p.photos);
                        thumb = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
                      } catch {
                        if (p.photos.startsWith("http") || p.photos.startsWith("/")) {
                          thumb = p.photos;
                        }
                      }
                    }

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleProduct(p.id)}
                        className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary-container/10" : "hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-outline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />

                          {/* Miniatura */}
                          <div className="w-9 h-9 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-surface-container-high flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-on-surface-variant/40" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-on-surface truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] font-mono text-on-surface-variant">
                              {p.barcode} • {p.status}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-primary">
                            Q{Number(p.salePrice).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Modal */}
        {!generatedUrl && (
          <div className="p-4 sm:p-5 border-t border-surface-container-high bg-surface-container-low flex items-center justify-between gap-3">
            <span className="text-xs text-on-surface-variant font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "prenda lista" : "prendas listas"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={generating || selectedIds.size === 0}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{generating ? "Generando..." : "Crear Enlace Público"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
