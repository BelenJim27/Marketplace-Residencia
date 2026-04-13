const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

const headers = (token?: string, isFormData = false) => ({
  ...(!isFormData && { "Content-Type": "application/json" }),
  ...(token && { Authorization: `Bearer ${token}` }),
});

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error desconocido" }));
    throw new Error(error.message || `Error ${response.status}`);
  }
  return response.json();
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
      fetchJson(endpoint("/usuarios/me"), { headers: headers(token) }),
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
    getOne: (id: number) => fetchJson(endpoint(`/productores/${id}`)),
    getByUsuario: (id_usuario: string) => fetchJson(endpoint(`/productores/by-usuario/${id_usuario}`)),
    getByUbicacion: (ubicacion: string) => fetchJson(endpoint(`/productores?ubicacion=${ubicacion}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/productores"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/productores/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/productores/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  pedidos: {
    getAll: () => fetchJson(endpoint("/pedidos")),
    getOne: (id: string) => fetchJson(endpoint(`/pedidos/${id}`)),
    getAnalytics: (id_productor: number, periodo: string) =>
      fetchJson(endpoint(`/pedidos/estadisticas?id_productor=${id_productor}&periodo=${periodo}`)),
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
    getOne: (id: number) => fetchJson(endpoint(`/lotes/${id}`)),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/lotes"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: any) =>
      fetchJson(endpoint(`/lotes/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/lotes/${id}`), { method: "DELETE", headers: headers(token) }),
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
    getAll: () => fetchJson(endpoint("/roles")),
    getOne: (id: number) => fetchJson(endpoint(`/roles/${id}`)),
    create: (token: string, data: { nombre: string }) =>
      fetchJson(endpoint("/roles"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
    update: (token: string, id: number, data: { nombre?: string; estado?: string }) =>
      fetchJson(endpoint(`/roles/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
    delete: (token: string, id: number) =>
      fetchJson(endpoint(`/roles/${id}`), { method: "DELETE", headers: headers(token) }),
  },

  permisos: {
    getAll: () => fetchJson(endpoint("/roles/permisos")),
    getOne: (id: number) => fetchJson(endpoint(`/roles/permisos/${id}`)),
    create: (token: string, data: { nombre: string }) =>
      fetchJson(endpoint("/roles/permisos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
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
  },

  usuarios: {
    getAll: () => fetchJson(endpoint("/usuarios")),
    getOne: (id: string) => fetchJson(endpoint(`/usuarios/${id}`)),
    update: (token: string, id: string, data: any) =>
      fetchJson(endpoint(`/usuarios/${id}`), { method: "PATCH", headers: headers(token), body: JSON.stringify(data) }),
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
    getAll: () => fetchJson(endpoint("/archivos")),
    create: (token: string, data: any) =>
      fetchJson(endpoint("/archivos"), { method: "POST", headers: headers(token), body: JSON.stringify(data) }),
  },

  auditoria: {
    getAll: () => fetchJson(endpoint("/auditoria")),
  },
};
