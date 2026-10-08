"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  MessageCircle, 
  ExternalLink, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Tag
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
        const data = await catalogRes.json();
        setCatalog(data);
      } catch {
        setError("Error de conexión. Por favor recarga la página.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.token]);

  const grammar = getGrammarTexts(settings);

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
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 pb-20 space-y-6">
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
            {catalog.products.length} {grammar.plural} disponibles
          </span>
        </div>
      </header>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {catalog.products.map((item, idx) => {
          const hasPhotos = item.photos && item.photos.length > 0;
          const mainPhoto = hasPhotos ? item.photos[0] : null;
          const isAvailable = item.status === "disponible";

          const whatsappMessage = encodeURIComponent(
            `¡Hola ${settings.storeName || "Alegra"}! 💕 Me interesa ${grammar.thisSingular} ${grammar.singular} *${item.name}* (Código: *${item.barcode}*) que vi en el catálogo.`
          );

          return (
            <div
              key={item.id || idx}
              className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all"
            >
              {/* Imagen con zoom */}
              <div 
                className="relative aspect-square w-full bg-surface-container-low cursor-pointer group overflow-hidden"
                onClick={() => mainPhoto && setSelectedPhoto(mainPhoto)}
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
              </div>

              {/* Miniaturas si hay múltiples fotos */}
              {item.photos && item.photos.length > 1 && (
                <div className="flex gap-1.5 p-2 bg-surface-container-low border-b border-surface-container-high overflow-x-auto scrollbar-thin">
                  {item.photos.map((photo, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      className="relative w-10 h-10 rounded-lg overflow-hidden border border-surface-container-high shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Información y botón de WhatsApp */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <h3 className="font-bold text-sm text-on-surface line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                    Código: {item.barcode}
                  </p>
                </div>

                <div className="pt-2 border-t border-surface-container-high flex items-center justify-between">
                  <span className="text-base font-black text-primary">
                    Q{item.salePrice.toFixed(2)}
                  </span>

                  {isAvailable ? (
                    <a
                      href={`https://wa.me/?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>¡Me interesa!</span>
                    </a>
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

      {/* Modal Zoom Foto */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={selectedPhoto}
              alt="Prenda ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white text-xs font-bold px-3 py-1 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-xs transition-colors"
            >
              Cerrar (✕)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
