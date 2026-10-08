"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  StoreSettings, 
  BankAccount, 
  ProductNounKey, 
  PRESET_NOUNS, 
  DEFAULT_STORE_SETTINGS, 
  getGrammarTexts 
} from "@/lib/settings";
import { 
  Save, 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  Check, 
  Copy, 
  Sparkles, 
  Building2, 
  CreditCard, 
  SlidersHorizontal, 
  Eye, 
  MessageCircle, 
  ShoppingBag, 
  RefreshCw,
  HelpCircle
} from "lucide-react";

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para subida de imagen
  const [uploadingImage, setUploadingImage] = useState(false);
  const [detectedDimensions, setDetectedDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para prueba de copia en cuentas bancarias
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Cargar configuración existente
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data: StoreSettings = await res.json();
          setSettings(data);
          if (data.logoUrl) {
            checkImageDimensions(data.logoUrl);
          }
        }
      } catch (err) {
        console.error("Error al cargar configuración:", err);
        setErrorMessage("No se pudo cargar la configuración actual.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const checkImageDimensions = (url: string) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setDetectedDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  };

  // Manejador de subida de imagen
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe pesar más de 5MB.");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.urls && data.urls.length > 0) {
        const newLogoUrl = data.urls[0];
        setSettings((prev) => ({ ...prev, logoUrl: newLogoUrl }));
        checkImageDimensions(newLogoUrl);
      } else {
        alert("Error al subir imagen: " + (data.error || "Intente de nuevo"));
      }
    } catch (err: any) {
      alert("Error de conexión al subir imagen: " + err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => ({ ...prev, logoUrl: "" }));
    setDetectedDimensions(null);
  };

  // Manejador del tipo de producto
  const handleSelectPreset = (key: ProductNounKey) => {
    if (key === "personalizado") {
      setSettings((prev) => ({
        ...prev,
        productNoun: "personalizado",
      }));
      return;
    }

    const preset = PRESET_NOUNS[key];
    setSettings((prev) => ({
      ...prev,
      productNoun: key,
      nounSingular: preset.singular,
      nounPlural: preset.plural,
      nounGender: preset.gender,
    }));
  };

  // Manejadores de cuentas bancarias
  const handleAddBankAccount = (presetBank?: string) => {
    const newAccount: BankAccount = {
      id: `bank_${Date.now()}`,
      bankName: presetBank || "Banco Industrial (BI)",
      accountType: "Monetaria",
      accountNumber: "",
      accountHolder: settings.storeName || "Alegra Boutique",
    };
    setSettings((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAccount],
    }));
  };

  const handleUpdateBankAccount = (id: string, field: keyof BankAccount, val: string) => {
    setSettings((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((acc) =>
        acc.id === id ? { ...acc, [field]: val } : acc
      ),
    }));
  };

  const handleDeleteBankAccount = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((acc) => acc.id !== id),
    }));
  };

  const handleTestCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankId(id);
    setTimeout(() => setCopiedBankId(null), 2000);
  };

  // Guardar configuración
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  // Textos calculados dinámicamente según la concordancia
  const grammar = getGrammarTexts(settings);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary-container text-secondary-fixed flex items-center justify-center animate-pulse mb-4">
          <SlidersHorizontal className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-primary">Cargando configuración...</p>
        <p className="text-xs text-on-surface-variant mt-1">Un momento por favor</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 pb-32 space-y-8">
      {/* Barra superior con navegación y botón de Guardar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-container-high pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/pos"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
              title="Volver al POS"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Configuración de la Tienda</h1>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant pl-8">
            Personaliza la imagen principal, textos de marca, tipo de productos y cuentas bancarias.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all ${
              saveSuccess
                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                : "bg-primary text-on-primary hover:bg-primary/95 shadow-primary/20"
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Cambios Guardados!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-error-container text-error text-xs font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="underline ml-2">Cerrar</button>
        </div>
      )}

      {/* SECCIÓN 1: Identidad de Marca y Logotipo */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 border-b border-surface-container-high pb-3">
          <div className="p-2 rounded-xl bg-primary-container text-secondary-fixed">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-base text-on-surface">1. Imagen Principal & Identidad de Marca</h2>
            <p className="text-xs text-on-surface-variant">Logotipo de la tienda y leyenda inferior que ven tus clientes</p>
          </div>
        </div>

        {/* Subida de Imagen con Medidas Exactas */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-primary">
            Logotipo / Imagen Principal
          </label>

          {/* Guía de Dimensiones Exactas */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/80 text-xs space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Medidas y especificaciones recomendadas para subir tu imagen:</span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-on-surface-variant text-[11px] leading-relaxed">
              <li>
                <strong className="text-on-surface">Formato Cuadrado (Ícono / Avatar 1:1):</strong>{" "}
                <span className="font-mono font-bold text-primary">512 × 512 píxeles</span>{" "}
                (o mínimo 256 × 256 px). Ideal para logos redondeados, sellos o isotipos.
              </li>
              <li>
                <strong className="text-on-surface">Formato Horizontal (Banner 3:1):</strong>{" "}
                <span className="font-mono font-bold text-primary">600 × 200 píxeles</span>{" "}
                (o 400 × 120 px). Ideal para nombres de marca alargados o firmas.
              </li>
              <li>
                <strong className="text-on-surface">Formatos soportados:</strong> PNG (con fondo transparente recomendado), JPG o WebP. Tamaño máximo: 5 MB.
              </li>
            </ul>
          </div>

          {/* Área de Visualización / Subida */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Dropzone o Vista Previa */}
            <div>
              {settings.logoUrl ? (
                <div className="p-4 rounded-2xl border border-surface-container-high bg-surface-container-low flex flex-col items-center gap-3 relative">
                  <div className="w-32 h-32 rounded-2xl bg-white p-2 border border-surface-container-high flex items-center justify-center overflow-hidden shadow-sm">
                    <img
                      src={settings.logoUrl}
                      alt="Logo Tienda"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {detectedDimensions && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium">
                      Dimensiones: {detectedDimensions.width} × {detectedDimensions.height} px
                    </span>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Cambiar imagen
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 rounded-xl bg-error-container/40 hover:bg-error-container text-xs font-semibold text-error transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-surface-container-highest hover:border-primary/50 bg-surface-container-low/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:scale-105 transition-all mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-on-surface group-hover:text-primary">
                    Haz clic para subir tu logotipo
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    512 × 512 px (cuadrado) o 600 × 200 px (horizontal)
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>

            {/* Simulación de cómo se ve en la cabecera del cliente */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Vista previa en la cabecera
              </span>
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high text-center space-y-1">
                {settings.logoUrl ? (
                  <div className="w-12 h-12 mx-auto rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 mb-1 border border-surface-container-high shadow-xs">
                    <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-container text-secondary-fixed shadow-xs mb-1">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                <h3 className="font-display font-black text-lg tracking-widest text-primary">
                  {settings.storeName || "ALEGRA"}
                </h3>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                  {settings.tagline || "Inventario & Live POS"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inputs de Nombre y Leyenda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-surface">
              Nombre de la Marca / Tienda
            </label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => setSettings((prev) => ({ ...prev, storeName: e.target.value }))}
              placeholder="ALEGRA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-surface">
              Texto o Leyenda de abajo
            </label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => setSettings((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="Inventario & Live POS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {/* Sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Inventario & Live POS",
                "Boutique & Live Shopping",
                "Tienda Oficial & Envíos",
                "Variedad & Calidad",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, tagline: sug }))}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: Tipo de Producto y Concordancia Gramatical */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 border-b border-surface-container-high pb-3">
          <div className="p-2 rounded-xl bg-primary-container text-secondary-fixed">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-base text-on-surface">2. ¿Qué vendes en tu tienda? (Adaptación de Textos)</h2>
            <p className="text-xs text-on-surface-variant">
              Adapta los mensajes automáticos ("prendas", "juguetes", "platillos", etc.) con concordancia exacta
            </p>
          </div>
        </div>

        {/* Tarjetas de Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(PRESET_NOUNS) as Array<Exclude<ProductNounKey, "personalizado">>).map((key) => {
            const preset = PRESET_NOUNS[key];
            const isSelected = settings.productNoun === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-primary-container/30 border-primary text-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-surface-container-low border-surface-container-high hover:border-surface-container-highest text-on-surface"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-2xl">{preset.icon}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <div>
                  <div className="font-bold text-xs capitalize">{key}</div>
                  <div className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                    {preset.gender === "f" ? "Femenino (las)" : "Masculino (los)"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Botón para Modo Personalizado */}
        <div>
          <button
            type="button"
            onClick={() => handleSelectPreset("personalizado")}
            className={`w-full p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-colors ${
              settings.productNoun === "personalizado"
                ? "bg-primary-container/30 border-primary text-primary"
                : "bg-surface-container-low border-surface-container-high hover:bg-surface-container text-on-surface-variant"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>✏️</span>
              <span>Personalizar sustantivo manualmente (ej. bolsos, accesorios, postres)</span>
            </span>
            {settings.productNoun === "personalizado" && <Check className="w-4 h-4 text-primary" />}
          </button>
        </div>

        {/* Inputs de Personalización si se elige 'personalizado' */}
        {settings.productNoun === "personalizado" && (
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-on-surface">Singular</label>
              <input
                type="text"
                value={settings.nounSingular}
                onChange={(e) => setSettings((prev) => ({ ...prev, nounSingular: e.target.value }))}
                placeholder="ej. bolso"
                className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-on-surface">Plural</label>
              <input
                type="text"
                value={settings.nounPlural}
                onChange={(e) => setSettings((prev) => ({ ...prev, nounPlural: e.target.value }))}
                placeholder="ej. bolsos"
                className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-on-surface">Género Gramatical</label>
              <select
                value={settings.nounGender}
                onChange={(e) => setSettings((prev) => ({ ...prev, nounGender: e.target.value as "f" | "m" }))}
                className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold"
              >
                <option value="f">Femenino (las / reservadas)</option>
                <option value="m">Masculino (los / reservados)</option>
              </select>
            </div>
          </div>
        )}

        {/* PREVIEW EN TIEMPO REAL de cómo se verán los textos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>Previsualización en vivo de los textos adaptados:</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Ejemplo 1: Banner de Pedido Apartado */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                1. Banner de Pedido Apartado (Enlace de fotos del pedido)
              </span>
              <p className="font-semibold text-xs leading-relaxed">
                "{grammar.reservedBanner}"
              </p>
            </div>

            {/* Ejemplo 2: Título de Galería */}
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high text-on-surface flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                  2. Título de Galería de Fotos
                </span>
                <span className="font-bold text-xs text-primary">{grammar.photosHeading}</span>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-medium">
                3 {grammar.plural}
              </span>
            </div>

            {/* Ejemplo 3: Mensaje WhatsApp para Catálogo */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                3. Mensaje enviado por el cliente al tocar "¡Me interesa!" en catálogo
              </span>
              <p className="text-xs font-medium italic">
                "{grammar.whatsappInterest("Ejemplo Producto", "COD-123")}"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: Números de Cuenta Bancaria */}
      <section className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-surface-container-high pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-container text-secondary-fixed">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-on-surface">3. Cuentas Bancarias para Depósitos</h2>
              <p className="text-xs text-on-surface-variant">
                Se muestran a los clientes en la vista de fotos de su pedido con botón para copiar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAddBankAccount()}
            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Agregar Cuenta
          </button>
        </div>

        {/* Botones de bancos frecuentes para agregar rápidamente */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-on-surface-variant">Bancos frecuentes en Guatemala:</span>
          {["Banco Industrial (BI)", "Banrural", "BAC Credomatic", "G&T Continental"].map((bank) => (
            <button
              key={bank}
              type="button"
              onClick={() => handleAddBankAccount(bank)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {bank}
            </button>
          ))}
        </div>

        {/* Lista de Cuentas Configuradas */}
        <div className="space-y-4">
          {settings.bankAccounts.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-surface-container-high text-center space-y-2">
              <p className="text-xs text-on-surface-variant">No tienes cuentas bancarias configuradas.</p>
              <button
                type="button"
                onClick={() => handleAddBankAccount("Banco Industrial (BI)")}
                className="text-xs text-primary font-bold hover:underline"
              >
                + Agregar primera cuenta
              </button>
            </div>
          ) : (
            settings.bankAccounts.map((account, index) => (
              <div
                key={account.id}
                className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-secondary" />
                    <span className="text-xs font-bold text-on-surface">Cuenta #{index + 1}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón de prueba de copiado */}
                    <button
                      type="button"
                      onClick={() => handleTestCopy(account.accountNumber, account.id)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      title="Probar copiado"
                    >
                      {copiedBankId === account.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Probar Copia</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBankAccount(account.id)}
                      className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface">Banco</label>
                    <input
                      type="text"
                      value={account.bankName}
                      onChange={(e) => handleUpdateBankAccount(account.id, "bankName", e.target.value)}
                      placeholder="Banco Industrial (BI)"
                      className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface">Tipo de Cuenta</label>
                    <input
                      type="text"
                      value={account.accountType}
                      onChange={(e) => handleUpdateBankAccount(account.id, "accountType", e.target.value)}
                      placeholder="Monetaria / Ahorro"
                      className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface">Número de Cuenta</label>
                    <input
                      type="text"
                      value={account.accountNumber}
                      onChange={(e) => handleUpdateBankAccount(account.id, "accountNumber", e.target.value)}
                      placeholder="000-000000-0"
                      className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-mono font-bold focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface">Nombre de Titular</label>
                    <input
                      type="text"
                      value={account.accountHolder}
                      onChange={(e) => handleUpdateBankAccount(account.id, "accountHolder", e.target.value)}
                      placeholder="Alegra Boutique"
                      className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface-container-lowest text-xs font-semibold focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Botón flotante inferior para guardar cómodamente */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 shadow-xl transition-all ${
            saveSuccess
              ? "bg-emerald-600 text-white shadow-emerald-500/30 scale-105"
              : "bg-primary text-on-primary hover:bg-primary/95 shadow-primary/30 hover:scale-105 active:scale-95"
          }`}
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Guardando cambios...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>¡Cambios Guardados con Éxito!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
