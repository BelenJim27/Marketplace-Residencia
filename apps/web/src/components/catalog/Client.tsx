"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Search, X, Heart, SlidersHorizontal, ChevronDown } from "lucide-react";
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

const TIPOS_MEZCAL = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo", "Anejo"];
const TIPOS_MAGUEY = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo"];
const TIPOS_DESTILACION = ["Alambique", "Artefacto", "Cambio"];
const TIPOS_MOLIENDA = ["Tahona", "Molino de piedra", "Molino mecánico", "Manual"];

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

// Sección colapsable del sidebar
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t" style={{ borderColor: "var(--bio-sidebar-border, #e8dcc8)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-left transition-opacity hover:opacity-70"
      >
        <span
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--bio-color-precio, #8b6914)" }}
        >
          {title}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{
            color: "var(--bio-color-precio, #8b6914)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// Chip de filtro reutilizable
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:opacity-90"
      style={{
        backgroundColor: active
          ? "var(--bio-color-boton, #5c3d1e)"
          : "var(--bio-chip-bg, rgba(92,61,30,0.07))",
        color: active ? "#fff" : "var(--bio-color-titulo, #5c3d1e)",
        border: active
          ? "1px solid transparent"
          : "1px solid var(--bio-sidebar-border, #e8dcc8)",
        boxShadow: active ? "0 1px 4px rgba(92,61,30,0.25)" : "none",
      }}
    >
      {label}
    </button>
  );
}

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
  const [ordenar, setOrdenar] = useState<"popular" | "precio_asc" | "precio_desc" | "nombre_az">("popular");
  const [precioMinLocal, setPrecioMinLocal] = useState("");
  const [precioMaxLocal, setPrecioMaxLocal] = useState("");
  const isMobile = useIsMobile();

  const fetchProductos = useCallback(async (f: Filtros) => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof api.productos.getAll>[0] = {};
      if (f.busqueda) params.busqueda = f.busqueda;
      if (f.tipo_mezcal) params.tipo_mezcal = f.tipo_mezcal;
      if (f.maguey) params.maguey = f.maguey;
      if (f.precio_min) params.precio_min = f.precio_min;
      if (f.precio_max) params.precio_max = f.precio_max;
      if (f.destilacion) params.destilacion = f.destilacion;
      if (f.molienda) params.molienda = f.molienda;
      if (f.maestro_mezcalero) params.maestro_mezcalero = f.maestro_mezcalero;

      const data = await api.productos.getAll(params);
      const filtrados = (data as Producto[]).filter(
        (p) => p.categorias && p.categorias.length > 0 && p.nombre_productor
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
    const timer = setTimeout(() => setDebouncedBusqueda(filtrosPendientes.busqueda), 200);
    return () => clearTimeout(timer);
  }, [filtrosPendientes.busqueda]);

  useEffect(() => {
    setFiltros({
      busqueda: debouncedBusqueda,
      tipo_mezcal: filtrosPendientes.tipo_mezcal,
      maguey: filtrosPendientes.maguey,
      precio_min: filtrosPendientes.precio_min,
      precio_max: filtrosPendientes.precio_max,
      destilacion: filtrosPendientes.destilacion,
      molienda: filtrosPendientes.molienda,
      maestro_mezcalero: filtrosPendientes.maestro_mezcalero,
    });
  }, [debouncedBusqueda, filtrosPendientes.tipo_mezcal, filtrosPendientes.maguey, filtrosPendientes.precio_min, filtrosPendientes.precio_max, filtrosPendientes.destilacion, filtrosPendientes.molienda, filtrosPendientes.maestro_mezcalero]);

  const handleBusquedaChange = (valor: string) =>
    setFiltrosPendientes((prev) => ({ ...prev, busqueda: valor }));

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltrosPendientes((prev) => {
      const nuevos = { ...prev, [campo]: valor };
      if (campo === "tipo_mezcal" && valor && TIPOS_MAGUEY.includes(valor)) nuevos.maguey = valor;
      else if (campo === "maguey" && valor && TIPOS_MEZCAL.includes(valor)) nuevos.tipo_mezcal = valor;
      return nuevos;
    });
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
    const sorted = [...productos];
    if (ordenar === "precio_asc") sorted.sort((a, b) => parseFloat(a.precio_base) - parseFloat(b.precio_base));
    if (ordenar === "precio_desc") sorted.sort((a, b) => parseFloat(b.precio_base) - parseFloat(a.precio_base));
    if (ordenar === "nombre_az") sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
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

  // ─── SIDEBAR CONTENT ───────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="space-y-0">

      {/* Header del sidebar */}
      <div className="pb-4 mb-1">
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-bold tracking-wide"
            style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
          >
            Filtros
          </h2>
          {cantidadFiltros > 0 && (
            <button
              onClick={limpiarTodo}
              className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-60"
              style={{ color: "var(--bio-color-precio, #8b6914)" }}
            >
              Limpiar todo
            </button>
          )}
        </div>

        {/* Barra de búsqueda */}
        <div className="relative mt-3">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--bio-color-precio, #8b6914)" }}
          />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={filtrosPendientes.busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="w-full rounded-lg py-2.5 pl-9 pr-4 text-sm outline-none transition-all"
            style={{
              backgroundColor: "var(--bio-chip-bg, rgba(92,61,30,0.06))",
              border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
              color: "var(--bio-color-titulo, #5c3d1e)",
            }}
          />
          {filtrosPendientes.busqueda && (
            <button
              onClick={() => handleBusquedaChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }} />
            </button>
          )}
        </div>
      </div>

      {/* MAGUEY */}
      <FilterSection title="Maguey">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_MAGUEY.map((m) => (
            <FilterChip
              key={m}
              label={m}
              active={filtrosPendientes.maguey === m}
              onClick={() => handleFiltroChange("maguey", filtrosPendientes.maguey === m ? "" : m)}
            />
          ))}
        </div>
      </FilterSection>

      {/* DESTILACIÓN */}
      <FilterSection title="Destilación">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_DESTILACION.map((d) => (
            <FilterChip
              key={d}
              label={d}
              active={filtrosPendientes.destilacion === d}
              onClick={() => handleFiltroChange("destilacion", filtrosPendientes.destilacion === d ? "" : d)}
            />
          ))}
        </div>
      </FilterSection>

      {/* MOLIENDA */}
      <FilterSection title="Molienda">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_MOLIENDA.map((m) => (
            <FilterChip
              key={m}
              label={m}
              active={filtrosPendientes.molienda === m}
              onClick={() => handleFiltroChange("molienda", filtrosPendientes.molienda === m ? "" : m)}
            />
          ))}
        </div>
      </FilterSection>

      {/* RANGO DE PRECIO */}
      <FilterSection title="Rango de Precio (MXN)">
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: "var(--bio-color-precio, #8b6914)" }}
              >
                $
              </span>
              <input
                type="number"
                min="0"
                placeholder="Mín"
                value={precioMinLocal}
                onChange={(e) => setPrecioMinLocal(e.target.value)}
                className="w-full rounded-lg py-2 pl-6 pr-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bio-chip-bg, rgba(92,61,30,0.06))",
                  border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
                  color: "var(--bio-color-titulo, #5c3d1e)",
                }}
              />
            </div>
            <div className="relative flex-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: "var(--bio-color-precio, #8b6914)" }}
              >
                $
              </span>
              <input
                type="number"
                min="0"
                placeholder="Máx"
                value={precioMaxLocal}
                onChange={(e) => setPrecioMaxLocal(e.target.value)}
                className="w-full rounded-lg py-2 pl-6 pr-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--bio-chip-bg, rgba(92,61,30,0.06))",
                  border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
                  color: "var(--bio-color-titulo, #5c3d1e)",
                }}
              />
            </div>
          </div>
          <button
            onClick={handleAplicarPrecio}
            className="w-full rounded-lg py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "var(--bio-color-boton, #5c3d1e)" }}
          >
            Aplicar
          </button>
        </div>
      </FilterSection>

      {/* MAESTRO MEZCALERO */}
      <FilterSection title="Maestro Mezcalero" defaultOpen={false}>
        <input
          type="text"
          placeholder="Nombre del maestro..."
          value={filtrosPendientes.maestro_mezcalero}
          onChange={(e) => handleFiltroChange("maestro_mezcalero", e.target.value)}
          className="w-full rounded-lg py-2.5 px-3 text-sm outline-none"
          style={{
            backgroundColor: "var(--bio-chip-bg, rgba(92,61,30,0.06))",
            border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
            color: "var(--bio-color-titulo, #5c3d1e)",
          }}
        />
      </FilterSection>
    </div>
  );

  return (
    <div className="flex gap-6">
      {/* ─── SIDEBAR (desktop only) ─── */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div
          className="rounded-2xl p-5 sticky top-24"
          style={{
            backgroundColor: "var(--bio-color-fondo, #faf8f4)",
            border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
            boxShadow: "0 1px 6px rgba(92,61,30,0.06)",
          }}
        >
          <SidebarContent />
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 min-w-0">
        {/* Mobile filter button */}
        <div className="lg:hidden mb-4 flex gap-2">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              backgroundColor: cantidadFiltros > 0 ? "var(--bio-color-boton, #5c3d1e)" : "var(--bio-chip-bg, rgba(92,61,30,0.07))",
              color: cantidadFiltros > 0 ? "white" : "var(--bio-color-titulo, #5c3d1e)",
              border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {cantidadFiltros > 0 && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: "rgba(255,255,255,0.25)", color: "white" }}
              >
                {cantidadFiltros}
              </span>
            )}
          </button>
        </div>

        {/* Active filter pills */}
        {(filtros.busqueda || cantidadFiltros > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {filtros.busqueda && (
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--bio-chip-bg, rgba(92,61,30,0.07))",
                  color: "var(--bio-color-titulo, #5c3d1e)",
                  border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
                }}
              >
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
                style={{
                  background: "var(--bio-chip-bg, rgba(92,61,30,0.07))",
                  color: "var(--bio-color-titulo, #5c3d1e)",
                  border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
                }}
              >
                {campo.startsWith("precio")
                  ? `$ ${Number(filtros[campo]).toLocaleString("es-MX")}`
                  : filtros[campo]}
                <button onClick={() => quitarFiltro(campo)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={limpiarTodo}
              className="text-xs underline underline-offset-2 hover:opacity-60"
              style={{ color: "var(--bio-color-precio, #8b6914)" }}
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* Header: Count + Sort */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
            {productosMostrados.length} producto{productosMostrados.length !== 1 ? "s" : ""} encontrado{productosMostrados.length !== 1 ? "s" : ""}
          </p>
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value as typeof ordenar)}
            className="text-sm rounded-xl border py-1.5 px-3 focus:outline-none"
            style={{
              borderColor: "var(--bio-sidebar-border, #e8dcc8)",
              backgroundColor: "var(--bio-color-fondo, #faf8f4)",
              color: "var(--bio-color-titulo, #5c3d1e)",
            }}
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
                  style={{
                    borderColor: "var(--bio-sidebar-border, #e8dcc8)",
                    backgroundColor: "var(--bio-color-fondo, #faf8f4)",
                  }}
                >
                  <div
                    className="relative overflow-hidden bg-gray-50 dark:bg-slate-800"
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

                    {tipoMezcal && (
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--bio-chip-bg, rgba(92,61,30,0.07))",
                          color: "var(--bio-color-precio, #8b6914)",
                          border: "1px solid var(--bio-sidebar-border, #e8dcc8)",
                        }}
                      >
                        {tipoMezcal}
                      </span>
                    )}

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

                  <div className="p-4">
                    {subtitulo && (
                      <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "#b07850" }}>
                        {subtitulo}
                      </p>
                    )}
                    <h3
                      className="font-semibold text-sm line-clamp-2 mb-2 leading-snug cursor-pointer hover:opacity-80"
                      style={{
                        fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                        color: "var(--bio-color-titulo, #5c3d1e)",
                      }}
                      onClick={() => router.push(`/Cliente/producto/${producto.id_producto}`)}
                    >
                      {producto.nombre}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="font-bold text-base"
                        style={{
                          fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                          color: "var(--bio-color-precio, #8b6914)",
                        }}
                      >
                        ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })} MXN
                      </span>
                    </div>
                    <button
                      className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor:
                          agregadoId === producto.id_producto
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
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowMobileFilters(false)} />
          <div
            className="fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto shadow-xl"
            style={{ backgroundColor: "var(--bio-color-fondo, #faf8f4)" }}
          >
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: "var(--bio-sidebar-border, #e8dcc8)" }}
            >
              <span
                className="font-semibold"
                style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
              >
                Filtros
              </span>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="h-5 w-5" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }} />
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