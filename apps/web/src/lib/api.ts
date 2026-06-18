import { getCookie, setCookie } from "@/lib/cookies";
import type { InventarioItem, ProductItem } from "@/types/producer";


const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

// Tipos para respuestas del API
interface ArchivosUploadResponse {
  url?: string;
  ruta?: string;
  path?: string;
  [key: string]: any;
}

/**
 * Error con la respuesta del backend preservada (status + payload). Permite que los
 * llamadores hagan `if (err instanceof ApiError && err.code === 'AGE_DOB_REQUIRED')`.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  details: any;
  constructor(status: number, payload: any) {
    // NestJS ValidationPipe devuelve `message` como arreglo de strings; lo unimos
    // en un texto legible para que los toasts no muestren "a,b,c" sin formato.
    const raw = payload?.message;
    const message = Array.isArray(raw)
      ? raw.filter(Boolean).join(" · ")
      : (raw ?? `Error ${status}`);
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload?.code;
    this.details = payload;
  }
}

const headers = (token?: string, isFormData = false) => ({
  ...(isFormData ? {} : { "Content-Type": "application/json" }),
  ...(token && { Authorization: `Bearer ${token}` }),
});

// Singleton para deduplicar refreshes concurrentes: si múltiples requests
// fallan con 401 al mismo tiempo, todas esperan el mismo refresh en lugar de
// hacer N requests (el segundo invalidaría el token del primero).
let pendingRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getCookie("refresh_token");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(endpoint("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error("Refresh failed");

  const data = await res.json();
  const newAccess: string = data.tokens.access_token;
  setCookie("token", newAccess, 7);
  if (data.tokens.refresh_token) {
    setCookie("refresh_token", data.tokens.refresh_token, 30);
  }
  return newAccess;
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit & { next?: { revalidate?: number }; silent?: boolean },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    if (!options?.silent) {
      console.error("Network error fetching", url, networkError);
    }
    throw new Error(
      `No se pudo conectar con el servidor. Verifica que la API esté disponible.`,
    );
  }

  if (response.status === 401) {
    console.warn(" 401 detectado, intentando refresh de token...");

    // Paso 1: refrescar el token. Solo un fallo AQUÍ significa sesión expirada.
    let newAccessToken: string;
    try {
      if (!pendingRefresh) {
        pendingRefresh = refreshAccessToken().finally(() => {
          pendingRefresh = null;
        });
      }
      newAccessToken = await pendingRefresh;
      console.warn(" Token refrescado, reintentando request...");
    } catch (refreshErr) {
      // Limpiar cookies
      console.warn(" Refresh falló, limpiando cookies...");
      const cookies = document.cookie.split(";");
      cookies.forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        if (["token", "refresh_token", "usuario"].includes(name)) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      // Notificar a AuthContext para que limpie la sesión OAuth también antes de redirigir
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      throw new Error("Sesión expirada. Por favor inicia sesión de nuevo.");
    }

    // Paso 2: reintentar el request original. Un fallo aquí es un error real del
    // backend (no sesión expirada) → se propaga como ApiError con status/mensaje real.
    const newHeaders = { ...options?.headers } as Record<string, string>;
    newHeaders["Authorization"] = `Bearer ${newAccessToken}`;

    let retryResponse: Response;
    try {
      retryResponse = await fetch(url, { ...options, headers: newHeaders });
    } catch (networkError) {
      if (!options?.silent) {
        console.error("Network error retrying", url, networkError);
      }
      throw new Error(
        `No se pudo conectar con el servidor. Verifica que la API esté disponible.`,
      );
    }

    console.warn("📡 Retry response status:", retryResponse.status);
    if (!retryResponse.ok) {
      const error = await retryResponse
        .json()
        .catch(() => ({ message: `Error ${retryResponse.status}` }));
      // ApiError (no Error plano) para preservar status/details del backend.
      throw new ApiError(retryResponse.status, error);
    }
    return retryResponse.json() as Promise<T>;
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let error: any = { message: `Error ${response.status}` };

    if (contentType && contentType.includes("application/json")) {
      try {
        error = await response.json();
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
    } else {
      const text = await response.text();
      console.warn("Non-JSON error response:", text);
    }
    throw new ApiError(response.status, error);
  }

  const text = await response.text();

  // Manejo robusto de respuestas vacías o nulas
  if (!text || text.trim() === "") {
    // Retornar objeto vacío si es una respuesta válida pero sin contenido
    // (típico en operaciones exitosas que no retornan data, ej: DELETE)
    console.warn(
      "Servidor retornó respuesta vacía (válido para algunos endpoints)",
    );
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parsing response JSON. Text:", text, "Error:", e);
    throw new Error(`Error al parsear respuesta: ${String(e)}`);
  }
}

function endpoint(path: string) {
  if (typeof window !== "undefined") {
    return path;
  }
  return `${API_BASE}${path}`;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchJson<{
        user: any;
        tokens: { access_token: string; refresh_token: string };
      }>(endpoint("/auth/login"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email, password }),
      }),
    register: (data: any) =>
      fetchJson<{
        user: any;
        tokens: { access_token: string; refresh_token: string };
      }>(endpoint("/auth/register"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data),
      }),
    refresh: (refresh_token: string) =>
      fetchJson(endpoint("/auth/refresh"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ refresh_token }),
      }),
    logout: (refresh_token: string) =>
      fetchJson(endpoint("/auth/logout"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ refresh_token }),
        silent: true,
      }),
    googleLogin: () => {
      window.location.href = "/auth/sign-in";
    },
    forgotPassword: (email: string) =>
      fetchJson(endpoint("/auth/password-reset/request"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      fetchJson(endpoint("/auth/password-reset/confirm"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ token, password }),
      }),
    getProfile: (token: string) =>
      fetchJson(endpoint("/auth/me"), { headers: headers(token) }),
    validateToken: (token: string) =>
      fetchJson(endpoint("/auth/refresh"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ refresh_token: token }),
      }),
  },

  productos: {
    getAll: (filtros?: {
      busqueda?: string;
      tipo_mezcal?: string;
      maguey?: string;
      precio_min?: string;
      precio_max?: string;
      destilacion?: string;
      molienda?: string;
      maestro_mezcalero?: string;
      categorias?: string;
    }) => {
      const params = new URLSearchParams();
      if (filtros) {
        if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
        if (filtros.tipo_mezcal)
          params.append("tipo_mezcal", filtros.tipo_mezcal);
        if (filtros.maguey) params.append("maguey", filtros.maguey);
        if (filtros.precio_min) params.append("precio_min", filtros.precio_min);
        if (filtros.precio_max) params.append("precio_max", filtros.precio_max);
        if (filtros.destilacion)
          params.append("destilacion", filtros.destilacion);
        if (filtros.molienda) params.append("molienda", filtros.molienda);
        if (filtros.maestro_mezcalero)
          params.append("maestro_mezcalero", filtros.maestro_mezcalero);
        if (filtros.categorias) params.append("categorias", filtros.categorias);
      }
      const query = params.toString();
      // Cache unfiltered product lists for 30 minutes
      const cacheOpts = !query ? { next: { revalidate: 1800 } } : undefined;
      return fetchJson<ProductItem[]>(
        endpoint("/productos" + (query ? `?${query}` : "")),
        cacheOpts,
      );
    },
    getByProductor: (id_productor: number, token?: string) =>
      fetchJson<ProductItem[]>(
        endpoint(`/productos?id_productor=${id_productor}`),
        {
          headers: headers(token),
        },
      ),
    getMine: (token: string, id_productor?: number) =>
      fetchJson<ProductItem[]>(
        endpoint(
          `/productos${
            id_productor
              ? `?${new URLSearchParams({ id_productor: String(id_productor) }).toString()}`
              : ""
          }`,
        ),
        { headers: headers(token) },
      ),
    // Alertas de stock calculadas por el backend (el productor se resuelve del token).
    getAlertasStock: (token?: string) =>
      fetchJson<
        Array<{
          id: string;
          id_producto: number;
          tipo: "sin_existencias" | "stock_bajo";
          producto: string;
          tienda: string;
          stock_actual: number;
        }>
      >(endpoint("/productos/alertas-stock"), { headers: headers(token) }),
    getOne: (id: string) =>
      fetchJson<ProductItem>(endpoint(`/productos/${id}`), {
        next: { revalidate: 300 },
      }),
    create: (token: string, data: any) =>
      fetchJson<ProductItem>(endpoint("/productos"), {
        method: "POST",
        headers: headers(token, data instanceof FormData),
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson<ProductItem>(endpoint(`/productos/${id}`), {
        method: "PATCH",
        headers: headers(token, data instanceof FormData),
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/productos/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    addImagenes: (token: string, id: string, formData: FormData) =>
      fetchJson(endpoint(`/productos/${id}/imagenes`), {
        method: "POST",
        headers: headers(token, true),
        body: formData,
      }),
    removeImagen: (token: string, id: string, id_imagen: string) =>
      fetchJson(endpoint(`/productos/${id}/imagenes/${id_imagen}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  categorias: {
    getAll: () =>
      fetchJson(endpoint("/categorias"), {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }),
    getOne: (id: number) => fetchJson(endpoint(`/categorias/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/categorias"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/categorias/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/categorias/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  tiendas: {
    // Las tiendas cambian poco: cache de 30 min para evitar refetch en cada vista.
    getAll: () => fetchJson(endpoint("/tiendas"), { next: { revalidate: 1800 } }),
    getOne: (id: number) => fetchJson(endpoint(`/tiendas/${id}`)),
    getByProductor: (id_productor: number, token?: string) =>
      fetchJson(endpoint(`/tiendas?id_productor=${id_productor}`), {
        headers: headers(token),
      }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/tiendas"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/tiendas/${id}`), {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/tiendas/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  productores: {
    getAll: (filters?: {
      asociacion?: string;
      marca?: string;
      id_categoria?: number;
      estado?: string;
    }): Promise<any[]> => {
      const params = new URLSearchParams();
      if (filters?.asociacion) params.set("asociacion", filters.asociacion);
      if (filters?.marca) params.set("marca", filters.marca);
      if (filters?.id_categoria)
        params.set("id_categoria", String(filters.id_categoria));
      if (filters?.estado) params.set("estado", filters.estado);
      const qs = params.toString();
      // Sin filtros (listado público completo) se cachea 30 min; con filtros se
      // consulta fresco para reflejar la selección del usuario.
      const cacheOpts = !qs ? { next: { revalidate: 1800 } } : undefined;
      return fetchJson<any[]>(endpoint(`/productores${qs ? `?${qs}` : ""}`), cacheOpts);
    },
    getOne: <T = any>(id: number) => fetchJson<T>(endpoint(`/productores/${id}`)),
    getByUsuario: (id_usuario: string) =>
      fetchJson(endpoint(`/productores/by-usuario/${id_usuario}`)),
    getByUbicacion: (ubicacion: string) =>
      fetchJson(endpoint(`/productores?ubicacion=${ubicacion}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/productores"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/productores/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    // Edición completa desde el panel admin (multipart, incluye foto).
    adminUpdate: (token: string, id: number, formData: FormData) =>
      fetchJson(endpoint(`/productores/${id}/admin`), {
        method: "PATCH",
        headers: headers(token, true),
        body: formData,
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/productores/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    getRegiones: () => fetchJson(endpoint("/productores/regiones")),
    getMiSolicitud: (token: string) => {
      if (!token || typeof token !== "string" || token.trim() === "") {
        console.warn("⚠️ getMiSolicitud llamado sin token válido");
        return Promise.resolve(null);
      }
      return fetchJson(endpoint("/productores/mi-solicitud"), {
        headers: headers(token),
      });
    },

    // ── CAMBIO: se agregó categorias_ids al tipo de data ─────────────────────
    solicitar: (
      token: string,
      data: {
        id_region?: number;
        rfc?: string;
        razon_social?: string;
        datos_bancarios?: string;
        asociacion?: string;
        nombre_marca?: string;
        categorias_ids?: number[];
        direccion_fiscal?: {
          linea_1?: string;
          linea_2?: string;
          ciudad?: string;
          estado?: string;
          codigo_postal?: string;
          pais_iso2?: string;
          referencia?: string;
          ubicacion?: Record<string, unknown>;
          es_internacional?: boolean;
        };
        direccion_produccion?: {
          linea_1?: string;
          linea_2?: string;
          ciudad?: string;
          estado?: string;
          codigo_postal?: string;
          pais_iso2?: string;
          referencia?: string;
          ubicacion?: Record<string, unknown>;
          es_internacional?: boolean;
        };
      },
    ) =>
      fetchJson(endpoint("/productores/solicitar"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    actualizarMiPerfil: (token: string, data: any) =>
      fetchJson(endpoint("/productores/mi-perfil"), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),

    // ─────────────────────────────────────────────────────────────────────────

    getSolicitudesPendientes: (token: string) =>
      fetchJson(endpoint("/admin/productores/solicitudes"), {
        headers: headers(token),
      }),
    revisarSolicitud: (
      token: string,
      id: number,
      data: { estado: string; motivo_rechazo?: string },
    ) =>
      fetchJson(endpoint(`/admin/productores/${id}/revisar`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    aprobarSolicitud: (token: string, id: number) =>
      fetchJson(endpoint(`/admin/productores/${id}/aprobar`), {
        method: "PATCH",
        headers: headers(token),
      }),
    rechazarSolicitud: (token: string, id: number, motivo: string) =>
      fetchJson(endpoint(`/admin/productores/${id}/rechazar`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify({ estado: "rechazado", motivo_rechazo: motivo }),
      }),
  },

  pedidos: {
    // El backend pagina /pedidos devolviendo { items, paginacion }. Los consumidores
    // (gráficas admin, tabla de pedidos, búsqueda global) esperan un arreglo, así que
    // pedimos el máximo permitido (limite=100) y desenvolvemos siempre a un arreglo.
    getAll: async (token?: string) => {
      const res = await fetchJson(
        endpoint("/pedidos?limite=100"),
        token ? { headers: headers(token) } : {},
      );
      return Array.isArray(res) ? res : ((res as any)?.items ?? []);
    },
    getOne: (id: string) => fetchJson(endpoint(`/pedidos/${id}`)),
    getMineSales: (token: string) =>
      fetchJson(endpoint("/pedidos/mis-ventas"), { headers: headers(token) }),
    getAnalytics: (token: string, periodo: string) =>
      fetchJson(endpoint(`/pedidos/estadisticas?periodo=${periodo}`), {
        headers: headers(token),
      }),
    getMisCompras: (token: string) =>
      fetchJson(endpoint("/pedidos/mis-compras"), { headers: headers(token) }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/pedidos"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    addDetalle: (token: string, pedidoId: string, data: any) =>
      fetchJson(endpoint(`/pedidos/${pedidoId}/detalles`), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    addFactura: (token: string, pedidoId: string, data: any) =>
      fetchJson(endpoint(`/pedidos/${pedidoId}/facturas`), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/pedidos/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/pedidos/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    getMisPedidos: (token: string) =>
      fetchJson(endpoint(`/pedidos/mis-pedidos`), { headers: headers(token) }),

    getMisPedidosByProductor: (token: string, id_productor: number) =>
      fetchJson(endpoint(`/pedidos/productor/${id_productor}`), {
        headers: headers(token),
      }),
    validarEnvio: (data: {
      pais_iso2: string;
      estado_codigo?: string;
      items: { id_producto: number; cantidad: number }[];
    }) =>
      fetchJson<{
        valido: boolean;
        items_bloqueados: {
          id_producto: number;
          nombre: string;
          razon: string;
        }[];
      }>(endpoint("/pedidos/validar-envio"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data),
      }),
  },

  envios: {
    getAll: () => fetchJson(endpoint("/envios")),
    getOne: (id: string) => fetchJson(endpoint(`/envios/${id}`)),
    getTracking: (id: string, token?: string) =>
      fetchJson(
        endpoint(`/envios/${id}/tracking`),
        { ...(token ? { headers: headers(token) } : {}), silent: true },
      ),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/envios"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/envios/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/envios/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    cotizar: (token: string, data: any) =>
      fetchJson(endpoint("/envios/cotizar"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    cotizarCarrito: (token: string, data: { items: Array<{ id_producto: number; cantidad: number }>; destino: any }) =>
      fetchJson(endpoint("/envios/cotizar-carrito"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    guardarCotizacion: (token: string, data: any) =>
      fetchJson(endpoint("/envios/cotizaciones"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    crearGuia: (token: string, id: string) =>
      fetchJson(endpoint(`/envios/${id}/crear-guia`), {
        method: "POST",
        headers: headers(token),
      }),
    /** Completa una guía que quedó "en proceso" (in_creation) re-consultando al carrier. */
    refrescarGuia: (token: string, id: string) =>
      fetchJson(endpoint(`/envios/${id}/refrescar-guia`), {
        method: "POST",
        headers: headers(token),
      }),
    /** Devuelve la URL relativa al endpoint de descarga (requiere token en header). */
    getGuiaDownloadUrl: (id: string) => `/envios/${id}/guia/download`,
  },

  transportistas: {
    getAll: () => fetchJson(endpoint("/transportistas")),
    getOne: (id: number) => fetchJson(endpoint(`/transportistas/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/transportistas"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/transportistas/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/transportistas/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  pagos: {
    getAll: () => fetchJson(endpoint("/pagos")),
    getOne: (id: string) => fetchJson(endpoint(`/pagos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/pagos"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/pagos/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/pagos/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    reembolsar: (token: string, idPago: number | string) =>
      fetchJson<{ mensaje: string }>(endpoint(`/pagos/${idPago}/reembolso`), {
        method: "POST",
        headers: headers(token),
      }),
    listar: (token: string, filtros?: { estado?: string; proveedor?: string }) => {
      const params = new URLSearchParams();
      if (filtros?.estado) params.set("estado", filtros.estado);
      if (filtros?.proveedor) params.set("proveedor", filtros.proveedor);
      const qs = params.toString();
      return fetchJson<any[]>(`${API_BASE}/pagos${qs ? `?${qs}` : ""}`, {
        headers: headers(token),
      });
    },
    resolverManual: (token: string, idPago: number | string, notas?: string) =>
      fetchJson<any>(`${API_BASE}/pagos/${idPago}/resolver-manual`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ notas }),
      }),
    stripe: {
      createIntent: (
        token: string,
        data: {
          id_pedido: string | number;
          subtotal: number;
          shipping_amount?: number;
          moneda: string;
          shipping_address: {
            line1: string;
            line2?: string;
            city: string;
            state: string;
            postal_code: string;
            country: string;
          };
          recipient_name?: string;
          customer_id?: string;
        },
      ): Promise<{
        clientSecret: string;
        paymentIntentId: string;
        subtotal: number;
        taxAmount: number;
        taxBreakdown?: { tipo: string; nombre: string; tasa: number; monto: number }[];
        shippingAmount: number;
        totalAmount: number;
      }> =>
        fetchJson(endpoint("/pagos/stripe/intent"), {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify(data),
        }),
      // Confirmación síncrona post-pago: marca el pedido como pagado sin depender del webhook.
      confirm: (
        token: string,
        id_pedido: string,
      ): Promise<{ estado: string; confirmado: boolean }> =>
        fetchJson(endpoint("/pagos/stripe/confirm"), {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ id_pedido }),
        }),
    },
    paypal: {
      createOrder: (
        token: string,
        data: {
          id_pedido: string | number;
          subtotal: number;
          shipping_amount?: number;
          moneda: string;
          shipping_address?: {
            line1: string;
            line2?: string;
            city: string;
            state: string;
            postal_code: string;
            country: string;
          };
        },
      ): Promise<{
        orderId: string;
        approveUrl: string;
        subtotal: number;
        taxAmount: number;
        taxBreakdown?: { tipo: string; nombre: string; tasa: number; monto: number }[];
        shippingAmount: number;
        totalAmount: number;
      }> =>
        fetchJson(endpoint("/pagos/paypal/order"), {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify(data),
        }),
      captureOrder: (
        token: string,
        data: { paypal_order_id: string },
      ): Promise<{ id_pago: string; estado: string }> =>
        fetchJson(endpoint("/pagos/paypal/capture"), {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify(data),
        }),
    },
    connect: {
      onboard: (
        token: string,
      ): Promise<{ url: string; expires_at: number; account_id: string }> =>
        fetchJson(endpoint("/pagos/connect/onboard"), {
          method: "POST",
          headers: headers(token),
        }),
      refresh: (
        token: string,
      ): Promise<{ url: string; expires_at: number; account_id: string }> =>
        fetchJson(endpoint("/pagos/connect/refresh"), {
          method: "POST",
          headers: headers(token),
        }),
      status: (
        token: string,
      ): Promise<{
        connected: boolean;
        account_id: string | null;
        charges_enabled: boolean;
        payouts_enabled: boolean;
        details_submitted: boolean;
        onboarding_completed: boolean;
      }> =>
        fetchJson(endpoint("/pagos/connect/status"), {
          headers: headers(token),
        }),
    },
    ingresos: {
      getResumen: (token: string, id_productor: number) =>
        fetchJson<{
          ventas_totales: string;
          comision_total: string;
          bruto_total: string;
          ingresos_recibidos: string;
          pendiente_recibir: string;
          total_pedidos: number;
          total_payouts: number;
        }>(endpoint(`/pagos/ingresos/${id_productor}`), {
          headers: headers(token),
        }),
    },
  },

  metodosPago: {
    getAll: () => fetchJson(endpoint("/pagos/monedas")),
    getOne: (id: number) => fetchJson(endpoint(`/pagos/monedas/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/pagos/monedas"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/pagos/monedas/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/pagos/monedas/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  carritos: {
    getAll: () => fetchJson(endpoint("/carrito")),
    getOne: (id: string) => fetchJson(endpoint(`/carrito/${id}`)),
    getByUsuario: (usuarioId: string) =>
      fetchJson(endpoint(`/carrito/${usuarioId}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/carrito"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/carrito/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  carritoItems: {
    getByUsuario: (token: string, usuarioId: string) =>
      fetchJson(endpoint(`/carrito/${usuarioId}`), {
        method: "GET",
        headers: headers(token),
      }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/carrito"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/carrito/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/carrito/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    deleteByUsuario: (token: string, usuarioId: string) =>
      fetchJson(endpoint(`/carrito/usuario/${usuarioId}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    // Vacía el carrito del usuario autenticado (id derivado del token en backend).
    deleteMine: (token: string) =>
      fetchJson(endpoint("/carrito/mi-carrito"), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  inventario: {
    getAll: () => fetchJson<InventarioItem[]>(endpoint("/inventario")),
    getOne: (id: string) =>
      fetchJson<InventarioItem>(endpoint(`/inventario/${id}`)),
    getByProducto: (id_producto: string | number) =>
      fetchJson<InventarioItem | null>(
        endpoint(`/inventario/producto/${id_producto}`),
      ),
    create: (token: string, data: any) =>
      fetchJson<InventarioItem>(endpoint("/inventario"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson<InventarioItem>(endpoint(`/inventario/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/inventario/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  resenas: {
    getAll: () => fetchJson(endpoint("/resenas")),
    getOne: (id: number) => fetchJson(endpoint(`/resenas/${id}`)),

    // GET /resenas/producto/:id?calificacion=5&pagina=1&limite=10
    getByProducto: (
      productoId: string,
      params?: { calificacion?: number; pagina?: number; limite?: number },
    ) => {
      const q = new URLSearchParams();
      if (params?.calificacion)
        q.append("calificacion", String(params.calificacion));
      if (params?.pagina) q.append("pagina", String(params.pagina));
      if (params?.limite) q.append("limite", String(params.limite));
      return fetchJson(
        endpoint(
          `/resenas/producto/${productoId}${q.toString() ? `?${q}` : ""}`,
        ),
      );
    },

    // GET /resenas/producto/:id/agregado
    getAgregado: (productoId: string) =>
      fetchJson(endpoint(`/resenas/producto/${productoId}/agregado`)),

    // GET /resenas/producto/:id/similares
    getSimilares: (productoId: string, limite = 6) =>
      fetchJson(
        endpoint(`/resenas/producto/${productoId}/similares?limite=${limite}`),
      ),

    // GET /resenas/producto/:id/tambien-compraron
    getTambienCompraron: (productoId: string, limite = 6) =>
      fetchJson(
        endpoint(
          `/resenas/producto/${productoId}/tambien-compraron?limite=${limite}`,
        ),
      ),

    // POST /resenas
    create: (token: string, data: any) =>
      fetchJson(endpoint("/resenas"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),

    // PATCH /resenas/:id
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/resenas/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),

    // PATCH /resenas/:id/moderar  (admin)
    moderar: (
      token: string,
      id: number,
      accion: "aprobar" | "rechazar",
      motivo?: string,
    ) =>
      fetchJson(endpoint(`/resenas/${id}/moderar`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify({ accion, motivo }),
      }),

    // PATCH /resenas/:id/responder  (vendedor)
    responder: (token: string, id: number, respuesta_vendedor: string) =>
      fetchJson(endpoint(`/resenas/${id}/responder`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify({ respuesta_vendedor }),
      }),

    // DELETE /resenas/:id
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/resenas/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  lotes: {
    getAll: () => fetchJson(endpoint("/lotes")),
    getByProductor: (id_productor: number) =>
      fetchJson(
        endpoint(
          `/lotes?${new URLSearchParams({ id_productor: String(id_productor) }).toString()}`,
        ),
      ),
    getOne: (id: number) => fetchJson(endpoint(`/lotes/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/lotes"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/lotes/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/lotes/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    sincronizar: (
      token: string,
      data: { uuid_externo: string; id_productor: number; id_region?: number },
    ) =>
      fetchJson(endpoint("/lotes/sincronizar"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    sincronizarTodos: (token: string, id_productor?: number) =>
      fetchJson(endpoint("/lotes/sincronizar-todos"), {
        method: "POST",
        headers: headers(token),
        body: id_productor ? JSON.stringify({ id_productor }) : undefined,
      }),
    sincronizarProducto: (token: string, id: number) =>
      fetchJson(endpoint(`/lotes/${id}/sincronizar-producto`), {
        method: "POST",
        headers: headers(token),
      }),
  },

  imagenes: {
    getAll: () => fetchJson(endpoint("/productos")),
    getOne: (id: number) => fetchJson(endpoint(`/productos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/productos"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/productos/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/productos/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  roles: {
    getAll: (token: string) =>
      fetchJson(endpoint("/roles"), { headers: headers(token) }),
    getOne: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/${id}`), { headers: headers(token) }),
    create: (token: string, data: { nombre: string }) =>
      fetchJson(endpoint("/roles"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (
      token: string,
      id: number,
      data: { nombre?: string; estado?: string },
    ) =>
      fetchJson(endpoint(`/roles/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  permisos: {
    getAll: (token: string) =>
      fetchJson(endpoint("/roles/permisos"), { headers: headers(token) }),
    getOne: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/permisos/${id}`), { headers: headers(token) }),
    create: (token: string, data: { nombre: string }) =>
      fetchJson(endpoint("/roles/permisos"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: { nombre: string }) =>
      fetchJson(endpoint(`/roles/permisos/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/permisos/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  usuariosRoles: {
    assign: (token: string, data: { id_usuario: string; id_rol: number }) =>
      fetchJson(endpoint(`/usuarios/${data.id_usuario}/roles`), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ id_rol: data.id_rol }),
      }),
    remove: (token: string, id_usuario: string, id_rol: number) =>
      fetchJson(endpoint(`/usuarios/${id_usuario}/roles/${id_rol}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  rolesPermisos: {
    assign: (token: string, data: { id_rol: number; id_permiso: number }) =>
      fetchJson(endpoint(`/roles/${data.id_rol}/permisos`), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ id_permiso: data.id_permiso }),
      }),
    remove: (token: string, id_rol: number, id_permiso: number) =>
      fetchJson(endpoint(`/roles/${id_rol}/permisos/${id_permiso}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    getByRole: (token: string, id_rol: number) =>
      fetchJson(endpoint(`/roles/${id_rol}/permisos`), {
        headers: headers(token),
      }),
  },

  usuarios: {
    // El backend pagina /usuarios devolviendo { items, paginacion }. Los
    // consumidores filtran/pagina del lado del cliente, así que pedimos el
    // máximo permitido (limite=100) y desenvolvemos siempre a un arreglo.
    getAll: async (token: string) => {
      const res = await fetchJson(endpoint("/usuarios?limite=100"), {
        headers: headers(token),
      });
      return Array.isArray(res) ? res : ((res as any)?.items ?? []);
    },
    getOne: (token: string, id: string) =>
      fetchJson(endpoint(`/usuarios/${id}`), { headers: headers(token) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/usuarios/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    uploadPhoto: (token: string, id: string, data: FormData) =>
      fetchJson(endpoint(`/usuarios/${id}/foto`), {
        method: "PATCH",
        headers: headers(token, true),
        body: data,
      }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/usuarios"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/usuarios/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  notificaciones: {
    getAll: (token: string) =>
      fetchJson(endpoint("/notificaciones"), { headers: headers(token) }),
    getByUser: (userId: string, token: string) =>
      fetchJson(endpoint(`/notificaciones/${userId}`), {
        headers: headers(token),
      }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/notificaciones"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/notificaciones/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/notificaciones/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  direcciones: {
    getAll: (token: string) =>
      fetchJson(endpoint("/direcciones"), { headers: headers(token) }),
    getByUsuario: (usuarioId: string, token: string) =>
      fetchJson(endpoint(`/direcciones/${usuarioId}`), {
        headers: headers(token),
      }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/direcciones"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/direcciones/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/direcciones/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  configuracion: {
    getAsociaciones: (): Promise<string[]> =>
      fetchJson<string[]>(endpoint("/configuracion/asociaciones")),
    setAsociaciones: (token: string, lista: string[]) =>
      fetchJson(endpoint("/configuracion/asociaciones"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ lista }),
      }),
    getSistema: () => fetchJson(endpoint("/configuracion/sistema")),
    getTasas: () => fetchJson(endpoint("/configuracion/tasas")),
    updateSistema: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/configuracion/sistema/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    createSistema: (token: string, data: any) =>
      fetchJson(endpoint("/configuracion/sistema"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    bulkUpsert: (
      token: string,
      items: { clave: string; valor: string; tipo?: string }[],
    ) =>
      fetchJson(endpoint("/configuracion/sistema/bulk"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(items),
      }),
  },

  archivos: {
    getAll: (params?: {
      entidad_tipo?: string;
      entidad_id?: number | string;
    }) => {
      const query = new URLSearchParams();
      if (params?.entidad_tipo)
        query.append("entidad_tipo", params.entidad_tipo);
      if (params?.entidad_id != null)
        query.append("entidad_id", String(params.entidad_id));
      return fetchJson(
        endpoint(`/archivos${query.toString() ? `?${query.toString()}` : ""}`),
      );
    },
    getOne: (id: string) => fetchJson(endpoint(`/archivos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/archivos"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    upload: (token: string, data: FormData) =>
      fetchJson<ArchivosUploadResponse>(endpoint("/archivos/upload"), {
        method: "POST",
        headers: headers(token, true),
        body: data,
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/archivos/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    replace: (token: string, id: string, data: FormData) =>
      fetchJson(endpoint(`/archivos/${id}/upload`), {
        method: "PATCH",
        headers: headers(token, true),
        body: data,
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/archivos/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  auditoria: {
    getAll: () => fetchJson(endpoint("/auditoria")),
  },

  estadisticas: {
    landing: () => fetchJson(endpoint("/estadisticas/landing")),
    topProductos: (top = 4) =>
      fetchJson(endpoint(`/estadisticas/top-productos?top=${top}`)),
    topProductosConLote: (top = 4) =>
      fetchJson(endpoint(`/estadisticas/top-productos-lote?top=${top}`)),
  },

  wishlist: {
    getByUsuario: (id_usuario: string, token?: string) =>
      fetchJson(
        endpoint(`/wishlist/${id_usuario}`),
        token ? { headers: headers(token) } : undefined,
      ),
    add: (token: string, data: { id_usuario: string; id_producto: string }) =>
      fetchJson(endpoint("/wishlist"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    remove: (token: string, id_usuario: string, id_producto: string) =>
      fetchJson(endpoint(`/wishlist/${id_usuario}/${id_producto}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    removeById: (token: string, id: string) =>
      fetchJson(endpoint(`/wishlist/item/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
    check: (id_usuario: string, id_producto: string) =>
      fetchJson(endpoint(`/wishlist/check/${id_usuario}/${id_producto}`)),
  },

  admin: {
    getStats: (token?: string) =>
      fetchJson(endpoint("/admin/stats"), { headers: headers(token) }),
    getRecentOrders: (token?: string) =>
      fetchJson(endpoint("/admin/pedidos/recientes"), {
        headers: headers(token),
      }),
    getTopProductores: (token?: string) =>
      fetchJson(endpoint("/admin/productores/top"), {
        headers: headers(token),
      }),
    getProductores: (
      token: string,
      filters?: {
        asociacion?: string;
        marca?: string;
        id_categoria?: number;
        estado?: string;
      },
    ): Promise<any[]> => {
      const params = new URLSearchParams();
      if (filters?.asociacion) params.set("asociacion", filters.asociacion);
      if (filters?.marca) params.set("marca", filters.marca);
      if (filters?.id_categoria)
        params.set("id_categoria", String(filters.id_categoria));
      if (filters?.estado) params.set("estado", filters.estado);
      const qs = params.toString();
      return fetchJson<any[]>(
        endpoint(`/admin/productores${qs ? `?${qs}` : ""}`),
        { headers: headers(token) },
      );
    },
    getProductos: (token: string, id_productor?: number): Promise<any[]> => {
      const qs = id_productor ? `?id_productor=${id_productor}` : "";
      return fetchJson<any[]>(endpoint(`/admin/productos${qs}`), {
        headers: headers(token),
      });
    },
  },

  paises: {
    list: (q?: { activo_venta?: boolean; activo_envio?: boolean }) => {
      const params = new URLSearchParams();
      if (typeof q?.activo_venta === "boolean")
        params.append("activo_venta", String(q.activo_venta));
      if (typeof q?.activo_envio === "boolean")
        params.append("activo_envio", String(q.activo_envio));
      const qs = params.toString();
      return fetchJson<Pais[]>(endpoint(`/paises${qs ? `?${qs}` : ""}`));
    },
    get: (iso2: string) => fetchJson<Pais>(endpoint(`/paises/${iso2}`)),
    create: (token: string, data: PaisInput) =>
      fetchJson<Pais>(endpoint("/paises"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, iso2: string, data: Partial<PaisInput>) =>
      fetchJson<Pais>(endpoint(`/paises/${iso2}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    remove: (token: string, iso2: string) =>
      fetchJson(endpoint(`/paises/${iso2}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  idiomas: {
    list: (soloActivos = false) =>
      fetchJson<Idioma[]>(
        endpoint(`/idiomas${soloActivos ? "?soloActivos=true" : ""}`),
      ),
    get: (codigo: string) => fetchJson<Idioma>(endpoint(`/idiomas/${codigo}`)),
  },

  tasasCambio: {
    actuales: () =>
      fetchJson<{
        MXN: {
          USD: number | null;
          EUR: number | null;
          BRL: number | null;
          CNY: number | null;
          JPY: number | null;
        };
      }>(endpoint("/tasas-cambio/actuales")),
    list: (origen?: string, destino?: string) => {
      const params = new URLSearchParams();
      if (origen) params.append("origen", origen);
      if (destino) params.append("destino", destino);
      const qs = params.toString();
      return fetchJson<TasaCambio[]>(
        endpoint(`/tasas-cambio${qs ? `?${qs}` : ""}`),
      );
    },
    vigente: (origen: string, destino: string, fecha?: string) => {
      const params = new URLSearchParams({ origen, destino });
      if (fecha) params.append("fecha", fecha);
      return fetchJson<TasaCambio>(
        endpoint(`/tasas-cambio/vigente?${params.toString()}`),
      );
    },
    convertir: (
      origen: string,
      destino: string,
      monto: string | number,
      fecha?: string,
    ) => {
      const params = new URLSearchParams({
        origen,
        destino,
        monto: String(monto),
      });
      if (fecha) params.append("fecha", fecha);
      return fetchJson<{
        monto_origen: number;
        monto_destino: number;
        moneda_origen: string;
        moneda_destino: string;
        tasa: string;
        vigente_desde: string;
      }>(endpoint(`/tasas-cambio/convertir?${params.toString()}`));
    },
    create: (
      token: string,
      data: {
        moneda_origen: string;
        moneda_destino: string;
        tasa: string;
        fuente?: string;
        vigente_desde?: string;
      },
    ) =>
      fetchJson<TasaCambio>(endpoint("/tasas-cambio"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
  },

  comisiones: {
    list: (token: string) =>
      fetchJson<Comision[]>(endpoint("/comisiones"), {
        headers: headers(token),
      }),
    get: (token: string, id: number) =>
      fetchJson<Comision>(endpoint(`/comisiones/${id}`), {
        headers: headers(token),
      }),
    resolver: (
      token: string,
      q: { id_productor?: number; id_categoria?: number; pais_iso2?: string },
    ) => {
      const params = new URLSearchParams();
      if (q.id_productor != null)
        params.append("id_productor", String(q.id_productor));
      if (q.id_categoria != null)
        params.append("id_categoria", String(q.id_categoria));
      if (q.pais_iso2) params.append("pais_iso2", q.pais_iso2);
      return fetchJson<{
        id_comision: number;
        porcentaje: number;
        monto_fijo: number | null;
        alcance: string;
      }>(endpoint(`/comisiones/resolver?${params.toString()}`), {
        headers: headers(token),
      });
    },
    create: (token: string, data: ComisionInput) =>
      fetchJson<Comision>(endpoint("/comisiones"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    update: (token: string, id: number, data: Partial<ComisionInput>) =>
      fetchJson<Comision>(endpoint(`/comisiones/${id}`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    remove: (token: string, id: number) =>
      fetchJson(endpoint(`/comisiones/${id}`), {
        method: "DELETE",
        headers: headers(token),
      }),
  },

  payouts: {
    list: (token: string, q?: { id_productor?: number; estado?: string }) => {
      const params = new URLSearchParams();
      if (q?.id_productor != null)
        params.append("id_productor", String(q.id_productor));
      if (q?.estado) params.append("estado", q.estado);
      const qs = params.toString();
      return fetchJson<Payout[]>(endpoint(`/payouts${qs ? `?${qs}` : ""}`), {
        headers: headers(token),
      });
    },
    get: (token: string, id: string) =>
      fetchJson<PayoutDetalle>(endpoint(`/payouts/${id}`), {
        headers: headers(token),
      }),
    misPayouts: (token: string, id_productor: number) =>
      fetchJson<Payout[]>(endpoint(`/payouts/mis-payouts/${id_productor}`), {
        headers: headers(token),
      }),
    generar: (
      token: string,
      data: {
        desde: string;
        hasta: string;
        proveedor?: string;
        estados_validos?: string[];
      },
    ) =>
      fetchJson<{
        creados: number;
        payouts: {
          id_payout: string;
          id_productor: number;
          moneda: string;
          cuenta: number;
        }[];
      }>(endpoint("/payouts/generar"), {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    actualizarEstado: (
      token: string,
      id: string,
      data: { estado: string; referencia_externa?: string; notas?: string },
    ) =>
      fetchJson<Payout>(endpoint(`/payouts/${id}/estado`), {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(data),
      }),
    resumenPendientes: (token: string) =>
      fetchJson<any[]>(endpoint("/payouts/resumen-pendientes"), {
        headers: headers(token),
      }),
  },
};

// === Tipos i18n + marketplace ===

export interface Pais {
  iso2: string;
  iso3: string;
  nombre: string;
  nombre_local: string | null;
  moneda_default: string;
  idioma_default: string;
  prefijo_telefono: string | null;
  activo_venta: boolean;
  activo_envio: boolean;
  creado_en: string;
}

export interface PaisInput {
  iso2: string;
  iso3: string;
  nombre: string;
  nombre_local?: string;
  moneda_default: string;
  idioma_default?: string;
  prefijo_telefono?: string;
  activo_venta?: boolean;
  activo_envio?: boolean;
}

export interface Idioma {
  codigo: string;
  nombre: string;
  nombre_local: string | null;
  activo: boolean;
  rtl: boolean;
}

export interface TasaCambio {
  moneda_origen: string;
  moneda_destino: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  tasa: string;
  fuente: string;
  creado_en: string;
}

export interface Comision {
  id_comision: number;
  alcance: "global" | "pais" | "categoria" | "productor";
  pais_iso2: string | null;
  id_categoria: number | null;
  id_productor: number | null;
  porcentaje: string;
  monto_fijo: string | null;
  moneda_monto_fijo: string | null;
  prioridad: number;
  vigente_desde: string;
  vigente_hasta: string | null;
  activo: boolean;
  creado_en: string;
}

export interface ComisionInput {
  alcance: "global" | "pais" | "categoria" | "productor";
  pais_iso2?: string;
  id_categoria?: number;
  id_productor?: number;
  porcentaje: string;
  monto_fijo?: string;
  moneda_monto_fijo?: string;
  prioridad?: number;
  activo?: boolean;
}

export interface Payout {
  id_payout: string;
  id_productor: number;
  moneda: string;
  monto_bruto: string;
  monto_comision: string;
  monto_neto: string;
  estado:
    | "pendiente"
    | "en_proceso"
    | "procesado"
    | "pagado"
    | "fallido"
    | "agotado"
    | "cancelado";
  proveedor: string | null;
  referencia_externa: string | null;
  periodo_desde: string;
  periodo_hasta: string;
  notas: string | null;
  creado_en: string;
  procesado_en: string | null;
  intentos?: number;
  ultimo_error?: string | null;
  proximo_reintento?: string | null;
  productores?: { id_productor: number; razon_social: string | null };
  pedido_productor?: Array<{
    id_pedido: string;
    estado: string;
    subtotal_bruto: string | null;
    comision_marketplace: string;
    monto_neto_productor: string | null;
    moneda: string | null;
  }>;
}

export interface PayoutDetalle extends Payout {
  pedido_productor: Array<{
    id_pedido: string;
    id_productor: number;
    estado: string;
    subtotal_bruto: string | null;
    comision_marketplace: string;
    monto_neto_productor: string | null;
    moneda: string | null;
    pedidos: { id_pedido: string; total: string; fecha_creacion: string };
  }>;
}
