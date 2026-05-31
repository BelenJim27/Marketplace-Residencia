"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Heart, Sparkles, User, ChevronLeft, ChevronRight } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useLocale } from "@/context/LocaleContext";

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

export default function ProductCarousel() {
  const router = useRouter();
  const { agregarProducto } = useCarrito();
  const { isInWishlist, agregarProducto: agregarWishlist, eliminarProducto: eliminarWishlist } = useWishlist();
  const { convertPrice, t } = useLocale();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [agregadoId, setAgregadoId] = useState<number | bigint | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const data = await api.productos.getAll({});
        setProductos((data as unknown as Producto[]).slice(0, 6));
      } catch (err) {
        console.error("Error al cargar productos para carrusel:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, []);

  useEffect(() => {
    if (!loading && productos.length > 0 && !isPaused && mounted) {
      autoplayRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % productos.length);
      }, 5000);

      return () => {
        if (autoplayRef.current) clearInterval(autoplayRef.current);
      };
    }
  }, [loading, productos.length, isPaused, mounted]);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index % productos.length);
  }, [productos.length]);

  const nextSlide = useCallback(() => {
    goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(activeIndex - 1 < 0 ? productos.length - 1 : activeIndex - 1);
  }, [activeIndex, goToSlide, productos.length]);

  const toggleWishlist = useCallback(
    (producto: Producto) => {
      if (isInWishlist(producto.id_producto)) {
        eliminarWishlist(producto.id_producto);
      } else {
        agregarWishlist(producto);
      }
    },
    [isInWishlist, agregarWishlist, eliminarWishlist]
  );

  const handleAgregarAlCarrito = useCallback(
    (producto: Producto) => {
      agregarProducto(producto as any);
      setAgregadoId(producto.id_producto);
      setTimeout(() => setAgregadoId(null), 2000);
    },
    [agregarProducto]
  );

  const getNombreProductor = (producto: Producto): string | null => {
    if (producto.nombre_productor) return producto.nombre_productor;
    const u = producto.tiendas?.productores?.usuarios;
    if (u?.nombre) return [u.nombre, u.apellido_paterno].filter(Boolean).join(" ");
    return null;
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-16">
        <div className="h-96 w-96 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-full animate-pulse" />
      </div>
    );
  }

  if (productos.length === 0) return null;

  const prevIndex = activeIndex === 0 ? productos.length - 1 : activeIndex - 1;
  const nextIndex = (activeIndex + 1) % productos.length;

  const productoPrev = productos[prevIndex];
  const productoActual = productos[activeIndex];
  const productoNext = productos[nextIndex];

  return (
    <div
      className="w-full py-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ─── Header ─── */}
      <div className="mb-12 flex items-center justify-center gap-3 px-2">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg blur opacity-30 animate-pulse" />
          <div className="relative bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg p-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h2
            className="text-3xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
              color: "var(--bio-color-titulo, #5c3d1e)",
            }}
          >
            {t("carousel_featured")}
          </h2>
          <p
            className="text-xs opacity-60"
            style={{
              fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
              color: "var(--bio-color-titulo, #5c3d1e)",
            }}
          >
            {t("carousel_featured_subtitle")}
          </p>
        </div>
      </div>

      {/* ─── Carrusel Circular ─── */}
      <div className="relative w-full">
        {/* Fondo decorativo circular */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-b from-slate-50 to-slate-100/50 pointer-events-none blur-2xl opacity-40" />

        <div className="relative flex items-center justify-center gap-4 sm:gap-8 px-4 min-h-[500px]">
          {/* Botella Anterior */}
          <div className="hidden lg:flex flex-col items-center gap-4 opacity-60 transition-all duration-500">
            <div
              className="relative w-48 h-64 flex-shrink-0 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden"
              style={{
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
              }}
            >
              {productoPrev?.producto_imagenes?.[0]?.url || productoPrev?.imagen_principal_url ? (
                <Image
                  src={productoPrev.producto_imagenes?.[0]?.url || productoPrev.imagen_principal_url!}
                  alt={productoPrev.nombre}
                  width={180}
                  height={240}
                  className="object-contain p-6 w-full h-full"
                />
              ) : (
                <div className="text-gray-300 text-xs">{t("catalog_no_image")}</div>
              )}
            </div>
            <p
              className="text-sm font-semibold text-center max-w-xs"
              style={{
                fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                color: "var(--bio-color-titulo, #5c3d1e)",
              }}
            >
              {productoPrev.nombre}
            </p>
          </div>

          {/* Flechas de navegación - Izquierda */}
          <button
            onClick={prevSlide}
            className="absolute left-2 sm:left-6 z-10 p-2 rounded-full transition-all duration-300 hover:bg-white hover:shadow-lg active:scale-95 hidden sm:flex items-center justify-center"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              color: "var(--bio-color-titulo, #5c3d1e)",
            }}
            aria-label="Anterior producto"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Botella Principal (Centro) */}
          <div className="flex flex-col items-center gap-6 z-20">
            {/* Imagen */}
            <div
              className="relative w-80 h-96 flex-shrink-0 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden transform transition-all duration-500"
              style={{
                boxShadow: "0 30px 60px rgba(0, 0, 0, 0.12)",
              }}
            >
              {productoActual?.producto_imagenes?.[0]?.url || productoActual?.imagen_principal_url ? (
                <>
                  <Image
                    src={productoActual.producto_imagenes?.[0]?.url || productoActual.imagen_principal_url!}
                    alt={productoActual.nombre}
                    width={280}
                    height={340}
                    className="object-contain p-8 w-full h-full transform transition-transform duration-700"
                  />
                </>
              ) : (
                <div className="text-gray-300 text-xs">{t("catalog_no_image")}</div>
              )}

              {/* Wishlist Button */}
              <button
                className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(productoActual);
                }}
              >
                <Heart
                  className="h-5 w-5 transition-all duration-300"
                  fill={isInWishlist(productoActual.id_producto) ? "currentColor" : "none"}
                  style={{
                    color: isInWishlist(productoActual.id_producto)
                      ? "var(--bio-color-precio, #8b6914)"
                      : "#d1d5db",
                  }}
                />
              </button>
            </div>

            {/* Información del Producto */}
            <div className="text-center space-y-3 max-w-md">
              {/* Nombre */}
              <h3
                className="text-2xl sm:text-3xl font-bold cursor-pointer transition-colors duration-300 hover:opacity-70"
                style={{
                  fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                  color: "var(--bio-color-titulo, #5c3d1e)",
                }}
                onClick={() => router.push(`/Cliente/producto/${productoActual.id_producto}`)}
              >
                {productoActual.nombre}
              </h3>

              {/* Productor */}
              {getNombreProductor(productoActual) && (
                <div className="flex items-center justify-center gap-1.5">
                  <User
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "var(--bio-color-precio, #8b6914)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                      color: "var(--bio-color-precio, #8b6914)",
                    }}
                  >
                    {t("carousel_producer_label")} {getNombreProductor(productoActual)}
                  </span>
                </div>
              )}

              {/* Precio */}
              <div className="flex items-center justify-center gap-2">
                <span
                  className="text-3xl font-bold"
                  style={{
                    fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                    color: "var(--bio-color-precio, #8b6914)",
                  }}
                >
                  {convertPrice(Number(productoActual.precio_base || 0))}
                </span>
              </div>

              {/* Botón Agregar */}
              <button
                className={`flex items-center justify-center gap-2 rounded-full py-3 px-8 text-sm font-semibold text-white transition-all duration-300 mx-auto ${
                  agregadoId === productoActual.id_producto
                    ? "scale-95 opacity-80"
                    : "hover:scale-105 active:scale-95"
                }`}
                style={{
                  fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                  backgroundColor: "var(--bio-color-boton, #5c3d1e)",
                  boxShadow:
                    agregadoId === productoActual.id_producto
                      ? "0 0 20px rgba(92, 61, 30, 0.4)"
                      : "0 4px 12px rgba(92, 61, 30, 0.2)",
                }}
                disabled={agregadoId === productoActual.id_producto}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAgregarAlCarrito(productoActual);
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="transition-all duration-300">
                  {agregadoId === productoActual.id_producto ? t("carousel_added_success") : t("carousel_add_to_cart")}
                </span>
              </button>
            </div>
          </div>

          {/* Botella Siguiente */}
          <div className="hidden lg:flex flex-col items-center gap-4 opacity-60 transition-all duration-500">
            <div
              className="relative w-48 h-64 flex-shrink-0 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden"
              style={{
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
              }}
            >
              {productoNext?.producto_imagenes?.[0]?.url || productoNext?.imagen_principal_url ? (
                <Image
                  src={productoNext.producto_imagenes?.[0]?.url || productoNext.imagen_principal_url!}
                  alt={productoNext.nombre}
                  width={180}
                  height={240}
                  className="object-contain p-6 w-full h-full"
                />
              ) : (
                <div className="text-gray-300 text-xs">{t("catalog_no_image")}</div>
              )}
            </div>
            <p
              className="text-sm font-semibold text-center max-w-xs"
              style={{
                fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                color: "var(--bio-color-titulo, #5c3d1e)",
              }}
            >
              {productoNext.nombre}
            </p>
          </div>

          {/* Flechas de navegación - Derecha */}
          <button
            onClick={nextSlide}
            className="absolute right-2 sm:right-6 z-10 p-2 rounded-full transition-all duration-300 hover:bg-white hover:shadow-lg active:scale-95 hidden sm:flex items-center justify-center"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              color: "var(--bio-color-titulo, #5c3d1e)",
            }}
            aria-label="Siguiente producto"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ─── Indicadores ─── */}
      <div className="flex gap-2 justify-center mt-12">
        {productos.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === activeIndex ? "h-3 w-8" : "h-3 w-3 hover:w-4"
            }`}
            style={{
              backgroundColor:
                idx === activeIndex ? "var(--bio-color-boton, #5c3d1e)" : "rgba(92, 61, 30, 0.2)",
            }}
            aria-label={`Ir a producto ${idx + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in-scale {
          animation: fadeInScale 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}