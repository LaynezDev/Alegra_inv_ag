"use client";

import { useEffect, useState } from "react";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Truck, 
  PackageCheck, 
  XCircle, 
  Plus, 
  CreditCard, 
  Printer, 
  MessageCircle, 
  Search, 
  AlertCircle,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp
} from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState("pendiente_pago");
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Formulario Pago
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
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

  // Abrir modal de pago
  const handleOpenPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setPaymentRef("");
    setPaymentMethod("transferencia");
    setPaymentAmount(order.balanceDue > 0 ? String(order.balanceDue) : "");
    setPaymentNotes("");
    setActionError("");
    setIsPaymentModalOpen(true);
  };

  // Registrar Pago (Soporta múltiples referencias y transiciona a Pagado)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmittingPayment(true);
    setActionError("");

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceNumber: paymentRef,
          paymentMethod,
          amount: parseFloat(paymentAmount),
          notes: paymentNotes,
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
      "¿Estás seguro de cancelar esta orden? Los productos apartados se liberarán de inmediato y volverán a estar disponibles."
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

  // Ver recibo modal
  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setIsReceiptModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente_pago":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pendiente de Pago
          </span>
        );
      case "pagado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Pagado
          </span>
        );
      case "enviado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3" />
            Enviado (En Ruta)
          </span>
        );
      case "entregado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-50 text-teal-800 border border-teal-200">
            <PackageCheck className="w-3 h-3" />
            Entregado (Venta Concluida)
          </span>
        );
      case "cancelado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Filtrar por texto
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer.fullName.toLowerCase().includes(q) ||
      o.customer.phonePrimary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-alegra-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-alegra-navy">
            Panel de Pedidos, Cobranza y Despacho
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitorea comandas pendientes, registra múltiples referencias de pago y gestiona envíos.
          </p>
        </div>
      </div>

      {/* Pestañas de Filtro por Estado */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {[
          { key: "pendiente_pago", label: "Pendientes de Pago", icon: Clock },
          { key: "pagado", label: "Pagados", icon: CheckCircle2 },
          { key: "enviado", label: "Enviados", icon: Truck },
          { key: "entregado", label: "Entregados", icon: PackageCheck },
          { key: "cancelado", label: "Cancelados", icon: XCircle },
          { key: "todos", label: "Todas las Órdenes", icon: ClipboardList },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                isActive
                  ? "bg-alegra-navy text-white border-alegra-navy shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar orden por folio CMD-XXXX, nombre del cliente o teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
        />
      </div>

      {/* Listado de Pedidos */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-alegra-navy"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-alegra-border p-8">
          <ClipboardList className="w-12 h-12 text-alegra-sand mx-auto mb-3" />
          <h3 className="text-base font-semibold text-alegra-navy">No hay pedidos en este estado</h3>
          <p className="text-sm text-gray-500 mt-1">
            Los pedidos finalizados en el POS Live se listarán aquí para registro de pago y seguimiento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const canAddItems = ["pendiente_pago", "pagado"].includes(order.status);
            const canCancel = order.status === "pendiente_pago";
            const canPay = order.status === "pendiente_pago" || order.balanceDue > 0;
            const canShip = order.status === "pagado";
            const canDeliver = ["pagado", "enviado"].includes(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs hover:border-gray-300 transition-all space-y-4"
              >
                {/* Cabecera de la Orden */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-alegra-navy bg-gray-100 px-2.5 py-1 rounded">
                      {order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-gray-400">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Total:</span>
                    <span className="text-lg font-bold text-alegra-navy">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Datos del Cliente y Ubicación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 bg-alegra-bg p-3 rounded-lg border border-gray-100">
                  <div>
                    <span className="font-semibold text-alegra-navy block text-sm">
                      {order.customer.fullName}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {order.customer.phonePrimary}
                      </span>
                      {order.customer.tiktokUsername && (
                        <span>• TikTok: {order.customer.tiktokUsername}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-alegra-sand-dark shrink-0 mt-0.5" />
                      <span>
                        {order.customer.fullAddress}, {order.customer.municipality.name}, {order.customer.department.name}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Detalle de Artículos */}
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 flex justify-between">
                    <span>Prendas en la Orden ({order.items.length})</span>
                    <span>Subtotal / Descuento / Final</span>
                  </div>
                  <div className="divide-y divide-gray-100 text-xs">
                    {order.items.map((item) => (
                      <div key={item.id} className="p-3 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-alegra-navy block">
                            {item.product.name}
                          </span>
                          <span className="font-mono text-[11px] text-gray-400">
                            {item.product.barcode} • Estado: {item.product.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-alegra-navy block">
                            {formatCurrency(item.finalPrice)}
                          </span>
                          {Number(item.discountAmount) > 0 && (
                            <span className="text-[10px] text-red-500 block">
                              Base: {formatCurrency(item.originalPrice)} (-{formatCurrency(item.discountAmount)})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección de Pagos y Referencias Registradas */}
                <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-200/60 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-alegra-navy flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-alegra-sand-dark" />
                      Referencias de Pago Registradas ({order.payments.length})
                    </span>
                    <div className="space-x-3">
                      <span>Pagado: <b className="text-emerald-700">{formatCurrency(order.totalPaid)}</b></span>
                      {order.balanceDue > 0 && (
                        <span>Saldo Pendiente: <b className="text-amber-700">{formatCurrency(order.balanceDue)}</b></span>
                      )}
                    </div>
                  </div>

                  {order.payments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      No se han registrado boletas ni transferencias aún.
                    </p>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {order.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize text-alegra-navy">
                              {p.paymentMethod}:
                            </span>
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
                              Ref: {p.referenceNumber}
                            </span>
                            {p.notes && <span className="text-gray-400 italic">({p.notes})</span>}
                          </div>
                          <span className="font-bold text-emerald-700">
                            +{formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Barra de Acciones de la Orden */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {/* Botón Ver / Imprimir Recibo */}
                    <button
                      onClick={() => handleViewReceipt(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Recibo
                    </button>

                    {/* Botón Agregar Prenda (Permitido antes de Enviado/Entregado) */}
                    {canAddItems && (
                      <button
                        onClick={() => handleOpenAddProductModal(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-alegra-navy bg-alegra-sand-light hover:bg-alegra-sand/30 rounded-lg transition-colors border border-alegra-sand/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar Prenda
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Cancelar Cuenta (Solo si está en pendiente_pago) */}
                    {canCancel && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancelar Cuenta
                      </button>
                    )}

                    {/* Registrar Pago (Pasar a Pagado con Referencia) */}
                    {canPay && (
                      <button
                        onClick={() => handleOpenPaymentModal(order)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Registrar Referencia de Pago
                      </button>
                    )}

                    {/* Pasar a Enviado */}
                    {canShip && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "enviado")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Pasar a Enviado
                      </button>
                    )}

                    {/* Marcar como Entregado */}
                    {canDeliver && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "entregado")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Marcar como Entregado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Pago con Referencia Bancaria */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-alegra-border overflow-hidden">
            <div className="bg-alegra-navy p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Registrar Referencia de Pago</h3>
                <p className="text-xs text-alegra-sand">Comanda {selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-300 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {actionError}
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-semibold">{selectedOrder.customer.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Orden:</span>
                  <span className="font-bold">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo Pendiente:</span>
                  <span className="font-bold text-amber-700">
                    {formatCurrency(selectedOrder.balanceDue)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Número de Referencia / Boleta / Autorización *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. TRANSF-891023 o No. Boleta 48291"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy bg-white"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="deposito">Depósito Bancario</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Monto Pagado (Q) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notas Adicionales (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Banco Industrial / Banrural..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
                Al confirmar el pago, la orden pasará a <b>Pagado</b> y los productos se retirarán permanentemente del inventario disponible.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submittingPayment ? "Registrando..." : "Confirmar y Pasar a Pagado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Producto Adicional a Orden */}
      {isAddProductModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-alegra-border overflow-hidden">
            <div className="bg-alegra-navy p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Agregar Prenda Adicional</h3>
                <p className="text-xs text-alegra-sand">Comanda {selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-gray-300 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAddProduct} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Seleccionar Prenda Disponible *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy bg-white"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descuento por Monto (Q) (Opcional)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={addItemDiscount}
                  onChange={(e) => setAddItemDiscount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAddProduct || !selectedProductId}
                  className="px-5 py-2 text-xs font-semibold bg-alegra-navy text-white rounded-lg hover:bg-alegra-navy-light disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submittingAddProduct ? "Agregando..." : "Agregar a la Orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recibo */}
      {isReceiptModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-alegra-border overflow-hidden my-6">
            <div className="bg-alegra-navy p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Comprobante / Recibo</h3>
                <p className="text-xs text-alegra-sand">{selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-gray-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div id="printable-receipt" className="p-6 text-sm text-gray-800 space-y-4">
              <div className="text-center border-b border-gray-200 pb-3">
                <h2 className="text-lg font-black tracking-widest text-alegra-navy">ALEGRA</h2>
                <p className="text-xs text-gray-500">Comprobante de Venta</p>
                <p className="text-xs font-mono font-bold text-alegra-navy mt-1">
                  {selectedOrder.orderNumber}
                </p>
              </div>

              <div className="text-xs space-y-1">
                <p><b>Cliente:</b> {selectedOrder.customer.fullName}</p>
                <p><b>Teléfono:</b> {selectedOrder.customer.phonePrimary}</p>
                <p><b>Ubicación:</b> {selectedOrder.customer.fullAddress}, {selectedOrder.customer.municipality.name}, {selectedOrder.customer.department.name}</p>
                <p><b>Estado Actual:</b> <span className="uppercase font-bold">{selectedOrder.status}</span></p>
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
                    {selectedOrder.items.map((item) => (
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
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {Number(selectedOrder.totalDiscount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(selectedOrder.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-alegra-navy pt-1 border-t border-gray-200">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Pagado:</span>
                  <span className="font-semibold">{formatCurrency(selectedOrder.totalPaid)}</span>
                </div>
                {selectedOrder.balanceDue > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Saldo Pendiente:</span>
                    <span>{formatCurrency(selectedOrder.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2 px-4 bg-alegra-navy hover:bg-alegra-navy-light text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo Térmico</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
