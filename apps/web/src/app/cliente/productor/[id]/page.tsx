"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Heart, ArrowLeft, Filter, X, Store, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { SidebarFiltersComponent } from "@/components/catalog/SidebarFilters";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Producto {
  id_producto: bigint;
  id_tienda?: number;
  nombre: string;
  descripcion?: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  categorias?: string[];
  nombre_productor?: string | null;
  nombre_tienda?: string | null;
  promedio_calificacion?: number | null;
  total_resenas?: number | null;
  stock?: number | null;
  lotes?: { datos_api?: Record<string, string> };
  tiendas?: { nombre?: string } | null;
}

interface Productor {
  id_productor: number;
  biografia?: string;
  asociacion?: string;
  certificaciones?: string;
  usuarios?: { nombre: string; apellido_paterno?: string; apellido_materno?: string };
  tiendas?: { id_tienda: number; nombre: string; ciudad_origen?: string; estado_origen?: string }[];
}

interface Filtros {
  busqueda: string;
  maguey: string[];
  precio_min: string;
  precio_max: string;
}

const FILTROS_VACIOS: Filtros = { busqueda: "", maguey: [], precio_min: "", precio_max: "" };
const TIPOS_MAGUEY = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo"];
const POR_PAGINA = 9;

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating = 0, reviews = 0 }: { rating?: number; reviews?: number }) {
  const fullStars = reviews > 0 ? Math.floor(rating) : 0;
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className="w-3 h-3" viewBox="0 0 24 24"
            fill={i <= fullStars ? "#C97A3E" : "none"}
            stroke={i <= fullStars ? "#C97A3E" : "#A8C26B"}
            strokeWidth={i <= fullStars ? 0 : 1.5}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {reviews > 0 && (
        <span className="text-[11px] text-gray-500">({reviews})</span>
      )}
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  producto,
  isWishlisted,
  onWishlist,
  onAddCart,
  isAdded,
  onViewDetails,
}: {
  producto: Producto;
  isWishlisted: boolean;
  onWishlist: () => void;
  onAddCart: () => void;
  isAdded: boolean;
  onViewDetails: () => void;
}) {
  const { convertPrice } = useLocale();
  const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
  const maguey = producto.lotes?.datos_api?.maguey;
  const tipoMezcal = producto.lotes?.datos_api?.tipo_mezcal;
  const rating = Number(producto.promedio_calificacion ?? 0);
  const reviews = Number(producto.total_resenas ?? 0);
  const sinStock = (producto.stock ?? 0) <= 0;

  return (
    <div
      className="group rounded-2xl overflow-hidden border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
      style={{ borderColor: "#ddd8c4", backgroundColor: "#F4F0E3" }}
    >
      {/* Imagen */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ aspectRatio: "4/3", backgroundColor: "#eae6d4" }}
        onClick={onViewDetails}
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {tipoMezcal && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: "#e5eedc", color: "#306B3F", border: "1px solid #ddd8c4" }}>
              {tipoMezcal}
            </span>
          )}
          {sinStock && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
              Agotado
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all hover:scale-110"
          style={{
            backgroundColor: isWishlisted ? "#C97A3E" : "rgba(255,255,255,0.92)",
            border: isWishlisted ? "none" : "1px solid rgba(0,0,0,0.08)",
          }}
          onClick={(e) => { e.stopPropagation(); onWishlist(); }}
          aria-label={isWishlisted ? "Remover de favoritos" : "Agregar a favoritos"}
        >
          <Heart size={14} fill={isWishlisted ? "white" : "none"} color={isWishlisted ? "white" : "#C97A3E"} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        {maguey && (
          <p className="text-xs font-medium mb-1" style={{ color: "#C97A3E" }}>{maguey}</p>
        )}
        <h3
          className="font-semibold text-sm line-clamp-2 mb-2 leading-snug cursor-pointer hover:opacity-80"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1F3A2E" }}
          onClick={onViewDetails}
        >
          {producto.nombre}
        </h3>

        <StarRating rating={rating} reviews={reviews} />

        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-bold text-base" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#306B3F" }}>
            {convertPrice(Number(producto.precio_base || 0))}
          </span>
          {producto.nombre_tienda && (
            <span className="text-xs text-gray-400 truncate max-w-[100px]">{producto.nombre_tienda}</span>
          )}
        </div>

        <button
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: isAdded ? "#163020" : "#1F3A2E" }}
          disabled={isAdded || sinStock}
          onClick={(e) => { e.stopPropagation(); onAddCart(); }}
        >
          <ShoppingCart size={13} />
          {sinStock ? "Sin stock" : isAdded ? "¡Agregado!" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ProductorPage() {
  const params = useParams();
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [productor, setProductor] = useState<Productor | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [filtrosPendientes, setFiltrosPendientes] = useState<Filtros>(FILTROS_VACIOS);
  const [precioMinLocal, setPrecioMinLocal] = useState("");
  const [precioMaxLocal, setPrecioMaxLocal] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Paginación
  const [pagina, setPagina] = useState(1);

  // Cards agregadas
  const [agregados, setAgregados] = useState<Set<string>>(new Set());

  // Ordenamiento
  const [orden, setOrden] = useState<"nombre" | "precio_asc" | "precio_desc" | "popular">("nombre");

  const fetchData = useCallback(async () => {
    const id = params.id;
    if (!id) return;
    const idNum = Number(id);
    if (isNaN(idNum)) return;

    setLoading(true);
    setError(null);
    try {
      const [productorData, productosData] = await Promise.all([
        api.productores.getOne(idNum).catch(() => null),
        api.productos.getByProductor(idNum).catch(() => [] as Producto[]),
      ]);
      if (!productorData) {
        setError("Productor no encontrado");
      } else {
        setProductor(productorData as Productor);
      }
      setProductos((productosData as Producto[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtrado + ordenamiento
  const productosFiltrados = useMemo(() => {
    let result = [...productos];

    if (filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase();
      result = result.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q) ||
        p.lotes?.datos_api?.maguey?.toLowerCase().includes(q)
      );
    }

    if (filtros.maguey.length > 0) {
      result = result.filter((p) => {
        const m = p.lotes?.datos_api?.maguey?.toLowerCase() ?? "";
        return filtros.maguey.some((f) => m.includes(f.toLowerCase()));
      });
    }

    if (filtros.precio_min !== "") {
      const min = Number(filtros.precio_min);
      result = result.filter((p) => Number(p.precio_base) >= min);
    }
    if (filtros.precio_max !== "") {
      const max = Number(filtros.precio_max);
      result = result.filter((p) => Number(p.precio_base) <= max);
    }

    result.sort((a, b) => {
      if (orden === "precio_asc") return Number(a.precio_base) - Number(b.precio_base);
      if (orden === "precio_desc") return Number(b.precio_base) - Number(a.precio_base);
      if (orden === "popular") return (Number(b.promedio_calificacion ?? 0)) - (Number(a.promedio_calificacion ?? 0));
      return a.nombre.localeCompare(b.nombre);
    });

    return result;
  }, [productos, filtros, orden]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / POR_PAGINA));
  const productosPagina = productosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Handlers de filtros
  const handleBusquedaChange = (value: string) => {
    setFiltrosPendientes((f) => ({ ...f, busqueda: value }));
    setFiltros((f) => ({ ...f, busqueda: value }));
    setPagina(1);
  };

  const handleFiltroToggle = (field: string, value: string) => {
    setFiltrosPendientes((prev) => {
      const arr = prev[field as keyof Filtros] as string[];
      const nuevo = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      const updated = { ...prev, [field]: nuevo };
      setFiltros(updated);
      setPagina(1);
      return updated;
    });
  };

  const handleAplicarPrecio = () => {
    setFiltros((f) => ({ ...f, precio_min: precioMinLocal, precio_max: precioMaxLocal }));
    setPagina(1);
  };

  const handleLimpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setFiltrosPendientes(FILTROS_VACIOS);
    setPrecioMinLocal("");
    setPrecioMaxLocal("");
    setPagina(1);
  };

  const hayFiltrosActivos =
    filtros.busqueda !== "" ||
    filtros.maguey.length > 0 ||
    filtros.precio_min !== "" ||
    filtros.precio_max !== "";

  const handleWishlist = (producto: Producto) => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
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

  const handleAddCart = (producto: Producto) => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }
    agregarProducto({
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      precio_base: producto.precio_base,
      imagen_principal_url: producto.imagen_principal_url,
      producto_imagenes: producto.producto_imagenes,
      cantidad: 1,
    });
    const key = String(producto.id_producto);
    setAgregados((prev) => new Set(prev).add(key));
    setTimeout(() => setAgregados((prev) => { const s = new Set(prev); s.delete(key); return s; }), 1500);
  };

  const nombreProductor = productor
    ? [productor.usuarios?.nombre, productor.usuarios?.apellido_paterno, productor.usuarios?.apellido_materno]
        .filter(Boolean).join(" ")
    : "";

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ backgroundColor: "#F4F0E3" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#ddd8c4] border-t-[#306B3F]" />
          <p className="text-sm" style={{ color: "#A8C26B" }}>Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (error || !productor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" style={{ backgroundColor: "#F4F0E3" }}>
        <p className="text-red-500">{error ?? "Productor no encontrado"}</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 rounded-full px-5 py-2 text-sm text-white" style={{ backgroundColor: "#1F3A2E" }}>
          <ArrowLeft size={16} /> Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F0E3" }}>
      {/* ─── Header Productor ───────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#1F3A2E" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }}
        />
        <div className="relative mx-auto max-w-screen-xl px-4 py-10 md:px-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#A8C26B" }}
          >
            <ArrowLeft size={16} /> Volver
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Info productor */}
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#A8C26B" }}>
                Maestro Productor
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {nombreProductor || "Productor"}
              </h1>

              {productor.biografia && (
                <p className="text-sm leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {productor.biografia}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {productor.asociacion && (
                  <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: "rgba(168,194,107,0.15)", color: "#A8C26B", border: "1px solid rgba(168,194,107,0.3)" }}>
                    {productor.asociacion}
                  </span>
                )}
                {productor.certificaciones && (
                  <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: "rgba(201,122,62,0.15)", color: "#C97A3E", border: "1px solid rgba(201,122,62,0.3)" }}>
                    {productor.certificaciones}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}>
                  {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Tiendas del productor */}
            {productor.tiendas && productor.tiendas.length > 0 && (
              <div className="md:min-w-[220px]">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#A8C26B" }}>
                  Tiendas
                </p>
                <div className="flex flex-col gap-2">
                  {productor.tiendas.map((tienda) => (
                    <button
                      key={tienda.id_tienda}
                      onClick={() => router.push(`/cliente/tienda/${tienda.id_tienda}`)}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm transition-all hover:opacity-90"
                      style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <Store size={14} style={{ color: "#A8C26B", flexShrink: 0 }} />
                      <div>
                        <p className="font-medium text-white">{tienda.nombre}</p>
                        {(tienda.ciudad_origen || tienda.estado_origen) && (
                          <p className="text-xs flex items-center gap-0.5 mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <MapPin size={10} />
                            {[tienda.ciudad_origen, tienda.estado_origen].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Catálogo con filtros ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
        <div className="flex gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4 rounded-2xl border p-5" style={{ backgroundColor: "white", borderColor: "#ddd8c4" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm" style={{ color: "#1F3A2E" }}>Filtros</h2>
                {hayFiltrosActivos && (
                  <button onClick={handleLimpiarFiltros} className="text-xs hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: "#C97A3E" }}>
                    <X size={12} /> Limpiar
                  </button>
                )}
              </div>
              <SidebarFiltersComponent
                filtrosPendientes={filtrosPendientes}
                onBusquedaChange={handleBusquedaChange}
                onFiltroToggle={handleFiltroToggle}
                searchFocus={searchFocus}
                onSearchFocus={setSearchFocus}
                precioMinLocal={precioMinLocal}
                precioMaxLocal={precioMaxLocal}
                onPrecioMinChange={setPrecioMinLocal}
                onPrecioMaxChange={setPrecioMaxLocal}
                onAplicarPrecio={handleAplicarPrecio}
                TIPOS_MAGUEY={TIPOS_MAGUEY}
              />
            </div>
          </aside>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {/* Barra superior */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Botón filtros móvil */}
                <button
                  className="flex lg:hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: "#1F3A2E", color: "white" }}
                  onClick={() => setSidebarOpen(true)}
                >
                  <Filter size={14} /> Filtros
                  {hayFiltrosActivos && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: "#C97A3E" }}>
                      {filtros.maguey.length + (filtros.precio_min ? 1 : 0) + (filtros.precio_max ? 1 : 0)}
                    </span>
                  )}
                </button>

                {/* Badges filtros activos */}
                <div className="hidden sm:flex flex-wrap gap-2">
                  {filtros.maguey.map((m) => (
                    <span key={m} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "rgba(201,122,62,0.12)", color: "#C97A3E", border: "1px solid rgba(201,122,62,0.3)" }}>
                      {m}
                      <button onClick={() => handleFiltroToggle("maguey", m)} className="hover:opacity-70"><X size={10} /></button>
                    </span>
                  ))}
                  {(filtros.precio_min || filtros.precio_max) && (
                    <span className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "rgba(201,122,62,0.12)", color: "#C97A3E", border: "1px solid rgba(201,122,62,0.3)" }}>
                      ${filtros.precio_min || "0"} – ${filtros.precio_max || "∞"}
                      <button onClick={() => { setFiltros((f) => ({ ...f, precio_min: "", precio_max: "" })); setPrecioMinLocal(""); setPrecioMaxLocal(""); }} className="hover:opacity-70"><X size={10} /></button>
                    </span>
                  )}
                </div>
              </div>

              {/* Ordenamiento */}
              <select
                value={orden}
                onChange={(e) => { setOrden(e.target.value as typeof orden); setPagina(1); }}
                className="rounded-full border px-4 py-2 text-xs font-medium focus:outline-none"
                style={{ borderColor: "#ddd8c4", backgroundColor: "white", color: "#1F3A2E" }}
              >
                <option value="nombre">Nombre A-Z</option>
                <option value="precio_asc">Precio: menor a mayor</option>
                <option value="precio_desc">Precio: mayor a menor</option>
                <option value="popular">Más valorados</option>
              </select>
            </div>

            {/* Grid de productos */}
            {productosPagina.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-4">🌿</div>
                <p className="font-semibold mb-2" style={{ color: "#1F3A2E" }}>Sin resultados</p>
                <p className="text-sm text-gray-500 mb-4">No hay productos que coincidan con los filtros.</p>
                {hayFiltrosActivos && (
                  <button onClick={handleLimpiarFiltros} className="rounded-full px-5 py-2 text-sm text-white"
                    style={{ backgroundColor: "#1F3A2E" }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {productosPagina.map((producto) => (
                  <ProductCard
                    key={String(producto.id_producto)}
                    producto={producto}
                    isWishlisted={isInWishlist(producto.id_producto)}
                    onWishlist={() => handleWishlist(producto)}
                    onAddCart={() => handleAddCart(producto)}
                    isAdded={agregados.has(String(producto.id_producto))}
                    onViewDetails={() => router.push(`/cliente/producto/${producto.id_producto}`)}
                  />
                ))}
              </div>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-all disabled:opacity-40 hover:bg-white"
                  style={{ borderColor: "#ddd8c4", color: "#1F3A2E" }}
                >
                  ‹
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-all"
                    style={{
                      borderColor: p === pagina ? "#1F3A2E" : "#ddd8c4",
                      backgroundColor: p === pagina ? "#1F3A2E" : "white",
                      color: p === pagina ? "white" : "#1F3A2E",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-all disabled:opacity-40 hover:bg-white"
                  style={{ borderColor: "#ddd8c4", color: "#1F3A2E" }}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Sidebar móvil (drawer) ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 overflow-y-auto rounded-l-2xl p-5 shadow-2xl"
            style={{ backgroundColor: "#F4F0E3" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold" style={{ color: "#1F3A2E" }}>Filtros</h2>
              <div className="flex items-center gap-3">
                {hayFiltrosActivos && (
                  <button onClick={handleLimpiarFiltros} className="text-xs" style={{ color: "#C97A3E" }}>Limpiar</button>
                )}
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:opacity-70">
                  <X size={20} />
                </button>
              </div>
            </div>
            <SidebarFiltersComponent
              filtrosPendientes={filtrosPendientes}
              onBusquedaChange={handleBusquedaChange}
              onFiltroToggle={handleFiltroToggle}
              searchFocus={searchFocus}
              onSearchFocus={setSearchFocus}
              precioMinLocal={precioMinLocal}
              precioMaxLocal={precioMaxLocal}
              onPrecioMinChange={setPrecioMinLocal}
              onPrecioMaxChange={setPrecioMaxLocal}
              onAplicarPrecio={handleAplicarPrecio}
              TIPOS_MAGUEY={TIPOS_MAGUEY}
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="mt-6 w-full rounded-full py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: "#1F3A2E" }}
            >
              Ver {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
