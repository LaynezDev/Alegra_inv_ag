"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Printer, 
  MessageCircle, 
  AtSign,
  Share2
} from "lucide-react";
import BarcodeDisplay from "@/components/BarcodeDisplay";

interface Municipality {
  id: number | string;
  name: string;
}

interface Department {
  id: number | string;
  name: string;
  municipalities: Municipality[];
}

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
  department: { id?: number | string; name: string };
  municipality: { id?: number | string; name: string };
  _count?: { orders: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [facebookUsername, setFacebookUsername] = useState("");
  const [phonePrimary, setPhonePrimary] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [addressReference, setAddressReference] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [municipalityId, setMunicipalityId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async (q = "") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  const selectedDepartment = departments.find((d) => String(d.id) === String(departmentId));
  const availableMunicipalities = selectedDepartment ? selectedDepartment.municipalities : [];
  const selectedMunicipality = availableMunicipalities.find(
    (m) => String(m.id) === String(municipalityId) || m.name === String(municipalityId)
  );

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          tiktokUsername,
          instagramUsername,
          facebookUsername,
          phonePrimary,
          phoneSecondary,
          fullAddress,
          addressReference,
          departmentId,
          municipalityId,
          departmentName: selectedDepartment?.name || "Guatemala",
          municipalityName: selectedMunicipality?.name || (availableMunicipalities[0]?.name || "Guatemala"),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear el cliente");
      }

      // Limpiar formulario y cerrar
      setFullName("");
      setTiktokUsername("");
      setInstagramUsername("");
      setFacebookUsername("");
      setPhonePrimary("");
      setPhoneSecondary("");
      setFullAddress("");
      setAddressReference("");
      setDepartmentId("");
      setMunicipalityId("");
      setIsModalOpen(false);

      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cleanPhoneForWa = (phone: string) => {
    return phone.replace(/[^0-9]/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-alegra-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-alegra-navy">
            Directorio de Compradores
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registra perfiles previos a ventas en vivo con redes sociales, teléfonos y códigos de cliente.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-alegra-navy text-white text-sm font-semibold rounded-lg hover:bg-alegra-navy-light shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-alegra-sand" />
          Registrar Comprador
        </button>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, @tiktok, @instagram, facebook o código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-alegra-sand text-alegra-navy font-semibold text-sm rounded-lg hover:bg-alegra-sand-dark/40 transition-colors"
        >
          Buscar
        </button>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              fetchCustomers("");
            }}
            className="px-3 py-2.5 text-xs text-gray-500 hover:text-gray-800"
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Listado de Clientes */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-alegra-navy"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-alegra-border p-8">
          <Users className="w-12 h-12 text-alegra-sand mx-auto mb-3" />
          <h3 className="text-base font-semibold text-alegra-navy">No se encontraron clientes</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Registra a tus compradores antes o durante la transmisión en vivo para generar sus comandas al instante.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-alegra-sand text-alegra-navy font-semibold text-sm rounded-lg hover:bg-alegra-sand-dark/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar Primer Comprador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((c) => {
            const waNumber = cleanPhoneForWa(c.phonePrimary);
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-alegra-border p-5 shadow-xs flex flex-col justify-between hover:border-alegra-sand transition-all space-y-4"
              >
                <div className="space-y-3">
                  {/* Nombre y Redes */}
                  <div>
                    <h3 className="font-bold text-base text-alegra-navy">
                      {c.fullName}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {c.tiktokUsername && (
                        <span className="text-[11px] font-medium bg-black/5 text-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          TikTok: <b className="text-black">{c.tiktokUsername}</b>
                        </span>
                      )}
                      {c.instagramUsername && (
                        <span className="text-[11px] font-medium bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          IG: <b className="text-pink-900">{c.instagramUsername}</b>
                        </span>
                      )}
                      {c.facebookUsername && (
                        <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          FB: <b className="text-blue-900">{c.facebookUsername}</b>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teléfonos y WhatsApp */}
                  <div className="text-xs space-y-1 text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-alegra-navy">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {c.phonePrimary}
                      </span>
                      {waNumber && (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                    {c.phoneSecondary && (
                      <div className="text-gray-500 pl-5">
                        Secundario: {c.phoneSecondary}
                      </div>
                    )}
                  </div>

                  {/* Ubicación en Guatemala */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-alegra-sand-dark shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-alegra-navy">
                          {c.municipality.name}, {c.department.name}
                        </span>
                        <p className="text-gray-500 mt-0.5 leading-relaxed">{c.fullAddress}</p>
                        {c.addressReference && (
                          <p className="text-gray-400 italic text-[11px]">
                            Ref: {c.addressReference}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Código de barras del cliente con botón de imprimir carnet/etiqueta */}
                <div className="pt-2 border-t border-gray-100 flex justify-center">
                  <BarcodeDisplay
                    value={c.barcode}
                    label={`Cliente: ${c.fullName}`}
                    showPrintButton={true}
                    height={32}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Comprador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-alegra-border overflow-hidden my-8">
            <div className="bg-alegra-navy p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Registrar Perfil de Comprador</h3>
                <p className="text-xs text-alegra-sand">
                  Genera automáticamente su código de barras escaneable
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana Lucía Morales Estrada"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              {/* Redes Sociales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Usuario TikTok
                  </label>
                  <input
                    type="text"
                    placeholder="@analucia_gt"
                    value={tiktokUsername}
                    onChange={(e) => setTiktokUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Usuario Instagram
                  </label>
                  <input
                    type="text"
                    placeholder="@analucia.fashion"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre en Facebook
                  </label>
                  <input
                    type="text"
                    placeholder="Ana Lucia Morales"
                    value={facebookUsername}
                    onChange={(e) => setFacebookUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
              </div>

              {/* Teléfonos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teléfono Principal (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 4589 1234"
                    value={phonePrimary}
                    onChange={(e) => setPhonePrimary(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teléfono Secundario (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 5512 8765"
                    value={phoneSecondary}
                    onChange={(e) => setPhoneSecondary(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                  />
                </div>
              </div>

              {/* Ubicación: Departamento y Municipio de Guatemala en Cascada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Departamento de Guatemala *
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setMunicipalityId("");
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy bg-white"
                  >
                    <option value="">Selecciona departamento...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Municipio *
                  </label>
                  <select
                    required
                    disabled={!departmentId}
                    value={municipalityId}
                    onChange={(e) => setMunicipalityId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy bg-white disabled:bg-gray-100"
                  >
                    <option value="">Selecciona municipio...</option>
                    {availableMunicipalities.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección Completa de Entrega *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. 10 Avenida 4-35 Zona 1, Colonia El Calvario..."
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Punto de Referencia (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Casa verde de dos niveles, portón negro frente a la tienda"
                  value={addressReference}
                  onChange={(e) => setAddressReference(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-hidden focus:border-alegra-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-alegra-navy text-white rounded-lg hover:bg-alegra-navy-light disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? "Guardando y Generando Código..." : "Registrar Comprador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
