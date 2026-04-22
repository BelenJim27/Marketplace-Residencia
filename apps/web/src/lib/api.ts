import { getCookie, setCookie } from "@/lib/cookies";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

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

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (response.status === 401) {
    try {
      if (!pendingRefresh) {
        pendingRefresh = refreshAccessToken().finally(() => {
          pendingRefresh = null;
        });
      }

      const newAccessToken = await pendingRefresh;


      const newHeaders = { ...options?.headers } as Record<string, string>;
      if (newHeaders["Authorization"]) {
        newHeaders["Authorization"] = `Bearer ${newAccessToken}`;
      }

      const retryResponse = await fetch(url, { ...options, headers: newHeaders });
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: "Error desconocido" }));
        throw new Error(error.message || `Error ${retryResponse.status}`);
      }
      return retryResponse.json() as Promise<T>;
    } catch {
      // Limpiar cookies y redirigir al login
      const cookies = document.cookie.split(";");
      cookies.forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        if (["token", "refresh_token", "usuario"].includes(name)) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      window.location.href = "/auth/sign-in";
      throw new Error("Sesión expirada. Por favor inicia sesión de nuevo.");
    }

  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let error = { message: `Error ${response.status}` };
    
    if (contentType && contentType.includes("application/json")) {
      try {
        error = await response.json();
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
    } else {
      const text = await response.text();
      console.error("Non-JSON error response:", text);
    }
    throw new Error(error.message || `Error ${response.status}`);
  }
  
  const text = await response.text();
  
  // Manejo robusto de respuestas vacías o nulas
  if (!text || text.trim() === '') {
    // Retornar objeto vacío si es una respuesta válida pero sin contenido
    // (típico en operaciones exitosas que no retornan data, ej: DELETE)
    console.warn("Servidor retornó respuesta vacía (válido para algunos endpoints)");
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
  return `${API_BASE}${path}`;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchJson<{ user: any; tokens: { access_token: string; refresh_token: string } }>(endpoint("/auth/login"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email, password }),
      }),
    register: (data: any) =>
      fetchJson<{ user: any; tokens: { access_token: string; refresh_token: string } }>(endpoint("/auth/register"), {
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
    }) => {
      const params = new URLSearchParams();
      if (filtros) {
        if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
        if (filtros.tipo_mezcal) params.append("tipo_mezcal", filtros.tipo_mezcal);
        if (filtros.maguey) params.append("maguey", filtros.maguey);
        if (filtros.precio_min) params.append("precio_min", filtros.precio_min);
        if (filtros.precio_max) params.append("precio_max", filtros.precio_max);
        if (filtros.destilacion) params.append("destilacion", filtros.destilacion);
        if (filtros.molienda) params.append("molienda", filtros.molienda);
        if (filtros.maestro_mezcalero) params.append("maestro_mezcalero", filtros.maestro_mezcalero);
      }
      const query = params.toString();
      return fetchJson(endpoint("/productos" + (query ? `?${query}` : "")));
    },
    getByProductor: (id_productor: number) => fetchJson(endpoint(`/productos?id_productor=${id_productor}`)),
    getMine: (token: string) =>
      fetchJson(endpoint("/productos"), { headers: headers(token) }),
    getOne: (id: string) => fetchJson(endpoint(`/productos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/productos"), {
        method: "POST",
        headers: headers(token, data instanceof FormData),
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/productos/${id}`), {
        method: "PATCH",
        headers: headers(token, data instanceof FormData),
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/productos/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  categorias: {
    getAll: () => fetchJson(endpoint("/categorias")),
    getOne: (id: number) => fetchJson(endpoint(`/categorias/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/categorias"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/categorias/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/categorias/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  tiendas: {
    getAll: () => fetchJson(endpoint("/tiendas")),
    getOne: (id: number) => fetchJson(endpoint(`/tiendas/${id}`)),
    getByProductor: (id_productor: number) => fetchJson(endpoint(`/tiendas?id_productor=${id_productor}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/tiendas"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/tiendas/${id}`), { method: "PUT", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/tiendas/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  productores: {
    getAll: () => fetchJson(endpoint("/productores")),
    getOne: (id: number) => fetchJson(`/api/productores/${id}`),
    getByUsuario: (id_usuario: string) => fetchJson(endpoint(`/productores/by-usuario/${id_usuario}`)),
    getByUbicacion: (ubicacion: string) => fetchJson(endpoint(`/productores?ubicacion=${ubicacion}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/productores"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/productores/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/productores/${id}`), { method: "DELETE", headers: headers(token) }),
    getRegiones: () => fetchJson(endpoint("/productores/regiones")),
    getMiSolicitud: (token: string) =>
      fetchJson(endpoint("/productores/mi-solicitud"), { headers: headers(token) }),
    solicitar: (token: string, data: { id_region?: number; rfc?: string; razon_social?: string; datos_bancarios?: string; direccion_fiscal?: { linea_1?: string; linea_2?: string; referencia?: string; ubicacion?: Record<string, unknown>; es_internacional?: boolean } }) =>
      fetchJson(endpoint("/productores/solicitar"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    getSolicitudesPendientes: (token: string) =>
      fetchJson(endpoint("/admin/productores/solicitudes"), { headers: headers(token) }),
    revisarSolicitud: (token: string, id: number, data: { estado: string; motivo_rechazo?: string }) =>
      fetchJson(endpoint(`/admin/productores/${id}/revisar`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    aprobarSolicitud: (token: string, id: number) =>
      fetchJson(endpoint(`/admin/productores/${id}/aprobar`), { method: "PATCH", headers: headers(token) }),
    rechazarSolicitud: (token: string, id: number, motivo: string) =>
      fetchJson(endpoint(`/admin/productores/${id}/rechazar`), { method: "PATCH", headers: headers(token), body: JSON.stringify({ estado: "rechazado", motivo_rechazo: motivo }) }),
  },

  pedidos: {
    getAll: () => fetchJson(endpoint("/pedidos")),
    getOne: (id: string) => fetchJson(endpoint(`/pedidos/${id}`)),
    getMineSales: (token: string) =>
      fetchJson(endpoint("/pedidos/mis-ventas"), { headers: headers(token) }),
    getAnalytics: (token: string, periodo: string) =>
      fetchJson(endpoint(`/pedidos/estadisticas?periodo=${periodo}`), { headers: headers(token) }),
    getByUsuario: (usuarioId: string) => fetchJson(endpoint(`/pedidos?usuario=${usuarioId}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/pedidos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/pedidos/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/pedidos/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  envios: {
    getAll: () => fetchJson(endpoint("/envios")),
    getOne: (id: string) => fetchJson(endpoint(`/envios/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/envios"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/envios/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/envios/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  transportistas: {
    getAll: () => fetchJson(endpoint("/transportistas")),
    getOne: (id: number) => fetchJson(endpoint(`/transportistas/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/transportistas"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/transportistas/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/transportistas/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  pagos: {
    getAll: () => fetchJson(endpoint("/pagos")),
    getOne: (id: string) => fetchJson(endpoint(`/pagos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/pagos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/pagos/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/pagos/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  metodosPago: {
    getAll: () => fetchJson(endpoint("/pagos/monedas")),
    getOne: (id: number) => fetchJson(endpoint(`/pagos/monedas/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/pagos/monedas"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/pagos/monedas/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/pagos/monedas/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  carritos: {
    getAll: () => fetchJson(endpoint("/carrito")),
    getOne: (id: string) => fetchJson(endpoint(`/carrito/${id}`)),
    getByUsuario: (usuarioId: string) => fetchJson(endpoint(`/carrito/${usuarioId}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/carrito"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/carrito/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  carritoItems: {
    create: (token: string, data: any) =>
      fetchJson(endpoint("/carrito"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/carrito/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/carrito/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  inventario: {
    getAll: () => fetchJson(endpoint("/inventario")),
    getOne: (id: string) => fetchJson(endpoint(`/inventario/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/inventario"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/inventario/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/inventario/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  resenas: {
    getAll: () => fetchJson(endpoint("/resenas")),
    getOne: (id: number) => fetchJson(endpoint(`/resenas/${id}`)),
    getByProducto: (productoId: string) => fetchJson(endpoint(`/productos/${productoId}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/resenas"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/resenas/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/resenas/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  lotes: {
    getAll: () => fetchJson(endpoint("/lotes")),
    getByProductor: (id_productor: number) =>
      fetchJson(endpoint(`/lotes?${new URLSearchParams({ id_productor: String(id_productor) }).toString()}`)),
    getOne: (id: number) => fetchJson(endpoint(`/lotes/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/lotes"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/lotes/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/lotes/${id}`), { method: "DELETE", headers: headers(token) }),
    sincronizar: (token: string, data: { uuid_externo: string; id_productor: number; id_region?: number }) =>
      fetchJson(endpoint("/lotes/sincronizar"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    sincronizarTodos: (token: string) =>
    fetchJson(endpoint("/lotes/sincronizar-todos"), {
      method: "POST",
      headers: headers(token),
    }),
  },

  imagenes: {
    getAll: () => fetchJson(endpoint("/productos")),
    getOne: (id: number) => fetchJson(endpoint(`/productos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/productos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/productos/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/productos/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  roles: {
    getAll: (token: string) => fetchJson(endpoint("/roles"), { headers: headers(token) }),
    getOne: (token: string, id: number) => fetchJson(endpoint(`/roles/${id}`), { headers: headers(token) }),
    create: (token: string, data: { nombre: string }) =>
      fetchJson(endpoint("/roles"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: { nombre?: string; estado?: string }) =>
      fetchJson(endpoint(`/roles/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  permisos: {
    getAll: (token: string) => fetchJson(endpoint("/roles/permisos"), { headers: headers(token) }),
    getOne: (token: string, id: number) => fetchJson(endpoint(`/roles/permisos/${id}`), { headers: headers(token) }),
    create: (token: string, data: { nombre: string }) =>
      fetchJson(endpoint("/roles/permisos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: { nombre: string }) =>
      fetchJson(endpoint(`/roles/permisos/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/permisos/${id}`), { method: "DELETE", headers: headers(token) }),
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
    getByRole: (token: string, id_rol: number) => fetchJson(endpoint(`/roles/${id_rol}/permisos`), { headers: headers(token) }),
  },

  usuarios: {
    getAll: (token: string) => fetchJson(endpoint("/usuarios"), { headers: headers(token) }),
    getOne: (token: string, id: string) => fetchJson(endpoint(`/usuarios/${id}`), { headers: headers(token) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/usuarios/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    uploadPhoto: (token: string, id: string, data: FormData) =>
      fetchJson(endpoint(`/usuarios/${id}/foto`), { method: "PATCH", headers: headers(token, true), body: data }),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/usuarios"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/usuarios/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  notificaciones: {
    getAll: () => fetchJson(endpoint("/notificaciones")),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/notificaciones"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/notificaciones/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/notificaciones/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  direcciones: {
    getAll: () => fetchJson(endpoint("/direcciones")),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/direcciones"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/direcciones/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/direcciones/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  configuracion: {
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
  },

  archivos: {
    getAll: (params?: { entidad_tipo?: string; entidad_id?: number | string }) => {
      const query = new URLSearchParams();
      if (params?.entidad_tipo) query.append("entidad_tipo", params.entidad_tipo);
      if (params?.entidad_id != null) query.append("entidad_id", String(params.entidad_id));
      return fetchJson(endpoint(`/archivos${query.toString() ? `?${query.toString()}` : ""}`));
    },
    getOne: (id: string) => fetchJson(endpoint(`/archivos/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/archivos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    upload: (token: string, data: FormData) =>
      fetchJson(endpoint("/archivos/upload"), { method: "POST", headers: headers(token, true), body: data }),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/archivos/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    replace: (token: string, id: string, data: FormData) =>
      fetchJson(endpoint(`/archivos/${id}/upload`), { method: "PATCH", headers: headers(token, true), body: data }),
    delete: (token: string, id: string) =>
      fetchJson(endpoint(`/archivos/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  auditoria: {
    getAll: () => fetchJson(endpoint("/auditoria")),
  },

  wishlist: {
    getByUsuario: (id_usuario: string) => fetchJson(endpoint(`/wishlist/${id_usuario}`)),
    add: (token: string, data: { id_usuario: string; id_producto: string }) =>
      fetchJson(endpoint("/wishlist"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    remove: (token: string, id_usuario: string, id_producto: string) =>
      fetchJson(endpoint(`/wishlist/${id_usuario}/${id_producto}`), { method: "DELETE", headers: headers(token) }),
    removeById: (token: string, id: string) =>
      fetchJson(endpoint(`/wishlist/item/${id}`), { method: "DELETE", headers: headers(token) }),
    check: (id_usuario: string, id_producto: string) =>
      fetchJson(endpoint(`/wishlist/check/${id_usuario}/${id_producto}`)),
  },

  admin: {
    getStats: (token?: string) =>
      fetchJson(endpoint("/admin/stats"), { headers: headers(token) }),
    getRecentOrders: (token?: string) =>
      fetchJson(endpoint("/admin/pedidos/recientes"), { headers: headers(token) }),
    getTopProductores: (token?: string) =>
      fetchJson(endpoint("/admin/productores/top"), { headers: headers(token) }),
  },
};
