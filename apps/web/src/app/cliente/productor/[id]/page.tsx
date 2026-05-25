"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Users, MapPin, ShoppingCart, Heart, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { ProductItem } from "@/types/producer";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";

interface Producto extends ProductItem {
  producto_imagenes?: { url: string }[];
  categorias?: string[];
  nombre_productor?: string;
  lotes?: { datos_api?: Record<string, string> };
}

interface Productor {
  id_productor: number;
  usuarios?: { nombre: string; apellido_paterno?: string; apellido_materno?: string };
  biografia?: string;
  regiones?: { nombre: string };
  lotes?: any[];
  tiendas?: Array<{ id_tienda: number; nombre: string; descripcion?: string; ciudad_origen?: string; estado_origen?: string }>;
}

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
  const [agregadoId, setAgregadoId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const id = params.id;
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const productorData = await api.productores.getOne<Productor>(Number(id));
      const productosData = await api.productos.getByProductor(Number(id));

      if (!productorData) {
        setError("Productor no encontrado");
        return;
      }

      setProductor(productorData);
      const filtrados = (productosData as Producto[]).filter(
        (p) => p.categorias && p.categorias.length > 0
      );
      setProductos(filtrados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        precio_base: producto.precio_base == null ? "0" : String(producto.precio_base),
        imagen_principal_url: producto.imagen_principal_url ?? undefined,
        producto_imagenes: producto.producto_imagenes,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-green-600">Cargando productor...</div>
      </div>
    );
  }

  if (error || !productor) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-red-500">Error: {error || "Productor no encontrado"}</div>
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

  const nombreCompleto = [
    productor.usuarios?.nombre,
    productor.usuarios?.apellido_paterno,
    productor.usuarios?.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8" style={{ backgroundColor: "#F4F0E3", minHeight: "100vh" }}>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 hover:opacity-80 transition-opacity"
        style={{ color: "#306B3F" }}
      >
        <ArrowLeft size={20} />
        Volver
      </button>

      {/* Hero Productor */}
      <div className="mb-12 rounded-lg p-8" style={{ backgroundColor: "white", border: "1px solid #ddd8c4" }}>
        <div className="grid gap-8 md:grid-cols-3">
          {/* Avatar placeholder */}
          <div className="flex items-center justify-center">
            <div
              className="h-40 w-40 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#e5eedc" }}
            >
              <Users size={60} style={{ color: "#306B3F" }} />
            </div>
          </div>

          {/* Información */}
          <div className="col-span-2 space-y-4">
            <h1 className="text-4xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1F3A2E" }}>
              {nombreCompleto}
            </h1>

            {productor.regiones && (
              <p className="flex items-center gap-2 text-gray-600">
                <MapPin size={18} style={{ color: "#306B3F" }} />
                <span className="font-medium">{(productor.regiones as any)?.nombre}</span>
              </p>
            )}

            {productor.biografia && (
              <p className="text-gray-700 leading-relaxed">{productor.biografia}</p>
            )}

            {/* Badges stats */}
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="flex flex-col items-center rounded-lg p-3" style={{ backgroundColor: "#e5eedc" }}>
                <span className="text-2xl font-bold" style={{ color: "#306B3F" }}>
                  {productor.lotes?.length || 0}
                </span>
                <span className="text-xs text-gray-600">Lotes</span>
              </div>
              <div className="flex flex-col items-center rounded-lg p-3" style={{ backgroundColor: "#e5eedc" }}>
                <span className="text-2xl font-bold" style={{ color: "#306B3F" }}>
                  {productor.tiendas?.length || 0}
                </span>
                <span className="text-xs text-gray-600">Tiendas</span>
              </div>
              <div className="flex flex-col items-center rounded-lg p-3" style={{ backgroundColor: "#e5eedc" }}>
                <span className="text-2xl font-bold" style={{ color: "#306B3F" }}>
                  {productos.length}
                </span>
                <span className="text-xs text-gray-600">Productos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tiendas */}
      {productor.tiendas && productor.tiendas.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1F3A2E" }}>
            Sus tiendas
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productor.tiendas.map((tienda) => (
              <div
                key={tienda.id_tienda}
                className="rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: "white", border: "1px solid #ddd8c4" }}
                onClick={() => router.push(`/cliente/tienda/${tienda.id_tienda}`)}
              >
                <h3 className="font-semibold mb-2" style={{ color: "#1F3A2E" }}>
                  {tienda.nombre}
                </h3>
                {tienda.descripcion && <p className="text-sm text-gray-600 mb-2">{tienda.descripcion}</p>}
                {(tienda.ciudad_origen || tienda.estado_origen) && (
                  <p className="text-xs flex items-center gap-1 text-gray-500">
                    <MapPin size={12} />
                    {[tienda.ciudad_origen, tienda.estado_origen].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Productos */}
      <div>
        <h2 className="mb-6 text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1F3A2E" }}>
          Sus productos
        </h2>

        {productos.length === 0 ? (
          <p className="text-gray-500">No hay productos disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {productos.map((producto) => {
              const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
              const tipoMezcal = producto.lotes?.datos_api?.tipo_mezcal ?? "";

              return (
                <div
                  key={String(producto.id_producto)}
                  className="group rounded-xl overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderColor: "#ddd8c4", backgroundColor: "#F4F0E3" }}
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
                        style={{ backgroundColor: "#e5eedc", color: "#306B3F", border: "1px solid #ddd8c4" }}
                      >
                        {tipoMezcal}
                      </span>
                    )}

                    <button
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110"
                      style={{
                        backgroundColor: isInWishlist(producto.id_producto) ? "#edf5e5" : "rgba(244,240,227,0.9)",
                        color: isInWishlist(producto.id_producto) ? "#306B3F" : "#A8C26B",
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
                      style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1F3A2E" }}
                      onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}
                    >
                      {producto.nombre}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="font-bold text-base"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#306B3F" }}
                      >
                        ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })} MXN
                      </span>
                    </div>
                    <button
                      className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: agregadoId === producto.id_producto ? "#163020" : "#1F3A2E",
                      }}
                      disabled={agregadoId === producto.id_producto}
                      onClick={() => {
                        agregarProducto({
                          id_producto: producto.id_producto,
                          nombre: producto.nombre,
                          precio_base: producto.precio_base == null ? "0" : String(producto.precio_base),
                          imagen_principal_url: producto.imagen_principal_url ?? undefined,
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
  );
}
