"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Heart, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";

interface Producto {
  id_producto: bigint;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  categorias?: string[];
  nombre_productor?: string;
  lotes?: { datos_api?: Record<string, string> };
}

interface Categoria {
  id_categoria: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagen_url?: string;
  tipo?: string;
}

const TIPOS_MEZCAL = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo", "Anejo"];
const TIPOS_MAGUEY = ["Espadín", "Tobalá", "Peñata", "Madrecuixe", "Arroqueño", "Cuishe", "Coyote", "Litrea", "Garabatillo"];

export default function CategoriaPage() {
  const params = useParams();
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregadoId, setAgregadoId] = useState<bigint | null>(null);

  // Filtros
  const [tipoMezcalFilter, setTipoMezcalFilter] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  const fetchData = useCallback(async () => {
    const slug = params.slug;
    if (!slug) return;

    setLoading(true);
    setError(null);
    try {
      const decodedSlug = decodeURIComponent(slug as string);

      const categoriasData = await api.categorias.getAll();
      const categoriaFound = (categoriasData as any[]).find((c) => c.nombre === decodedSlug);

      if (!categoriaFound) {
        setError("Categoría no encontrada");
        return;
      }

      setCategoria(categoriaFound);

      const productosData = await api.productos.getAll({});
      const filtrados = (productosData as Producto[]).filter(
        (p) =>
          p.categorias &&
          p.categorias.length > 0 &&
          p.categorias.includes(categoriaFound.nombre) &&
          p.nombre_productor
      );
      setProductos(filtrados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const productosFiltrados = useMemo(() => {
    let filtered = [...productos];

    if (tipoMezcalFilter) {
      filtered = filtered.filter((p) => p.lotes?.datos_api?.tipo_mezcal === tipoMezcalFilter);
    }

    if (precioMin) {
      filtered = filtered.filter((p) => Number(p.precio_base) >= Number(precioMin));
    }

    if (precioMax) {
      filtered = filtered.filter((p) => Number(p.precio_base) <= Number(precioMax));
    }

    return filtered;
  }, [productos, tipoMezcalFilter, precioMin, precioMax]);

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-green-600">Cargando categoría...</div>
      </div>
    );
  }

  if (error || !categoria) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-red-500">Error: {error || "Categoría no encontrada"}</div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white"
        >
          <ArrowLeft size={18} />
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8" style={{ backgroundColor: "var(--bio-color-fondo, #faf8f4)", minHeight: "100vh" }}>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 hover:opacity-80 transition-opacity"
        style={{ color: "var(--bio-color-precio, #8b6914)" }}
      >
        <ArrowLeft size={20} />
        Volver
      </button>

      {/* Header Categoría */}
      <div className="mb-12 rounded-lg p-8" style={{ backgroundColor: "white", border: "1px solid #e8dcc8" }}>
        <div className="flex gap-8 items-start">
          {categoria.imagen_url && (
            <div className="relative h-40 w-40 flex-shrink-0">
              <Image
                src={categoria.imagen_url}
                alt={categoria.nombre}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}>
              {categoria.nombre}
            </h1>
            {categoria.tipo && (
              <span
                className="inline-block text-xs font-medium rounded-full px-3 py-1 mb-4"
                style={{
                  backgroundColor: "#f0ebe0",
                  color: "var(--bio-color-precio, #8b6914)",
                  border: "1px solid #e8dcc8",
                }}
              >
                {categoria.tipo}
              </span>
            )}
            {categoria.descripcion && <p className="text-gray-700 leading-relaxed">{categoria.descripcion}</p>}
          </div>
        </div>
      </div>

      {/* Filtros y productos */}
      <div className="flex gap-6">
        {/* Sidebar filtros */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="rounded-xl border p-6" style={{ border: "1px solid #e8dcc8", backgroundColor: "white" }}>
            <div className="space-y-6">
              {/* Tipo de Mezcal */}
              <div className="space-y-2 border-b pb-4" style={{ borderColor: "#e8dcc8" }}>
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
                  Tipo de Mezcal
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS_MEZCAL.map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setTipoMezcalFilter(tipoMezcalFilter === tipo ? "" : tipo)}
                      className="px-2.5 py-1 rounded-full text-xs transition-colors font-medium"
                      style={{
                        backgroundColor: tipoMezcalFilter === tipo ? "var(--bio-color-boton, #5c3d1e)" : "#f0ebe0",
                        color: tipoMezcalFilter === tipo ? "white" : "var(--bio-color-titulo, #5c3d1e)",
                        border: "1px solid #e8dcc8",
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rango de Precio */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
                  Rango de Precio (MXN)
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Máx"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Clear filters */}
              {(tipoMezcalFilter || precioMin || precioMax) && (
                <button
                  onClick={() => {
                    setTipoMezcalFilter("");
                    setPrecioMin("");
                    setPrecioMax("");
                  }}
                  className="w-full text-sm font-medium text-red-600 hover:text-red-700 border-t pt-4"
                  style={{ borderColor: "#e8dcc8" }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Productos */}
        <div className="flex-1 min-w-0">
          <p className="mb-5 text-sm text-gray-600" style={{ color: "var(--bio-color-precio, #8b6914)" }}>
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""} encontrado{productosFiltrados.length !== 1 ? "s" : ""}
          </p>

          {productosFiltrados.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-gray-500">
              <p>No hay productos que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {productosFiltrados.map((producto) => {
                const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
                const tipoMezcal = producto.lotes?.datos_api?.tipo_mezcal ?? "";

                return (
                  <div
                    key={String(producto.id_producto)}
                    className="group rounded-xl overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                    style={{ borderColor: "#e8dcc8", backgroundColor: "var(--bio-color-fondo, #faf8f4)" }}
                  >
                    {/* Image */}
                    <div
                      className="relative overflow-hidden bg-gray-50"
                      style={{ aspectRatio: "1 / 1" }}
                      onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}
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
                          style={{ backgroundColor: "#f0ebe0", color: "var(--bio-color-precio, #8b6914)", border: "1px solid #e8dcc8" }}
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

                    {/* Text Zone */}
                    <div className="p-4">
                      <h3
                        className="font-semibold text-sm line-clamp-2 mb-2 leading-snug cursor-pointer hover:opacity-80"
                        style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
                        onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}
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
                          backgroundColor: agregadoId === producto.id_producto ? "var(--bio-color-boton-hover, #3d2510)" : "var(--bio-color-boton, #5c3d1e)",
                        }}
                        disabled={agregadoId === producto.id_producto}
                        onClick={() => {
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
      </div>
    </div>
  );
}
