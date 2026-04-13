"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Search, X } from "lucide-react";

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
    productores?: { biografia?: string; otras_caracteristicas?: string };
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

const TIPOS_MEZCAL = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo", "Anejo"];
const TIPOS_MAGUEY = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo"];
const TIPOS_DESTILACION = ["Alambique", "Artefacto", "Cambio"];
const TIPOS_MOLIENDA = ["Tahona", "Molino de piedra", "Molino mecánico", "Manual"];

export function ProductosGrid() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    busqueda: "",
    tipo_mezcal: "",
    maguey: "",
    precio_min: "",
    precio_max: "",
    destilacion: "",
    molienda: "",
    maestro_mezcalero: "",
  });

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof api.productos.getAll>[0] = {};
      if (filtros.busqueda) params.busqueda = filtros.busqueda;
      if (filtros.tipo_mezcal) params.tipo_mezcal = filtros.tipo_mezcal;
      if (filtros.maguey) params.maguey = filtros.maguey;
      if (filtros.precio_min) params.precio_min = filtros.precio_min;
      if (filtros.precio_max) params.precio_max = filtros.precio_max;
      if (filtros.destilacion) params.destilacion = filtros.destilacion;
      if (filtros.molienda) params.molienda = filtros.molienda;
      if (filtros.maestro_mezcalero) params.maestro_mezcalero = filtros.maestro_mezcalero;

      const data = await api.productos.getAll(params);
      setProductos(data as Producto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: "",
      tipo_mezcal: "",
      maguey: "",
      precio_min: "",
      precio_max: "",
      destilacion: "",
      molienda: "",
      maestro_mezcalero: "",
    });
  };

  const tieneFiltrosActivos = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={filtros.busqueda}
            onChange={(e) => handleFiltroChange("busqueda", e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-dark dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showFilters || tieneFiltrosActivos
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          {showFilters || tieneFiltrosActivos ? "Ocultar filtros" : "Mostrar filtros"}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-dark">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtros</h3>
            {tieneFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Tipo de Mezcal
              </label>
              <select
                value={filtros.tipo_mezcal}
                onChange={(e) => handleFiltroChange("tipo_mezcal", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todos</option>
                {TIPOS_MEZCAL.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Maguey
              </label>
              <select
                value={filtros.maguey}
                onChange={(e) => handleFiltroChange("maguey", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todos</option>
                {TIPOS_MAGUEY.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Destilación
              </label>
              <select
                value={filtros.destilacion}
                onChange={(e) => handleFiltroChange("destilacion", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todas</option>
                {TIPOS_DESTILACION.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Molienda
              </label>
              <select
                value={filtros.molienda}
                onChange={(e) => handleFiltroChange("molienda", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Todas</option>
                {TIPOS_MOLIENDA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Precio mínimo
              </label>
              <input
                type="number"
                placeholder="0"
                value={filtros.precio_min}
                onChange={(e) => handleFiltroChange("precio_min", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Precio máximo
              </label>
              <input
                type="number"
                placeholder="9999"
                value={filtros.precio_max}
                onChange={(e) => handleFiltroChange("precio_max", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Maestro Mezcalero
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre del maestro..."
                value={filtros.maestro_mezcalero}
                onChange={(e) => handleFiltroChange("maestro_mezcalero", e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-green-600">Cargando productos...</div>
        </div>
      ) : error ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      ) : productos.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-gray-500">No hay productos disponibles</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productos.map((producto) => (
            <div
              key={producto.id_producto}
              className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg dark:bg-gray-dark"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                {producto.producto_imagenes?.[0] ? (
                  <Image
                    src={producto.producto_imagenes[0].url}
                    alt={producto.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"                    className="object-cover"
                  />
                ) : producto.imagen_principal_url ? (
                  <Image
                    src={producto.imagen_principal_url}
                    alt={producto.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {producto.nombre}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-gray-500">
                  {producto.descripcion}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-green-600">
                    ${Number(producto.precio_base || 0).toFixed(2)}
                  </span>
                  <button className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700">
                    <ShoppingCart size={18} />
                    <span className="text-sm">Agregar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && productos.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {productos.length} producto{productos.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}