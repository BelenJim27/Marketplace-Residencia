"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Search, X, Heart, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";

interface Producto {
  id: number;
  id_producto: bigint;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
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

export function ProductosGrid() {
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [agregadoId, setAgregadoId] = useState<number | bigint | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosPendientes, setFiltrosPendientes] = useState<Filtros>(FILTROS_VACIOS);

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
      setProductos(data as Producto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial y cada vez que cambian los filtros aplicados
  useEffect(() => {
    fetchProductos(filtros);
  }, [filtros, fetchProductos]);

  // Aplicar filtros automáticamente - búsqueda con debounce, resto instantáneo
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
    setShowFilters(false);
  };

  const quitarFiltro = (campo: keyof Filtros) => {
    const nuevos = { ...filtros, [campo]: "" };
    setFiltros(nuevos);
    setFiltrosPendientes(nuevos);
  };

  const limpiarTodo = () => {
    setFiltros(FILTROS_VACIOS);
    setFiltrosPendientes(FILTROS_VACIOS);
  };

  // Filtros activos = todos excepto búsqueda (que tiene su propia barra)
  const filtrosActivos = (Object.keys(filtros) as (keyof Filtros)[]).filter(
    (k) => k !== "busqueda" && filtros[k] !== ""
  );
  const cantidadFiltros = filtrosActivos.length;

  const toggleWishlist = (producto: Producto) => {
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

  return (
    <div className="space-y-4">

      {/* ── Barra superior: búsqueda + botón de filtros ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={filtrosPendientes.busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-dark dark:text-white"
          />
          {filtrosPendientes.busqueda && (
            <button
              onClick={() => handleBusquedaChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setFiltrosPendientes(filtros); // sincronizar panel con filtros aplicados
            setShowFilters(!showFilters);
          }}
          className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            showFilters || cantidadFiltros > 0
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros</span>
          {cantidadFiltros > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-green-700">
              {cantidadFiltros}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* ── Chips de filtros activos ── */}
      {(filtros.busqueda || cantidadFiltros > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {filtros.busqueda && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Búsqueda: "{filtros.busqueda}"
              <button onClick={() => quitarFiltro("busqueda")} className="hover:text-green-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filtrosActivos.map((campo) => (
            <span
              key={campo}
              className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              {ETIQUETAS_FILTRO[campo]}: {campo.startsWith("precio") ? `$${filtros[campo]}` : filtros[campo]}
              <button onClick={() => quitarFiltro(campo)} className="hover:text-green-600">
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

      {/* ── Panel de filtros ── */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-dark">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Filtrar productos</p>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">

            {/* Tipo de Mezcal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Tipo de Mezcal
              </label>
              <select
                value={filtrosPendientes.tipo_mezcal}
                onChange={(e) => handleFiltroChange("tipo_mezcal", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todos</option>
                {TIPOS_MEZCAL.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Maguey */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Maguey
              </label>
              <select
                value={filtrosPendientes.maguey}
                onChange={(e) => handleFiltroChange("maguey", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todos</option>
                {TIPOS_MAGUEY.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Destilación */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Destilación
              </label>
              <select
                value={filtrosPendientes.destilacion}
                onChange={(e) => handleFiltroChange("destilacion", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todas</option>
                {TIPOS_DESTILACION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Molienda */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Molienda
              </label>
              <select
                value={filtrosPendientes.molienda}
                onChange={(e) => handleFiltroChange("molienda", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todas</option>
                {TIPOS_MOLIENDA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Precio mínimo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Precio mínimo (MXN)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filtrosPendientes.precio_min}
                  onChange={(e) => handleFiltroChange("precio_min", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Precio máximo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Precio máximo (MXN)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="9999"
                  value={filtrosPendientes.precio_max}
                  onChange={(e) => handleFiltroChange("precio_max", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Maestro Mezcalero */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Maestro Mezcalero
              </label>
              <input
                type="text"
                placeholder="Nombre del maestro..."
                value={filtrosPendientes.maestro_mezcalero}
                onChange={(e) => handleFiltroChange("maestro_mezcalero", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Footer del panel */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-700">
            <button
              onClick={() => {
                setFiltrosPendientes(FILTROS_VACIOS);
              }}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400"
            >
              Limpiar filtros
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={aplicarFiltros}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 active:scale-95 transition-transform"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid de productos ── */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-green-600">
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
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
          >
            Reintentar
          </button>
        </div>
      ) : productos.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-gray-500">
          <p>No hay productos que coincidan con los filtros.</p>
          {(cantidadFiltros > 0 || filtros.busqueda) && (
            <button
              onClick={limpiarTodo}
              className="text-sm text-green-600 underline hover:text-green-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <div
              key={String(producto.id_producto)}
              className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-dark dark:ring-gray-700"
            >
              {/* Imagen */}
              <button
                onClick={() => router.push(`/Cliente/producto/${producto.id_producto}`)}
                className="relative block aspect-square w-full overflow-hidden bg-gray-100"
              >
                {producto.producto_imagenes?.[0]?.url || producto.imagen_principal_url ? (
                  <Image
                    src={producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url!}
                    alt={producto.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300 text-sm">
                    Sin imagen
                  </div>
                )}

                {/* Botón wishlist sobre la imagen */}
                <div
                  className="absolute right-2 top-2"
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(producto); }}
                >
                  
                </div>
              </button>

              {/* Info */}
              <div className="p-4">
                <button
                  onClick={() => router.push(`/Cliente/producto/${producto.id_producto}`)}
                  className="block w-full text-left"
                >
                  <h3 className="mb-1 text-sm font-semibold leading-snug text-gray-900 dark:text-white line-clamp-1">
                    {producto.nombre}
                  </h3>
                  <p className="mb-3 text-xs leading-relaxed text-gray-500 line-clamp-2">
                    {producto.descripcion}
                  </p>
                </button>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    ${Number(producto.precio_base || 0).toFixed(2)}
                  </span>
                  <button
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
                    disabled={agregadoId === producto.id_producto}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      agregadoId === producto.id_producto
                        ? "bg-green-700 text-white"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {agregadoId === producto.id_producto ? "¡Agregado!" : "Agregar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conteo de resultados */}
      {!loading && !error && productos.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          {productos.length} producto{productos.length !== 1 ? "s" : ""} encontrado{productos.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
