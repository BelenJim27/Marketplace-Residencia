"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Search, X, Heart, SlidersHorizontal, ChevronDown, Store, User } from "lucide-react";
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
  nombre_tienda?: string | null;
  lotes?: {
    datos_api?: Record<string, string>;
    productores?: { biografia?: string };
  };
  tiendas?: {
    nombre?: string;
    productores?: {
      usuarios?: {
        nombre?: string;
        apellido_paterno?: string;
      };
    };
  } | null;
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

// PALETA DE COLORES REFINADA
const COLORS = {
  cream: "#faf8f5",
  champagne: "#f4f1ed",
  taupe: "#a89f94",
  mahogany: "#5c3d1e",
  darkChocolate: "#3d2817",
  gold: "#8b7355",
  accent: "#b8956a",
  softBorder: "#e8dcc8",
  text: {
    primary: "#2d2520",
    secondary: "#6b6460",
    muted: "#9a9390",
  }
};

const STYLES = {
  typography: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "'Segoe UI', Trebuchet MS, sans-serif",
  }
};

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
    <div style={{ borderTop: `1px solid ${COLORS.softBorder}` }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left transition-opacity hover:opacity-70"
      >
        <span
          className="text-[11px] font-medium uppercase tracking-[0.15em] letter-spacing"
          style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}
        >
          {title}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-300"
          style={{
            color: COLORS.text.secondary,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && <div className="pb-5 space-y-2">{children}</div>}
    </div>
  );
}

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
      className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
      style={{
        backgroundColor: active ? COLORS.mahogany : COLORS.champagne,
        color: active ? "white" : COLORS.text.primary,
        border: `1px solid ${active ? COLORS.mahogany : COLORS.softBorder}`,
        fontFamily: STYLES.typography.sans,
        cursor: "pointer",
        opacity: active ? 1 : 0.8,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.target as HTMLButtonElement).style.backgroundColor = COLORS.champagne;
          (e.target as HTMLButtonElement).style.borderColor = COLORS.taupe;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.target as HTMLButtonElement).style.backgroundColor = COLORS.champagne;
          (e.target as HTMLButtonElement).style.borderColor = COLORS.softBorder;
        }
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
      setProductos(data as unknown as Producto[]);
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
  }, [
    debouncedBusqueda,
    filtrosPendientes.tipo_mezcal,
    filtrosPendientes.maguey,
    filtrosPendientes.precio_min,
    filtrosPendientes.precio_max,
    filtrosPendientes.destilacion,
    filtrosPendientes.molienda,
    filtrosPendientes.maestro_mezcalero,
  ]);

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
      router.push("/auth/sign-in?redirect=/cliente/producto");
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

  const getNombreProductor = (producto: Producto): string | null => {
    if (producto.nombre_productor) return producto.nombre_productor;
    const u = producto.tiendas?.productores?.usuarios;
    if (u?.nombre) return [u.nombre, u.apellido_paterno].filter(Boolean).join(" ");
    return null;
  };

  const getNombreTienda = (producto: Producto): string | null => {
    return producto.nombre_tienda ?? producto.tiendas?.nombre ?? null;
  };

  // ─── SIDEBAR CONTENT ───────────────────────────────────────────────
  const SidebarContent = () => (
    <div>
      <div className="pb-6 mb-2">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-medium"
            style={{ fontFamily: STYLES.typography.serif, color: COLORS.text.primary }}
          >
            Refine
          </h2>
          {cantidadFiltros > 0 && (
            <button
              onClick={limpiarTodo}
              className="text-xs font-medium transition-opacity hover:opacity-60"
              style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: COLORS.text.muted }}
          />
          <input
            type="text"
            placeholder="Search products..."
            value={filtrosPendientes.busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="w-full rounded-lg py-3 pl-10 pr-4 text-sm outline-none transition-all"
            style={{
              backgroundColor: COLORS.champagne,
              border: `1px solid ${COLORS.softBorder}`,
              color: COLORS.text.primary,
              fontFamily: STYLES.typography.sans,
            }}
          />
          {filtrosPendientes.busqueda && (
            <button
              onClick={() => handleBusquedaChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            >
              <X className="h-4 w-4" style={{ color: COLORS.text.secondary }} />
            </button>
          )}
        </div>
      </div>

      <FilterSection title="Maguey">
        <div className="flex flex-wrap gap-2">
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

      <FilterSection title="Distillation">
        <div className="flex flex-wrap gap-2">
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

      <FilterSection title="Grinding">
        <div className="flex flex-wrap gap-2">
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

      <FilterSection title="Price range (MXN)">
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}
              >
                $
              </span>
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={precioMinLocal}
                onChange={(e) => setPrecioMinLocal(e.target.value)}
                className="w-full rounded-lg py-3 pl-7 pr-2 text-sm outline-none"
                style={{
                  backgroundColor: COLORS.champagne,
                  border: `1px solid ${COLORS.softBorder}`,
                  color: COLORS.text.primary,
                  fontFamily: STYLES.typography.sans,
                }}
              />
            </div>
            <div className="relative flex-1">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}
              >
                $
              </span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={precioMaxLocal}
                onChange={(e) => setPrecioMaxLocal(e.target.value)}
                className="w-full rounded-lg py-3 pl-7 pr-2 text-sm outline-none"
                style={{
                  backgroundColor: COLORS.champagne,
                  border: `1px solid ${COLORS.softBorder}`,
                  color: COLORS.text.primary,
                  fontFamily: STYLES.typography.sans,
                }}
              />
            </div>
          </div>
          <button
            onClick={handleAplicarPrecio}
            className="w-full rounded-lg py-3 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: COLORS.mahogany, fontFamily: STYLES.typography.sans }}
          >
            Apply
          </button>
        </div>
      </FilterSection>

      <FilterSection title="Mezcal Master" defaultOpen={false}>
        <input
          type="text"
          placeholder="Master name..."
          value={filtrosPendientes.maestro_mezcalero}
          onChange={(e) => handleFiltroChange("maestro_mezcalero", e.target.value)}
          className="w-full rounded-lg py-3 px-3 text-sm outline-none"
          style={{
            backgroundColor: COLORS.champagne,
            border: `1px solid ${COLORS.softBorder}`,
            color: COLORS.text.primary,
            fontFamily: STYLES.typography.sans,
          }}
        />
      </FilterSection>
    </div>
  );

  return (
    <div className="flex gap-8" style={{ backgroundColor: COLORS.cream }}>
      {/* ─── SIDEBAR (desktop only) ─── */}
      <aside className="hidden lg:block w-72 shrink-0 pt-8">
        <div
          className="rounded-xl p-6 sticky top-28"
          style={{
            backgroundColor: "white",
            border: `1px solid ${COLORS.softBorder}`,
          }}
        >
          <SidebarContent />
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 min-w-0 py-8 pr-8">

        {/* Mobile filter button */}
        <div className="lg:hidden mb-6 flex gap-2">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all"
            style={{
              backgroundColor: cantidadFiltros > 0 ? COLORS.mahogany : "white",
              color: cantidadFiltros > 0 ? "white" : COLORS.text.primary,
              border: `1px solid ${COLORS.softBorder}`,
              fontFamily: STYLES.typography.sans,
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
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
          <div className="flex flex-wrap items-center gap-2 mb-7">
            {filtros.busqueda && (
              <span
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  background: COLORS.champagne,
                  color: COLORS.text.primary,
                  border: `1px solid ${COLORS.softBorder}`,
                  fontFamily: STYLES.typography.sans,
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
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  background: COLORS.champagne,
                  color: COLORS.text.primary,
                  border: `1px solid ${COLORS.softBorder}`,
                  fontFamily: STYLES.typography.sans,
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
          </div>
        )}

        {/* Header: Count + Sort */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm font-medium" style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}>
            {productosMostrados.length} product{productosMostrados.length !== 1 ? "s" : ""} found
          </p>
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value as typeof ordenar)}
            className="text-sm rounded-lg border py-2 px-3 focus:outline-none"
            style={{
              borderColor: COLORS.softBorder,
              backgroundColor: "white",
              color: COLORS.text.primary,
              fontFamily: STYLES.typography.sans,
            }}
          >
            <option value="popular">Popular</option>
            <option value="precio_asc">Price: low to high</option>
            <option value="precio_desc">Price: high to low</option>
            <option value="nombre_az">Name A–Z</option>
          </select>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3" style={{ color: COLORS.text.secondary }}>
              <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm" style={{ fontFamily: STYLES.typography.sans }}>Loading products...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
            <p style={{ color: "#d32f2f" }}>Error: {error}</p>
            <button
              onClick={() => fetchProductos(filtros)}
              className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
              style={{ backgroundColor: COLORS.mahogany, fontFamily: STYLES.typography.sans }}
            >
              Retry
            </button>
          </div>
        ) : productosMostrados.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <p style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}>No products match your filters.</p>
            {(cantidadFiltros > 0 || filtros.busqueda) && (
              <button
                onClick={limpiarTodo}
                className="text-sm font-medium hover:opacity-90"
                style={{ color: COLORS.mahogany, fontFamily: STYLES.typography.sans }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productosMostrados.map((producto) => {
              const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
              const tipoMezcal = producto.lotes?.datos_api?.tipo_mezcal ?? "";
              const subtitulo = producto.lotes?.datos_api?.maguey ?? "";
              const nombreProductor = getNombreProductor(producto);
              const nombreTienda = getNombreTienda(producto);

              return (
                <div
                  key={String(producto.id_producto)}
                  className="group rounded-xl overflow-hidden border transition-all duration-300 hover:border-opacity-100 cursor-pointer flex flex-col h-full"
                  style={{
                    borderColor: COLORS.softBorder,
                    backgroundColor: "white",
                    borderWidth: "1px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(92, 61, 30, 0.08)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* ─── IMAGEN ─── */}
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "1 / 1", backgroundColor: COLORS.champagne }}
                    onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}
                  >
                    {imagenUrl ? (
                      <Image
                        src={imagenUrl}
                        alt={producto.nombre}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-contain p-5 group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm" style={{ color: COLORS.text.muted }}>
                        No image
                      </div>
                    )}

                    {tipoMezcal && (
                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: COLORS.champagne,
                          color: COLORS.accent,
                          border: `1px solid ${COLORS.softBorder}`,
                          fontFamily: STYLES.typography.sans,
                        }}
                      >
                        {tipoMezcal}
                      </span>
                    )}

                    <button
                      className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-all hover:scale-110"
                      style={{
                        backgroundColor: isInWishlist(producto.id_producto) ? COLORS.champagne : "white",
                        color: isInWishlist(producto.id_producto) ? COLORS.accent : COLORS.taupe,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(producto);
                      }}
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isInWishlist(producto.id_producto) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  {/* ─── INFO ─── */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Maguey / subtítulo */}
                    {subtitulo && (
                      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: COLORS.accent, fontFamily: STYLES.typography.sans }}>
                        {subtitulo}
                      </p>
                    )}

                    {/* ─── PRODUCTOR Y TIENDA ─── */}
                    {(nombreProductor || nombreTienda) && (
                      <div className="flex flex-col gap-1.5 mb-3">
                        {nombreProductor && (
                          <div className="flex items-center gap-2">
                            <User
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: COLORS.text.secondary, opacity: 0.75 }}
                            />
                            <span
                              className="text-xs truncate"
                              style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}
                            >
                              {nombreProductor}
                            </span>
                          </div>
                        )}
                        {nombreTienda && (
                          <div className="flex items-center gap-2">
                            <Store
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: COLORS.text.muted, opacity: 0.7 }}
                            />
                            <span
                              className="text-xs truncate"
                              style={{ color: COLORS.text.secondary, fontFamily: STYLES.typography.sans }}
                            >
                              {nombreTienda}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nombre del producto */}
                    <h3
                      className="font-medium text-sm line-clamp-2 mb-3 leading-snug cursor-pointer hover:opacity-80 flex-1"
                      style={{ fontFamily: STYLES.typography.serif, color: COLORS.text.primary }}
                      onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}
                    >
                      {producto.nombre}
                    </h3>

                    {/* Precio */}
                    <div className="flex items-center justify-between mb-4 pt-2" style={{ borderTop: `1px solid ${COLORS.softBorder}` }}>
                      <span
                        className="font-semibold text-base"
                        style={{
                          fontFamily: STYLES.typography.sans,
                          color: COLORS.accent,
                        }}
                      >
                        ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })} MXN
                      </span>
                    </div>

                    {/* Botón agregar al carrito */}
                    <button
                      className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor:
                          agregadoId === producto.id_producto
                            ? COLORS.darkChocolate
                            : COLORS.mahogany,
                        fontFamily: STYLES.typography.sans,
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
                      <ShoppingCart className="h-4 w-4" />
                      {agregadoId === producto.id_producto ? "Added!" : "Add to cart"}
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
            className="fixed inset-0 z-40 bg-black/25"
            onClick={() => setShowMobileFilters(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto shadow-xl"
            style={{ backgroundColor: "white" }}
          >
            <div
              className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: COLORS.softBorder }}
            >
              <span
                className="font-medium text-lg"
                style={{
                  fontFamily: STYLES.typography.serif,
                  color: COLORS.text.primary,
                }}
              >
                Refine
              </span>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="h-5 w-5" style={{ color: COLORS.text.secondary }} />
              </button>
            </div>
            <div className="p-5">
              <SidebarContent />
            </div>
          </div>
        </>
      )}
    </div>
  );
}