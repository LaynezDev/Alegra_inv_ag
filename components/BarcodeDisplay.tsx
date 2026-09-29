"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";

interface BarcodeDisplayProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  label?: string;
  showPrintButton?: boolean;
}

export default function BarcodeDisplay({
  value,
  width = 1.6,
  height = 42,
  displayValue = true,
  fontSize = 13,
  label,
  showPrintButton = false,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize,
          margin: 4,
          background: "#FFFFFF",
          lineColor: "#233142",
        });
      } catch (err) {
        console.error("Error generando código de barras:", err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Etiqueta - ${value}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 10px;
              margin: 0;
            }
            .label-title {
              font-size: 12px;
              font-weight: 600;
              color: #233142;
              margin-bottom: 4px;
              text-align: center;
            }
            svg {
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          ${label ? `<div class="label-title">${label}</div>` : ""}
          ${svgRef.current ? svgRef.current.outerHTML : ""}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="inline-flex flex-col items-center p-2 bg-white rounded-lg border border-alegra-border shadow-xs">
      {label && (
        <span className="text-xs font-medium text-alegra-navy mb-1 text-center truncate max-w-[200px]">
          {label}
        </span>
      )}
      <svg ref={svgRef} className="max-w-full" />
      {showPrintButton && (
        <button
          onClick={handlePrint}
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-alegra-navy bg-alegra-sand-light hover:bg-alegra-sand/30 rounded-md transition-colors"
          title="Imprimir código de barras"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir Etiqueta
        </button>
      )}
    </div>
  );
}
