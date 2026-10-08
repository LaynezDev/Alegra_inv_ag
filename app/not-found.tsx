import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-6 shadow-sm">
        <AlertCircle className="w-8 h-8 text-secondary" />
      </div>
      
      <h1 className="text-6xl font-black text-on-surface tracking-tight mb-2 font-display">
        404
      </h1>
      
      <h2 className="text-xl font-bold text-on-surface mb-2">
        Página no encontrada
      </h2>
      
      <p className="text-sm text-on-surface-variant max-w-md mb-8">
        La dirección solicitada no existe, ha sido cambiada o no está disponible en este momento.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors shadow-xs"
      >
        Ir a la página principal
      </Link>
    </div>
  );
}
