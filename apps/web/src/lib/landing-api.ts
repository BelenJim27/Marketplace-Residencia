const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export interface EstadisticasLanding {
  totalProductores: number;
  totalProductos: number;
  totalRegiones: number;
  ingresosTotales: number;
  ingresosFormateado: string;
}

export interface ProductoMasVendido {
  id: number;
  nombre: string;
  imagen: string;
  descripcion: string;
  cantidad: number;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const landingApi = {
  estadisticas: (signal?: AbortSignal) =>
    getJson<EstadisticasLanding>("/estadisticas/landing", signal),
  topProductos: (top: number, signal?: AbortSignal) =>
    getJson<ProductoMasVendido[]>(`/estadisticas/top-productos?top=${top}`, signal),
  topProductosConLote: <T>(top: number, signal?: AbortSignal) =>
    getJson<T[]>(`/estadisticas/top-productos-lote?top=${top}`, signal),
  configuracion: (signal?: AbortSignal) =>
    getJson<Record<string, string>>("/configuracion/publica/landing", signal),
};
