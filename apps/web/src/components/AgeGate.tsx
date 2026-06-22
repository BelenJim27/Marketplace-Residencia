"use client";

import { useEffect, useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import {
  calcularEdadEnAnios,
  isAgeVerified,
  persistAgeVerified,
  isGlobalAgeVerified,
  persistGlobalAgeVerified,
} from "@/lib/edad";
import { api } from "@/lib/api";
import { useLocale } from "@/context/LocaleContext";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface AgeGateProps {
  /** Minimum age required. null/0 => no gate (product mode only). */
  edadMinima: number | null | undefined;
  /** "global": one-time gate for the whole tienda, managed by root-content. "product": per-product cookie. */
  mode?: "global" | "product";
  /** Force the gate open even if cookie exists (product mode only). */
  forceOpen?: boolean;
  onVerified?: () => void;
  onDeny?: () => void;
  /** User ID to persist fecha_nacimiento to profile (global mode only). */
  userId?: string;
  /** Auth token for API calls. */
  token?: string;
}

export function AgeGate({ edadMinima, mode = "product", forceOpen = false, onVerified, onDeny, userId, token }: AgeGateProps) {
  const { t, locale } = useLocale();
  const months = locale === "en" ? MONTHS_EN : MONTHS_ES;
  const minAge = typeof edadMinima === "number" && edadMinima > 0 ? edadMinima : 18;
  const requires = mode === "global" || (typeof edadMinima === "number" && edadMinima > 0);

  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "global") {
      // Parent (root-content) only renders this component when not yet verified
      setOpen(true);
      return;
    }
    if (!requires) { setOpen(false); return; }
    if (forceOpen || !isAgeVerified(edadMinima as number)) setOpen(true);
  }, [mode, requires, edadMinima, forceOpen]);

  if (!open) return null;

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - minAge;
  const minYear = currentYear - 120;
  const isFormFilled = !!day && !!month && !!year;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isFormFilled) {
      setError(t("Ingresa tu fecha de nacimiento completa."));
      return;
    }
    const d = Number(day), m = Number(month), y = Number(year);
    const testDate = new Date(y, m - 1, d);
    if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
      setError(t("Fecha inválida. Verifica el día seleccionado."));
      return;
    }
    const edad = calcularEdadEnAnios(testDate);
    if (edad < minAge) {
      setError(t("Debes tener al menos {n} años para acceder.").replace("{n}", String(minAge)));
      return;
    }
    if (edad > 120) {
      setError(t("Fecha inválida."));
      return;
    }
    if (mode === "global") {
      persistGlobalAgeVerified();
      // Persist fecha_nacimiento to user profile if logged in
      if (userId && token) {
        const fechaISO = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00.000Z`;
        api.usuarios.update(token, userId, { fecha_nacimiento: fechaISO }).catch(() => {});
      }
    } else {
      persistAgeVerified(edadMinima as number);
    }
    setOpen(false);
    onVerified?.();
  };

  const handleDeny = () => {
    setOpen(false);
    onDeny?.();
  };

  const selectClass = "w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={20} />
          <h2 id="age-gate-title" className="text-lg font-semibold">
            {t("Verifica tu edad")}
          </h2>
        </div>
        <p className="mb-5 text-sm text-gray-700 dark:text-gray-300">
          {t("Este sitio vende mezcal y bebidas de alto contenido alcohólico. Debes tener al menos {n} años para continuar.").replace("{n}", String(minAge))}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("Fecha de nacimiento")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={selectClass}
                aria-label={t("Día")}
                autoFocus
              >
                <option value="">{t("Día")}</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{String(d).padStart(2, "0")}</option>
                ))}
              </select>

              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={selectClass}
                aria-label={t("Mes")}
              >
                <option value="">{t("Mes")}</option>
                {months.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={selectClass}
                aria-label={t("Año")}
              >
                <option value="">{t("Año")}</option>
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
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
              {t("Salir")}
            </button>
            <button
              type="submit"
              disabled={!isFormFilled}
              className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock size={14} />
              {t("Confirmar")}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {t("Tu confirmación se guarda en este dispositivo por 30 días.")}
        </p>
      </div>
    </div>
  );
}

export default AgeGate;
