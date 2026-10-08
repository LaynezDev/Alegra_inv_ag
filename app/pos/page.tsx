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
import { StoreSettings, DEFAULT_STORE_SETTINGS, getGrammarTexts } from "@/lib/settings";

interface Customer {
  id: number | string;
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
  productId: number | string;
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  // Cargar configuración de tienda
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {});
  }, []);

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
  const handleDiscountChange = (productId: number | string, discountValue: string) => {
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
  const handleRemoveItem = (productId: number | string) => {
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

  // Generar texto para WhatsApp con enlace a fotos
  const getWhatsappReceiptMessage = (o: any) => {
    const grammar = getGrammarTexts(settings);
    const brand = settings.storeName || "ALEGRA";
    let message = `✨ *${brand} - RECIBO DE COMPRA* ✨\n`;
    message += `Comanda: *${o.orderNumber}*\n`;
    message += `Cliente: *${o.customer.fullName}*\n`;
    message += `Fecha: ${new Date(o.createdAt).toLocaleString("es-GT")}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*DETALLE DE ${grammar.capPlural.toUpperCase()}:*\n`;

    o.items.forEach((item: any, idx: number) => {
      const name = item.product?.name || item.name || grammar.capSingular;
      message += `${idx + 1}. ${name}\n`;
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

    // Enlace público al visor de fotos de productos del cliente
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/p/${o.shareToken || o.id}`;
    message += `🛍️ *Ver fotos de tus ${grammar.plural} aquí:*\n`;
    message += `👉 ${shareUrl}\n\n`;

    message += `💳 *Datos de Pago:*\n`;
    message += `Por favor envíanos la boleta o comprobante con el número de autorización para procesar tu envío.\n\n`;
    const depName = o.customer.department?.name || o.customer.departmentName || "";
    const munName = o.customer.municipality?.name || o.customer.municipalityName || "";
    message += `📍 *Entrega:* ${o.customer.fullAddress}, ${munName}, ${depName}\n`;
    message += `¡Muchas gracias por tu compra en ${brand}! 💕`;

    return message;
  };

  // Copiar detalle de recibo formateado para WhatsApp
  const handleCopyWhatsapp = () => {
    if (!completedOrder) return;
    const msg = getWhatsappReceiptMessage(completedOrder);
    navigator.clipboard.writeText(msg);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 3000);
  };

  // Copiar únicamente el enlace a las fotos del pedido
  const handleCopyLink = () => {
    if (!completedOrder) return;
    const origin = window.location.origin;
    const url = `${origin}/p/${completedOrder.shareToken || completedOrder.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Sub-Barra de Estado Operativo & Multi-Comanda Live */}
      <section className="w-full bg-surface-container-lowest p-3 sm:p-4 rounded-2xl shadow-xs border border-surface-container-high">
        <div className="w-full flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Multi-Comandas: Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-thin">
            {/* Botón Nueva Comanda */}
            <button
              onClick={() => {
                setIsCustomerModalOpen(true);
                fetchCustomers("");
              }}
              className="group flex items-center gap-1.5 bg-primary-container hover:bg-primary text-on-primary px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0"
              id="btn-new-ticket"
            >
              <Plus className="w-4 h-4 text-secondary-fixed" />
              <span>Nueva Comanda</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container/20 text-secondary-fixed font-bold">
                +
              </span>
            </button>

            <div className="h-6 w-px bg-surface-container-high mx-1 shrink-0" />

            {tabs.length === 0 ? (
              <span className="text-xs text-on-surface-variant italic px-2">
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
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all border shrink-0 ${
                      isActive
                        ? "bg-primary-container text-on-primary border-primary-container shadow-md"
                        : "bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-high"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isActive ? "bg-secondary-fixed" : "bg-outline-variant"}`} />
                    <div className="flex flex-col text-left">
                      <span className={`font-semibold truncate max-w-[130px] ${isActive ? "text-surface-container-lowest" : "text-primary"}`}>
                        {tab.customer.fullName}
                      </span>
                      <span className={`text-[10px] ${isActive ? "text-secondary-fixed" : "text-on-surface-variant"}`}>
                        {tab.items.length} prendas • <strong className="font-bold">{formatCurrency(tabTotal)}</strong>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className={`p-1 rounded-lg transition-colors ml-1 ${
                        isActive
                          ? "hover:bg-primary/50 text-surface-container-highest"
                          : "hover:bg-surface-variant text-on-surface-variant"
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

          {/* Live Broadcast Status Badge */}
          <div className="flex items-center gap-3 shrink-0 self-end xl:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
              </span>
              <span>Modo Live Activo</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-xl font-medium">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <span>Transmisión en Vivo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Escaneo Continuo (Hardware Barcode Wedge) */}
      <section className="w-full bg-surface-container-lowest p-3 sm:p-4 rounded-2xl shadow-xs border border-surface-container-high flex flex-col gap-2">
        <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-center gap-2">
          {/* Input Scanner con Auto-Focus visual */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary">
              <Barcode className="w-5 h-5 text-secondary" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              autoFocus
              placeholder={
                activeTab
                  ? `Escanear código de prenda (ALE-XXXXX) o cliente (CLI-XXXXX) para ${activeTab.customer.fullName}...`
                  : "Abre una comanda para comenzar a escanear productos..."
              }
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              className="w-full pl-11 pr-28 py-3 bg-surface-container-low hover:bg-surface-container text-on-surface placeholder:text-on-surface-variant font-mono text-sm rounded-xl outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                Pistola Activa
              </span>
            </div>
          </div>

          {/* Botón de Escaneo Manual */}
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-3 bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-secondary-fixed" />
            <span>Escanear [Enter]</span>
          </button>
        </form>

        {/* Banner de Feedback Instantáneo */}
        {scanMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
              scanMessage.type === "success"
                ? "bg-secondary-fixed text-on-secondary-fixed border border-secondary/20"
                : "bg-error-container text-on-error-container border border-error/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {scanMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
              )}
              <span>{scanMessage.text}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-lowest text-primary font-bold shadow-xs">
              Reciente
            </span>
          </div>
        )}
      </section>

      {/* Contenido Principal: Comanda Activa vs Panel Lateral */}
      {!activeTab ? (
        <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-3 text-secondary">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-primary font-display">No hay comanda activa</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
            Abre una comanda seleccionando un comprador para comenzar a escanear prendas en tu transmisión en vivo.
          </p>
          <button
            onClick={() => {
              setIsCustomerModalOpen(true);
              fetchCustomers("");
            }}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary text-xs font-bold rounded-xl hover:bg-primary transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-secondary-fixed" />
            <span>Abrir Nueva Comanda</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* COLUMNA IZQUIERDA (8 Columnas): Ficha de Cliente & Prendas Escaneadas */}
          <div className="xl:col-span-8 flex flex-col gap-4 min-w-0">
            {/* Ficha de Cliente Activa */}
            <div className="w-full bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-surface-container-high flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-container text-secondary-fixed flex items-center justify-center text-base font-bold font-display shadow-xs">
                  {activeTab.customer.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-primary font-display leading-tight">
                      {activeTab.customer.fullName}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                      CLIENTE LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-on-surface-variant">
                    {activeTab.customer.tiktokUsername && (
                      <span className="inline-flex items-center gap-1 font-medium bg-surface-container-low px-2 py-0.5 rounded-md text-primary">
                        @{activeTab.customer.tiktokUsername}
                      </span>
                    )}
                    {activeTab.customer.instagramUsername && (
                      <span className="inline-flex items-center gap-1 font-medium bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md">
                        IG: {activeTab.customer.instagramUsername}
                      </span>
                    )}
                    <span>• {activeTab.customer.municipality.name}</span>
                  </div>
                </div>
              </div>

              {/* Acción Directa WhatsApp & Contador */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <a
                  href={`https://wa.me/${activeTab.customer.phonePrimary.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>{activeTab.customer.phonePrimary}</span>
                </a>
                <div className="px-3 py-1.5 bg-surface-container rounded-xl flex items-center gap-1 text-xs">
                  <span className="text-on-surface-variant font-medium">Prendas:</span>
                  <span className="text-primary font-bold">{activeTab.items.length}</span>
                </div>
              </div>
            </div>

            {/* Lista de Cards de Prendas Escaneadas */}
            <div className="w-full flex flex-col gap-2.5">
              {activeTab.items.length === 0 ? (
                <div className="text-center py-14 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-6 text-on-surface-variant">
                  <Barcode className="w-10 h-10 mx-auto mb-2 text-outline-variant" />
                  <p className="text-sm font-semibold text-primary">Aún no has escaneado prendas para este cliente</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Usa tu pistola de código de barras o escribe el código en el recuadro superior.
                  </p>
                </div>
              ) : (
                activeTab.items.map((item, index) => (
                  <div
                    key={item.productId}
                    className="w-full bg-surface-container-lowest p-3.5 rounded-2xl shadow-xs hover:shadow-sm border border-surface-container-high transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-surface-container-low overflow-hidden shrink-0 relative border border-surface-container-high">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline-variant">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute top-1 left-1 text-[9px] px-1 py-0.2 bg-primary/80 text-on-primary rounded font-mono font-bold">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-container text-primary">
                            {item.barcode}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-primary truncate mt-0.5">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    {/* Precios, Descuento y Eliminar */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-on-surface-variant line-through">
                          {formatCurrency(item.originalPrice)}
                        </span>
                        <span className="text-[9px] text-secondary font-bold uppercase tracking-wider">
                          P. Lista
                        </span>
                      </div>

                      {/* Input Descuento */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center bg-surface-container-low rounded-xl px-2 py-1 border border-surface-container-high">
                          <span className="text-xs text-on-surface-variant font-medium mr-1">-Q</span>
                          <input
                            type="number"
                            min="0"
                            value={item.discountAmount || ""}
                            onChange={(e) => handleDiscountChange(item.productId, e.target.value)}
                            className="w-12 bg-transparent text-center text-xs font-bold outline-none text-primary font-mono"
                            placeholder="0"
                          />
                        </div>
                        <span className="text-[9px] text-on-surface-variant mt-0.5 uppercase tracking-wider font-semibold">
                          Descuento
                        </span>
                      </div>

                      {/* Total Prenda */}
                      <div className="flex flex-col text-right min-w-[70px]">
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(item.finalPrice)}
                        </span>
                        <span className="text-[9px] text-secondary font-bold uppercase tracking-wider">
                          Subtotal
                        </span>
                      </div>

                      {/* Eliminar */}
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-xl transition-colors"
                        title="Quitar prenda de comanda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Scan Tip */}
            <div className="flex items-center justify-between p-2.5 px-4 bg-surface-container-low rounded-xl text-on-surface-variant text-xs">
              <span className="flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" />
                <span>Atajos: El lector ingresa prendas al instante. Presiona Tab para editar descuentos.</span>
              </span>
              <span className="text-[10px] text-secondary font-bold uppercase">Escaneo Rápido</span>
            </div>
          </div>

          {/* COLUMNA DERECHA (4 Columnas): Totales, Observaciones y Cierre */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            <div className="w-full bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container-high flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-primary font-display">Liquidación Live</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed">
                  {activeTab.items.length} Artículos
                </span>
              </div>

              {/* Desglose */}
              <div className="flex flex-col gap-2 text-xs text-on-surface-variant">
                <div className="flex items-center justify-between">
                  <span>Subtotal prendas:</span>
                  <span className="text-primary font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-secondary">
                    <span className="flex items-center gap-1">
                      <span>Descuentos aplicados:</span>
                    </span>
                    <span className="font-bold">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Total a Pagar Prominente */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-secondary tracking-wider uppercase">
                    Total a Pagar
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium">Prendas de Comanda</span>
                </div>
                <span className="text-2xl font-black text-primary font-display tracking-tight">
                  {formatCurrency(totalToPay)}
                </span>
              </div>

              {/* Observaciones */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-semibold">
                  Observaciones de Entrega o Live:
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
                  className="w-full p-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-surface-container-high resize-none"
                />
              </div>

              {/* Botón Principal */}
              <button
                onClick={handleCheckout}
                disabled={activeTab.items.length === 0 || isProcessingCheckout}
                className="w-full py-3.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4 text-secondary-fixed" />
                <span>
                  {isProcessingCheckout ? "Procesando Apartado..." : "Finalizar Venta (Pasar a Pendiente)"}
                </span>
              </button>

              <p className="text-[10px] text-on-surface-variant text-center leading-relaxed">
                Al finalizar, los productos pasarán a estado <b>Apartado</b> y podrás emitir el recibo para el cliente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selección de Comprador */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full shadow-2xl border border-surface-container-high overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-primary-container p-5 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base font-display">Abrir Comanda para Cliente</h3>
                <p className="text-xs text-secondary-fixed">
                  Busca por nombre, teléfono o escanea su código de barras
                </p>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-on-primary-container hover:text-on-primary text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Escribe nombre, @tiktok, teléfono o código CLI-XXXXX..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    fetchCustomers(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-surface-container-low">
                {loadingCustomers ? (
                  <div className="py-8 text-center text-xs text-on-surface-variant">
                    Buscando clientes...
                  </div>
                ) : customersList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-on-surface-variant">
                    No se encontró ningún cliente con ese criterio.
                  </div>
                ) : (
                  customersList.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleOpenAccount(c)}
                      className="py-3 px-2 flex items-center justify-between hover:bg-surface-container-low rounded-xl cursor-pointer transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-primary">
                          {c.fullName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                          {c.tiktokUsername && <span>@{c.tiktokUsername}</span>}
                          <span>• Tel: {c.phonePrimary}</span>
                          <span>• {c.municipality.name}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-secondary-fixed px-2.5 py-1 rounded-lg">
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
            <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col gap-2">
              {/* Enlace directo a WhatsApp del cliente si tiene teléfono */}
              {completedOrder.customer.phonePrimary && (
                <a
                  href={`https://wa.me/502${completedOrder.customer.phonePrimary.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(getWhatsappReceiptMessage(completedOrder))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar por WhatsApp al Cliente (con Fotos)</span>
                </a>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsapp}
                  className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-surface-container-high"
                >
                  {copiedWhatsapp ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">¡Texto Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Resumen WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-surface-container-high"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-secondary" />
                      <span>Copiar Enlace Fotos</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket Térmico</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full py-1.5 text-xs text-on-surface-variant hover:text-on-surface text-center font-medium"
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
