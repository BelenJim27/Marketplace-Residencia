"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Search, X, Heart, SlidersHorizontal } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";
import { useIsMobile } from "@/hooks/useMobile";

interface Producto {
  id: number;
  id_producto: bigint;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  categorias?: string[];
  nombre_productor?: string | null;
  lotes?: {
    datos_api?: Record<string, string>;
    productores?: { biografia?: string };
  };
}

interface Filtros {
  busqueda: string;
  tipo_mezcal: string;
  maguey: string;
  precio_min: string;
  precio_max: string;
  destilacion: string;
  molienda: string;
  maestro_mezcalero: string;
}

const FILTROS_VACIOS: Filtros = {
  busqueda: "",
  tipo_mezcal: "",
  maguey: "",
  precio_min: "",
  precio_max: "",
  destilacion: "",
  molienda: "",
  maestro_mezcalero: "",
};

const TIPOS_MEZCAL = ["Espadín","Tobalá","Peñata","Madrecuixe","Arroqueño","Cuishe","Coyote","Litrea","Garabatillo","Anejo"];
const TIPOS_MAGUEY = ["Espadín","Tobalá","Peñata","Madrecuixe","Arroqueño","Cuishe","Coyote","Litrea","Garabatillo"];
const TIPOS_DESTILACION = ["Alambique","Artefacto","Cambio"];
const TIPOS_MOLIENDA = ["Tahona","Molino de piedra","Molino mecánico","Manual"];

const ETIQUETAS_FILTRO: Record<keyof Filtros, string> = {
  busqueda: "Búsqueda",
  tipo_mezcal: "Tipo",
  maguey: "Maguey",
  precio_min: "Precio mín",
  precio_max: "Precio máx",
  destilacion: "Destilación",
  molienda: "Molienda",
  maestro_mezcalero: "Maestro",
};

export default function ProductCatalogClient() {
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregadoId, setAgregadoId] = useState<number | bigint | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosPendientes, setFiltrosPendientes] = useState<Filtros>(FILTROS_VACIOS);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [ordenar, setOrdenar] = useState<'popular' | 'precio_asc' | 'precio_desc' | 'nombre_az'>('popular');
  const [precioMinLocal, setPrecioMinLocal] = useState("");
  const [precioMaxLocal, setPrecioMaxLocal] = useState("");
  const isMobile = useIsMobile();

  const fetchProductos = useCallback(async (f: Filtros) => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof api.productos.getAll>[0] = {};
      if (f.busqueda)          params.busqueda          = f.busqueda;
      if (f.tipo_mezcal)       params.tipo_mezcal       = f.tipo_mezcal;
      if (f.maguey)            params.maguey            = f.maguey;
      if (f.precio_min)        params.precio_min        = f.precio_min;
      if (f.precio_max)        params.precio_max        = f.precio_max;
      if (f.destilacion)       params.destilacion       = f.destilacion;
      if (f.molienda)          params.molienda          = f.molienda;
      if (f.maestro_mezcalero) params.maestro_mezcalero = f.maestro_mezcalero;

      const data = await api.productos.getAll(params);
      const filtrados = (data as Producto[]).filter(
        p => p.categorias && p.categorias.length > 0 && p.nombre_productor
      );
      setProductos(filtrados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos(filtros);
  }, [filtros, fetchProductos]);

  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusqueda(filtrosPendientes.busqueda);
    }, 200);
    return () => clearTimeout(timer);
  }, [filtrosPendientes.busqueda]);
  
  useEffect(() => {
    const nuevos: Filtros = {
      busqueda: debouncedBusqueda,
      tipo_mezcal: filtrosPendientes.tipo_mezcal,
      maguey: filtrosPendientes.maguey,
      precio_min: filtrosPendientes.precio_min,
      precio_max: filtrosPendientes.precio_max,
      destilacion: filtrosPendientes.destilacion,
      molienda: filtrosPendientes.molienda,
      maestro_mezcalero: filtrosPendientes.maestro_mezcalero,
    };
    setFiltros(nuevos);
  }, [debouncedBusqueda, filtrosPendientes.tipo_mezcal, filtrosPendientes.maguey, filtrosPendientes.precio_min, filtrosPendientes.precio_max, filtrosPendientes.destilacion, filtrosPendientes.molienda, filtrosPendientes.maestro_mezcalero]);

  const handleBusquedaChange = (valor: string) => {
    setFiltrosPendientes((prev) => ({ ...prev, busqueda: valor }));
  };

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltrosPendientes((prev) => {
      const nuevos = { ...prev, [campo]: valor };
      if (campo === "tipo_mezcal" && valor && TIPOS_MAGUEY.includes(valor)) {
        nuevos.maguey = valor;
      } else if (campo === "maguey" && valor && TIPOS_MEZCAL.includes(valor)) {
        nuevos.tipo_mezcal = valor;
      }
      return nuevos;
    });
  };

  const aplicarFiltros = () => {
    setFiltros(filtrosPendientes);
    setShowMobileFilters(false);
  };

  const quitarFiltro = (campo: keyof Filtros) => {
    const nuevos = { ...filtros, [campo]: "" };
    setFiltros(nuevos);
    setFiltrosPendientes(nuevos);
    if (campo === "precio_min") setPrecioMinLocal("");
    if (campo === "precio_max") setPrecioMaxLocal("");
  };

  const limpiarTodo = () => {
    setFiltros(FILTROS_VACIOS);
    setFiltrosPendientes(FILTROS_VACIOS);
    setPrecioMinLocal("");
    setPrecioMaxLocal("");
  };

  const productosMostrados = useMemo(() => {
    let sorted = [...productos];
    if (ordenar === 'precio_asc') sorted.sort((a, b) => parseFloat(a.precio_base) - parseFloat(b.precio_base));
    if (ordenar === 'precio_desc') sorted.sort((a, b) => parseFloat(b.precio_base) - parseFloat(a.precio_base));
    if (ordenar === 'nombre_az') sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return sorted;
  }, [productos, ordenar]);

  const filtrosActivos = (Object.keys(filtros) as (keyof Filtros)[]).filter(
    (k) => k !== "busqueda" && filtros[k] !== ""
  );
  const cantidadFiltros = filtrosActivos.length;

  const toggleWishlist = (producto: Producto) => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in?redirect=/Cliente/producto");
      return;
    }
    if (isInWishlist(producto.id_producto)) {
      eliminarWishlist(producto.id_producto);
    } else {
      agregarWishlist({
        id_producto: producto.id_producto,
        nombre: producto.nombre,
        precio_base: producto.precio_base,
        imagen_principal_url: producto.imagen_principal_url,
        producto_imagenes: producto.producto_imagenes,
      });
    }
  };

  const handleAplicarPrecio = () => {
    handleFiltroChange("precio_min", precioMinLocal);
    handleFiltroChange("precio_max", precioMaxLocal);
  };

  // Sidebar filter component (desktop)
  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Buscar */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Buscar</h3>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Productos..."
            value={filtrosPendientes.busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-dark dark:text-white"
          />
        </div>
      </div>

      {/* Tipo de Mezcal */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#e8dcc8" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Tipo de Mezcal</h3>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_MEZCAL.map(tipo => (
            <button
              key={tipo}
              onClick={() => handleFiltroChange("tipo_mezcal", filtrosPendientes.tipo_mezcal === tipo ? "" : tipo)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors font-medium"
              style={{
                backgroundColor: filtrosPendientes.tipo_mezcal === tipo ? "var(--bio-color-boton, #5c3d1e)" : "#f0ebe0",
                color: filtrosPendientes.tipo_mezcal === tipo ? "white" : "var(--bio-color-titulo, #5c3d1e)",
                border: "1px solid #e8dcc8"
              }}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Maguey */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#e8dcc8" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Maguey</h3>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_MAGUEY.map(m => (
            <button
              key={m}
              onClick={() => handleFiltroChange("maguey", filtrosPendientes.maguey === m ? "" : m)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors font-medium"
              style={{
                backgroundColor: filtrosPendientes.maguey === m ? "var(--bio-color-boton, #5c3d1e)" : "#f0ebe0",
                color: filtrosPendientes.maguey === m ? "white" : "var(--bio-color-titulo, #5c3d1e)",
                border: "1px solid #e8dcc8"
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Destilación */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#e8dcc8" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Destilación</h3>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_DESTILACION.map(d => (
            <button
              key={d}
              onClick={() => handleFiltroChange("destilacion", filtrosPendientes.destilacion === d ? "" : d)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors font-medium"
              style={{
                backgroundColor: filtrosPendientes.destilacion === d ? "var(--bio-color-boton, #5c3d1e)" : "#f0ebe0",
                color: filtrosPendientes.destilacion === d ? "white" : "var(--bio-color-titulo, #5c3d1e)",
                border: "1px solid #e8dcc8"
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Molienda */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#e8dcc8" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Molienda</h3>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_MOLIENDA.map(m => (
            <button
              key={m}
              onClick={() => handleFiltroChange("molienda", filtrosPendientes.molienda === m ? "" : m)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors font-medium"
              style={{
                backgroundColor: filtrosPendientes.molienda === m ? "var(--bio-color-boton, #5c3d1e)" : "#f0ebe0",
                color: filtrosPendientes.molienda === m ? "white" : "var(--bio-color-titulo, #5c3d1e)",
                border: "1px solid #e8dcc8"
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Rango de Precio */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#e8dcc8" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Rango de Precio (MXN)</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            placeholder="Mín"
            value={precioMinLocal}
            onChange={(e) => setPrecioMinLocal(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <input
            type="number"
            placeholder="Máx"
            value={precioMaxLocal}
            onChange={(e) => setPrecioMaxLocal(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <button
          onClick={handleAplicarPrecio}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
        >
          Aplicar
        </button>
      </div>

      {/* Maestro Mezcalero */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "#e8dcc8" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>Maestro Mezcalero</h3>
        <input
          type="text"
          placeholder="Nombre..."
          value={filtrosPendientes.maestro_mezcalero}
          onChange={(e) => handleFiltroChange("maestro_mezcalero", e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {cantidadFiltros > 0 && (
        <button
          onClick={limpiarTodo}
          className="w-full text-sm font-medium text-red-600 hover:text-red-700 border-t pt-4"
          style={{ borderColor: "#e8dcc8" }}
        >
          Limpiar todo
        </button>
      )}
    </div>
  );

  return (
    <div className="flex gap-6">
      {/* ─── SIDEBAR (desktop only) ─── */}
      <aside className="hidden lg:block w-72 shrink-0" style={{ backgroundColor: "var(--bio-color-fondo, #faf8f4)" }}>
        <div className="rounded-xl border p-6" style={{ border: "1px solid #e8dcc8" }}>
          <SidebarContent />
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 min-w-0">
        {/* Mobile filter button */}
        <div className="lg:hidden mb-4 flex gap-2">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: cantidadFiltros > 0 ? "var(--bio-color-boton2, #8b6914)" : "#f0ebe0",
              color: cantidadFiltros > 0 ? "white" : "var(--bio-color-titulo, #5c3d1e)"
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {cantidadFiltros > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "white", color: "var(--bio-color-boton2, #8b6914)" }}>
                {cantidadFiltros}
              </span>
            )}
          </button>
        </div>

        {/* Active filter pills */}
        {(filtros.busqueda || cantidadFiltros > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {filtros.busqueda && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: "#f0ebe0", color: "var(--bio-color-titulo, #5c3d1e)", border: "1px solid #e8dcc8" }}>
                "{filtros.busqueda}"
                <button onClick={() => quitarFiltro("busqueda")} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filtrosActivos.map((campo) => (
              <span
                key={campo}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "#f0ebe0", color: "var(--bio-color-titulo, #5c3d1e)", border: "1px solid #e8dcc8" }}
              >
                {campo.startsWith("precio") ? `$ ${Number(filtros[campo]).toLocaleString("es-MX")}` : filtros[campo]}
                <button onClick={() => quitarFiltro(campo)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={limpiarTodo}
              className="text-xs text-gray-500 underline underline-offset-2 hover:text-red-600"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* Header: Count + Sort */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-600" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
            {productosMostrados.length} producto{productosMostrados.length !== 1 ? "s" : ""} encontrado{productosMostrados.length !== 1 ? "s" : ""}
          </p>
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value as typeof ordenar)}
            className="text-sm rounded-lg border py-1.5 px-3 focus:outline-none focus:ring-1"
            style={{ borderColor: "#e8dcc8", backgroundColor: "var(--bio-color-fondo, #faf8f4)", color: "var(--bio-color-titulo, #5c3d1e)" }}
          >
            <option value="popular">Popular</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre_az">Nombre A–Z</option>
          </select>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
              <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm">Cargando productos...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
            <p className="text-red-500">Error: {error}</p>
            <button
              onClick={() => fetchProductos(filtros)}
              className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
              style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
            >
              Reintentar
            </button>
          </div>
        ) : productosMostrados.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-gray-500">
            <p>No hay productos que coincidan con los filtros.</p>
            {(cantidadFiltros > 0 || filtros.busqueda) && (
              <button
                onClick={limpiarTodo}
                className="text-sm font-medium hover:opacity-90"
                style={{ color: "var(--bio-color-boton, #5c3d1e)" }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {productosMostrados.map((producto) => {
              const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
              const tipoMezcal = producto.lotes?.datos_api?.tipo_mezcal ?? "";
              const subtitulo = producto.lotes?.datos_api?.maguey ?? "";

              return (
                <div
                  key={String(producto.id_producto)}
                  className="group rounded-xl overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderColor: "#e8dcc8", backgroundColor: "var(--bio-color-fondo, #faf8f4)" }}
                >
                  {/* Image Zone */}
                  <div
                    className="relative overflow-hidden bg-gray-50"
                    style={{ aspectRatio: "1 / 1" }}
                    onClick={() => router.push(`/Cliente/producto/${producto.id_producto}`)}
                  >
                    {imagenUrl ? (
                      <Image
                        src={imagenUrl}
                        alt={producto.nombre}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-sm">Sin imagen</div>
                    )}

                    {/* Type badge top-left */}
                    {tipoMezcal && (
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: "#f0ebe0", color: "var(--bio-color-precio, #8b6914)", border: "1px solid #e8dcc8" }}
                      >
                        {tipoMezcal}
                      </span>
                    )}

                    {/* Wishlist heart top-right */}
                    <button
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110"
                      style={{
                        backgroundColor: isInWishlist(producto.id_producto) ? "#fdf7ee" : "rgba(250,248,244,0.9)",
                        color: isInWishlist(producto.id_producto) ? "#b07850" : "#c8a97a",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(producto);
                      }}
                    >
                      <Heart className="h-3.5 w-3.5" fill={isInWishlist(producto.id_producto) ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Text Zone */}
                  <div className="p-4">
                    {subtitulo && (
                      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "#b07850" }}>
                        {subtitulo}
                      </p>
                    )}
                    <h3
                      className="font-semibold text-sm line-clamp-2 mb-2 leading-snug cursor-pointer hover:opacity-80"
                      style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
                      onClick={() => router.push(`/Cliente/producto/${producto.id_producto}`)}
                    >
                      {producto.nombre}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="font-bold text-base"
                        style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-precio, #8b6914)" }}
                      >
                        ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })} MXN
                      </span>
                    </div>
                    <button
                      className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: agregadoId === producto.id_producto
                          ? "var(--bio-color-boton-hover, #3d2510)"
                          : "var(--bio-color-boton, #5c3d1e)",
                      }}
                      disabled={agregadoId === producto.id_producto}
                      onClick={(e) => {
                        e.stopPropagation();
                        agregarProducto({
                          id_producto: producto.id_producto,
                          nombre: producto.nombre,
                          precio_base: producto.precio_base,
                          imagen_principal_url: producto.imagen_principal_url,
                          producto_imagenes: producto.producto_imagenes,
                          cantidad: 1,
                        });
                        setAgregadoId(producto.id_producto);
                        setTimeout(() => setAgregadoId(null), 1500);
                      }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {agregadoId === producto.id_producto ? "¡Agregado!" : "Agregar al carrito"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MOBILE FILTER DRAWER ─── */}
      {showMobileFilters && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowMobileFilters(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto shadow-xl"
            style={{ backgroundColor: "var(--bio-color-fondo, #faf8f4)" }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#e8dcc8" }}>
              <span className="font-semibold" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>Filtros</span>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <SidebarContent />
            </div>
          </div>
        </>
      )}
    </div>
  );
}