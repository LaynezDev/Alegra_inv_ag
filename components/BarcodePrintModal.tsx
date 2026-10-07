"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import {
  Printer,
  X,
  Search,
  CheckSquare,
  Square,
  Eye,
  Sliders,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  RotateCcw,
  Tag,
  CheckCircle2,
  FileText,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface ProductForPrint {
  id: number | string;
  barcode: string;
  name: string;
  salePrice: number;
  status: string;
  photos?: string | null;
}

export interface LabelPreset {
  id: string;
  name: string;
  shortName: string;
  description: string;
  labelsPerPage: number;
  columns: number;
  rows: number;
  sheetSize: "letter" | "a4" | "roll";
  labelWidthMm: number;
  labelHeightMm: number;
  gapColMm: number;
  gapRowMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  barcodeHeightPx: number;
  barcodeWidthFactor: number;
  barcodeFontSize: number;
  productNameFontSizePt: number;
  priceFontSizePt: number;
}

export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: "30_letter",
    name: "30 por Hoja (Estándar 1\" × 2.625\" - Avery 5160)",
    shortName: "30 por Hoja",
    description: "3 columnas × 10 filas • 66.7 × 25.4 mm. Tamaño Carta común para etiquetas de precio.",
    labelsPerPage: 30,
    columns: 3,
    rows: 10,
    sheetSize: "letter",
    labelWidthMm: 66.7,
    labelHeightMm: 25.4,
    gapColMm: 3.1,
    gapRowMm: 0,
    marginTopMm: 12.7,
    marginLeftMm: 4.8,
    barcodeHeightPx: 22,
    barcodeWidthFactor: 1.15,
    barcodeFontSize: 9,
    productNameFontSizePt: 8.5,
    priceFontSizePt: 9.5,
  },
  {
    id: "24_letter",
    name: "24 por Hoja (Mediana 1.33\" × 2.75\" - Avery 7159)",
    shortName: "24 por Hoja",
    description: "3 columnas × 8 filas • 63.5 × 33.9 mm. Mayor altura para texto y precio más grande.",
    labelsPerPage: 24,
    columns: 3,
    rows: 8,
    sheetSize: "letter",
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
    gapColMm: 2.5,
    gapRowMm: 0,
    marginTopMm: 13.0,
    marginLeftMm: 7.0,
    barcodeHeightPx: 28,
    barcodeWidthFactor: 1.25,
    barcodeFontSize: 10,
    productNameFontSizePt: 9.5,
    priceFontSizePt: 11,
  },
  {
    id: "21_letter",
    name: "21 por Hoja (Espaciosa 70 × 38.1 mm)",
    shortName: "21 por Hoja",
    description: "3 columnas × 7 filas • 70 × 38.1 mm. Etiquetas adhesivas estándar de alta legibilidad.",
    labelsPerPage: 21,
    columns: 3,
    rows: 7,
    sheetSize: "letter",
    labelWidthMm: 70.0,
    labelHeightMm: 38.1,
    gapColMm: 2.0,
    gapRowMm: 0,
    marginTopMm: 12.0,
    marginLeftMm: 5.0,
    barcodeHeightPx: 32,
    barcodeWidthFactor: 1.35,
    barcodeFontSize: 10.5,
    productNameFontSizePt: 10,
    priceFontSizePt: 12,
  },
  {
    id: "40_letter",
    name: "40 por Hoja (Compacta 48.5 × 25.4 mm)",
    shortName: "40 por Hoja",
    description: "4 columnas × 10 filas • 48.5 × 25.4 mm. Para prendas pequeñas o accesorios.",
    labelsPerPage: 40,
    columns: 4,
    rows: 10,
    sheetSize: "letter",
    labelWidthMm: 48.5,
    labelHeightMm: 25.4,
    gapColMm: 2.5,
    gapRowMm: 0,
    marginTopMm: 12.7,
    marginLeftMm: 5.0,
    barcodeHeightPx: 18,
    barcodeWidthFactor: 1.0,
    barcodeFontSize: 8.5,
    productNameFontSizePt: 7.5,
    priceFontSizePt: 8.5,
  },
  {
    id: "12_letter",
    name: "12 por Hoja (Grande 105 × 42.3 mm)",
    shortName: "12 por Hoja",
    description: "2 columnas × 6 filas • 105 × 42.3 mm. Formato grande para etiquetas de cartulina/gancho.",
    labelsPerPage: 12,
    columns: 2,
    rows: 6,
    sheetSize: "letter",
    labelWidthMm: 105.0,
    labelHeightMm: 42.3,
    gapColMm: 3.0,
    gapRowMm: 0,
    marginTopMm: 12.0,
    marginLeftMm: 3.0,
    barcodeHeightPx: 40,
    barcodeWidthFactor: 1.8,
    barcodeFontSize: 12,
    productNameFontSizePt: 11,
    priceFontSizePt: 13,
  },
  {
    id: "roll_50x30",
    name: "Rollo Térmico POS (50 × 30 mm)",
    shortName: "Rollo 50×30 mm",
    description: "1 etiqueta continua • Impresora térmica para tickets/etiquetas (Zebra, Xprinter).",
    labelsPerPage: 1,
    columns: 1,
    rows: 1,
    sheetSize: "roll",
    labelWidthMm: 50.0,
    labelHeightMm: 30.0,
    gapColMm: 0,
    gapRowMm: 0,
    marginTopMm: 1.0,
    marginLeftMm: 1.0,
    barcodeHeightPx: 26,
    barcodeWidthFactor: 1.3,
    barcodeFontSize: 9.5,
    productNameFontSizePt: 8.5,
    priceFontSizePt: 10.5,
  },
  {
    id: "roll_58x40",
    name: "Rollo Térmico POS (58 × 40 mm)",
    shortName: "Rollo 58×40 mm",
    description: "1 etiqueta continua • Rollo térmico mediano de alta nitidez.",
    labelsPerPage: 1,
    columns: 1,
    rows: 1,
    sheetSize: "roll",
    labelWidthMm: 58.0,
    labelHeightMm: 40.0,
    gapColMm: 0,
    gapRowMm: 0,
    marginTopMm: 1.0,
    marginLeftMm: 1.0,
    barcodeHeightPx: 34,
    barcodeWidthFactor: 1.4,
    barcodeFontSize: 10,
    productNameFontSizePt: 9.5,
    priceFontSizePt: 12,
  },
];

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductForPrint[];
  packageCode: string;
  initialSelectedIds?: (string | number)[];
}

// Subcomponente para renderizar la vista previa de código de barras
function PreviewBarcodeSvg({
  value,
  width,
  height,
  fontSize,
}: {
  value: string;
  width: number;
  height: number;
  fontSize: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 1,
          background: "#FFFFFF",
          lineColor: "#111827",
        });
      } catch (err) {
        console.error("Error al renderizar código de barras:", err);
      }
    }
  }, [value, width, height, fontSize]);

  return <svg ref={svgRef} className="max-w-full h-auto inline-block" />;
}

// Generador de string SVG en memoria para la ventana de impresión
function generateBarcodeSvgString(
  value: string,
  width: number,
  height: number,
  fontSize: number
): string {
  if (typeof document === "undefined") return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, {
      format: "CODE128",
      width,
      height,
      displayValue: true,
      fontSize,
      margin: 1,
      background: "#FFFFFF",
      lineColor: "#000000",
    });
    return svg.outerHTML;
  } catch (err) {
    console.error("Error al generar barcode svg string:", err);
    return `<div style="font-family: monospace; font-size: 10px; font-weight: bold; text-align: center;">${value}</div>`;
  }
}

export default function BarcodePrintModal({
  isOpen,
  onClose,
  products,
  packageCode,
  initialSelectedIds,
}: BarcodePrintModalProps) {
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<"selection" | "preview">("selection");

  // Selección de IDs
  const [selectedIds, setSelectedIds] = useState<Record<string | number, boolean>>({});

  // Cantidad de copias por prenda
  const [copies, setCopies] = useState<Record<string | number, number>>({});

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Configuración de formato
  const [selectedPresetId, setSelectedPresetId] = useState<string>("30_letter");
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showPackageCode, setShowPackageCode] = useState(true);
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [paperSize, setPaperSize] = useState<"letter" | "a4">("letter");

  // Paginación de vista previa
  const [previewPage, setPreviewPage] = useState(1);

  // Inicializar selección al abrir el modal o cambiar productos
  useEffect(() => {
    if (isOpen && products.length > 0) {
      const initialMap: Record<string | number, boolean> = {};
      const initialCopies: Record<string | number, number> = {};

      if (initialSelectedIds && initialSelectedIds.length > 0) {
        initialSelectedIds.forEach((id) => {
          initialMap[id] = true;
          initialCopies[id] = 1;
        });
      } else {
        // Por defecto seleccionamos todas las prendas disponibles y apartadas (o todas si no hay disponibles)
        products.forEach((p) => {
          initialMap[p.id] = p.status !== "vendido";
          initialCopies[p.id] = 1;
        });

        // Si ninguna quedó seleccionada (ej. todas vendidas), seleccionamos todas
        const hasAny = Object.values(initialMap).some(Boolean);
        if (!hasAny) {
          products.forEach((p) => {
            initialMap[p.id] = true;
          });
        }
      }

      setSelectedIds(initialMap);
      setCopies(initialCopies);
      setPreviewPage(1);
    }
  }, [isOpen, products, initialSelectedIds]);

  const currentPreset = useMemo(() => {
    return (
      LABEL_PRESETS.find((p) => p.id === selectedPresetId) || LABEL_PRESETS[0]
    );
  }, [selectedPresetId]);

  // Filtrado de prendas en la lista
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.barcode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "todos" || prod.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  // Lista expandida de etiquetas seleccionadas (tomando en cuenta número de copias)
  const itemsToPrint = useMemo(() => {
    const list: ProductForPrint[] = [];
    products.forEach((prod) => {
      if (selectedIds[prod.id]) {
        const qty = copies[prod.id] || 1;
        for (let i = 0; i < qty; i++) {
          list.push(prod);
        }
      }
    });
    return list;
  }, [products, selectedIds, copies]);

  const totalLabels = itemsToPrint.length;
  const totalPages = Math.max(1, Math.ceil(totalLabels / currentPreset.labelsPerPage));

  // Ajustar página de vista previa si excede el total
  useEffect(() => {
    if (previewPage > totalPages) {
      setPreviewPage(totalPages);
    }
  }, [totalPages, previewPage]);

  // Etiquetas para la página de vista previa actual
  const previewPageItems = useMemo(() => {
    const startIdx = (previewPage - 1) * currentPreset.labelsPerPage;
    return itemsToPrint.slice(startIdx, startIdx + currentPreset.labelsPerPage);
  }, [itemsToPrint, previewPage, currentPreset.labelsPerPage]);

  // Handlers de selección masiva
  const handleSelectAllFiltered = (select: boolean) => {
    const updated = { ...selectedIds };
    filteredProducts.forEach((p) => {
      updated[p.id] = select;
    });
    setSelectedIds(updated);
  };

  const handleSelectOnlyAvailable = () => {
    const updated = { ...selectedIds };
    products.forEach((p) => {
      updated[p.id] = p.status === "disponible";
    });
    setSelectedIds(updated);
  };

  const handleToggleProduct = (id: string | number) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyChange = (id: string | number, delta: number) => {
    setCopies((prev) => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(50, current + delta));
      return { ...prev, [id]: next };
    });
  };

  // Motor de Impresión: Genera el HTML y activa la ventana de impresión
  const handleExecutePrint = () => {
    if (totalLabels === 0) {
      alert("Por favor selecciona al menos una prenda para imprimir.");
      return;
    }

    // Agrupar items por páginas
    const pages: ProductForPrint[][] = [];
    for (let i = 0; i < itemsToPrint.length; i += currentPreset.labelsPerPage) {
      pages.push(itemsToPrint.slice(i, i + currentPreset.labelsPerPage));
    }

    // Generar el HTML de las páginas
    const pagesHtml = pages
      .map((pageItems, pageIndex) => {
        const labelsHtml = pageItems
          .map((item) => {
            const svgString = generateBarcodeSvgString(
              item.barcode,
              currentPreset.barcodeWidthFactor,
              currentPreset.barcodeHeightPx,
              currentPreset.barcodeFontSize
            );

            return `
              <div class="label-box">
                ${
                  showPackageCode
                    ? `<div class="label-pkg">${packageCode}</div>`
                    : ""
                }
                ${
                  showProductName
                    ? `<div class="label-title" title="${item.name}">${item.name}</div>`
                    : ""
                }
                <div class="label-svg-wrap">
                  ${svgString}
                </div>
                ${
                  showPrice
                    ? `<div class="label-price">${formatCurrency(item.salePrice)}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("");

        return `
          <div class="sheet">
            ${labelsHtml}
          </div>
        `;
      })
      .join("");

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Etiquetas_${packageCode}_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            @page {
              size: ${
                currentPreset.sheetSize === "roll"
                  ? `${currentPreset.labelWidthMm}mm ${currentPreset.labelHeightMm}mm`
                  : `${paperSize} portrait`
              };
              margin: ${
                currentPreset.sheetSize === "roll"
                  ? "0mm"
                  : `${currentPreset.marginTopMm}mm ${currentPreset.marginLeftMm}mm`
              };
            }
            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #ffffff;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              display: grid;
              grid-template-columns: repeat(${currentPreset.columns}, ${currentPreset.labelWidthMm}mm);
              grid-template-rows: repeat(${currentPreset.rows}, ${currentPreset.labelHeightMm}mm);
              column-gap: ${currentPreset.gapColMm}mm;
              row-gap: ${currentPreset.gapRowMm}mm;
              page-break-after: always;
              break-after: page;
              width: 100%;
              box-sizing: border-box;
            }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .label-box {
              width: ${currentPreset.labelWidthMm}mm;
              height: ${currentPreset.labelHeightMm}mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 1mm 1.5mm;
              box-sizing: border-box;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
              ${
                showCutGuides && currentPreset.sheetSize !== "roll"
                  ? "border: 0.5px dashed #cccccc;"
                  : "border: 0.5px solid transparent;"
              }
              border-radius: 2px;
            }
            .label-pkg {
              font-size: 6.5pt;
              color: #555555;
              line-height: 1;
              margin-bottom: 0.5mm;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .label-title {
              font-size: ${currentPreset.productNameFontSizePt}pt;
              font-weight: 700;
              line-height: 1.15;
              max-width: 96%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 0.5mm;
            }
            .label-svg-wrap {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              margin: 0.5mm 0;
            }
            .label-svg-wrap svg {
              max-width: 98%;
              height: auto;
              display: block;
            }
            .label-price {
              font-size: ${currentPreset.priceFontSizePt}pt;
              font-weight: 800;
              line-height: 1.1;
              margin-top: 0.5mm;
              letter-spacing: -0.2px;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    // Intentar ventana emergente
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDocument);
      printWindow.document.close();
      return;
    }

    // Respaldo con Iframe oculto si las ventanas emergentes estuviesen bloqueadas
    let iframe = document.getElementById("print-barcode-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-barcode-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printDocument);
      doc.close();
    }
  };

  if (!isOpen) return null;

  const countSelected = Object.values(selectedIds).filter(Boolean).length;
  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds[p.id]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full max-h-[92vh] bg-surface-container-lowest border border-surface-container-high rounded-3xl shadow-2xl flex flex-col overflow-hidden text-on-surface"
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-container-high bg-surface-container-low/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-on-primary rounded-2xl shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-display text-base sm:text-lg text-primary flex items-center gap-2">
                <span>Impresión Masiva de Códigos de Barra</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
                  Lote {packageCode}
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Selecciona prendas, configura el tamaño de hoja y manda a imprimir con un clic.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas y Resumen Rápido */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-surface-container-lowest border-b border-surface-container-high shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("selection")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "selection"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>1. Seleccionar Prendas ({countSelected})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2. Formato & Vista Previa</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="font-semibold">
              <b className="text-primary">{totalLabels}</b> etiquetas seleccionadas
            </span>
            <span>•</span>
            <span className="font-semibold">
              <b className="text-primary">{totalPages}</b> {totalPages === 1 ? "hoja" : "hojas"} ({currentPreset.shortName})
            </span>
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === "selection" ? (
            /* ================= PESTAÑA 1: SELECCIÓN DE PRENDAS ================= */
            <div className="space-y-4">
              {/* Barra de Búsqueda y Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por prenda o código de barra..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-lowest border border-surface-container-high rounded-xl focus:outline-hidden focus:border-primary text-on-surface placeholder:text-outline-variant"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-surface-container-high rounded-xl focus:outline-hidden focus:border-primary text-on-surface"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="disponible">Solo Disponibles</option>
                    <option value="apartado">Solo Apartadas</option>
                    <option value="vendido">Solo Vendidas</option>
                  </select>
                </div>

                <div className="sm:col-span-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllFiltered(!allFilteredSelected)}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl border border-surface-container-high transition-colors flex items-center justify-center gap-1.5"
                  >
                    {allFilteredSelected ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span>Deseleccionar</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-secondary" />
                        <span>Todos ({filteredProducts.length})</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyAvailable}
                    className="px-2.5 py-2 text-xs font-bold bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim rounded-xl transition-colors"
                    title="Seleccionar únicamente prendas disponibles"
                  >
                    Solo Disp.
                  </button>
                </div>
              </div>

              {/* Lista de Prendas para Seleccionar */}
              <div className="border border-surface-container-high rounded-2xl overflow-hidden bg-surface-container-lowest shadow-xs">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <AlertCircle className="w-8 h-8 text-outline-variant mx-auto mb-2" />
                    <p className="text-xs font-bold text-primary">No se encontraron prendas con este filtro</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Prueba limpiando la búsqueda o cambiando el filtro de estado.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-container-high max-h-[50vh] overflow-y-auto">
                    {filteredProducts.map((prod) => {
                      const isChecked = !!selectedIds[prod.id];
                      const qty = copies[prod.id] || 1;
                      const photos: string[] = prod.photos ? JSON.parse(prod.photos) : [];
                      const primaryPhoto = photos.length > 0 ? photos[0] : null;

                      return (
                        <div
                          key={prod.id}
                          className={`flex items-center justify-between p-3 transition-colors ${
                            isChecked
                              ? "bg-secondary-fixed/15 hover:bg-secondary-fixed/25"
                              : "hover:bg-surface-container-low/50 opacity-70"
                          }`}
                        >
                          <div
                            onClick={() => handleToggleProduct(prod.id)}
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Manejado por div contenedor
                              className="w-4 h-4 rounded-md text-primary accent-primary cursor-pointer shrink-0"
                            />

                            <div className="w-10 h-10 rounded-lg bg-surface-container-low border border-surface-container-high overflow-hidden shrink-0 flex items-center justify-center">
                              {primaryPhoto ? (
                                <img
                                  src={primaryPhoto}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Tag className="w-4 h-4 text-outline-variant" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-primary truncate max-w-xs sm:max-w-md">
                                  {prod.name}
                                </h4>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    prod.status === "disponible"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : prod.status === "apartado"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {prod.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-on-surface-variant font-mono">
                                <span>{prod.barcode}</span>
                                <span>•</span>
                                <span className="font-bold text-primary font-display">
                                  {formatCurrency(prod.salePrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Control de Copias por Prenda */}
                          <div className="flex items-center gap-2 pl-3 shrink-0">
                            <span className="text-[10px] font-semibold text-on-surface-variant hidden sm:inline">
                              Copias:
                            </span>
                            <div className="flex items-center border border-surface-container-high rounded-xl bg-surface-container-lowest overflow-hidden">
                              <button
                                type="button"
                                disabled={!isChecked || qty <= 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyChange(prod.id, -1);
                                }}
                                className="p-1 hover:bg-surface-container-low text-on-surface-variant disabled:opacity-30 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold font-mono">
                                {qty}
                              </span>
                              <button
                                type="button"
                                disabled={!isChecked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyChange(prod.id, 1);
                                }}
                                className="p-1 hover:bg-surface-container-low text-on-surface-variant disabled:opacity-30 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= PESTAÑA 2: CONFIGURACIÓN & VISTA PREVIA ================= */
            <div className="space-y-6">
              {/* Selector de Plantilla / Distribución por Hoja */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-secondary" />
                    <span>Selecciona el Tamaño y Distribución de Etiquetas (X por hoja)</span>
                  </label>
                  <span className="text-xs text-on-surface-variant font-semibold">
                    Preset actual: <b>{currentPreset.shortName}</b>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {LABEL_PRESETS.map((preset) => {
                    const isSelected = preset.id === selectedPresetId;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-secondary-fixed/20 border-secondary ring-1 ring-secondary shadow-xs"
                            : "bg-surface-container-lowest border-surface-container-high hover:border-secondary/50 hover:bg-surface-container-low/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-primary font-display">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">
                            {preset.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[10px] text-on-surface-variant font-medium">
                          <span>
                            {preset.columns} col × {preset.rows} fil
                          </span>
                          <span className="font-bold text-primary bg-surface-container-low px-2 py-0.5 rounded-md">
                            {preset.labelsPerPage === 1 ? "1 etiqueta" : `${preset.labelsPerPage} por hoja`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opciones de Contenido de la Etiqueta */}
              <div className="p-4 bg-surface-container-low/50 rounded-2xl border border-surface-container-high space-y-3">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-secondary" />
                  <span>Opciones de la Etiqueta Físicas</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showProductName}
                      onChange={(e) => setShowProductName(e.target.checked)}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <span className="font-medium">Nombre de prenda</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <span className="font-medium">Precio de venta</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPackageCode}
                      onChange={(e) => setShowPackageCode(e.target.checked)}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <span className="font-medium">Código de Lote</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showCutGuides}
                      onChange={(e) => setShowCutGuides(e.target.checked)}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <span className="font-medium">Líneas de corte</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-surface-container-high text-xs">
                  <span className="text-on-surface-variant font-semibold">Tamaño de Papel:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperSize("letter")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        paperSize === "letter"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest text-on-surface-variant border border-surface-container-high"
                      }`}
                    >
                      Carta (Letter 8.5" × 11")
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize("a4")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        paperSize === "a4"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest text-on-surface-variant border border-surface-container-high"
                      }`}
                    >
                      A4 (210 × 297 mm)
                    </button>
                  </div>
                </div>
              </div>

              {/* Vista Previa Interactiva de la Hoja */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <Eye className="w-3.5 h-3.5 text-secondary" />
                      <span>Vista Previa Impresa ({paperSize.toUpperCase()})</span>
                    </h4>
                    <span className="text-xs text-on-surface-variant">
                      (Página {previewPage} de {totalPages})
                    </span>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={previewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold px-2">
                        {previewPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={previewPage >= totalPages}
                        onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded-lg border border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Hoja Simulada */}
                <div className="bg-neutral-800/80 p-4 sm:p-6 rounded-2xl flex justify-center overflow-x-auto shadow-inner">
                  <div
                    className="bg-white text-black shadow-2xl rounded-xs p-3 min-w-[320px] max-w-[700px] w-full"
                    style={{
                      aspectRatio:
                        currentPreset.sheetSize === "roll"
                          ? `${currentPreset.labelWidthMm} / ${currentPreset.labelHeightMm}`
                          : "8.5 / 11",
                    }}
                  >
                    {previewPageItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                        No hay etiquetas seleccionadas para esta hoja.
                      </div>
                    ) : (
                      <div
                        className="grid gap-1.5 w-full h-full"
                        style={{
                          gridTemplateColumns: `repeat(${currentPreset.columns}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${currentPreset.rows}, minmax(0, 1fr))`,
                        }}
                      >
                        {previewPageItems.map((item, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col items-center justify-center p-1 text-center overflow-hidden rounded-xs bg-white ${
                              showCutGuides && currentPreset.sheetSize !== "roll"
                                ? "border border-dashed border-gray-300"
                                : ""
                            }`}
                          >
                            {showPackageCode && (
                              <span className="text-[8px] text-gray-500 uppercase leading-none mb-0.5">
                                {packageCode}
                              </span>
                            )}
                            {showProductName && (
                              <span className="text-[10px] font-bold text-gray-900 truncate max-w-[95%] leading-tight mb-0.5">
                                {item.name}
                              </span>
                            )}
                            <div className="w-full flex justify-center my-0.5">
                              <PreviewBarcodeSvg
                                value={item.barcode}
                                width={currentPreset.barcodeWidthFactor}
                                height={currentPreset.barcodeHeightPx}
                                fontSize={currentPreset.barcodeFontSize}
                              />
                            </div>
                            {showPrice && (
                              <span className="text-[11px] font-extrabold text-black leading-none mt-0.5">
                                {formatCurrency(item.salePrice)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal con Acciones */}
        <div className="p-4 sm:p-5 border-t border-surface-container-high bg-surface-container-low/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-on-surface-variant flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Listo para imprimir <b>{totalLabels} etiquetas</b> en <b>{totalPages} {totalPages === 1 ? "hoja" : "hojas"}</b>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded-xl transition-colors"
            >
              Cerrar
            </button>

            {activeTab === "selection" && (
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className="px-4 py-2.5 text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Formato & Hoja</span>
              </button>
            )}

            <button
              type="button"
              disabled={totalLabels === 0}
              onClick={handleExecutePrint}
              className="px-6 py-2.5 text-xs font-bold bg-primary hover:bg-primary-container text-on-primary rounded-xl disabled:opacity-40 transition-all shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-secondary-fixed" />
              <span>Imprimir {totalLabels} {totalLabels === 1 ? "Etiqueta" : "Etiquetas"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
