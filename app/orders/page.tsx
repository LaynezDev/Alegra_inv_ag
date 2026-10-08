"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderItem {
  id: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  product: {
    id: number;
    barcode: string;
    name: string;
    status: string;
  };
}

interface Payment {
  id: number;
  referenceNumber: string;
  paymentMethod: string;
  amount: number;
  paymentDate: string;
  notes: string | null;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  notes: string | null;
  createdAt: string;
  customer: {
    id: number;
    fullName: string;
    phonePrimary: string;
    tiktokUsername: string | null;
    instagramUsername: string | null;
    fullAddress: string;
    department: { name: string };
    municipality: { name: string };
  };
  items: OrderItem[];
  payments: Payment[];
}

interface AvailableProduct {
  id: number;
  barcode: string;
  name: string;
  salePrice: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");

  // Modales
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Formulario Pago
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [bankDestination, setBankDestination] = useState("bi");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Formulario Agregar Producto Adicional
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addItemDiscount, setAddItemDiscount] = useState("");
  const [submittingAddProduct, setSubmittingAddProduct] = useState(false);

  // Mensajes de error
  const [actionError, setActionError] = useState("");

  const fetchOrders = async (status = statusFilter) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter]);

  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch("/api/products/search");
      if (res.ok) {
        const data = await res.json();
        setAvailableProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Métricas dinámicas calculadas
  const metrics = useMemo(() => {
    let pendingAmount = 0;
    let pendingCount = 0;
    let paidAmount = 0;
    let paidTransfers = 0;
    let readyToShipCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    orders.forEach((o) => {
      if (o.status === "pendiente_pago" || o.balanceDue > 0) {
        pendingAmount += Number(o.balanceDue || 0);
        pendingCount += 1;
      }
      if (o.status === "pagado") {
        readyToShipCount += 1;
      }
      if (o.status === "enviado") {
        inTransitCount += 1;
      }
      if (o.status === "entregado") {
        deliveredCount += 1;
      }
      if (o.status === "cancelado") {
        cancelledCount += 1;
      }
      paidAmount += Number(o.totalPaid || 0);
      paidTransfers += o.payments?.length || 0;
    });

    return {
      pendingAmount,
      pendingCount,
      paidAmount,
      paidTransfers,
      readyToShipCount,
      inTransitCount,
      deliveredCount,
      cancelledCount,
      totalOrders: orders.length,
    };
  }, [orders]);

  // Abrir modal de pago
  const handleOpenPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setPaymentRef("");
    setPaymentMethod("transferencia");
    setBankDestination("bi");
    setPaymentAmount(order.balanceDue > 0 ? String(order.balanceDue) : "");
    setPaymentNotes("");
    setActionError("");
    setIsPaymentModalOpen(true);
  };

  // Registrar Pago
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmittingPayment(true);
    setActionError("");

    try {
      const combinedNotes = bankDestination
        ? `[${bankDestination.toUpperCase()}] ${paymentNotes}`.trim()
        : paymentNotes;

      const res = await fetch(`/api/orders/${selectedOrder.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: paymentRef,
          paymentMethod,
          amount: parseFloat(paymentAmount),
          notes: combinedNotes,
          markAsPaid: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al registrar pago");
      }

      setIsPaymentModalOpen(false);
      fetchOrders(statusFilter);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Abrir modal de agregar producto adicional
  const handleOpenAddProductModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedProductId("");
    setAddItemDiscount("");
    setActionError("");
    fetchAvailableProducts();
    setIsAddProductModalOpen(true);
  };

  // Agregar Producto Adicional
  const handleSubmitAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedProductId) return;

    setSubmittingAddProduct(true);
    setActionError("");

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/add-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          discountAmount: parseFloat(addItemDiscount) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al agregar producto");
      }

      setIsAddProductModalOpen(false);
      fetchOrders(statusFilter);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAddProduct(false);
    }
  };

  // Cancelar orden (libera stock a disponible)
  const handleCancelOrder = async (orderId: number) => {
    const confirm = window.confirm(
      "¿Estás seguro de cancelar esta orden? Los productos apartados se liberarán de inmediato y volverán a estar disponibles en stock."
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cancelar orden");
      }

      fetchOrders(statusFilter);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Transicionar estado (ej. Enviado, Entregado)
  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    let confirmMsg = `¿Deseas marcar la orden como ${nextStatus.toUpperCase()}?`;
    if (nextStatus === "entregado") {
      confirmMsg = "Al marcar como ENTREGADO, la venta concluye formalmente. ¿Deseas continuar?";
    }
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar estado");
      }

      fetchOrders(statusFilter);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Estado para copiar link público de fotos
  const [copiedOrderId, setCopiedOrderId] = useState<number | string | null>(null);

  // Generar texto para WhatsApp con enlace a fotos
  const getOrderWhatsappMessage = (o: Order) => {
    let message = `✨ *ALEGRA - DETALLE DE TU PEDIDO* ✨\n`;
    message += `Comanda: *${o.orderNumber}*\n`;
    message += `Cliente: *${o.customer.fullName}*\n`;
    message += `Estado: *${o.status.replace("_", " ").toUpperCase()}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*PRENDAS:* (${o.items.length})\n`;
    o.items.forEach((item, idx) => {
      const name = item.product?.name || (item as any).name || "Prenda";
      message += `${idx + 1}. ${name} - Q${Number(item.finalPrice).toFixed(2)}\n`;
    });
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*TOTAL: Q${Number(o.totalAmount).toFixed(2)}*\n`;
    if (Number(o.totalPaid) > 0) {
      message += `Total Abonado: Q${Number(o.totalPaid).toFixed(2)}\n`;
    }
    if (Number(o.balanceDue) > 0) {
      message += `*Saldo Pendiente: Q${Number(o.balanceDue).toFixed(2)}*\n`;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/p/${(o as any).shareToken || o.id}`;
    message += `\n👗 *Fotos de tus prendas y detalles aquí:*\n👉 ${shareUrl}\n\n`;
    message += `¡Muchas gracias por tu compra en Alegra! 💕`;
    return message;
  };

  const handleCopyOrderLink = (order: Order) => {
    const origin = window.location.origin;
    const url = `${origin}/p/${(order as any).shareToken || order.id}`;
    navigator.clipboard.writeText(url);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  // Ver recibo modal
  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setIsReceiptModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente_pago":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/50 text-secondary font-label-caps text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Pendiente de Pago
          </span>
        );
      case "pagado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-caps text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Pagado • Listo para Despacho
          </span>
        );
      case "enviado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-label-caps text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            Enviado • En Ruta
          </span>
        );
      case "entregado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 font-label-caps text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">package_2</span>
            Entregado (Concluido)
          </span>
        );
      case "cancelado":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-caps text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">cancel</span>
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-caps text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  // Filtrar por texto y selectores
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customer?.fullName?.toLowerCase().includes(q) ||
          o.customer?.phonePrimary?.toLowerCase().includes(q) ||
          o.customer?.tiktokUsername?.toLowerCase().includes(q) ||
          o.customer?.instagramUsername?.toLowerCase().includes(q) ||
          o.payments?.some((p) => p.referenceNumber.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (carrierFilter) {
        const addr = (o.customer?.fullAddress || "").toLowerCase();
        if (!addr.includes(carrierFilter.toLowerCase())) return false;
      }
      if (bankFilter) {
        const hasBank = o.payments?.some((p) =>
          (p.notes || "").toLowerCase().includes(bankFilter.toLowerCase())
        );
        if (!hasBank) return false;
      }
      return true;
    });
  }, [orders, searchQuery, carrierFilter, bankFilter]);

  const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Encabezado Principal y Acciones Operativas */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-caps text-xs tracking-wider font-bold">
              DESPACHO &amp; COBRANZA EN VIVO
            </span>
            <span className="flex items-center gap-1.5 text-outline text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              Sync GTQ: BI / Banrural / Guatex Activo
            </span>
          </div>
          <h1 className="font-headline-xl text-2xl lg:text-3xl font-extrabold text-primary tracking-tight">
            Gestión de Pedidos, Cobranza y Despacho
          </h1>
          <p className="text-sm text-outline leading-relaxed">
            Monitoreo del ciclo de vida de compras Live, validación de transferencias bancarias
            guatemaltecas (BI/Banrural) y despacho sincronizado con paqueterías nacionales.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap self-start lg:self-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest text-primary font-semibold text-xs shadow-sm hover:bg-surface-container-low transition-all border border-surface-container-high"
            type="button"
          >
            <span className="material-symbols-outlined text-secondary text-base">picture_as_pdf</span>
            <span>Imprimir / Exportar Manifiesto</span>
          </button>
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-secondary-fixed text-base">
              add_shopping_cart
            </span>
            <span>+ Ir a POS Live</span>
          </Link>
        </div>
      </section>

      {/* 2. Tarjetas de Métricas y KPIs de Flujo de Caja y Despacho */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Pendiente por Cobrar */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden border border-surface-container-high">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-outline font-medium">Total por Cobrar (Pendiente)</span>
              <span className="font-financial-lg text-2xl font-bold text-primary mt-1">
                {formatCurrency(metrics.pendingAmount)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-secondary text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{metrics.pendingCount} órdenes a la espera de boleta</span>
          </div>
        </div>

        {/* KPI 2: Cobrado Hoy */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden border border-surface-container-high">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-outline font-medium">Cobrado Registrado</span>
              <span className="font-financial-lg text-2xl font-bold text-primary mt-1">
                {formatCurrency(metrics.paidAmount)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">price_check</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-primary text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>+{metrics.paidTransfers} transferencias y pagos</span>
          </div>
        </div>

        {/* KPI 3: Listos para Despacho */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden border border-surface-container-high">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary-container"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-outline font-medium">Listos para Despacho</span>
              <span className="font-financial-lg text-2xl font-bold text-primary mt-1">
                {metrics.readyToShipCount} pedidos
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-outline text-xs">
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            <span>Guatex, Forza y Moto Express</span>
          </div>
        </div>

        {/* KPI 4: En Tránsito / Ruta */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden border border-surface-container-high">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-outline font-medium">En Tránsito / Ruta Nacional</span>
              <span className="font-financial-lg text-2xl font-bold text-primary mt-1">
                {metrics.inTransitCount} envíos
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">route</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-outline text-xs">
            <span className="material-symbols-outlined text-sm">hub</span>
            <span>Guías con tracking en tiempo real</span>
          </div>
        </div>
      </section>

      {/* 3. Pipeline Tabs & Barra de Filtros Multifuncional */}
      <section className="flex flex-col gap-4">
        {/* Tabs de Estado */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-surface-container-high scrollbar-none">
          {[
            { key: "todos", label: "Todos los Pedidos", count: metrics.totalOrders, icon: "list_alt" },
            {
              key: "pendiente_pago",
              label: "⏳ Pendientes de Pago",
              count: metrics.pendingCount,
              icon: "schedule",
            },
            {
              key: "pagado",
              label: "✅ Pagados",
              count: metrics.readyToShipCount,
              icon: "check_circle",
            },
            {
              key: "enviado",
              label: "🚚 Enviados / En Ruta",
              count: metrics.inTransitCount,
              icon: "local_shipping",
            },
            {
              key: "entregado",
              label: "📦 Entregados",
              count: metrics.deliveredCount,
              icon: "package_2",
            },
            {
              key: "cancelado",
              label: "❌ Cancelados",
              count: metrics.cancelledCount,
              icon: "cancel",
            },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-outline hover:bg-surface-container-low hover:text-primary"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-secondary text-primary"
                      : "bg-surface-container-high text-outline"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtros y Búsqueda Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Buscador Universal */}
          <div className="md:col-span-6 lg:col-span-6 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por # Orden (CMD-XXXX), cliente, @tiktok, teléfono o No. Boleta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-surface-container-lowest text-primary text-sm placeholder:text-outline border border-surface-container-high focus:outline-hidden focus:ring-2 focus:ring-secondary/50 shadow-xs"
            />
          </div>

          {/* Filtro Paquetería */}
          <div className="md:col-span-3 lg:col-span-3 relative">
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-surface-container-lowest text-primary text-xs font-semibold border border-surface-container-high appearance-none focus:outline-hidden focus:ring-2 focus:ring-secondary/50 shadow-xs cursor-pointer"
            >
              <option value="">Paquetería: Todas</option>
              <option value="guatex">Guatex (Nacional)</option>
              <option value="forza">Forza Delivery Express</option>
              <option value="cargo">Cargo Expreso</option>
              <option value="moto">Mensajería Capitalina (Moto)</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-base">
              expand_more
            </span>
          </div>

          {/* Filtro Banco Receptor */}
          <div className="md:col-span-3 lg:col-span-3 relative">
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full h-11 pl-3.5 pr-8 rounded-xl bg-surface-container-lowest text-primary text-xs font-semibold border border-surface-container-high appearance-none focus:outline-hidden focus:ring-2 focus:ring-secondary/50 shadow-xs cursor-pointer"
            >
              <option value="">Banco Receptor: Todos</option>
              <option value="bi">Banco Industrial (BI)</option>
              <option value="banrural">Banrural</option>
              <option value="bac">BAC Credomatic</option>
              <option value="gyt">G&amp;T Continental</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-base">
              expand_more
            </span>
          </div>
        </div>
      </section>

      {/* 4. Lista Principal de Órdenes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-surface-container-lowest rounded-2xl border border-surface-container-high">
          <span className="material-symbols-outlined text-4xl text-secondary animate-spin">
            progress_activity
          </span>
          <p className="text-sm font-semibold text-outline">Cargando pedidos y cobranza...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-8 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-secondary/60 mb-2">
            receipt_long
          </span>
          <h3 className="text-base font-bold text-primary">No hay pedidos en este estado</h3>
          <p className="text-sm text-outline mt-1 max-w-md mx-auto">
            Los pedidos apartados desde el POS Live se sincronizan automáticamente aquí para
            validar boletas bancarias y gestionar su entrega.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          {filteredOrders.map((order) => {
            const canAddItems = ["pendiente_pago", "pagado"].includes(order.status);
            const canCancel = order.status === "pendiente_pago";
            const canPay = order.status === "pendiente_pago" || order.balanceDue > 0;
            const canShip = order.status === "pagado";
            const canDeliver = ["pagado", "enviado"].includes(order.status);

            const phoneDigits = cleanPhone(order.customer?.phonePrimary || "");
            const initials = (order.customer?.fullName || "Cliente")
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase();

            return (
              <article
                key={order.id}
                className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-xs hover:shadow-md transition-shadow flex flex-col gap-4"
              >
                {/* Top Bar de la Orden */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(order.status)}
                    <span className="font-mono text-base font-extrabold text-primary">
                      {order.orderNumber}
                    </span>
                    <span className="text-outline text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">live_tv</span>
                      Apartado en Live • {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Acciones Rápidas con Comprador */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {phoneDigits && (
                      <a
                        href={`https://wa.me/502${phoneDigits}?text=${encodeURIComponent(getOrderWhatsappMessage(order))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-all shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">
                          chat
                        </span>
                        <span>WhatsApp (con Fotos)</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleCopyOrderLink(order)}
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-low text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors"
                      title="Copiar enlace público de fotos para el cliente"
                    >
                      <span className="material-symbols-outlined text-sm text-secondary">
                        {copiedOrderId === order.id ? "check" : "share"}
                      </span>
                      <span>{copiedOrderId === order.id ? "¡Enlace Copiado!" : "Enlace Fotos"}</span>
                    </button>
                    <button
                      onClick={() => handleViewReceipt(order)}
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-low text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm text-secondary">
                        print
                      </span>
                      <span>Recibo Térmico</span>
                    </button>
                  </div>
                </div>

                {/* Grid de 3 Columnas: Cliente & Destino | Prendas | Estado Financiero */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Columna 1: Cliente y Destino (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center font-extrabold text-secondary text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-primary text-sm truncate">
                          {order.customer.fullName}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-outline">
                          {order.customer.tiktokUsername && (
                            <span className="text-secondary font-medium truncate">
                              @{order.customer.tiktokUsername.replace(/^@/, "")}
                            </span>
                          )}
                          {order.customer.instagramUsername && (
                            <span className="truncate">
                              IG: @{order.customer.instagramUsername.replace(/^@/, "")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dirección de Entrega */}
                    <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1 text-xs text-outline">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <span className="material-symbols-outlined text-sm text-secondary">
                          pin_drop
                        </span>
                        <span>Destino de Despacho:</span>
                      </div>
                      <p className="pl-5 text-primary font-medium leading-relaxed">
                        {order.customer.fullAddress}
                      </p>
                      <p className="pl-5 text-outline">
                        {order.customer.municipality?.name}, {order.customer.department?.name}
                      </p>
                    </div>

                    {/* Cuentas Bancarias Sugeridas */}
                    <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1 text-xs text-outline">
                      <span className="font-semibold text-primary">Cuentas compartidas al cliente:</span>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Banco Industrial (Monetaria):</span>
                        <span className="font-mono text-primary font-bold">014-049182-3</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Banrural (Ahorro / Monetaria):</span>
                        <span className="font-mono text-primary font-bold">304-001928-1</span>
                      </div>
                    </div>
                  </div>

                  {/* Columna 2: Prendas Apartadas (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-primary">
                      <span>Prendas Apartadas ({order.items.length})</span>
                      <span className="text-outline">Total Items: {order.items.length}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low text-xs border border-surface-container-high/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-surface-container-highest text-primary font-mono text-[11px] flex items-center justify-center font-bold shrink-0">
                              1x
                            </span>
                            <div className="min-w-0">
                              <span className="text-primary font-medium block truncate">
                                {item.product.name}
                              </span>
                              <span className="text-outline text-[11px] font-mono">
                                {item.product.barcode}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-primary block">
                              {formatCurrency(item.finalPrice)}
                            </span>
                            {Number(item.discountAmount) > 0 && (
                              <span className="text-[10px] text-error font-semibold">
                                -{formatCurrency(item.discountAmount)} desc.
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Historial de Boletas Verificadas */}
                    {order.payments && order.payments.length > 0 && (
                      <div className="mt-1 p-2.5 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-secondary">
                            verified
                          </span>
                          Boletas Registradas ({order.payments.length})
                        </span>
                        <div className="flex flex-col gap-1">
                          {order.payments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-xs bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-surface-container-high/70"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold uppercase text-[10px] text-secondary">
                                  {p.paymentMethod}:
                                </span>
                                <span className="font-mono font-bold text-primary text-[11px]">
                                  {p.referenceNumber}
                                </span>
                                {p.notes && (
                                  <span className="text-outline text-[10px] truncate max-w-[120px]">
                                    ({p.notes})
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-emerald-700">
                                +{formatCurrency(p.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna 3: Estado Financiero & Liquidación (3 cols) */}
                  <div className="lg:col-span-3 flex flex-col justify-between p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high">
                    <div className="flex flex-col gap-1.5 text-xs text-outline">
                      <div className="flex justify-between">
                        <span>Subtotal prendas:</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(order.subtotal)}
                        </span>
                      </div>
                      {Number(order.totalDiscount) > 0 && (
                        <div className="flex justify-between text-error font-medium">
                          <span>Descuentos aplicados:</span>
                          <span>-{formatCurrency(order.totalDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-primary font-bold pt-1 border-t border-surface-container-high text-sm">
                        <span>Total Pedido:</span>
                        <span className="font-financial-md text-base">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Total Pagado:</span>
                        <span className="font-bold">{formatCurrency(order.totalPaid)}</span>
                      </div>
                    </div>

                    {/* Caja de Saldo Pendiente o Confirmado */}
                    {order.balanceDue > 0 ? (
                      <div className="mt-3 p-3 rounded-xl bg-secondary-fixed/40 border border-secondary/20 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                          Saldo Pendiente por Validar
                        </span>
                        <span className="font-financial-lg text-xl font-black text-secondary mt-0.5">
                          {formatCurrency(order.balanceDue)}
                        </span>
                        <span className="text-[10px] text-outline mt-0.5">
                          {order.payments.length === 0
                            ? "Sin boletas registradas"
                            : "Pago parcial registrado"}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 rounded-xl bg-surface-container-lowest border border-emerald-300/40 flex items-center gap-2 justify-center shadow-xs">
                        <span className="material-symbols-outlined text-emerald-600 text-2xl">
                          task_alt
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Pago 100% Confirmado
                          </span>
                          <span className="text-[11px] text-outline">Paz y salvo para despacho</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Acciones Operativas de la Orden */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-surface-container-high">
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {/* Botón Registrar Boleta / Pago */}
                    {canPay && (
                      <button
                        onClick={() => handleOpenPaymentModal(order)}
                        type="button"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm text-secondary-fixed">
                          receipt_long
                        </span>
                        <span>+ Registrar Boleta / Pago</span>
                      </button>
                    )}

                    {/* Botón Agregar Prenda Extra */}
                    {canAddItems && (
                      <button
                        onClick={() => handleOpenAddProductModal(order)}
                        type="button"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors"
                        title="Agregar Prenda Extra del Live"
                      >
                        <span className="material-symbols-outlined text-sm text-secondary">
                          add_circle
                        </span>
                        <span>+ Prenda Extra</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    {/* Pasar a Enviado */}
                    {canShip && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "enviado")}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold uppercase tracking-wider shadow-md hover:bg-primary transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm text-secondary-fixed">
                          local_shipping
                        </span>
                        <span>🚚 Marcar como Enviado</span>
                      </button>
                    )}

                    {/* Marcar como Entregado */}
                    {canDeliver && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "entregado")}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:bg-emerald-800 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">task_alt</span>
                        <span>📦 Marcar como Entregado</span>
                      </button>
                    )}

                    {/* Cancelar Cuenta (Solo en pendiente_pago) */}
                    {canCancel && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        type="button"
                        className="px-3 py-2 rounded-xl text-error text-xs font-bold hover:bg-error-container/30 transition-colors uppercase tracking-wider"
                      >
                        Cancelar y Liberar Stock
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ================= MODALES ================= */}

      {/* Modal 1: Registrar Boleta con Banco y Referencia */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-primary p-5 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-base font-bold text-on-primary">
                  Validar y Registrar Boleta de Pago
                </h3>
                <p className="text-xs text-secondary-fixed">
                  Orden {selectedOrder.orderNumber} • {selectedOrder.customer.fullName}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-on-primary-container hover:text-on-primary text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 text-xs bg-error-container text-on-error-container border border-error/20 rounded-xl font-medium">
                  {actionError}
                </div>
              )}

              {/* Resumen de la Orden */}
              <div className="bg-surface-container-low p-3 rounded-xl text-xs space-y-1.5 border border-surface-container-high">
                <div className="flex justify-between text-outline">
                  <span>Total de la Orden:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Ya Pagado a la Fecha:</span>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(selectedOrder.totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-secondary font-bold pt-1 border-t border-surface-container-high">
                  <span>Saldo Pendiente:</span>
                  <span className="font-financial-sm text-sm">
                    {formatCurrency(selectedOrder.balanceDue)}
                  </span>
                </div>
              </div>

              {/* Banco Receptor y Método */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Banco Receptor *
                  </label>
                  <select
                    value={bankDestination}
                    onChange={(e) => setBankDestination(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all cursor-pointer font-medium"
                  >
                    <option value="bi">Banco Industrial (BI)</option>
                    <option value="banrural">Banrural</option>
                    <option value="bac">BAC Credomatic</option>
                    <option value="gyt">G&amp;T Continental</option>
                    <option value="efectivo">Efectivo / Contra Entrega</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Forma de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all cursor-pointer font-medium"
                  >
                    <option value="transferencia">Transferencia Móvil</option>
                    <option value="deposito">Boleta Depósito Físico</option>
                    <option value="tarjeta">Link de Tarjeta</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* No. de Boleta / Referencia */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  No. de Boleta / Transferencia / Autorización *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. TRANSF-7821903 o Boleta 48291"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl font-mono focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Monto Verificado en Cuenta (Q) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ej. 615.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all font-bold"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Notas de Verificación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Verificado en BancaSAT / Enviaron captura por WhatsApp"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                />
              </div>

              <div className="p-3 bg-secondary-fixed/30 text-secondary text-xs rounded-xl border border-secondary/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm mt-0.5">verified_user</span>
                <span>
                  Al registrar el pago total, la orden pasará a <b>Pagado (Listo para Despacho)</b>{" "}
                  y se reservará la guía de envío nacional.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-outline hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingPayment && (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  )}
                  {submittingPayment ? "Registrando Boleta..." : "Confirmar y Liquidar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Agregar Prenda Extra del Live */}
      {isAddProductModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high overflow-hidden animate-in fade-in-50 zoom-in-95">
            <div className="bg-primary p-5 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-base font-bold text-on-primary">
                  Agregar Prenda Adicional
                </h3>
                <p className="text-xs text-secondary-fixed">
                  Comanda {selectedOrder.orderNumber} • {selectedOrder.customer.fullName}
                </p>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-on-primary-container hover:text-on-primary text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAddProduct} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 text-xs bg-error-container text-on-error-container border border-error/20 rounded-xl font-medium">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Seleccionar Prenda Disponible en Stock *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all cursor-pointer"
                >
                  <option value="">Selecciona una prenda disponible...</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.barcode}) - {formatCurrency(p.salePrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Descuento por Monto (Q) (Opcional)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  value={addItemDiscount}
                  onChange={(e) => setAddItemDiscount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-outline hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAddProduct || !selectedProductId}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-secondary text-primary rounded-xl hover:bg-secondary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingAddProduct && (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  )}
                  {submittingAddProduct ? "Agregando..." : "Agregar a la Orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Recibo Térmico y Comprobante */}
      {isReceiptModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container-high overflow-hidden my-6">
            <div className="bg-primary p-4 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-on-primary">Comprobante de Venta</h3>
                <p className="text-xs text-secondary-fixed">{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-on-primary-container hover:text-on-primary text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div id="printable-receipt" className="p-6 text-sm text-primary space-y-4">
              <div className="text-center border-b border-surface-container-high pb-3">
                <h2 className="text-lg font-black tracking-widest text-primary">ALEGRA</h2>
                <p className="text-xs text-outline">Live Shopping &amp; Boutique</p>
                <p className="text-xs font-mono font-bold text-primary mt-1">
                  {selectedOrder.orderNumber}
                </p>
              </div>

              <div className="text-xs space-y-1 text-outline">
                <p>
                  <b className="text-primary">Cliente:</b> {selectedOrder.customer.fullName}
                </p>
                <p>
                  <b className="text-primary">Teléfono:</b> {selectedOrder.customer.phonePrimary}
                </p>
                <p>
                  <b className="text-primary">Destino:</b> {selectedOrder.customer.fullAddress},{" "}
                  {selectedOrder.customer.municipality?.name},{" "}
                  {selectedOrder.customer.department?.name}
                </p>
                <p>
                  <b className="text-primary">Estado:</b>{" "}
                  <span className="uppercase font-bold text-secondary">
                    {selectedOrder.status.replace("_", " ")}
                  </span>
                </p>
              </div>

              <div className="border-t border-b border-surface-container-high py-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-outline border-b border-surface-container-high">
                      <th className="pb-1 font-bold uppercase">Prenda</th>
                      <th className="pb-1 text-center font-bold uppercase">Desc.</th>
                      <th className="pb-1 text-right font-bold uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id} className="py-1">
                        <td className="py-1.5 font-medium">{item.product.name}</td>
                        <td className="py-1.5 text-center text-error">
                          {Number(item.discountAmount) > 0
                            ? `-${formatCurrency(item.discountAmount)}`
                            : "-"}
                        </td>
                        <td className="py-1.5 text-right font-bold">
                          {formatCurrency(item.finalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-outline">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {Number(selectedOrder.totalDiscount) > 0 && (
                  <div className="flex justify-between text-error font-medium">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(selectedOrder.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-primary pt-1 border-t border-surface-container-high">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Pagado:</span>
                  <span>{formatCurrency(selectedOrder.totalPaid)}</span>
                </div>
                {selectedOrder.balanceDue > 0 && (
                  <div className="flex justify-between text-secondary font-bold">
                    <span>Saldo Pendiente:</span>
                    <span>{formatCurrency(selectedOrder.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col gap-2">
              {/* Enviar WhatsApp con Fotos */}
              {selectedOrder.customer.phonePrimary && (
                <a
                  href={`https://wa.me/502${selectedOrder.customer.phonePrimary.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(getOrderWhatsappMessage(selectedOrder))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  <span>Enviar por WhatsApp al Cliente (con Fotos)</span>
                </a>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyOrderLink(selectedOrder)}
                  className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm text-secondary">
                    {copiedOrderId === selectedOrder.id ? "check" : "share"}
                  </span>
                  <span>{copiedOrderId === selectedOrder.id ? "¡Enlace Copiado!" : "Copiar Enlace Fotos"}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm text-secondary-fixed">
                    print
                  </span>
                  <span>Imprimir Térmico</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
