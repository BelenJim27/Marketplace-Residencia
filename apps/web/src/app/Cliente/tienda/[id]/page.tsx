"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Heart, MapPin, Phone, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";

interface Producto {
  id_producto: bigint;
  id_tienda?: number;
  nombre: string;
  descripcion: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  categorias?: string[];
  nombre_productor?: string;
  lotes?: { datos_api?: Record<string, string> };
}

interface Tienda {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  descripcion?: string;
  ciudad_origen?: string;
  estado_origen?: string;
  pais_operacion?: string;
  nombre_contacto?: string;
  telefono_contacto?: string;
}

interface Productor {
  id_productor: number;
  usuarios?: { nombre: string; apellido_paterno?: string; apellido_materno?: string };
  biografia?: string;
}

export default function TiendaPage() {
  const params = useParams();
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productor, setProductor] = useState<Productor | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregadoId, setAgregadoId] = useState<bigint | null>(null);

  const fetchData = useCallback(async () => {
    const id = params.id;
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const tiendaData = await api.tiendas.getOne(Number(id));
      if (!tiendaData) {
        setError("Tienda no encontrada");
        return;
      }
      setTienda(tiendaData);

      const productorData = await api.productores.getAll().then(
        (all: any[]) => all.find((p) => p.id_productor === tiendaData.id_productor)
      );
      setProductor(productorData || null);

      const productosData = await api.productos.getByProductor(tiendaData.id_productor);
      const filtrados = (productosData as Producto[]).filter(
        (p) => p.id_tienda === Number(id) && p.categorias && p.categorias.length > 0
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
        precio_base: producto.precio_base,
        imagen_principal_url: producto.imagen_principal_url,
        producto_imagenes: producto.producto_imagenes,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-green-600">Cargando tienda...</div>
      </div>
    );
  }

  if (error || !tienda) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-red-500">Error: {error || "Tienda no encontrada"}</div>
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

  const nombreProductor = productor
    ? [productor.usuarios?.nombre, productor.usuarios?.apellido_paterno, productor.usuarios?.apellido_materno]
        .filter(Boolean)
        .join(" ")
    : "";

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

      {/* Header Tienda */}
      <div className="mb-12 rounded-lg p-8" style={{ backgroundColor: "white", border: "1px solid #e8dcc8" }}>
        <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}>
          {tienda.nombre}
        </h1>

        {tienda.descripcion && <p className="text-gray-700 mb-4 leading-relaxed">{tienda.descripcion}</p>}

        <div className="space-y-2">
          {(tienda.ciudad_origen || tienda.estado_origen) && (
            <p className="flex items-center gap-2 text-gray-600">
              <MapPin size={18} style={{ color: "var(--bio-color-precio, #8b6914)" }} />
              <span>{[tienda.ciudad_origen, tienda.estado_origen].filter(Boolean).join(", ")}</span>
            </p>
          )}

          {tienda.pais_operacion && (
            <p className="text-sm text-gray-500">Operando en: <strong>{tienda.pais_operacion}</strong></p>
          )}

          {tienda.nombre_contacto && <p className="text-gray-600">Contacto: <strong>{tienda.nombre_contacto}</strong></p>}

          {tienda.telefono_contacto && (
            <p className="flex items-center gap-2 text-gray-600">
              <Phone size={16} />
              {tienda.telefono_contacto}
            </p>
          )}
        </div>
      </div>

      {/* Card Productor */}
      {productor && (
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold" style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}>
            Productor
          </h2>
          <div
            className="rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
            style={{ backgroundColor: "white", border: "1px solid #e8dcc8" }}
            onClick={() => router.push(`/cliente/productor/${productor.id_productor}`)}
          >
            <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--bio-color-titulo, #5c3d1e)" }}>
              {nombreProductor}
            </h3>
            {productor.biografia && <p className="text-gray-600">{productor.biografia}</p>}
          </div>
        </div>
      )}

      {/* Productos */}
      <div>
        <h2 className="mb-6 text-2xl font-bold" style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}>
          Productos de esta tienda
        </h2>

        {productos.length === 0 ? (
          <p className="text-gray-500">No hay productos disponibles en esta tienda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {productos.map((producto) => {
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
  );
}
