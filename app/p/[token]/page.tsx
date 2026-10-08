"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Image as ImageIcon,
  Tag,
  AlertCircle
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  barcode: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  photos: string[];
}

interface PublicOrder {
  id: string;
  orderNumber: string;
  shareToken: string;
  status: "pendiente_pago" | "pagado" | "enviado" | "entregado" | "cancelado";
  customer: {
    fullName: string;
    phonePrimary: string;
    department: string;
    municipality: string;
    fullAddress: string;
  };
  items: OrderItem[];
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  createdAt: string;
}

export default function PublicOrderPage({ params }: { params: { token: string } }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/order/${params.token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("No encontramos este pedido. Es posible que el enlace haya expirado o no sea válido.");
          } else {
            setError("Ocurrió un error al cargar el pedido.");
          }
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setError("Error de conexión. Por favor recarga la página.");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [params.token]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(id);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente_pago":
        return {
          title: "Apartado • Pendiente de Pago",
          subtitle: "Tus prendas están reservadas temporalmente. Envíanos tu comprobante para programar tu envío.",
          badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
          icon: Clock,
          color: "text-amber-700",
        };
      case "pagado":
        return {
          title: "¡Pago Confirmado! • En Preparación",
          subtitle: "Tu pago ha sido registrado. Estamos preparando y empacando tu pedido con mucho cariño.",
          badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
          icon: CheckCircle2,
          color: "text-emerald-700",
        };
      case "enviado":
        return {
          title: "Enviado • En Camino",
          subtitle: "Tu pedido ya se encuentra en ruta hacia tu dirección de entrega.",
          badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
          icon: Truck,
          color: "text-blue-700",
        };
      case "entregado":
        return {
          title: "Entregado con Éxito",
          subtitle: "Esperamos que disfrutes mucho tus prendas. ¡Gracias por tu preferencia!",
          badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
          icon: CheckCircle2,
          color: "text-purple-700",
        };
      default:
        return {
          title: "Cancelado",
          subtitle: "Este pedido fue cancelado.",
          badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
          icon: AlertCircle,
          color: "text-gray-600",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary-container text-secondary-fixed flex items-center justify-center animate-pulse mb-4">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-primary">Cargando las fotos de tu pedido...</p>
        <p className="text-xs text-on-surface-variant mt-1">Un momento por favor</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-error-container text-error flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-bold text-on-surface mb-2">Pedido No Encontrado</h1>
        <p className="text-xs text-on-surface-variant mb-6">{error || "El pedido solicitado no existe."}</p>
        <p className="text-[11px] text-on-surface-variant/70">
          Si crees que esto es un error, por favor comunícate con nosotros por WhatsApp.
        </p>
      </div>
    );
  }

  const statusInfo = getStatusBadge(order.status);
  const StatusIcon = statusInfo.icon;

  const whatsappMessage = encodeURIComponent(
    `¡Hola Alegra! 💕 Te comparto el comprobante de pago de mi pedido *${order.orderNumber}* a nombre de *${order.customer.fullName}* por un total de *Q${order.totalAmount.toFixed(2)}*.`
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 pb-24 space-y-6">
      {/* Cabecera de Marca Alegra */}
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container text-secondary-fixed shadow-md shadow-primary/10 mb-1">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h1 className="font-display font-black text-2xl tracking-widest text-primary">
          ALEGRA
        </h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Boutique & Live Shopping
        </p>
      </header>

      {/* Banner de Estado del Pedido */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${statusInfo.badgeClass} flex items-start gap-3.5 shadow-xs`}>
        <div className="p-2 rounded-xl bg-white/80 shadow-xs shrink-0">
          <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm tracking-tight">{statusInfo.title}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/70 font-semibold">
              {order.orderNumber}
            </span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">{statusInfo.subtitle}</p>
        </div>
      </div>

      {/* Galería de Fotos de Prendas */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-primary">Fotos de tus Prendas</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
            {order.items.length} {order.items.length === 1 ? "prenda" : "prendas"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.items.map((item, idx) => {
            const hasPhotos = item.photos && item.photos.length > 0;
            const mainPhoto = hasPhotos ? item.photos[0] : null;

            return (
              <div 
                key={item.id || idx}
                className="bg-surface-container-low rounded-2xl border border-surface-container-high overflow-hidden flex flex-col transition-all hover:shadow-md"
              >
                {/* Imagen Principal */}
                <div 
                  className="relative aspect-square w-full bg-surface-container cursor-pointer group overflow-hidden"
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
                          Ampliar foto
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/50 p-4">
                      <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                      <span className="text-xs">Foto no disponible</span>
                    </div>
                  )}

                  {/* Número de prenda */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                    #{idx + 1}
                  </span>
                </div>

                {/* Miniaturas adicionales si hay más fotos */}
                {item.photos && item.photos.length > 1 && (
                  <div className="flex gap-1.5 p-2 bg-surface-container-lowest border-t border-surface-container-high overflow-x-auto scrollbar-thin">
                    {item.photos.map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-surface-container-high shrink-0 hover:opacity-80 transition-opacity"
                      >
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Detalles de la prenda */}
                <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-on-surface line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                      Código: {item.barcode}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-surface-container-high/60">
                    {item.discountAmount > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-on-surface-variant line-through">
                          Q{item.originalPrice.toFixed(2)}
                        </span>
                        <span className="text-xs font-black text-emerald-700">
                          Q{item.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-primary">
                        Q{item.finalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Resumen del Pedido & Totales */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-primary border-b border-surface-container-high pb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-secondary" />
          Resumen Financiero
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-on-surface-variant">
            <span>Subtotal ({order.items.length} prendas):</span>
            <span className="font-semibold">Q{order.subtotal.toFixed(2)}</span>
          </div>

          {order.totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Descuentos aplicados:</span>
              <span>-Q{order.totalDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-surface-container-high text-sm font-bold text-primary">
            <span>TOTAL:</span>
            <span className="text-lg font-black text-primary">
              Q{order.totalAmount.toFixed(2)}
            </span>
          </div>

          {order.totalPaid > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold pt-1">
              <span>Monto Abonado / Pagado:</span>
              <span>Q{order.totalPaid.toFixed(2)}</span>
            </div>
          )}

          {order.balanceDue > 0 && (
            <div className="flex justify-between text-secondary font-bold text-sm pt-1 border-t border-surface-container-high/50">
              <span>Saldo Pendiente:</span>
              <span className="text-secondary font-black">
                Q{order.balanceDue.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Datos de Entrega */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-4 sm:p-6 shadow-sm space-y-3">
        <h2 className="font-bold text-sm text-primary flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary" />
          Datos de Entrega
        </h2>

        <div className="p-3.5 rounded-2xl bg-surface-container-low text-xs space-y-1.5">
          <p className="font-semibold text-on-surface">
            {order.customer.fullName}
          </p>
          <p className="text-on-surface-variant">
            {order.customer.fullAddress || "Dirección pendiente de confirmación"}
          </p>
          {(order.customer.municipality || order.customer.department) && (
            <p className="text-on-surface-variant font-medium">
              {[order.customer.municipality, order.customer.department].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </section>

      {/* Datos Bancarios para Depositar */}
      {order.balanceDue > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-surface-container-high pb-3">
            <ShoppingBag className="w-4 h-4 text-secondary" />
            <div>
              <h2 className="font-bold text-sm text-primary">Cuentas Bancarias para Pago</h2>
              <p className="text-[11px] text-on-surface-variant">
                Toca cualquier número de cuenta para copiarlo
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Banco Industrial */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Banco Industrial (BI) • Monetaria
                </span>
                <p className="font-mono text-sm font-black text-on-surface">
                  000-000000-0
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  Nombre: Alegra Boutique
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText("0000000000", "bi")}
                className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
              >
                {copiedBank === "bi" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Banrural */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/70 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Banrural • Ahorro / Monetaria
                </span>
                <p className="font-mono text-sm font-black text-on-surface">
                  000-000000-0
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  Nombre: Alegra Boutique
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText("0000000000", "banrural")}
                className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
              >
                {copiedBank === "banrural" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Botón Flotante / Fijo para Enviar Comprobante por WhatsApp */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container-high z-30 flex items-center justify-center">
        <a
          href={`https://wa.me/?text=${whatsappMessage}`}
          target="_blank"
          rel="noreferrer"
          className="w-full max-w-md py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-98"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Confirmar Pago por WhatsApp</span>
        </a>
      </div>

      {/* Modal para Ver Foto en Pantalla Completa */}
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
