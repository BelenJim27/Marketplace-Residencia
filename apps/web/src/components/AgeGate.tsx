"use client";

import { useEffect, useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { calcularEdadEnAnios, isAgeVerified, persistAgeVerified } from "@/lib/edad";

interface AgeGateProps {
  /** Minimum age required by the product/category. null/0 => no gate. */
  edadMinima: number | null | undefined;
  /** When true, the gate is forced open even if the cookie exists (e.g. carrito add). */
  forceOpen?: boolean;
  /** Called when user passes the gate. */
  onVerified?: () => void;
  /** Called when user dismisses (clicks "Salir"). */
  onDeny?: () => void;
}

/**
 * Contextual age gate.
 *
 * Renders nothing when:
 *   - edadMinima is null/0 (product is unrestricted), or
 *   - the buyer already has the age_verified_{n} cookie (last 30 days).
 *
 * Otherwise mounts a blocking modal that asks for DOB, validates client-side, and
 * persists the cookie on success. The cookie is per-age-bracket so a single 21+
 * confirmation works for any 21+ product.
 */
export function AgeGate({ edadMinima, forceOpen = false, onVerified, onDeny }: AgeGateProps) {
  const requires = typeof edadMinima === "number" && edadMinima > 0;
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requires) {
      setOpen(false);
      return;
    }
    if (forceOpen || !isAgeVerified(edadMinima)) {
      setOpen(true);
    }
  }, [requires, edadMinima, forceOpen]);

  if (!requires || !open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!dob) {
      setError("Ingresa tu fecha de nacimiento.");
      return;
    }
    const edad = calcularEdadEnAnios(dob);
    if (Number.isNaN(edad) || edad < 0 || edad > 120) {
      setError("Fecha inválida.");
      return;
    }
    if (edad < (edadMinima as number)) {
      setError(`Debes tener al menos ${edadMinima} años para ver este producto.`);
      return;
    }
    persistAgeVerified(edadMinima as number);
    setOpen(false);
    onVerified?.();
  };

  const handleDeny = () => {
    setOpen(false);
    onDeny?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={20} />
          <h2 id="age-gate-title" className="text-lg font-semibold">
            Verifica tu edad
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          Este producto requiere que tengas al menos <strong>{edadMinima} años</strong>.
          Confirma tu fecha de nacimiento para continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="age-gate-dob" className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Fecha de nacimiento
            </label>
            <input
              id="age-gate-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleDeny}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Salir
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Lock size={14} />
              Confirmar
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Tu confirmación se guarda en este dispositivo por 30 días.
        </p>
      </div>
    </div>
  );
}

export default AgeGate;
