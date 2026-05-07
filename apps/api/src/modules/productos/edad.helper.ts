/**
 * Resolve the minimum buyer age required for a product.
 *
 * Returns the most restrictive of:
 *   1. producto.requiere_edad_minima (per-product override)
 *   2. max(categoria.requiere_edad_minima) across all categorias attached to the product
 *
 * Returns null when no rule applies — the product is unrestricted and no age gate fires.
 *
 * Designed to be category-driven so future restricted goods (tobacco, CBD, etc.) plug in
 * by setting requiere_edad_minima on the categoria, not by special-casing alcohol.
 */

type EdadCategoria = { requiere_edad_minima?: number | null } | null | undefined;

export interface ProductoConEdad {
  requiere_edad_minima?: number | null;
  // After mapProductoResponse() the relation lives under `categorias_productos`
  categorias_productos?: Array<{
    categorias?: EdadCategoria;
  }> | null;
  // Some callers may pass a flattened shape with `categorias_full` (rich objects).
  categorias_full?: Array<EdadCategoria> | null;
}

export function getEdadMinima(producto: ProductoConEdad | null | undefined): number | null {
  if (!producto) return null;

  if (typeof producto.requiere_edad_minima === 'number' && producto.requiere_edad_minima > 0) {
    return producto.requiere_edad_minima;
  }

  const candidates: number[] = [];
  for (const link of producto.categorias_productos ?? []) {
    const v = link?.categorias?.requiere_edad_minima;
    if (typeof v === 'number' && v > 0) candidates.push(v);
  }
  for (const cat of producto.categorias_full ?? []) {
    const v = cat?.requiere_edad_minima;
    if (typeof v === 'number' && v > 0) candidates.push(v);
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/**
 * Compute age in whole years between a date of birth and a reference date (default: now).
 * Used by the authoritative checkout validation.
 */
export function calcularEdadEnAnios(fechaNacimiento: Date | string, referencia: Date = new Date()): number {
  const dob = typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento;
  let edad = referencia.getFullYear() - dob.getFullYear();
  const mDelta = referencia.getMonth() - dob.getMonth();
  if (mDelta < 0 || (mDelta === 0 && referencia.getDate() < dob.getDate())) {
    edad -= 1;
  }
  return edad;
}
