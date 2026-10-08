"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShoppingBag, Delete, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function AccesoPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = useCallback(async (pinToSubmit: string) => {
    if (loading || pinToSubmit.length < 4) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToSubmit }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/pos");
          router.refresh();
        }, 400);
      } else {
        setError(data.error || "PIN incorrecto");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPin("");
      }
    } catch {
      setError("Error de conexión. Intente de nuevo.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [loading, router]);

  // Listener para teclado físico (escritorio/laptop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || success) return;

      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 6) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          if (nextPin.length === 4) {
            handleSubmit(nextPin);
          }
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === "Enter" && pin.length >= 4) {
        handleSubmit(pin);
      } else if (e.key === "Escape") {
        setPin("");
        setError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, loading, success, handleSubmit]);

  const handleKeypadPress = (val: string) => {
    if (loading || success) return;
    setError(null);

    if (val === "clear") {
      setPin("");
    } else if (val === "backspace") {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handleSubmit(nextPin);
      }
    }
  };

  const keypadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 select-none">
      <div className="w-full max-w-sm">
        {/* Card Contenedora */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-surface-container-high shadow-xl shadow-black/5 text-center flex flex-col items-center">
          {/* Logo / Ícono */}
          <div className="w-14 h-14 rounded-2xl bg-primary-container text-secondary-fixed flex items-center justify-center shadow-sm mb-4">
            <ShoppingBag className="w-7 h-7" />
          </div>

          <h1 className="font-display font-black text-2xl tracking-wider text-primary">
            ALEGRA
          </h1>
          <p className="text-xs font-semibold text-secondary uppercase tracking-widest mt-0.5 mb-6">
            Terminal de Tienda
          </p>

          {/* Estado de PIN (Círculos indicadores) */}
          <div className="w-full mb-6">
            <div
              className={`flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-surface-container-low transition-transform ${
                isShaking ? "animate-bounce" : ""
              }`}
            >
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      filled
                        ? success
                          ? "bg-emerald-500 scale-125"
                          : error
                          ? "bg-error scale-110"
                          : "bg-primary scale-110 shadow-xs shadow-primary/40"
                        : "bg-surface-container-highest border border-outline-variant/40"
                    }`}
                  />
                );
              })}
            </div>

            {/* Mensajes de feedback */}
            <div className="min-h-[24px] mt-2 flex items-center justify-center">
              {loading && (
                <span className="text-xs text-primary font-medium animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  Verificando PIN...
                </span>
              )}
              {success && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Acceso concedido
                </span>
              )}
              {error && !loading && (
                <span className="text-xs text-error font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </span>
              )}
              {!loading && !success && !error && (
                <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <Lock className="w-3 h-3 text-secondary" />
                  Ingresa el PIN de 4 dígitos
                </span>
              )}
            </div>
          </div>

          {/* Teclado Numérico Táctil */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {keypadButtons.map((row, rowIdx) =>
              row.map((btnKey) => {
                if (btnKey === "clear") {
                  return (
                    <button
                      key={`key-${rowIdx}-${btnKey}`}
                      type="button"
                      onClick={() => handleKeypadPress("clear")}
                      disabled={loading || pin.length === 0}
                      className="h-14 rounded-2xl flex items-center justify-center text-xs font-bold text-on-surface-variant hover:bg-surface-container active:scale-95 disabled:opacity-30 transition-all"
                    >
                      C
                    </button>
                  );
                }

                if (btnKey === "backspace") {
                  return (
                    <button
                      key={`key-${rowIdx}-${btnKey}`}
                      type="button"
                      onClick={() => handleKeypadPress("backspace")}
                      disabled={loading || pin.length === 0}
                      className="h-14 rounded-2xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 disabled:opacity-30 transition-all"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  );
                }

                return (
                  <button
                    key={`key-${btnKey}`}
                    type="button"
                    onClick={() => handleKeypadPress(btnKey)}
                    disabled={loading || success}
                    className="h-14 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-surface-container-high/60 flex items-center justify-center text-xl font-bold font-display text-on-surface active:scale-95 active:bg-primary-container active:text-on-primary transition-all shadow-xs"
                  >
                    {btnKey}
                  </button>
                );
              })
            )}
          </div>

          {/* Botón manual si el PIN tiene más de 4 caracteres */}
          {pin.length >= 4 && !loading && !success && (
            <button
              onClick={() => handleSubmit(pin)}
              className="mt-4 w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>Acceder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Footer discreto */}
          <div className="mt-6 pt-4 border-t border-surface-container-high/40 w-full text-center">
            <p className="text-[10px] text-on-surface-variant/80">
              Sesión activa por 30 días en este dispositivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
