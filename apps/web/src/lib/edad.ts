import { getCookie, setCookieWithOptions } from "@/lib/cookies";

const COOKIE_DAYS = 30;

type EdadCategoria = { requiere_edad_minima?: number | null } | null | undefined;

export interface ProductoConEdad {
  edad_minima?: number | null;
  requiere_edad_minima?: number | null;
  categorias_full?: Array<EdadCategoria> | null;
  categorias_productos?: Array<{ categorias?: EdadCategoria }> | null;
}

/**
 * Mirror of the backend resolver in apps/api/src/modules/productos/edad.helper.ts.
 * Prefer the server-computed `edad_minima` field (set by mapProductoResponse) and fall
 * back to recomputing from the producto/categorias when only a stripped payload is at
 * hand (e.g. an old cached carrito item).
 */
export function getEdadMinima(producto: ProductoConEdad | null | undefined): number | null {
  if (!producto) return null;
  if (typeof producto.edad_minima === "number" && producto.edad_minima > 0) {
    return producto.edad_minima;
  }
  if (typeof producto.requiere_edad_minima === "number" && producto.requiere_edad_minima > 0) {
    return producto.requiere_edad_minima;
  }
  const ages: number[] = [];
  for (const c of producto.categorias_full ?? []) {
    const v = c?.requiere_edad_minima;
    if (typeof v === "number" && v > 0) ages.push(v);
  }
  for (const link of producto.categorias_productos ?? []) {
    const v = link?.categorias?.requiere_edad_minima;
    if (typeof v === "number" && v > 0) ages.push(v);
  }
  return ages.length ? Math.max(...ages) : null;
}

const cookieName = (n: number) => `age_verified_${n}`;

export function isAgeVerified(edadMinima: number | null | undefined): boolean {
  if (!edadMinima || edadMinima <= 0) return true; // unrestricted
  return getCookie(cookieName(edadMinima)) === "1";
}

export function persistAgeVerified(edadMinima: number): void {
  setCookieWithOptions(cookieName(edadMinima), "1", { days: COOKIE_DAYS });
}

export function calcularEdadEnAnios(fechaNacimiento: Date | string, ref: Date = new Date()): number {
  const dob = typeof fechaNacimiento === "string" ? new Date(fechaNacimiento) : fechaNacimiento;
  let edad = ref.getFullYear() - dob.getFullYear();
  const mDelta = ref.getMonth() - dob.getMonth();
  if (mDelta < 0 || (mDelta === 0 && ref.getDate() < dob.getDate())) edad -= 1;
  return edad;
}
