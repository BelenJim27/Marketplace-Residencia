"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, X, Heart, ChevronRight, Sparkles, Filter } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";
import { semanticColors, hexFallbacks } from "@/lib/colors";
import { SidebarFiltersComponent } from "./SidebarFilters";

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
  tipo_mezcal: string[];
  maguey: string[];
  precio_min: string;
  precio_max: string;
  destilacion: string[];
  molienda: string[];
  maestro_mezcalero: string;
}

interface Toast {
  id: string;
  message: string;
  timestamp: number;
}

const FILTROS_VACIOS: Filtros = {
  busqueda: "",
  tipo_mezcal: [],
  maguey: [],
  precio_min: "",
  precio_max: "",
  destilacion: [],
  molienda: [],
  maestro_mezcalero: "",
};

const TIPOS_MEZCAL = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo", "Anejo"];
const TIPOS_MAGUEY = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo"];
const TIPOS_DESTILACION = ["Alambique", "Artefacto", "Cambio"];
const TIPOS_MOLIENDA = ["Tahona", "Molino de piedra", "Molino mecánico", "Manual"];

// Two-color strategy (Restrained): neutrals + brand accent
// Use index % 2 to alternate: 0 = neutral (default), 1 = brand (featured)
// Keeping most cards neutral maintains Restrained strategy
const CARD_COLORS = [
  { bg: hexFallbacks.bgSecondary, text: hexFallbacks.textPrimary },     // Neutral card
  { bg: hexFallbacks.brand, text: hexFallbacks.bgSecondary },            // Brand featured card (≤10% of grid)
];

// StarRating Component
function StarRating({ rating = 5, reviews = 47, cardColor }: { rating?: number; reviews?: number; cardColor?: typeof CARD_COLORS[0] }) {
  const fullStars = Math.floor(rating);
  const isNeutralCard = cardColor?.bg === hexFallbacks.bgSecondary;
  const starColor = isNeutralCard ? hexFallbacks.brand : hexFallbacks.bgSecondary;
  const emptyStarColor = isNeutralCard ? "#e0d5c7" : "rgba(255, 255, 255, 0.3)";
  const textColor = isNeutralCard ? hexFallbacks.brand : "rgb(255 255 255 / 0.9)";
  const ratingLabel = `${rating.toFixed(1)} de 5 estrellas (${reviews} ${reviews === 1 ? "reseña" : "reseñas"})`;

  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={ratingLabel}>
      <div className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill={i <= fullStars ? starColor : "currentColor"}
            style={{ color: i <= fullStars ? starColor : emptyStarColor }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-semibold" style={{ color: textColor }} aria-hidden="true">{rating.toFixed(1)}</span>
      <span className="text-[11px]" style={{ color: isNeutralCard ? hexFallbacks.textMuted : "rgb(255 255 255 / 0.8)" }} aria-hidden="true">({reviews})</span>
    </div>
  );
}

// Badge de Filtros Activos Mejorado
function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-all hover:shadow-md animate-in fade-in duration-300"
      style={{
        backgroundColor: `${hexFallbacks.brand}22`,  // 13% opacity
        border: `1px solid ${hexFallbacks.brand}4d`, // 30% opacity
        color: hexFallbacks.brand,
      }}
    >
      <span className="max-w-xs truncate">{label}</span>
      <button
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity hover:scale-110 focus:outline-none focus:ring-1 focus:ring-offset-1 rounded-sm p-0.5 flex-shrink-0"
        style={{ "--tw-ring-color": hexFallbacks.brand } as React.CSSProperties}
        aria-label={`Quitar filtro: ${label}`}
        title={`Quitar filtro: ${label}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

// ProductCard Component
function ProductCard({
  producto,
  index,
  isWishlisted,
  onWishlist,
  onAddCart,
  isAdded,
  onViewDetails,
}: {
  producto: Producto;
  index: number;
  isWishlisted: boolean;
  onWishlist: () => void;
  onAddCart: () => void;
  isAdded: boolean;
  onViewDetails: () => void;
}) {
  const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
  const cardColor = CARD_COLORS[index % CARD_COLORS.length];
  const maguey = producto.lotes?.datos_api?.maguey || "";
  const maestro = producto.nombre_productor || "";
  const tienda = producto.nombre_tienda || producto.tiendas?.nombre || "";
  const folio = `FOLIO-${String(producto.id_producto).slice(-4).toUpperCase()}`;

  return (
    <div
      className="w-full relative rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 max-w-[280px] sm:max-w-[290px] mx-auto flex flex-col h-[520px]"
      style={{ backgroundColor: cardColor.bg, border: `1px solid ${hexFallbacks.borderLight}` }}
      role="article"
      aria-label={`Producto: ${producto.nombre}`}
    >
      <div className="relative flex items-center justify-center overflow-hidden h-[280px] w-full group" style={{ backgroundColor: hexFallbacks.bgPrimary }}>
        {imagenUrl && (
          <Image
            src={imagenUrl}
            alt={producto.nombre}
            width={200}
            height={280}
            className="object-contain w-auto h-auto max-h-[95%] p-2 transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <button
          className="absolute top-2.5 right-2.5 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center z-20 transition-all hover:scale-110 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: isWishlisted ? hexFallbacks.bgSecondary : "rgba(255,255,255,0.95)",
            "--tw-ring-color": hexFallbacks.brand,
          } as React.CSSProperties}
          onClick={(e) => {
            e.stopPropagation();
            onWishlist();
          }}
          aria-label={isWishlisted ? "Remover de favoritos" : "Agregar a favoritos"}
          aria-pressed={isWishlisted}
          title={isWishlisted ? "Remover de favoritos" : "Agregar a favoritos"}
        >
          <Heart
            size={16}
            fill={isWishlisted ? hexFallbacks.brand : "none"}
            color={isWishlisted ? hexFallbacks.brand : "#d4b8a0"}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        className="p-3 sm:p-4 flex flex-col justify-between flex-grow"
        style={{
          backgroundColor: cardColor.bg,
          color: cardColor.text
        }}
      >
        <div className="space-y-1.5">
          {maestro && (
            <div className="space-y-0.5 min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-wider truncate"
                style={{
                  color: cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.textPrimary : "rgb(255 255 255 / 0.95)"
                }}
                title={maestro}
              >
                {maestro}
              </p>
              {tienda && (
                <p
                  className="text-[8px] uppercase tracking-widest truncate"
                  style={{
                    color: cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.textSecondary : "rgb(255 255 255 / 0.7)"
                  }}
                  title={tienda}
                >
                  {tienda}
                </p>
              )}
            </div>
          )}
          <div
            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider"
            style={{
              backgroundColor: cardColor.bg === hexFallbacks.bgSecondary ? `${hexFallbacks.brand}1f` : "rgba(255, 255, 255, 0.2)",
              color: cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.brand : "white"
            }}
          >
            {folio}
          </div>
          {maguey && (
            <p
              className="text-[10px] sm:text-xs italic uppercase tracking-wider"
              style={{
                color: cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.textSecondary : "rgb(255 255 255 / 0.9)"
              }}
            >
              {maguey}
            </p>
          )}
          <h3
            className="text-sm sm:text-base lg:text-lg font-bold leading-tight line-clamp-2 break-words"
            style={{
              fontFamily: "Georgia, serif",
              color: cardColor.text,
              overflowWrap: "break-word",
            }}
            title={producto.nombre}
          >
            {producto.nombre}
          </h3>
          <StarRating cardColor={cardColor} />
          {producto.descripcion && (
            <p
              className="text-[9px] sm:text-xs leading-relaxed line-clamp-2 break-words"
              style={{
                color: cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.textMuted : "rgb(255 255 255 / 0.8)",
                overflowWrap: "break-word",
              }}
              title={producto.descripcion}
            >
              {producto.descripcion}
            </p>
          )}
        </div>

        <div className="flex gap-1.5 mt-3">
          <button
            className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-full font-bold uppercase text-[9px] sm:text-[10px] tracking-wider transition-all hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: isAdded ? hexFallbacks.textPrimary : (cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.brand : hexFallbacks.bgSecondary),
              color: isAdded ? "white" : (cardColor.bg === hexFallbacks.bgSecondary ? "white" : hexFallbacks.textPrimary),
            }}
            disabled={isAdded}
            onClick={(e) => {
              e.stopPropagation();
              onAddCart();
            }}
          >
            <ShoppingCart size={11} />
            <span>{isAdded ? "¡Listo!" : "Agregar"}</span>
          </button>

          <button
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-80 active:scale-95 shadow-sm"
            style={{
              backgroundColor: cardColor.bg === hexFallbacks.bgSecondary ? `${hexFallbacks.brand}1f` : "rgba(255,255,255,0.15)",
              color: cardColor.bg === hexFallbacks.bgSecondary ? hexFallbacks.brand : "white",
              "--tw-ring-color": hexFallbacks.brand,
            } as React.CSSProperties}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            aria-label={`Ver detalles de ${producto.nombre}`}
            title="Ver detalles del producto"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="absolute right-2 top-[280px] -translate-y-1/2 rounded-full flex flex-col items-center justify-center z-30 shadow-md flex-shrink-0"
        style={{
          backgroundColor: hexFallbacks.bgSecondary,
          border: `2.5px solid ${hexFallbacks.bgTertiary}`,
          width: "60px",
          height: "60px",
        }}
      >
        <span
          className="text-[7px] font-bold uppercase tracking-wider"
          style={{ color: hexFallbacks.brand }}
        >
          Precio
        </span>
        <span
          className="text-xs font-black leading-none"
          style={{
            fontFamily: "Georgia, serif",
            color: hexFallbacks.brand,
          }}
        >
          ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })}
        </span>
        <span className="text-[6px] tracking-tight font-semibold uppercase" style={{ color: hexFallbacks.brand, opacity: 0.6 }}>
          MXN
        </span>
      </div>
    </div>
  );
}

export default function ProductCatalogEnhanced() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregadoId, setAgregadoId] = useState<number | bigint | null>(null);
  const [searchFocus, setSearchFocus] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosPendientes, setFiltrosPendientes] = useState<Filtros>(FILTROS_VACIOS);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [ordenar, setOrdenar] = useState<"popular" | "precio_asc" | "precio_desc" | "nombre_az">("popular");
  const [precioMinLocal, setPrecioMinLocal] = useState("");
  const [precioMaxLocal, setPrecioMaxLocal] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const PRODUCTOS_POR_PAGINA = 6;

  // Restaurar filtros desde URL al montar
  useEffect(() => {
    if (isInitialized) return;

    const busqueda = searchParams.get('q') || '';
    const maguey = searchParams.getAll('maguey');
    const destilacion = searchParams.getAll('destilacion');
    const molienda = searchParams.getAll('molienda');
    const precio_min = searchParams.get('precio_min') || '';
    const precio_max = searchParams.get('precio_max') || '';
    const maestro = searchParams.get('maestro') || '';

    setFiltros({
      busqueda,
      maguey,
      destilacion,
      molienda,
      precio_min,
      precio_max,
      maestro_mezcalero: maestro,
      tipo_mezcal: searchParams.getAll('tipo_mezcal'),
    });

    setFiltrosPendientes({
      busqueda,
      maguey,
      destilacion,
      molienda,
      precio_min,
      precio_max,
      maestro_mezcalero: maestro,
      tipo_mezcal: searchParams.getAll('tipo_mezcal'),
    });

    setPrecioMinLocal(precio_min);
    setPrecioMaxLocal(precio_max);
    setIsInitialized(true);
  }, [searchParams, isInitialized]);

  const fetchProductos = useCallback(async (f: Filtros) => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof api.productos.getAll>[0] = {};
      if (f.busqueda) params.busqueda = f.busqueda;
      if (f.tipo_mezcal.length > 0) params.tipo_mezcal = f.tipo_mezcal.join(',');
      if (f.maguey.length > 0) params.maguey = f.maguey.join(',');
      if (f.precio_min) params.precio_min = f.precio_min;
      if (f.precio_max) params.precio_max = f.precio_max;
      if (f.destilacion.length > 0) params.destilacion = f.destilacion.join(',');
      if (f.molienda.length > 0) params.molienda = f.molienda.join(',');
      if (f.maestro_mezcalero) params.maestro_mezcalero = f.maestro_mezcalero;

      const data = await api.productos.getAll(params);
      setProductos(data as unknown as Producto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Sincronizar filtros con URL (después de que se estabilicen)
  const syncURL = useCallback((f: Filtros) => {
    const params = new URLSearchParams();
    if (f.busqueda) params.set('q', f.busqueda);
    f.tipo_mezcal.forEach(v => params.append('tipo_mezcal', v));
    f.maguey.forEach(v => params.append('maguey', v));
    f.destilacion.forEach(v => params.append('destilacion', v));
    f.molienda.forEach(v => params.append('molienda', v));
    if (f.precio_min) params.set('precio_min', f.precio_min);
    if (f.precio_max) params.set('precio_max', f.precio_max);
    if (f.maestro_mezcalero) params.set('maestro', f.maestro_mezcalero);

    const query = params.toString();
    const url = query ? `?${query}` : '';
    router.replace(url, { scroll: false });
  }, [router]);

  // Apply filters on mount and when intentionally applied (P1: not auto-update)
  useEffect(() => {
    if (!isInitialized) return;
    fetchProductos(filtros);
    syncURL(filtros);
  }, [filtros, fetchProductos, isInitialized, syncURL]);

  // P1: Preview count when filtrosPendientes change (debounced, silent fetch)
  useEffect(() => {
    if (!isInitialized || showMobileFilters === false) {
      setPreviewCount(productos.length);
      return;
    }

    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params: Parameters<typeof api.productos.getAll>[0] = {};
        if (filtrosPendientes.busqueda) params.busqueda = filtrosPendientes.busqueda;
        if (filtrosPendientes.tipo_mezcal.length > 0) params.tipo_mezcal = filtrosPendientes.tipo_mezcal.join(',');
        if (filtrosPendientes.maguey.length > 0) params.maguey = filtrosPendientes.maguey.join(',');
        if (filtrosPendientes.precio_min) params.precio_min = filtrosPendientes.precio_min;
        if (filtrosPendientes.precio_max) params.precio_max = filtrosPendientes.precio_max;
        if (filtrosPendientes.destilacion.length > 0) params.destilacion = filtrosPendientes.destilacion.join(',');
        if (filtrosPendientes.molienda.length > 0) params.molienda = filtrosPendientes.molienda.join(',');
        if (filtrosPendientes.maestro_mezcalero) params.maestro_mezcalero = filtrosPendientes.maestro_mezcalero;

        const data = await api.productos.getAll(params);
        setPreviewCount((data as unknown as Producto[]).length);
      } catch (err) {
        // Fallback to current count if preview fails
        setPreviewCount(productos.length);
      } finally {
        setPreviewLoading(false);
      }
    }, 300); // Debounce preview fetch

    return () => clearTimeout(timer);
  }, [filtrosPendientes, isInitialized, showMobileFilters, productos.length]);

  // P2: Toast notification system
  const addToast = useCallback((message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 4s
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // P1: Apply filters intentionally via button, not auto-update on pending changes
  const handleAplicarFiltros = useCallback(() => {
    // P4: Validate price before applying
    const minNum = Number(filtrosPendientes.precio_min) || 0;
    const maxNum = Number(filtrosPendientes.precio_max) || 5000;
    if (minNum > maxNum) {
      return; // Don't apply if price validation fails
    }

    // Update filtros with filtrosPendientes
    setFiltros({
      busqueda: filtrosPendientes.busqueda,
      tipo_mezcal: filtrosPendientes.tipo_mezcal,
      maguey: filtrosPendientes.maguey,
      precio_min: filtrosPendientes.precio_min,
      precio_max: filtrosPendientes.precio_max,
      destilacion: filtrosPendientes.destilacion,
      molienda: filtrosPendientes.molienda,
      maestro_mezcalero: filtrosPendientes.maestro_mezcalero,
    });

    // Close modal
    setShowMobileFilters(false);

    // Scroll grid into view smoothly
    setTimeout(() => {
      const gridElement = document.querySelector('[data-grid="productos"]');
      if (gridElement) {
        gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150); // Wait for modal animation to complete
  }, [filtrosPendientes]);

  const handleBusquedaChange = (valor: string) =>
    setFiltrosPendientes((prev) => ({ ...prev, busqueda: valor }));

  const handleMaestroChange = (valor: string) =>
    setFiltrosPendientes((prev) => ({ ...prev, maestro_mezcalero: valor }));

  const handleFiltroToggle = (campo: string, valor: string) => {
    setFiltrosPendientes((prev) => {
      const actual = prev[campo as keyof Filtros] as string[];
      const nuevos = actual.includes(valor)
        ? actual.filter(v => v !== valor)
        : [...actual, valor];
      return { ...prev, [campo]: nuevos };
    });
  };

  const quitarFiltro = (campo: keyof Filtros, valor?: string) => {
    if (campo === 'busqueda') {
      setFiltros((prev) => ({ ...prev, busqueda: "" }));
      setFiltrosPendientes((prev) => ({ ...prev, busqueda: "" }));
    } else if (campo === 'precio_min' || campo === 'precio_max') {
      const nuevos = { ...filtros, [campo]: "" };
      setFiltros(nuevos);
      setFiltrosPendientes(nuevos);
      if (campo === "precio_min") setPrecioMinLocal("");
      if (campo === "precio_max") setPrecioMaxLocal("");
    } else if (Array.isArray(filtros[campo]) && valor) {
      setFiltros((prev) => ({
        ...prev,
        [campo]: (prev[campo] as string[]).filter(v => v !== valor),
      }));
      setFiltrosPendientes((prev) => ({
        ...prev,
        [campo]: (prev[campo] as string[]).filter(v => v !== valor),
      }));
    } else {
      const nuevos = { ...filtros, [campo]: campo.includes('maestro') ? "" : [] };
      setFiltros(nuevos);
      setFiltrosPendientes(nuevos);
    }
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

  const totalPaginas = Math.max(1, Math.ceil(productosMostrados.length / PRODUCTOS_POR_PAGINA));
  const productosPagina = productosMostrados.slice(
    (paginaActual - 1) * PRODUCTOS_POR_PAGINA,
    paginaActual * PRODUCTOS_POR_PAGINA,
  );

  // Resetear página al cambiar filtros u orden
  useEffect(() => { setPaginaActual(1); }, [filtros, ordenar]);

  const filtrosActivos = (Object.keys(filtros) as (keyof Filtros)[]).filter((k) => {
    if (k === 'busqueda') return false;
    const val = filtros[k];
    return Array.isArray(val) ? val.length > 0 : val !== '';
  });
  const cantidadFiltros = filtrosActivos.length +
    (filtros.busqueda ? 1 : 0);

  const toggleWishlist = (producto: Producto) => {
    if (!isAuthenticated) {
      addToast("Inicia sesión para guardar favoritos");
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
    setFiltrosPendientes((prev) => ({
      ...prev,
      precio_min: precioMinLocal,
      precio_max: precioMaxLocal,
    }));
  };


  return (
    <div style={{ backgroundColor: hexFallbacks.bgPrimary, minHeight: "100vh" }} className="font-sans">
      {/* ─── HEADER MEJORADO ─── */}
      <header className="border-b relative overflow-hidden" style={{ borderColor: hexFallbacks.borderLight, backgroundColor: hexFallbacks.bgSecondary }} role="banner">
        {/* Decorative background elements */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
          style={{ backgroundColor: hexFallbacks.brand }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-5 pointer-events-none"
          style={{ backgroundColor: hexFallbacks.brand }}
        />

        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 relative z-10">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles size={20} style={{ color: hexFallbacks.brand }} />
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: hexFallbacks.brand, fontFamily: "Georgia, serif" }}>
                Artesanía Pura
              </p>
              <Sparkles size={20} style={{ color: hexFallbacks.brand }} />
            </div>
            <h1
              className="text-3xl sm:text-5xl font-black mb-3 leading-tight"
              style={{ fontFamily: "Georgia, serif", color: hexFallbacks.textPrimary }}
            >
              Nuestros Mezcales
            </h1>
            <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: hexFallbacks.textSecondary }}>
              Descubre una colección curada de los mejores mezcales artesanales, cada uno con su historia única
            </p>
            <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ backgroundColor: hexFallbacks.brand }} />
          </div>

          {/* Filtros activos con mejor diseño */}
          {(filtros.busqueda || cantidadFiltros > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-6 border-t" style={{ borderColor: hexFallbacks.borderLight }}>
              {filtros.busqueda && (
                <FilterBadge
                  label={`"${filtros.busqueda}"`}
                  onRemove={() => quitarFiltro("busqueda")}
                />
              )}
              {filtrosActivos.flatMap((campo) => {
                const val = filtros[campo];
                if (campo === 'busqueda') return [];
                if (campo === 'precio_min' || campo === 'precio_max') {
                  return (
                    <FilterBadge
                      key={campo}
                      label={`$${Number(val as string).toLocaleString("es-MX")}`}
                      onRemove={() => quitarFiltro(campo)}
                    />
                  );
                }
                if (Array.isArray(val)) {
                  return val.map(v => (
                    <FilterBadge
                      key={`${campo}-${v}`}
                      label={v}
                      onRemove={() => quitarFiltro(campo, v)}
                    />
                  ));
                }
                if (campo === 'maestro_mezcalero' && val) {
                  return (
                    <FilterBadge
                      key={campo}
                      label={val}
                      onRemove={() => quitarFiltro(campo)}
                    />
                  );
                }
                return [];
              })}
              {cantidadFiltros > 0 && (
                <button
                  onClick={limpiarTodo}
                  className="text-xs font-bold transition-all hover:opacity-70 underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-offset-1 px-2 py-1 rounded"
                  style={{ color: hexFallbacks.brand, "--tw-ring-color": hexFallbacks.brand } as React.CSSProperties}
                  aria-label="Limpiar todos los filtros"
                  title="Limpiar todos los filtros"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ─── SIDEBAR ─── */}
          <aside className="hidden lg:block lg:w-72 shrink-0">
            <div
              className="sticky top-10 rounded-2xl p-5 shadow-sm transition-all"
              style={{
                backgroundColor: hexFallbacks.bgSecondary,
                border: `1px solid ${hexFallbacks.borderLight}`,
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} style={{ color: hexFallbacks.brand }} />
                <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: hexFallbacks.textPrimary }}>
                  Filtros
                </h2>
                {cantidadFiltros > 0 && (
                  <span
                    className="ml-auto text-xs font-bold px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: hexFallbacks.brand }}
                  >
                    {cantidadFiltros}
                  </span>
                )}
              </div>
              <SidebarFiltersComponent
                filtrosPendientes={filtrosPendientes}
                onBusquedaChange={handleBusquedaChange}
                onFiltroToggle={handleFiltroToggle}
                onMaestroChange={handleMaestroChange}
                searchFocus={searchFocus}
                onSearchFocus={setSearchFocus}
                precioMinLocal={precioMinLocal}
                precioMaxLocal={precioMaxLocal}
                onPrecioMinChange={setPrecioMinLocal}
                onPrecioMaxChange={setPrecioMaxLocal}
                onAplicarPrecio={handleAplicarPrecio}
                TIPOS_MAGUEY={TIPOS_MAGUEY}
                TIPOS_DESTILACION={TIPOS_DESTILACION}
                TIPOS_MOLIENDA={TIPOS_MOLIENDA}
              />
            </div>
          </aside>

          {/* Botón Filtros móvil mejorado */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 shadow-sm relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: hexFallbacks.brand,
                color: "white",
                "--tw-ring-color": hexFallbacks.brand,
              } as React.CSSProperties}
              aria-label={`Abrir filtros${cantidadFiltros > 0 ? ` (${cantidadFiltros} activos)` : ""}`}
              title={`Abrir filtros${cantidadFiltros > 0 ? ` (${cantidadFiltros} activos)` : ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity" />
              <Filter size={18} aria-hidden="true" />
              Filtros {cantidadFiltros > 0 && `(${cantidadFiltros})`}
            </button>
          </div>

          {/* ─── LISTADO DE PRODUCTOS ─── */}
          <div className="flex-1 w-full">
            {/* Ordenamiento mejorado */}
            <div className="mb-6 flex justify-between items-center gap-4">
              <div className="text-sm" style={{ color: hexFallbacks.textSecondary }}>
                {!loading && productosMostrados.length > 0 && (
                  <span className="font-semibold">
                    Mostrando {(paginaActual - 1) * PRODUCTOS_POR_PAGINA + 1}–{Math.min(paginaActual * PRODUCTOS_POR_PAGINA, productosMostrados.length)} de {productosMostrados.length} {productosMostrados.length === 1 ? "producto" : "productos"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label htmlFor="sort-select" className="text-sm font-medium" style={{ color: hexFallbacks.textPrimary }}>
                  Ordenar:
                </label>
                <select
                  id="sort-select"
                  value={ordenar}
                  onChange={(e) => setOrdenar(e.target.value as any)}
                  className="text-sm rounded-xl px-4 py-2.5 outline-none font-medium transition-all shadow-sm focus:ring-2 focus:ring-offset-1"
                  style={{
                    backgroundColor: hexFallbacks.bgSecondary,
                    border: `1.5px solid ${hexFallbacks.borderLight}`,
                    color: hexFallbacks.textPrimary,
                    cursor: "pointer",
                    "--tw-ring-color": hexFallbacks.brand,
                  } as React.CSSProperties}
                >
                  <option value="popular">Popularidad</option>
                  <option value="precio_asc">Precio: menor a mayor</option>
                  <option value="precio_desc">Precio: mayor a menor</option>
                  <option value="nombre_az">Nombre A–Z</option>
                </select>
              </div>
            </div>

            {/* Estados de carga y error mejorados */}
            {loading ? (
              <div className="flex min-h-96 items-center justify-center" role="status" aria-live="polite" aria-busy="true">
                <div className="text-center">
                  <div className="mb-4 relative inline-block">
                    <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ color: hexFallbacks.brand }} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ color: hexFallbacks.brand }} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: hexFallbacks.brand }}>
                    Buscando lotes en el palenque...
                  </p>
                  <p className="text-xs mt-2" style={{ color: hexFallbacks.textSecondary }}>
                    Espera mientras procesamos tu búsqueda
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex min-h-96 items-center justify-center" role="alert" aria-live="assertive">
                <div
                  className="text-center p-6 rounded-2xl max-w-md"
                  style={{
                    backgroundColor: `${hexFallbacks.errorColor}15`,
                    border: `2px solid ${hexFallbacks.errorColor}4d`
                  }}
                >
                  <p className="text-sm font-semibold mb-2" style={{ color: hexFallbacks.errorColor }}>
                    ⚠️ Error al cargar productos
                  </p>
                  <p className="text-xs mb-4" style={{ color: hexFallbacks.textSecondary }}>
                    {error || "No fue posible cargar los productos. Por favor, intenta más tarde."}
                  </p>
                  <button
                    onClick={() => fetchProductos(filtros)}
                    className="w-full px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ backgroundColor: hexFallbacks.brand, "--tw-ring-color": hexFallbacks.brand } as React.CSSProperties}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : productosMostrados.length === 0 ? (
              <div className="flex min-h-96 items-center justify-center" role="status" aria-live="polite">
                <div
                  className="text-center p-8 rounded-2xl max-w-md"
                  style={{
                    backgroundColor: `${hexFallbacks.brand}14`,
                    border: `1px solid ${hexFallbacks.brand}26`
                  }}
                >
                  <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
                  <p className="text-sm font-semibold mb-2" style={{ color: hexFallbacks.textPrimary }}>
                    No encontramos lotes
                  </p>
                  <p className="text-xs mb-6" style={{ color: hexFallbacks.textSecondary }}>
                    No hay mezcales que coincidan con estas especificaciones. Intenta ajustar los filtros o {cantidadFiltros > 0 || filtros.busqueda ? "restablecerlos." : "usa la búsqueda."}
                  </p>
                  {(cantidadFiltros > 0 || filtros.busqueda) && (
                    <button
                      onClick={limpiarTodo}
                      className="w-full px-4 py-2.5 rounded-lg text-xs font-bold transition-all hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{ backgroundColor: `${hexFallbacks.brand}33`, color: hexFallbacks.brand, "--tw-ring-color": hexFallbacks.brand } as React.CSSProperties}
                    >
                      ← Restablecer filtros
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 justify-center animate-in fade-in duration-500" data-grid="productos">
                  {productosPagina.map((producto, index) => (
                    <ProductCard
                      key={String(producto.id_producto)}
                      producto={producto}
                      index={(paginaActual - 1) * PRODUCTOS_POR_PAGINA + index}
                      isWishlisted={isInWishlist(producto.id_producto)}
                      onWishlist={() => toggleWishlist(producto)}
                      onAddCart={() => {
                        agregarProducto({
                          id_producto: producto.id_producto,
                          nombre: producto.nombre,
                          precio_base: producto.precio_base,
                          imagen_principal_url: producto.imagen_principal_url,
                          producto_imagenes: producto.producto_imagenes,
                          cantidad: 1,
                        });
                        setAgregadoId(producto.id_producto);
                        addToast("Producto agregado al carrito");
                        setTimeout(() => setAgregadoId(null), 2500);
                      }}
                      isAdded={agregadoId === producto.id_producto}
                      onViewDetails={() => router.push(`/Cliente/producto/${producto.id_producto}`)}
                    />
                  ))}
                </div>

                {/* ─── PAGINACIÓN ─── */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10" role="navigation" aria-label="Paginación">
                    {/* Anterior */}
                    <button
                      onClick={() => {
                        setPaginaActual((p) => Math.max(1, p - 1));
                        document.querySelector('[data-grid="productos"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      disabled={paginaActual === 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80 active:scale-95"
                      style={{ backgroundColor: hexFallbacks.bgSecondary, color: hexFallbacks.textPrimary, border: `1px solid ${hexFallbacks.borderLight}` }}
                      aria-label="Página anterior"
                    >
                      ← Anterior
                    </button>

                    {/* Números de página */}
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => {
                      const isActive = num === paginaActual;
                      const isNear = Math.abs(num - paginaActual) <= 1 || num === 1 || num === totalPaginas;
                      if (!isNear) {
                        const isGap = num === 2 || num === totalPaginas - 1;
                        return isGap ? (
                          <span key={num} className="text-sm px-1" style={{ color: hexFallbacks.textMuted }}>…</span>
                        ) : null;
                      }
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            setPaginaActual(num);
                            document.querySelector('[data-grid="productos"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="w-9 h-9 rounded-lg text-sm font-bold transition-all hover:opacity-80 active:scale-95"
                          style={{
                            backgroundColor: isActive ? hexFallbacks.brand : hexFallbacks.bgSecondary,
                            color: isActive ? "white" : hexFallbacks.textPrimary,
                            border: `1px solid ${isActive ? hexFallbacks.brand : hexFallbacks.borderLight}`,
                          }}
                          aria-label={`Página ${num}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {num}
                        </button>
                      );
                    })}

                    {/* Siguiente */}
                    <button
                      onClick={() => {
                        setPaginaActual((p) => Math.min(totalPaginas, p + 1));
                        document.querySelector('[data-grid="productos"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      disabled={paginaActual === totalPaginas}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80 active:scale-95"
                      style={{ backgroundColor: hexFallbacks.bgSecondary, color: hexFallbacks.textPrimary, border: `1px solid ${hexFallbacks.borderLight}` }}
                      aria-label="Página siguiente"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ─── FILTROS MÓVILES P1: INTENCIONAL + FOOTER DINÁMICO ─── */}
      {showMobileFilters && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setShowMobileFilters(false)}
            role="presentation"
            aria-hidden="true"
            style={{
              animation: showMobileFilters ? 'fadeIn 0.2s ease-out' : 'fadeOut 0.2s ease-in',
            }}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 shadow-2xl flex flex-col lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-modal-title"
            style={{
              width: "min(70vw, 400px)",
              backgroundColor: hexFallbacks.bgPrimary,
              animation: showMobileFilters ? 'slideInLeft 0.3s ease-out' : 'slideOutLeft 0.3s ease-in',
            }}
          >
            {/* Header */}
            <div className="p-5 border-b sticky top-0 z-10" style={{ borderColor: hexFallbacks.borderLight, backgroundColor: hexFallbacks.bgPrimary }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="filters-modal-title" className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: hexFallbacks.textPrimary }}>
                    Filtros
                  </h2>
                </div>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:opacity-70 transition-opacity rounded-lg hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-1 w-10 h-10 flex items-center justify-center"
                  style={{ "--tw-ring-color": hexFallbacks.brand } as React.CSSProperties}
                  aria-label="Cerrar filtros"
                  title="Cerrar filtros"
                >
                  <X size={22} style={{ color: hexFallbacks.textPrimary }} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Scrollable filters */}
            <div className="flex-1 overflow-y-auto p-5">
              <SidebarFiltersComponent
                filtrosPendientes={filtrosPendientes}
                onBusquedaChange={handleBusquedaChange}
                onFiltroToggle={handleFiltroToggle}
                onMaestroChange={handleMaestroChange}
                searchFocus={searchFocus}
                onSearchFocus={setSearchFocus}
                precioMinLocal={precioMinLocal}
                precioMaxLocal={precioMaxLocal}
                onPrecioMinChange={setPrecioMinLocal}
                onPrecioMaxChange={setPrecioMaxLocal}
                onAplicarPrecio={handleAplicarPrecio}
                TIPOS_MAGUEY={TIPOS_MAGUEY}
                TIPOS_DESTILACION={TIPOS_DESTILACION}
                TIPOS_MOLIENDA={TIPOS_MOLIENDA}
              />
            </div>

            {/* P1: Sticky footer with dynamic "Apply" button */}
            <div
              className="border-t p-4 sticky bottom-0"
              style={{ borderColor: hexFallbacks.borderLight, backgroundColor: hexFallbacks.bgPrimary }}
            >
              {/* P4: Price validation error */}
              {(() => {
                const minNum = Number(filtrosPendientes.precio_min) || 0;
                const maxNum = Number(filtrosPendientes.precio_max) || 5000;
                return minNum > maxNum ? (
                  <div id="price-error" className="mb-3 text-xs font-semibold p-2 rounded" style={{ color: hexFallbacks.errorColor, backgroundColor: `${hexFallbacks.errorColor}1a` }} role="alert">
                    El precio mínimo debe ser menor al máximo
                  </div>
                ) : null;
              })()}
              <button
                onClick={handleAplicarFiltros}
                disabled={previewCount === 0 || (() => {
                  const minNum = Number(filtrosPendientes.precio_min) || 0;
                  const maxNum = Number(filtrosPendientes.precio_max) || 5000;
                  return minNum > maxNum;
                })()}
                className="w-full py-3 rounded-lg font-bold uppercase text-sm tracking-wider transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: previewCount > 0 && !(() => {
                    const minNum = Number(filtrosPendientes.precio_min) || 0;
                    const maxNum = Number(filtrosPendientes.precio_max) || 5000;
                    return minNum > maxNum;
                  })() ? hexFallbacks.brand : hexFallbacks.bgTertiary,
                  color: "white",
                  "--tw-ring-color": hexFallbacks.brand,
                } as React.CSSProperties}
                aria-describedby={(() => {
                  const minNum = Number(filtrosPendientes.precio_min) || 0;
                  const maxNum = Number(filtrosPendientes.precio_max) || 5000;
                  return minNum > maxNum ? "price-error" : undefined;
                })()}
                aria-disabled={previewCount === 0}
                aria-label={`Ver ${previewCount} resultado${previewCount !== 1 ? "s" : ""}. Presiona para aplicar filtros`}
                title={previewCount === 0 ? "No hay resultados para los filtros seleccionados" : "Aplicar filtros"}
              >
                {previewLoading ? "Cargando..." : `Ver ${previewCount} resultado${previewCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* P2: Toast container (top-right) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none" role="region" aria-label="Notificaciones" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto"
            style={{
              backgroundColor: hexFallbacks.successColor,
              color: "white",
              animation: "slideInRight 0.2s ease-out",
            }}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-sm font-semibold flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1.5 hover:opacity-70 transition-opacity flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-white rounded-md h-6 w-6 flex items-center justify-center"
              aria-label="Cerrar notificación"
              title="Cerrar notificación"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}