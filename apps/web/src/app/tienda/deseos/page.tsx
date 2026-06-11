"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCarrito } from "@/context/CarritoContext";
import { useLocale } from "@/context/LocaleContext";

export default function WishlistPage() {
  const { items, eliminarProducto } = useWishlist();
  const { agregarProducto } = useCarrito();
  const { t, convertPrice } = useLocale();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white" style={{ fontFamily: 'var(--font-family-store)' }}>
          {t("wishlist_title")}
        </h1>
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-dark">
          <Heart className="h-16 w-16 text-gray-300" />
          <p className="text-gray-500">{t("wishlist_empty_state")}</p>
          <Link
            href="/cliente/producto"
            className="mt-4 flex items-center gap-2 rounded-lg bg-[#3D6B3F] px-6 py-2 text-white transition-colors hover:bg-[#1F3A2E]"
          >
            {t("wishlist_view_products")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white" style={{ fontFamily: 'var(--font-family-store)' }}>
        {t("wishlist_title")} ({items.length})
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id_item}
            className="flex flex-col overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-dark"
          >
            {/* ↓ block es el fix clave: sin él, Link es inline y el contenedor colapsa */}
            <Link
              href={`/Cliente/producto/${item.id_producto}`}
              className="relative block aspect-square w-full overflow-hidden bg-gray-100"
            >
              {item.producto.producto_imagenes?.[0]?.url ? (
                <Image
                  src={item.producto.producto_imagenes[0].url}
                  alt={item.producto.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : item.producto.imagen_principal_url ? (
                <Image
                  src={item.producto.imagen_principal_url}
                  alt={item.producto.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  {t("wishlist_no_image")}
                </div>
              )}
            </Link>

            <div className="flex flex-1 flex-col p-4">
              <Link
                href={`/cliente/producto/${item.id_producto}`}
                className="mb-1 block text-base font-semibold leading-snug text-gray-900 hover:text-[#3D6B3F] dark:text-white line-clamp-2"
              >
                {item.producto.nombre}
              </Link>

              <p className="mb-4 mt-auto pt-2 text-xl font-bold text-[#3D6B3F]">
                {convertPrice(Number(item.producto.precio_base))}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    agregarProducto({
                      id_producto: item.id_producto,
                      nombre: item.producto.nombre,
                      precio_base: item.producto.precio_base,
                      imagen_principal_url: item.producto.imagen_principal_url,
                      producto_imagenes: item.producto.producto_imagenes,
                      cantidad: 1,
                    })
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1F3A2E] active:scale-95"
                >
                  <ShoppingBag size={16} />
                  {t("wishlist_add_to_cart")}
                </button>
                <button
                  onClick={() => eliminarProducto(item.id_producto)}
                  className="flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:border-red-300 hover:text-red-500 dark:border-gray-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/cliente/producto"
        className="mt-8 inline-flex items-center gap-2 text-sm text-[#3D6B3F] hover:text-[#1F3A2E]"
      >
        <ArrowRight size={16} className="rotate-180" />
        {t("wishlist_continue_viewing")}
      </Link>
    </main>
  );
}