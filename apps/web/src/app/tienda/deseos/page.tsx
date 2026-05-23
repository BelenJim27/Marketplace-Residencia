"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCarrito } from "@/context/CarritoContext";
import { formatPrice } from "@/lib/format-number";

export default function WishlistPage() {
  const { items, eliminarProducto } = useWishlist();
  const { agregarProducto } = useCarrito();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
        <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
          Lista de Deseos
        </h1>
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-dark">
          <Heart className="h-16 w-16 text-gray-300" />
          <p className="text-gray-500">Tu lista de deseos está vacía</p>
          <Link
            href="/Cliente/producto"
            className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
          >
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
        Lista de Deseos ({items.length})
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
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : item.producto.imagen_principal_url ? (
                <Image
                  src={item.producto.imagen_principal_url}
                  alt={item.producto.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  Sin imagen
                </div>
              )}
            </Link>

            <div className="flex flex-1 flex-col p-4">
              <Link
                href={`/Cliente/producto/${item.id_producto}`}
                className="mb-1 block text-base font-semibold leading-snug text-gray-900 hover:text-green-600 dark:text-white line-clamp-2"
              >
                {item.producto.nombre}
              </Link>

              <p className="mb-4 mt-auto pt-2 text-xl font-bold text-green-600">
                ${formatPrice(Number(item.producto.precio_base), { showCurrency: false })}
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 active:scale-95"
                >
                  <ShoppingBag size={16} />
                  Agregar al carrito
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
        href="/Cliente/producto"
        className="mt-8 inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
      >
        <ArrowRight size={16} className="rotate-180" />
        Continuar viendo productos
      </Link>
    </main>
  );
}