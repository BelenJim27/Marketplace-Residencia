"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export interface CategoriaDisclaimerInput {
  id_categoria?: number;
  nombre?: string;
  requiere_edad_minima?: number | null;
}

export interface CategoryDisclaimerProps {
  /** Categorías del producto (con su requiere_edad_minima). */
  categorias: Array<CategoriaDisclaimerInput | null | undefined>;
  /** Grado alcohólico para el badge ABV (cuando aplica). */
  gradoAlcohol?: number | null;
  className?: string;
}

/**
 * Renders the regulatory disclaimer that the producto's categoría requires.
 *
 * Driven by category metadata (no hardcoding by product type), so adding a new
 * regulated category (e.g. tobacco, supplements, CBD) is a matter of adding a branch
 * here. Returns null when no category triggers a disclaimer — pages that wrap this
 * for unrestricted products render nothing.
 */
export function CategoryDisclaimer({ categorias, gradoAlcohol, className }: CategoryDisclaimerProps) {
  if (!categorias?.length) return null;

  const isAlcohol = categorias.some((c) => {
    if (!c) return false;
    if (typeof c.requiere_edad_minima === "number" && c.requiere_edad_minima >= 18) {
      const nombre = (c.nombre ?? "").toLowerCase();
      // Heuristic: 18+/21+ category named alcohol/mezcal/destilado/licor.
      // Future regulated categories (tabaco, cbd) will branch below.
      return /mezcal|alcohol|destilad|licor|spirit|tequila|wine|vino|cerveza|beer/.test(nombre);
    }
    return false;
  });

  if (isAlcohol) {
    return <AlcoholDisclaimer gradoAlcohol={gradoAlcohol} className={className} />;
  }

  // Add other regulated categories here (tobacco, supplements, etc.) without
  // touching unrestricted products.
  return null;
}

function AlcoholDisclaimer({ gradoAlcohol, className }: { gradoAlcohol?: number | null; className?: string }) {
  return (
    <div
      role="note"
      aria-label="Government Warning"
      className={`rounded-md border-2 border-amber-700 bg-amber-50 p-4 text-amber-900 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-100 ${className ?? ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <AlertTriangle size={16} />
          GOVERNMENT WARNING
        </div>
        {typeof gradoAlcohol === "number" && gradoAlcohol > 0 && (
          <span className="rounded-full bg-amber-700 px-2 py-0.5 text-xs font-semibold text-white">
            {gradoAlcohol.toFixed(0)}% ABV
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed">
        <strong>(1)</strong> According to the Surgeon General, women should not drink
        alcoholic beverages during pregnancy because of the risk of birth defects.{" "}
        <strong>(2)</strong> Consumption of alcoholic beverages impairs your ability to
        drive a car or operate machinery, and may cause health problems.
      </p>
      <p className="mt-2 text-xs">
        <Link
          href="/alcohol-disclaimer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          Más información
        </Link>
      </p>
    </div>
  );
}

export default CategoryDisclaimer;
