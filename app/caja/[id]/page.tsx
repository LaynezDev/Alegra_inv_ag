"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingBag,
  ShoppingCart,
  MessageCircle,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Search,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { StoreSettings, DEFAULT_STORE_SETTINGS, getGrammarTexts } from "@/lib/settings";

interface PublicPackageProduct {
  id: string | number;
  barcode: string;
  salePrice: number;
  photos: string[];
}

interface PublicPackageData {
  id: string | number;
  code: string;
  name?: string | null;
  packageType: string;
  products: PublicPackageProduct[];
}

export default function PublicPackagePage({ params }: { params: { id: string } }) {
  const [pkg, setPkg] = useState<PublicPackageData | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrito temporal (guarda IDs de productos seleccionados)
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Búsqueda por código de cliente
  const [customerCodeInput, setCustomerCodeInput] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerLookupMsg, setCustomerLookupMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [matchedCustomerCode, setMatchedCustomerCode] = useState<string | null>(null);

  // Datos generales del cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [formError, setFormError] = useState("");
  const [copiedText, setCopiedText] = useState(false);

  // Lightbox de fotos
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxCode, setLightboxCode] = useState("");

  const storageKey = `alegra_public_cart_${params.id}`;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pkgRes, settingsRes] = await Promise.all([
          fetch(`/api/public/package/${encodeURIComponent(params.id)}`),
          fetch("/api/public/settings").catch(() => null),
        ]);

        if (settingsRes && settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }

        if (!pkgRes.ok) {
          if (pkgRes.status === 404) {
            setError("No encontramos este paquete. Es posible que el enlace no sea válido.");
          } else {
            setError("Ocurrió un error al cargar los productos del paquete.");
          }
          return;
        }

        const data: PublicPackageData = await pkgRes.json();
        setPkg(data);

        // Restaurar carrito temporal desde localStorage filtrando solo los aún disponibles
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsedIds: string[] = JSON.parse(saved);
            if (Array.isArray(parsedIds)) {
              const availableSet = new Set(data.products.map((p) => String(p.id)));
              const validIds = parsedIds.filter((id) => availableSet.has(String(id)));
              setCartIds(validIds);
            }
          }
        } catch {
          // Ignorar errores de localStorage
        }
      } catch {
        setError("Error de conexión. Por favor recarga la página.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id, storageKey]);

  // Sincronizar carrito temporal en localStorage
  useEffect(() => {
    if (!pkg) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cartIds));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, [cartIds, pkg, storageKey]);

  const grammar = getGrammarTexts(settings);

  const cartItems = useMemo(() => {
    if (!pkg) return [];
    const map = new Map(pkg.products.map((p) => [String(p.id), p]));
    return cartIds
      .map((id) => map.get(String(id)))
      .filter((p): p is PublicPackageProduct => Boolean(p));
  }, [pkg, cartIds]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.salePrice || 0), 0);
  }, [cartItems]);

  const toggleCartItem = (productId: string | number) => {
    const idStr = String(productId);
    setCartIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  const removeFromCart = (productId: string | number) => {
    const idStr = String(productId);
    setCartIds((prev) => prev.filter((id) => id !== idStr));
  };

  const openLightbox = (photos: string[], index: number, barcode: string) => {
    if (!photos || photos.length === 0) return;
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxCode(barcode);
  };

  const closeLightbox = () => {
    setLightboxPhotos([]);
    setLightboxIndex(0);
    setLightboxCode("");
  };

  // Buscar cliente por código para autocompletar
  const handleLookupCustomer = async () => {
    const code = customerCodeInput.trim();
    if (!code) {
      setCustomerLookupMsg({
        type: "error",
        text: "Ingresa tu código de cliente (ej. CLI-00001).",
      });
      return;
    }

    setSearchingCustomer(true);
    setCustomerLookupMsg(null);
    setFormError("");

    try {
      const res = await fetch(`/api/public/customer?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        setMatchedCustomerCode(null);
        setCustomerLookupMsg({
          type: "error",
          text: "No encontramos ese código de cliente. Puedes escribir tus datos manualmente abajo.",
        });
        return;
      }

      const data = await res.json();
      setCustomerName(data.fullName || "");
      setCustomerPhone(data.phonePrimary || "");
      setCustomerAddress(data.fullAddress || "");
      setMatchedCustomerCode(data.barcode || code.toUpperCase());
      setCustomerCodeInput(data.barcode || code.toUpperCase());
      setCustomerLookupMsg({
        type: "success",
        text: `¡Hola ${data.fullName}! Tus datos se llenaron automáticamente.`,
      });
    } catch {
      setCustomerLookupMsg({
        type: "error",
        text: "No se pudo consultar el código. Ingresa tus datos manualmente.",
      });
    } finally {
      setSearchingCustomer(false);
    }
  };

  const buildWhatsappMessage = () => {
    const storeName = settings.storeName || "ALEGRA";
    const pkgLabel = pkg?.name ? `${pkg.code} (${pkg.name})` : pkg?.code || "";

    let text = `¡Hola *${storeName}*! 🛍️\n`;
    text += `Quiero solicitar el siguiente pedido del paquete *${pkgLabel}*:\n\n`;
    text += `👤 *Datos Generales:*\n`;
    if (matchedCustomerCode) {
      text += `• Código Cliente: *${matchedCustomerCode}*\n`;
    }
    text += `• Nombre: ${customerName.trim()}\n`;
    text += `• Teléfono: ${customerPhone.trim()}\n`;
    text += `• Dirección: ${customerAddress.trim()}\n\n`;
    text += `📦 *${grammar.capPlural} seleccionados (${cartItems.length}):*\n`;
    cartItems.forEach((item, idx) => {
      text += `${idx + 1}. Código: *${item.barcode}* — Q${Number(item.salePrice).toFixed(2)}\n`;
    });
    text += `\n💰 *TOTAL: Q${cartTotal.toFixed(2)}*\n\n`;
    text += `¡Quedo pendiente de confirmación! 💕`;
    return text;
  };

  const validateCheckout = () => {
    if (cartItems.length === 0) {
      setFormError(`Agrega al menos 1 ${grammar.singular} a tu carrito.`);
      return false;
    }
    if (!customerName.trim()) {
      setFormError("Por favor ingresa tu nombre completo.");
      return false;
    }
    if (!customerPhone.trim()) {
      setFormError("Por favor ingresa tu número de teléfono.");
      return false;
    }
    if (!customerAddress.trim()) {
      setFormError("Por favor ingresa tu dirección de entrega.");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCheckout()) return;

    const message = buildWhatsappMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyOrderText = () => {
    if (!validateCheckout()) return;
    const message = buildWhatsappMessage();
    navigator.clipboard.writeText(message);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary-container text-secondary-fixed flex items-center justify-center animate-pulse mb-4">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-primary">
          Cargando {grammar.plural} disponibles...
        </p>
        <p className="text-xs text-on-surface-variant mt-1">Un momento por favor</p>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-bold text-on-surface mb-2">Enlace No Disponible</h1>
        <p className="text-xs text-on-surface-variant">
          {error || "El paquete solicitado no existe."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10 pb-28 space-y-6">
      {/* Cabecera de Marca y Paquete */}
      <header className="text-center space-y-2">
        {settings.logoUrl ? (
          <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden flex items-center justify-center bg-white p-1 mb-1 border border-surface-container-high shadow-sm">
            <img
              src={settings.logoUrl}
              alt={settings.storeName || "Logo"}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container text-secondary-fixed shadow-md shadow-primary/10 mb-1">
            <ShoppingBag className="w-7 h-7" />
          </div>
        )}

        <h1 className="font-display font-black text-2xl tracking-widest text-primary">
          {settings.storeName || "ALEGRA"}
        </h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {settings.tagline || "Boutique & Live Shopping"}
        </p>

        <div className="pt-2 space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold text-on-surface">
            {pkg.name ? pkg.name : `Catálogo ${pkg.code}`}
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-surface-container-high text-primary">
              {pkg.code}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {pkg.products.length} {grammar.plural} disponibles
            </span>
          </div>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto pt-1">
            Agrega a tu carrito los {grammar.plural} que deseas y envíanos tu pedido por WhatsApp.
          </p>
        </div>
      </header>

      {/* Grid de Productos Disponibles (Únicamente Fotos, Precio y Código) */}
      {pkg.products.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-surface-container-high p-6 shadow-xs max-w-md mx-auto">
          <ShoppingBag className="w-10 h-10 text-outline-variant mx-auto mb-3" />
          <p className="text-sm font-bold text-primary">
            No hay {grammar.plural} disponibles en este paquete
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Todos los artículos de este lote ya fueron reservados o vendidos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {pkg.products.map((item) => {
            const hasPhotos = item.photos && item.photos.length > 0;
            const mainPhoto = hasPhotos ? item.photos[0] : null;
            const isInCart = cartIds.includes(String(item.id));

            return (
              <div
                key={item.id}
                className={`bg-surface-container-lowest rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col transition-all shadow-xs ${
                  isInCart
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-surface-container-high hover:shadow-md"
                }`}
              >
                {/* Foto principal con zoom */}
                <div
                  className="relative aspect-square w-full bg-surface-container-low cursor-pointer group overflow-hidden"
                  onClick={() => hasPhotos && openLightbox(item.photos, 0, item.barcode)}
                >
                  {mainPhoto ? (
                    <>
                      <img
                        src={mainPhoto}
                        alt={item.barcode}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Ver foto
                        </span>
                      </div>
                      {item.photos.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                          +{item.photos.length - 1} fotos
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/50 p-4">
                      <ImageIcon className="w-9 h-9 mb-1.5 stroke-1" />
                      <span className="text-[11px]">Sin foto</span>
                    </div>
                  )}

                  {isInCart && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Check className="w-3 h-3" />
                      En carrito
                    </div>
                  )}
                </div>

                {/* Miniaturas si tiene más de 1 foto */}
                {item.photos.length > 1 && (
                  <div className="flex gap-1.5 p-1.5 bg-surface-container-low border-b border-surface-container-high overflow-x-auto">
                    {item.photos.map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => openLightbox(item.photos, pIdx, item.barcode)}
                        className="w-9 h-9 rounded-lg overflow-hidden border border-surface-container-high shrink-0 hover:opacity-80 transition-opacity"
                      >
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Solo Código, Precio y Botón de Carrito */}
                <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-lg border border-surface-container-high truncate">
                      {item.barcode}
                    </span>
                    <span className="text-base sm:text-lg font-black text-primary shrink-0">
                      Q{Number(item.salePrice).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCartItem(item.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                      isInCart
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        : "bg-primary hover:bg-primary/90 text-on-primary shadow-xs"
                    }`}
                  >
                    {isInCart ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Agregado</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar al carrito</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra Flotante Inferior del Carrito Temporal */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container-high shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                  {cartItems.length}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Tu carrito ({cartItems.length})
                </p>
                <p className="text-base sm:text-lg font-black text-primary leading-tight">
                  Q{cartTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormError("");
                setIsCartOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Pedido por WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal / Drawer del Carrito y Datos Generales */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-surface-container-high overflow-hidden">
            {/* Encabezado Modal */}
            <div className="bg-primary text-on-primary px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-secondary-fixed" />
                <div>
                  <h3 className="font-bold text-base leading-tight">Tu Pedido Temporal</h3>
                  <p className="text-xs text-secondary-fixed">
                    {cartItems.length} {cartItems.length === 1 ? grammar.singular : grammar.plural} • Total Q
                    {cartTotal.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-on-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Lista de items en el carrito */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Artículos Seleccionados
                  </span>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCartIds([])}
                      className="text-[11px] font-semibold text-error hover:underline cursor-pointer"
                    >
                      Vaciar carrito
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-6 bg-surface-container-low rounded-2xl">
                    Tu carrito está vacío.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cartItems.map((item) => {
                      const thumb = item.photos?.[0] || null;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-surface-container-low border border-surface-container-high"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={item.barcode}
                                className="w-11 h-11 rounded-xl object-cover border border-surface-container-high shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                                <ImageIcon className="w-5 h-5 text-outline-variant" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-mono text-xs font-bold text-primary block truncate">
                                {item.barcode}
                              </span>
                              <span className="text-sm font-black text-emerald-700">
                                Q{Number(item.salePrice).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                            title="Quitar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
                  <span className="text-xs font-bold uppercase text-on-surface-variant">
                    Total del Pedido:
                  </span>
                  <span className="text-lg font-black text-primary">
                    Q{cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Bloque #4: Código de Cliente (Autocompletado) */}
              <div className="p-3.5 rounded-2xl bg-secondary-fixed/25 border border-secondary/25 space-y-2">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-secondary" />
                  <span>¿Ya tienes código de cliente? (Opcional)</span>
                </label>
                <p className="text-[11px] text-on-surface-variant">
                  Ingrésalo para llenar automáticamente tu nombre, teléfono y dirección.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customerCodeInput}
                    onChange={(e) => setCustomerCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLookupCustomer();
                      }
                    }}
                    placeholder="Ej. CLI-00001"
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-surface-container-lowest border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCustomer}
                    disabled={searchingCustomer}
                    className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {searchingCustomer ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>

                {customerLookupMsg && (
                  <p
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ${
                      customerLookupMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {customerLookupMsg.text}
                  </p>
                )}
              </div>

              {/* Formulario #2: Datos Generales */}
              <form id="whatsapp-order-form" onSubmit={handleSendWhatsApp} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Tus Datos Generales para el Envío
                </h4>

                {formError && (
                  <div className="p-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej. María Pérez"
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej. 5555-1234"
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Dirección de entrega *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Ej. 4ta calle 12-34 Zona 1, Guatemala (referencia)"
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Footer Acciones del Modal */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col gap-2 shrink-0">
              <button
                type="submit"
                form="whatsapp-order-form"
                disabled={cartItems.length === 0}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Pedido por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyOrderText}
                disabled={cartItems.length === 0}
                className="w-full py-2 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high text-primary font-semibold text-xs border border-surface-container-high flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Texto del pedido copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar texto del pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox / Zoom de Fotos */}
      {lightboxPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-2xl w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-1">
              <span className="font-mono text-xs font-bold bg-white/15 px-3 py-1 rounded-full">
                Código: {lightboxCode}
              </span>
              <button
                type="button"
                onClick={closeLightbox}
                className="text-white text-xs font-bold px-3 py-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="relative w-full flex items-center justify-center">
              {lightboxPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === 0 ? lightboxPhotos.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-2 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <img
                src={lightboxPhotos[lightboxIndex]}
                alt={lightboxCode}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />

              {lightboxPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === lightboxPhotos.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {lightboxPhotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
                {lightboxPhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      idx === lightboxIndex ? "border-white scale-105" : "border-transparent opacity-60"
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
