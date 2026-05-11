"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { ShoppingCart, Heart, Sparkles, User, Store } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { formatPrice } from "@/lib/format-number";

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
  nombre_tienda?: string | null; // campo plano que manda el backend
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [agregadoId, setAgregadoId] = useState<number | bigint | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
    if (scrollRef.current) {
      const cardWidth = window.innerWidth < 640 ? 280 : 600;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    if (!loading && productos.length > 0 && !isPaused && mounted) {
      goToSlide(activeIndex);
      autoplayRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % productos.length);
      }, 5000);

      return () => {
        if (autoplayRef.current) clearInterval(autoplayRef.current);
      };
    }
  }, [loading, productos.length, isPaused, activeIndex, goToSlide, mounted]);

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

  // Helpers — igual que en el catálogo
  const getNombreProductor = (producto: Producto): string | null => {
    if (producto.nombre_productor) return producto.nombre_productor;
    const u = producto.tiendas?.productores?.usuarios;
    if (u?.nombre) return [u.nombre, u.apellido_paterno].filter(Boolean).join(" ");
    return null;
  };

  const getNombreTienda = (producto: Producto): string | null => {
    return producto.nombre_tienda ?? producto.tiendas?.nombre ?? null;
  };

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-96 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (productos.length === 0) return null;

  return (
    <div
      className="w-full py-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ─── Header ─── */}
      <div className="mb-8 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg blur opacity-30 animate-pulse" />
            <div className="relative bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{
                fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                color: "var(--bio-color-titulo, #5c3d1e)",
              }}
            >
              Destacados
            </h2>
            <p
              className="text-xs opacity-60"
              style={{
                fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                color: "var(--bio-color-titulo, #5c3d1e)",
              }}
            >
              Nuestras mejores selecciones
            </p>
          </div>
        </div>

        {/* Indicadores */}
        <div className="flex gap-2">
          {productos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                goToSlide(idx);
                setActiveIndex(idx);
              }}
              className={`transition-all duration-300 ${idx === activeIndex ? "h-2 w-8 rounded-full" : "h-2 w-2 rounded-full hover:w-4"
                }`}
              style={{
                backgroundColor:
                  idx === activeIndex ? "var(--bio-color-boton, #5c3d1e)" : "rgba(92, 61, 30, 0.2)",
              }}
              aria-label={`Ir a producto ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ─── Carrusel ─── */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-hidden scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {productos.map((producto, index) => {
            const imagenUrl = producto.producto_imagenes?.[0]?.url ?? producto.imagen_principal_url;
            const tipoMezcal = producto.lotes?.datos_api?.tipo_mezcal ?? "";
            const isActive = index === activeIndex;
            const nombreProductor = getNombreProductor(producto);
            const nombreTienda = getNombreTienda(producto);

            return (
              <div
                key={String(producto.id_producto)}
                className={`group relative flex-shrink-0 flex items-center gap-6 transition-all duration-500 ${isActive ? "opacity-100" : "opacity-60"
                  }`}
                style={{ width: "600px", minHeight: "320px" }}
              >
                {/* ─── Imagen ─── */}
                <div
                  className="relative flex-shrink-0 h-80 w-80 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 cursor-pointer"
                  onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}

                >
                  {imagenUrl ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer opacity-0 group-hover:opacity-100" />
                      <Image
                        src={imagenUrl}
                        alt={producto.nombre}
                        fill
                        sizes="320px"
                        className="object-contain p-8 group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300 text-xs">
                      Sin imagen
                    </div>
                  )}

                  {/* Badge tipo mezcal */}
                  {tipoMezcal && (
                    <div className="absolute top-4 left-4 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl blur opacity-30" />
                        <span
                          className="relative px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            color: "var(--bio-color-precio, #8b6914)",
                            border: "1px solid rgba(255, 200, 100, 0.3)",
                          }}
                        >
                          {tipoMezcal}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Wishlist */}
                  <button
                    className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(producto);
                    }}
                  >
                    <Heart
                      className="h-5 w-5 transition-all duration-300"
                      fill={isInWishlist(producto.id_producto) ? "currentColor" : "none"}
                      style={{
                        color: isInWishlist(producto.id_producto)
                          ? "var(--bio-color-precio, #8b6914)"
                          : "#d1d5db",
                      }}
                    />
                  </button>
                </div>

                {/* ─── Info ─── */}
                <div className="flex flex-col gap-3 flex-1">

                  {/* PRODUCTOR Y TIENDA */}
                  {(nombreProductor || nombreTienda) && (
                    <div className="flex flex-col gap-1">
                      {nombreProductor && (
                        <div className="flex items-center gap-1.5">
                          <User
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: "var(--bio-color-precio, #8b6914)", opacity: 0.75 }}
                          />
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: "var(--bio-color-precio, #8b6914)", opacity: 0.9 }}
                          >
                            {nombreProductor}
                          </span>
                        </div>
                      )}
                      {nombreTienda && (
                        <div className="flex items-center gap-1.5">
                          <Store
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: "var(--bio-color-titulo, #5c3d1e)", opacity: 0.55 }}
                          />
                          <span
                            className="text-xs truncate"
                            style={{ color: "var(--bio-color-titulo, #5c3d1e)", opacity: 0.65 }}
                          >
                            {nombreTienda}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nombre */}
                  <h3
                    className="font-bold text-xl line-clamp-3 cursor-pointer transition-colors duration-300 hover:opacity-70"

                    style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)", color: "var(--bio-color-titulo, #5c3d1e)" }}
                    onClick={() => router.push(`/cliente/producto/${producto.id_producto}`)}

                  >
                    {producto.nombre}
                  </h3>

                  {/* Descripción */}
                  {producto.descripcion && (
                    <p
                      className="text-sm opacity-70 line-clamp-2"
                      style={{
                        fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                        color: "var(--bio-color-titulo, #5c3d1e)",
                      }}
                    >
                      {producto.descripcion}
                    </p>
                  )}

                  {/* Precio */}
                  <div className="space-y-0.5">
                    <span
                      className="font-bold text-2xl block transition-all duration-300"
                      style={{
                        fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                        color: "var(--bio-color-precio, #8b6914)",
                      }}
                    >
                      ${formatPrice(Number(producto.precio_base || 0), { showCurrency: false })}
                    </span>
                    <p
                      className="text-xs opacity-50"
                      style={{ fontFamily: "var(--bio-fuente-titulo, Georgia, serif)" }}
                    >
                      MXN
                    </p>
                  </div>

                  {/* Botón */}
                  <button
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-semibold text-white transition-all duration-300 w-fit ${agregadoId === producto.id_producto
                        ? "scale-95 opacity-80"
                        : "hover:scale-105 active:scale-95"
                      }`}
                    style={{
                      fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                      backgroundColor: "var(--bio-color-boton, #5c3d1e)",
                      boxShadow:
                        agregadoId === producto.id_producto
                          ? "0 0 20px rgba(92, 61, 30, 0.4)"
                          : "0 4px 12px rgba(92, 61, 30, 0.2)",
                    }}
                    disabled={agregadoId === producto.id_producto}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgregarAlCarrito(producto);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="transition-all duration-300">
                      {agregadoId === producto.id_producto ? "¡Agregado!" : "Agregar al carrito"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-in { animation: slideInFade 0.6s ease-out forwards; }
        .fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .slide-in-from-top-2 { animation: slideInFromTop 0.6s ease-out forwards; }
        @keyframes slideInFade {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInFromTop {
          from { transform: translateY(-12px); }
          to { transform: translateY(0); }
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
      `}</style>
    </div>
  );
}