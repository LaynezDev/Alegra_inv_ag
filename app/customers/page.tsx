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

  const totalWithWa = customers.filter(c => !!c.phonePrimary).length;
  const totalWithSocial = customers.filter(c => !!c.tiktokUsername || !!c.instagramUsername || !!c.facebookUsername).length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-container-high">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-primary">
            Directorio de Clientes y Redes Sociales
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Perfiles de compradores habituales en transmisiones en vivo con redes sociales, WhatsApp y códigos de cliente.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-container hover:bg-primary text-on-primary text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-secondary-fixed" />
          <span>Registrar Comprador</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Total Clientes
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-bold font-display text-primary">
              {customers.length}
            </span>
            <span className="text-[11px] text-on-surface-variant block mt-0.5">
              Compradores registrados
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            WhatsApp Activo
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-bold font-display text-emerald-700">
              {totalWithWa}
            </span>
            <span className="text-[11px] text-on-surface-variant block mt-0.5">
              Con número directo
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Perfiles Sociales
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-bold font-display text-secondary">
              {totalWithSocial}
            </span>
            <span className="text-[11px] text-on-surface-variant block mt-0.5">
              TikTok / IG vinculados
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Cobertura Nacional
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-bold font-display text-primary">
              22 Deptos
            </span>
            <span className="text-[11px] text-on-surface-variant block mt-0.5">
              Guatex & Forza
            </span>
          </div>
        </div>
      </div>

      {/* Buscador Universal */}
      <form onSubmit={handleSearch} className="bg-surface-container-lowest p-2 rounded-2xl border border-surface-container-high shadow-xs flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, @tiktok, @instagram, Facebook o código CLI-XXXXX..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-surface-container-low rounded-xl border border-surface-container-high text-on-surface focus:outline-hidden focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-xl shadow-xs transition-all"
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
            className="px-3 py-2.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Listado de Clientes */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-on-surface-variant">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-surface-container-high p-8 shadow-xs">
          <Users className="w-12 h-12 text-secondary mx-auto mb-3" />
          <h3 className="text-base font-bold text-primary font-display">No se encontraron clientes</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
            Registra a tus compradores antes o durante la transmisión en vivo para generar sus comandas al instante.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary font-bold text-xs rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4 text-secondary-fixed" />
            <span>Registrar Primer Comprador</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {customers.map((c) => {
            const waNumber = cleanPhoneForWa(c.phonePrimary);
            const initials = c.fullName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

            return (
              <article
                key={c.id}
                className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-5 shadow-xs flex flex-col justify-between hover:border-secondary transition-all space-y-4 relative overflow-hidden group"
              >
                <div className="space-y-3">
                  {/* Header: Monogram Avatar, Name, VIP Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary-container text-secondary-fixed flex items-center justify-center font-bold font-display text-sm shrink-0 shadow-xs">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-primary font-display leading-tight">
                          {c.fullName}
                        </h3>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">
                          ID: {c.barcode}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[9px] font-bold shadow-xs whitespace-nowrap">
                      VIP Live
                    </span>
                  </div>

                  {/* Redes Sociales */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.tiktokUsername && (
                      <span className="text-[10px] font-semibold bg-surface-container-low text-primary px-2 py-0.5 rounded-lg border border-surface-container-high flex items-center gap-1">
                        TikTok: <b>@{c.tiktokUsername}</b>
                      </span>
                    )}
                    {c.instagramUsername && (
                      <span className="text-[10px] font-semibold bg-pink-50 text-pink-700 px-2 py-0.5 rounded-lg border border-pink-100 flex items-center gap-1">
                        IG: <b>@{c.instagramUsername}</b>
                      </span>
                    )}
                    {c.facebookUsername && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1">
                        FB: <b>{c.facebookUsername}</b>
                      </span>
                    )}
                  </div>

                  {/* Teléfonos y WhatsApp */}
                  <div className="text-xs space-y-1 text-on-surface bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-primary">
                        <Phone className="w-3.5 h-3.5 text-secondary" />
                        <span>{c.phonePrimary}</span>
                      </span>
                      {waNumber && (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    {c.phoneSecondary && (
                      <div className="text-on-surface-variant text-[11px] pl-5">
                        Secundario: {c.phoneSecondary}
                      </div>
                    )}
                  </div>

                  {/* Ubicación en Guatemala */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-primary">
                          {c.municipality.name}, {c.department.name}
                        </span>
                        <p className="text-on-surface-variant mt-0.5 text-[11px] leading-relaxed">{c.fullAddress}</p>
                        {c.addressReference && (
                          <p className="text-on-surface-variant italic text-[10px] mt-0.5">
                            Ref: {c.addressReference}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Código de barras del cliente con botón de imprimir carnet/etiqueta */}
                <div className="pt-2 border-t border-surface-container-high flex justify-center">
                  <BarcodeDisplay
                    value={c.barcode}
                    label={`Cliente: ${c.fullName}`}
                    showPrintButton={true}
                    height={32}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Comprador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full shadow-2xl border border-surface-container-high overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-primary-container p-5 text-on-primary flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base font-display">Registrar Perfil de Comprador</h3>
                <p className="text-xs text-secondary-fixed">
                  Genera automáticamente su código de barras escaneable
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-on-primary-container hover:text-on-primary text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-surface-container-lowest">
              {errorMsg && (
                <div className="p-3 text-xs bg-error-container text-on-error-container border border-error/20 rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana Lucía Morales Estrada"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                />
              </div>

              {/* Redes Sociales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Usuario TikTok
                  </label>
                  <input
                    type="text"
                    placeholder="@analucia_gt"
                    value={tiktokUsername}
                    onChange={(e) => setTiktokUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Usuario Instagram
                  </label>
                  <input
                    type="text"
                    placeholder="@analucia.fashion"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Nombre en Facebook
                  </label>
                  <input
                    type="text"
                    placeholder="Ana Lucia Morales"
                    value={facebookUsername}
                    onChange={(e) => setFacebookUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                  />
                </div>
              </div>

              {/* Teléfonos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Teléfono Principal (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 4589 1234"
                    value={phonePrimary}
                    onChange={(e) => setPhonePrimary(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Teléfono Secundario (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 5512 8765"
                    value={phoneSecondary}
                    onChange={(e) => setPhoneSecondary(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                  />
                </div>
              </div>

              {/* Ubicación: Departamento y Municipio de Guatemala en Cascada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Departamento de Guatemala *
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setMunicipalityId("");
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                    Municipio *
                  </label>
                  <select
                    required
                    disabled={!departmentId}
                    value={municipalityId}
                    onChange={(e) => setMunicipalityId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all disabled:opacity-50 cursor-pointer"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Dirección Completa de Entrega *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. 10 Avenida 4-35 Zona 1, Colonia El Calvario..."
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">
                  Punto de Referencia (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Casa verde de dos niveles, portón negro frente a la tienda"
                  value={addressReference}
                  onChange={(e) => setAddressReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-low border border-surface-container-high text-primary rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-hidden transition-all placeholder:text-outline"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-outline hover:text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-secondary text-primary rounded-xl hover:bg-secondary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  )}
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
