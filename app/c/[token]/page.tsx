"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingBag,
  ShoppingCart,
  MessageCircle,
  ExternalLink,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  X,
  Search,
  UserCheck,
  Loader2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StoreSettings, DEFAULT_STORE_SETTINGS, getGrammarTexts } from "@/lib/settings";

interface CatalogProduct {
  id: string;
  name: string;
  barcode: string;
  salePrice: number;
  status: string;
  photos: string[];
}

interface PublicCatalog {
  id: string;
  title: string;
  shareToken: string;
  notes?: string;
  products: CatalogProduct[];
  createdAt: string;
}

export default function PublicCatalogPage({ params }: { params: { token: string } }) {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrito / Lista de interés temporal
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Búsqueda opcional por código de cliente para autocompletar
  const [customerCodeInput, setCustomerCodeInput] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerLookupMsg, setCustomerLookupMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [matchedCustomerCode, setMatchedCustomerCode] = useState<string | null>(null);

  // Datos generales opcionales del cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [copiedText, setCopiedText] = useState(false);

  // Lightbox multi-foto
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState("");

  const storageKey = `alegra_catalog_cart_${params.token}`;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catalogRes, settingsRes] = await Promise.all([
          fetch(`/api/public/catalog/${params.token}`),
          fetch("/api/public/settings").catch(() => null),
        ]);

        if (settingsRes && settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }

        if (!catalogRes.ok) {
          if (catalogRes.status === 404) {
            setError("No encontramos este catálogo. Es posible que el enlace no sea válido.");
          } else {
            setError("Ocurrió un error al cargar el catálogo.");
          }
          return;
        }

        const data: PublicCatalog = await catalogRes.json();
        setCatalog(data);

        // Restaurar lista de interés temporal filtrando solo productos aún disponibles
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsedIds: string[] = JSON.parse(saved);
            if (Array.isArray(parsedIds)) {
              const availableSet = new Set(
                (data.products || [])
                  .filter((p) => p.status === "disponible")
                  .map((p) => String(p.id))
              );
              const validIds = parsedIds
                .map((id) => String(id))
                .filter((id) => availableSet.has(id));
              setCartIds(Array.from(new Set(validIds)));
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
  }, [params.token, storageKey]);

  // Sincronizar lista de interés en localStorage
  useEffect(() => {
    if (!catalog) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cartIds));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, [cartIds, catalog, storageKey]);

  const grammar = getGrammarTexts(settings);

  const availableCount = useMemo(() => {
    if (!catalog) return 0;
    return catalog.products.filter((p) => p.status === "disponible").length;
  }, [catalog]);

  const cartItems = useMemo(() => {
    if (!catalog) return [];
    const availableMap = new Map(
      catalog.products
        .filter((p) => p.status === "disponible")
        .map((p) => [String(p.id), p])
    );
    return cartIds
      .map((id) => availableMap.get(String(id)))
      .filter((p): p is CatalogProduct => Boolean(p));
  }, [catalog, cartIds]);

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

  const openLightbox = (photos: string[], index: number, title: string) => {
    if (!photos || photos.length === 0) return;
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxTitle(title);
  };

  const closeLightbox = () => {
    setLightboxPhotos([]);
    setLightboxIndex(0);
    setLightboxTitle("");
  };

  // Consultar código de cliente existente para autocompletar datos opcionales
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

    try {
      const res = await fetch(`/api/public/customer?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        setMatchedCustomerCode(null);
        setCustomerLookupMsg({
          type: "error",
          text: "No encontramos ese código de cliente. Puedes escribir tus datos manualmente o enviar la lista directo.",
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
        text: "No se pudo consultar el código. Puedes ingresar tus datos manualmente.",
      });
    } finally {
      setSearchingCustomer(false);
    }
  };

  const buildWhatsappMessage = () => {
    const storeName = settings.storeName || "ALEGRA";
    const catalogLabel = catalog?.title || "Catálogo";

    let text = `¡Hola *${storeName}*! 💕\n`;
    text += `Me interesan ${grammar.articlePlural} siguientes ${grammar.plural} del catálogo *${catalogLabel}*:\n\n`;
    text += `🛍️ *Lista de Interés (${cartItems.length}):*\n`;
    cartItems.forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}* (Código: *${item.barcode}*) — Q${Number(item.salePrice || 0).toFixed(2)}\n`;
    });
    text += `\n💰 *Total estimado (${cartItems.length}): Q${cartTotal.toFixed(2)}*\n`;

    const hasContactInfo =
      Boolean(matchedCustomerCode) ||
      Boolean(customerName.trim()) ||
      Boolean(customerPhone.trim()) ||
      Boolean(customerAddress.trim());

    if (hasContactInfo) {
      text += `\n👤 *Mis Datos:*\n`;
      if (matchedCustomerCode) {
        text += `• Código Cliente: *${matchedCustomerCode}*\n`;
      }
      if (customerName.trim()) {
        text += `• Nombre: ${customerName.trim()}\n`;
      }
      if (customerPhone.trim()) {
        text += `• Teléfono: ${customerPhone.trim()}\n`;
      }
      if (customerAddress.trim()) {
        text += `• Dirección: ${customerAddress.trim()}\n`;
      }
    }

    text += `\n¡Quedo pendiente de disponibilidad y detalles! ✨`;
    return text;
  };

  const handleSendWhatsApp = () => {
    if (cartItems.length === 0) return;
    const message = buildWhatsappMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyListText = () => {
    if (cartItems.length === 0) return;
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
        <p className="text-sm font-semibold text-primary">Cargando catálogo de {grammar.plural}...</p>
        <p className="text-xs text-on-surface-variant mt-1">Un momento por favor</p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-bold text-on-surface mb-2">Catálogo No Encontrado</h1>
        <p className="text-xs text-on-surface-variant mb-6">{error || "El catálogo solicitado no existe."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 pb-28 space-y-6">
      {/* Cabecera de Marca */}
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

        <div className="pt-2">
          <h2 className="text-lg sm:text-xl font-bold text-on-surface">
            {catalog.title}
          </h2>
          {catalog.notes && (
            <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
              {catalog.notes}
            </p>
          )}
          <span className="inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full bg-surface-container text-on-surface-variant">
            {availableCount} {grammar.plural} disponibles
          </span>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto pt-1.5">
            Toca &quot;¡Me interesa!&quot; en {grammar.articlePlural} {grammar.plural} que te gusten para armar tu lista y enviarla junta por WhatsApp.
          </p>
        </div>
      </header>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {catalog.products.map((item, idx) => {
          const hasPhotos = item.photos && item.photos.length > 0;
          const mainPhoto = hasPhotos ? item.photos[0] : null;
          const isAvailable = item.status === "disponible";
          const isInCart = isAvailable && cartIds.includes(String(item.id));

          return (
            <div
              key={item.id || idx}
              className={`bg-surface-container-lowest rounded-3xl border overflow-hidden flex flex-col transition-all shadow-xs ${
                isInCart
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                  : "border-surface-container-high hover:shadow-md"
              }`}
            >
              {/* Imagen con zoom */}
              <div
                className="relative aspect-square w-full bg-surface-container-low cursor-pointer group overflow-hidden"
                onClick={() => hasPhotos && openLightbox(item.photos, 0, item.name)}
              >
                {mainPhoto ? (
                  <>
                    <img
                      src={mainPhoto}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver grande
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/50 p-4">
                    <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                    <span className="text-xs">Foto no disponible</span>
                  </div>
                )}

                {/* Badge de disponibilidad */}
                <div className="absolute top-2.5 left-2.5">
                  {isAvailable ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold backdrop-blur-xs shadow-xs">
                      Disponible
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-secondary/90 text-white text-[10px] font-bold backdrop-blur-xs shadow-xs">
                      {grammar.gender === "f" ? "Apartada" : "Apartado"}
                    </span>
                  )}
                </div>

                {/* Badge cuando ya está en lista de interés */}
                {isInCart && (
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Check className="w-3 h-3" />
                    <span>En tu lista</span>
                  </div>
                )}
              </div>

              {/* Miniaturas si hay múltiples fotos */}
              {item.photos && item.photos.length > 1 && (
                <div className="flex gap-1.5 p-2 bg-surface-container-low border-b border-surface-container-high overflow-x-auto scrollbar-thin">
                  {item.photos.map((photo, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => openLightbox(item.photos, pIdx, item.name)}
                      className="relative w-10 h-10 rounded-lg overflow-hidden border border-surface-container-high shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Información y botón de lista de interés */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <h3 className="font-bold text-sm text-on-surface line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                    Código: {item.barcode}
                  </p>
                </div>

                <div className="pt-2 border-t border-surface-container-high flex items-center justify-between gap-2">
                  <span className="text-base font-black text-primary">
                    Q{Number(item.salePrice || 0).toFixed(2)}
                  </span>

                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => toggleCartItem(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                        isInCart
                          ? "bg-emerald-700 hover:bg-emerald-800 text-white ring-2 ring-emerald-500/30"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      {isInCart ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>En mi lista</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>¡Me interesa!</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-on-surface-variant font-medium">
                      Ya reservada
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra Flotante Inferior de Lista de Interés */}
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
                  Lista de interés ({cartItems.length})
                </p>
                <p className="text-base sm:text-lg font-black text-primary leading-tight">
                  Q{cartTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar listado por WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Lista de Interés */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-surface-container-high overflow-hidden">
            {/* Encabezado Modal */}
            <div className="bg-primary text-on-primary px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-secondary-fixed" />
                <div>
                  <h3 className="font-bold text-base leading-tight">Tu Lista de Interés</h3>
                  <p className="text-xs text-secondary-fixed">
                    {cartItems.length}{" "}
                    {cartItems.length === 1 ? grammar.singular : grammar.plural} • Total estimado Q
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
              {/* Listado de artículos de interés */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    {grammar.capPlural} de Interés
                  </span>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCartIds([])}
                      className="text-[11px] font-semibold text-error hover:underline cursor-pointer"
                    >
                      Vaciar lista
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-6 bg-surface-container-low rounded-2xl">
                    Tu lista de interés está vacía.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
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
                                alt={item.name}
                                className="w-11 h-11 rounded-xl object-cover border border-surface-container-high shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                                <ImageIcon className="w-5 h-5 text-outline-variant" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-on-surface block truncate">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] text-on-surface-variant">
                                  Código: {item.barcode}
                                </span>
                                <span className="text-xs font-black text-emerald-700">
                                  Q{Number(item.salePrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer shrink-0"
                            title="Quitar de la lista"
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
                    Total Estimado:
                  </span>
                  <span className="text-lg font-black text-primary">
                    Q{cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Autocompletado opcional por código de cliente */}
              <div className="p-3.5 rounded-2xl bg-secondary-fixed/25 border border-secondary/25 space-y-2">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-secondary" />
                  <span>¿Ya tienes código de cliente? (Opcional)</span>
                </label>
                <p className="text-[11px] text-on-surface-variant">
                  Ingrésalo si quieres incluir tus datos automáticamente junto con tu lista.
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

              {/* Datos de contacto opcionales */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Tus Datos (Opcional)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej. María Pérez"
                    className="w-full px-3.5 py-2 text-sm bg-surface-container-low border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ej. 5555-1234"
                    className="w-full px-3.5 py-2 text-sm bg-surface-container-low border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Dirección de entrega
                  </label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Ej. 4ta calle 12-34 Zona 1, Guatemala"
                    className="w-full px-3.5 py-2 text-sm bg-surface-container-low border border-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-hidden resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer Acciones del Modal */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={cartItems.length === 0}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar listado por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyListText}
                disabled={cartItems.length === 0}
                className="w-full py-2 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high text-primary font-semibold text-xs border border-surface-container-high flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Listado copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar listado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox Multi-foto */}
      {lightboxPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-2xl w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-1 gap-2">
              <span className="text-xs font-bold bg-white/15 px-3 py-1 rounded-full truncate">
                {lightboxTitle}
              </span>
              <button
                type="button"
                onClick={closeLightbox}
                className="text-white text-xs font-bold px-3 py-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer shrink-0"
              >
                Cerrar (✕)
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
                alt={lightboxTitle || "Prenda ampliada"}
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
