"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Radio, 
  Plus, 
  X, 
  Barcode, 
  Trash2, 
  Printer, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  ShoppingBag,
  Percent,
  Search,
  MessageCircle,
  Copy,
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { playScanSuccessSound, playScanErrorSound } from "@/lib/sound";

interface Customer {
  id: number;
  barcode: string;
  fullName: string;
  tiktokUsername: string | null;
  instagramUsername: string | null;
  facebookUsername: string | null;
  phonePrimary: string;
  phoneSecondary: string | null;
  fullAddress: string;
  addressReference: string | null;
  department: { name: string };
  municipality: { name: string };
}

interface CartItem {
  productId: number;
  barcode: string;
  name: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  photoUrl?: string | null;
}

interface TabAccount {
  id: string; // uuid o timestamp
  customer: Customer;
  items: CartItem[];
  notes: string;
}

export default function PosLivePage() {
  // Pestañas de Comandas Abiertas Simultáneamente
  const [tabs, setTabs] = useState<TabAccount[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Modal para seleccionar/escanear cliente
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Escáner de Códigos de Barras
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Estado para finalizar venta y modal de recibo
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // 1. Cargar comandas guardadas en localStorage al montar
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem("alegra_pos_open_tabs");
      const savedActiveId = localStorage.getItem("alegra_pos_active_tab_id");
      if (savedTabs) {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed);
          if (savedActiveId && parsed.some((t: any) => t.id === savedActiveId)) {
            setActiveTabId(savedActiveId);
          } else {
            setActiveTabId(parsed[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Error al cargar comandas desde localStorage:", e);
    } finally {
      setIsStorageLoaded(true);
    }
  }, []);

  // 2. Guardar en localStorage ante cualquier cambio en las comandas
  useEffect(() => {
    if (!isStorageLoaded) return;
    try {
      localStorage.setItem("alegra_pos_open_tabs", JSON.stringify(tabs));
      if (activeTabId) {
        localStorage.setItem("alegra_pos_active_tab_id", activeTabId);
      } else {
        localStorage.removeItem("alegra_pos_active_tab_id");
      }
    } catch (e) {
      console.error("Error al persistir comandas en localStorage:", e);
    }
  }, [tabs, activeTabId, isStorageLoaded]);

  // Cargar clientes al abrir modal
  const fetchCustomers = async (q = "") => {
    try {
      setLoadingCustomers(true);
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers("");
  }, []);

  // Mantener el foco en el input del escáner
  useEffect(() => {
    if (!isCustomerModalOpen && !isReceiptModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [activeTabId, isCustomerModalOpen, isReceiptModalOpen]);

  // Obtener comanda activa
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // Abrir nueva cuenta para un cliente
  const handleOpenAccount = (customer: Customer) => {
    // Verificar si el cliente ya tiene una pestaña abierta
    const existingTab = tabs.find((t) => t.customer.id === customer.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      setIsCustomerModalOpen(false);
      return;
    }

    const newTabId = `tab-${Date.now()}`;
    const newTab: TabAccount = {
      id: newTabId,
      customer,
      items: [],
      notes: "",
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    setIsCustomerModalOpen(false);
    setScanMessage({
      text: `Comanda abierta para ${customer.fullName}`,
      type: "success",
    });
  };

  // Cerrar pestaña
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (tabToClose && tabToClose.items.length > 0) {
      const confirm = window.confirm(
        `La comanda de ${tabToClose.customer.fullName} tiene prendas escaneadas. ¿Deseas cerrarla? (Los productos no se apartarán si cierras sin finalizar).`
      );
      if (!confirm) return;
    }

    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
    }
  };

  // Escaneo de código de barras
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scannedBarcode.trim();
    if (!code) return;

    setScannedBarcode("");
    setScanMessage(null);

    // Caso 1: Si es código de cliente (ej. CLI-00001) y no hay comanda o queremos abrir comanda
    if (code.toUpperCase().startsWith("CLI-")) {
      const customer = customersList.find((c) => c.barcode.toUpperCase() === code.toUpperCase());
      if (customer) {
        playScanSuccessSound();
        handleOpenAccount(customer);
        return;
      }
    }

    // Caso 2: Si no hay comanda activa abierta
    if (!activeTab) {
      playScanErrorSound();
      setScanMessage({
        text: "¡Abre o selecciona la cuenta de un cliente antes de escanear productos!",
        type: "error",
      });
      setIsCustomerModalOpen(true);
      return;
    }

    // Caso 3: Escaneo de producto
    try {
      const res = await fetch(`/api/products/search?barcode=${encodeURIComponent(code)}`);
      if (!res.ok) {
        throw new Error("Producto no encontrado con este código de barras");
      }

      const product = await res.json();

      if (product.status !== "disponible") {
        throw new Error(
          `La prenda '${product.name}' no está disponible (Estado actual: ${product.status})`
        );
      }

      // Validar si ya está en la comanda actual
      const alreadyInCart = activeTab.items.some((i) => i.productId === product.id);
      if (alreadyInCart) {
        throw new Error(`La prenda '${product.name}' ya está agregada en esta comanda`);
      }

      // Validar si está en otra comanda abierta en este navegador
      const inOtherTab = tabs.find((t) => t.items.some((i) => i.productId === product.id));
      if (inOtherTab) {
        throw new Error(
          `La prenda está actualmente en la comanda de '${inOtherTab.customer.fullName}'`
        );
      }

      const photoList = product.photos ? JSON.parse(product.photos) : [];
      const primaryPhoto = photoList.length > 0 ? photoList[0] : null;

      const newItem: CartItem = {
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        originalPrice: Number(product.salePrice),
        discountAmount: 0,
        finalPrice: Number(product.salePrice),
        photoUrl: primaryPhoto,
      };

      // Agregar a comanda activa
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id === activeTab.id) {
            return {
              ...t,
              items: [newItem, ...t.items],
            };
          }
          return t;
        })
      );

      playScanSuccessSound();
      setScanMessage({
        text: `Agregado: ${product.name} (${formatCurrency(product.salePrice)})`,
        type: "success",
      });
    } catch (err: any) {
      playScanErrorSound();
      setScanMessage({
        text: err.message,
        type: "error",
      });
    }
  };

  // Modificar descuento de un producto en la comanda activa
  const handleDiscountChange = (productId: number, discountValue: string) => {
    if (!activeTab) return;
    const discount = Math.max(0, parseFloat(discountValue) || 0);

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTab.id) {
          const updatedItems = t.items.map((item) => {
            if (item.productId === productId) {
              const finalPrice = Math.max(0, item.originalPrice - discount);
              return {
                ...item,
                discountAmount: discount,
                finalPrice,
              };
            }
            return item;
          });
          return { ...t, items: updatedItems };
        }
        return t;
      })
    );
  };

  // Quitar producto de la comanda
  const handleRemoveItem = (productId: number) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTab.id) {
          return {
            ...t,
            items: t.items.filter((i) => i.productId !== productId),
          };
        }
        return t;
      })
    );
  };

  // Finalizar Venta: Pasa a Pendiente de Pago
  const handleCheckout = async () => {
    if (!activeTab || activeTab.items.length === 0) return;

    setIsProcessingCheckout(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: activeTab.customer.id,
          notes: activeTab.notes,
          items: activeTab.items.map((i) => ({
            productId: i.productId,
            originalPrice: i.originalPrice,
            discountAmount: i.discountAmount,
            finalPrice: i.finalPrice,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al registrar la comanda");
      }

      const orderData = await res.json();
      setCompletedOrder(orderData);
      setIsReceiptModalOpen(true);

      // Cerrar la comanda de la lista de pestañas activas
      const remainingTabs = tabs.filter((t) => t.id !== activeTab.id);
      setTabs(remainingTabs);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    } catch (err: any) {
      alert(`Error al finalizar comanda: ${err.message}`);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Calcular totales de la comanda activa
  const subtotal = activeTab ? activeTab.items.reduce((acc, i) => acc + i.originalPrice, 0) : 0;
  const totalDiscount = activeTab ? activeTab.items.reduce((acc, i) => acc + i.discountAmount, 0) : 0;
  const totalToPay = Math.max(0, subtotal - totalDiscount);

  // Copiar detalle de recibo formateado para WhatsApp
  const handleCopyWhatsapp = () => {
    if (!completedOrder) return;
    const o = completedOrder;
    let message = `✨ *ALEGRA - RECIBO DE COMPRA* ✨\n`;
    message += `Comanda: *${o.orderNumber}*\n`;
    message += `Cliente: *${o.customer.fullName}*\n`;
    message += `Fecha: ${new Date(o.createdAt).toLocaleString("es-GT")}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*DETALLE DE PRENDAS:*\n`;

    o.items.forEach((item: any, idx: number) => {
      message += `${idx + 1}. ${item.product.name}\n`;
      if (Number(item.discountAmount) > 0) {
        message += `   Precio: Q${Number(item.originalPrice).toFixed(2)} - Desc: Q${Number(item.discountAmount).toFixed(2)} = *Q${Number(item.finalPrice).toFixed(2)}*\n`;
      } else {
        message += `   Precio: *Q${Number(item.finalPrice).toFixed(2)}*\n`;
      }
    });

    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Subtotal: Q${Number(o.subtotal).toFixed(2)}\n`;
    if (Number(o.totalDiscount) > 0) {
      message += `Descuento Total: -Q${Number(o.totalDiscount).toFixed(2)}\n`;
    }
    message += `*TOTAL A PAGAR: Q${Number(o.totalAmount).toFixed(2)}*\n`;
    message += `Estado: *PENDIENTE DE PAGO (Apartado)* ⏳\n\n`;
    message += `💳 *Datos de Pago:*\n`;
    message += `Por favor envíanos la boleta o comprobante con el número de autorización para procesar tu envío.\n\n`;
    message += `📍 *Entrega:* ${o.customer.fullAddress}, ${o.customer.municipality.name}, ${o.customer.department.name}\n`;
    message += `¡Muchas gracias por tu compra en Alegra! 💕`;

    navigator.clipboard.writeText(message);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Barra Superior de Pestañas de Comandas Multi-Cliente */}
      <div className="bg-white rounded-xl border border-alegra-border p-2 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => {
              setIsCustomerModalOpen(true);
              fetchCustomers("");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-alegra-navy text-white text-xs font-semibold rounded-lg hover:bg-alegra-navy-light transition-colors shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4 text-alegra-sand" />
            <span>Nueva Comanda</span>
          </button>

          <div className="h-6 w-px bg-gray-200 mx-1 shrink-0" />

          {tabs.length === 0 ? (
            <span className="text-xs text-gray-400 italic px-2">
              No hay cuentas abiertas. Haz clic en "Nueva Comanda" para comenzar.
            </span>
          ) : (
            tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const tabTotal = tab.items.reduce((acc, i) => acc + i.finalPrice, 0);

              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border shrink-0 ${
                    isActive
                      ? "bg-alegra-navy text-white border-alegra-navy shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold truncate max-w-[120px]">
                      {tab.customer.fullName}
                    </span>
                    <span className={`text-[10px] ${isActive ? "text-alegra-sand" : "text-gray-500"}`}>
                      {tab.items.length} prendas • {formatCurrency(tabTotal)}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className={`p-1 rounded-md transition-colors ${
                      isActive ? "hover:bg-white/20 text-gray-300 hover:text-white" : "hover:bg-gray-200 text-gray-400"
                    }`}
                    title="Cerrar comanda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Caja de Escaneo Continuo en Vivo */}
      <div className="bg-white rounded-xl border border-alegra-border p-4 shadow-xs">
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="w-5 h-5 text-alegra-sand-dark absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder={
                activeTab
                  ? `Escanear código de barras para la comanda de ${activeTab.customer.fullName}...`
                  : "Abre una comanda para comenzar a escanear productos..."
              }
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-base bg-alegra-sand-light/20 border-2 border-alegra-navy/20 rounded-lg focus:outline-hidden focus:border-alegra-navy focus:bg-white transition-colors placeholder:text-gray-400 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-alegra-navy text-white font-semibold text-sm rounded-lg hover:bg-alegra-navy-light transition-colors shadow-xs shrink-0 flex items-center gap-2"
          >
            <span>Escanear</span>
          </button>
        </form>

        {/* Mensaje de Escaneo */}
        {scanMessage && (
          <div
            className={`mt-2 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              scanMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {scanMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{scanMessage.text}</span>
          </div>
        )}
      </div>

      {/* Contenido Principal: Comanda Activa vs Panel Lateral */}
      {!activeTab ? (
        <div className="text-center py-20 bg-white rounded-xl border border-alegra-border p-8">
          <ShoppingBag className="w-14 h-14 text-alegra-sand mx-auto mb-3" />
          <h3 className="text-lg font-bold text-alegra-navy">No hay comanda activa</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Abre una comanda seleccionando un comprador para comenzar a escanear prendas en tu transmisión en vivo.
          </p>
          <button
            onClick={() => {
              setIsCustomerModalOpen(true);
              fetchCustomers("");
            }}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-alegra-navy text-white text-sm font-semibold rounded-lg hover:bg-alegra-navy-light transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-alegra-sand" />
            Abrir Nueva Comanda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado de Productos de la Comanda Activa */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-alegra-navy">
                    Comanda: {activeTab.customer.fullName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {activeTab.customer.tiktokUsername && (
                      <span className="bg-black/5 text-black px-2 py-0.5 rounded font-medium">
                        TikTok: {activeTab.customer.tiktokUsername}
                      </span>
                    )}
                    {activeTab.customer.instagramUsername && (
                      <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded font-medium">
                        IG: {activeTab.customer.instagramUsername}
                      </span>
                    )}
                    <span>• Tel: {activeTab.customer.phonePrimary}</span>
                  </div>
                </div>
                <span className="text-xs bg-alegra-sand-light text-alegra-navy px-2.5 py-1 rounded-full font-semibold border border-alegra-sand/40">
                  {activeTab.items.length} prendas en comanda
                </span>
              </div>

              {/* Items List */}
              {activeTab.items.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Barcode className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">Aún no has escaneado prendas para este cliente</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Usa tu pistola de código de barras o escribe el código en el recuadro superior.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeTab.items.map((item) => (
                    <div
                      key={item.productId}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.photoUrl && (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-alegra-navy truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs text-gray-400 font-mono">
                            {item.barcode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Precio Original */}
                        <div className="text-right">
                          <span className="text-xs text-gray-400 block">Precio Base</span>
                          <span className="text-sm font-semibold text-gray-700">
                            {formatCurrency(item.originalPrice)}
                          </span>
                        </div>

                        {/* Descuento por Monto */}
                        <div className="w-24">
                          <label className="text-[10px] text-gray-400 block mb-0.5 font-medium">
                            Desc. Monto (Q)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={item.discountAmount || ""}
                            onChange={(e) => handleDiscountChange(item.productId, e.target.value)}
                            className="w-full px-2 py-1 text-xs font-semibold text-red-600 bg-red-50/50 border border-red-200 rounded focus:outline-hidden focus:border-red-400 text-center"
                          />
                        </div>

                        {/* Precio Final */}
                        <div className="text-right min-w-[70px]">
                          <span className="text-xs text-gray-400 block">Final</span>
                          <span className="text-base font-bold text-alegra-navy">
                            {formatCurrency(item.finalPrice)}
                          </span>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Quitar producto de comanda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Cobro y Cierre de Comanda */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-alegra-navy pb-2 border-b border-gray-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-alegra-sand-dark" />
                Resumen de Venta
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal prendas:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuentos aplicados:</span>
                    <span className="font-semibold">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                  <span className="text-base font-bold text-alegra-navy">Total a Cobrar:</span>
                  <span className="text-2xl font-black text-alegra-navy">
                    {formatCurrency(totalToPay)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notas de Entrega o Comentarios
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Envío por Guatex, recoger en tienda..."
                  value={activeTab.notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTabs((prev) =>
                      prev.map((t) => (t.id === activeTab.id ? { ...t, notes: val } : t))
                    );
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <button
                onClick={handleCheckout}
                disabled={activeTab.items.length === 0 || isProcessingCheckout}
                className="w-full py-3.5 px-4 bg-alegra-navy hover:bg-alegra-navy-light text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-alegra-sand" />
                {isProcessingCheckout
                  ? "Procesando Apartado..."
                  : "Finalizar Venta (Pasar a Pendiente)"}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Al finalizar, los productos pasarán a estado <b>Apartado</b> y podrás imprimir o enviar el recibo detallado al cliente por WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selección de Comprador */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-alegra-border overflow-hidden">
            <div className="bg-alegra-navy p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Abrir Comanda para Cliente</h3>
                <p className="text-xs text-alegra-sand">
                  Busca por nombre, teléfono o escanea su código de barras
                </p>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-gray-300 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Escribe nombre, @tiktok, teléfono o código CLI-XXXXX..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    fetchCustomers(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {loadingCustomers ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    Buscando clientes...
                  </div>
                ) : customersList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500">
                    No se encontró ningún cliente con ese criterio.
                  </div>
                ) : (
                  customersList.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleOpenAccount(c)}
                      className="py-3 px-2 flex items-center justify-between hover:bg-alegra-sand-light/40 rounded-lg cursor-pointer transition-colors"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-alegra-navy">
                          {c.fullName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {c.tiktokUsername && <span>{c.tiktokUsername}</span>}
                          <span>• Tel: {c.phonePrimary}</span>
                          <span>• {c.municipality.name}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-alegra-sand-dark bg-alegra-sand/20 px-2.5 py-1 rounded-md">
                        Seleccionar
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recibo Detallado para Imprimir / WhatsApp */}
      {isReceiptModalOpen && completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-alegra-border overflow-hidden my-6">
            <div className="bg-alegra-navy p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Comanda Registrada con Éxito</h3>
                <p className="text-xs text-alegra-sand">Estado: Pendiente de Pago (Apartado)</p>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-gray-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Recibo Formateado */}
            <div id="printable-receipt" className="p-6 text-sm text-gray-800 space-y-4">
              <div className="text-center border-b border-gray-200 pb-3">
                <h2 className="text-lg font-black tracking-widest text-alegra-navy">ALEGRA</h2>
                <p className="text-xs text-gray-500">Comprobante de Venta y Apartado</p>
                <p className="text-xs font-mono font-bold text-alegra-navy mt-1">
                  {completedOrder.orderNumber}
                </p>
              </div>

              <div className="text-xs space-y-1">
                <p><b>Cliente:</b> {completedOrder.customer.fullName}</p>
                <p><b>Teléfono:</b> {completedOrder.customer.phonePrimary}</p>
                <p><b>Ubicación:</b> {completedOrder.customer.fullAddress}, {completedOrder.customer.municipality.name}, {completedOrder.customer.department.name}</p>
              </div>

              <div className="border-t border-b border-gray-200 py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-1">Prenda</th>
                      <th className="pb-1 text-center">Desc.</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {completedOrder.items.map((item: any) => (
                      <tr key={item.id} className="py-1">
                        <td className="py-1 font-medium">{item.product.name}</td>
                        <td className="py-1 text-center text-red-500">
                          {Number(item.discountAmount) > 0 ? `-${formatCurrency(item.discountAmount)}` : "-"}
                        </td>
                        <td className="py-1 text-right font-bold">
                          {formatCurrency(item.finalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedOrder.subtotal)}</span>
                </div>
                {Number(completedOrder.totalDiscount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(completedOrder.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-alegra-navy pt-1 border-t border-gray-200">
                  <span>TOTAL A PAGAR:</span>
                  <span>{formatCurrency(completedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Acciones de Impresión y Compartir WhatsApp */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-2">
              <button
                onClick={handleCopyWhatsapp}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {copiedWhatsapp ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Copiado para WhatsApp!</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    <span>Copiar Formato para WhatsApp</span>
                  </>
                )}
              </button>

              <button
                onClick={() => window.print()}
                className="w-full py-2 px-4 bg-alegra-navy hover:bg-alegra-navy-light text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket Térmico</span>
              </button>

              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 text-center"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
