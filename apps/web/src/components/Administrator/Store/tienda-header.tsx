"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, User, UserPlus, Heart } from "lucide-react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { useAuth } from "@/context/AuthContext";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";

export function TiendaHeader() {
  const { user, isAuthenticated, isAdmin, isProductor } = useAuth();
  const { cantidadTotal } = useCarrito();
  const { cantidadTotal: wishlistCount } = useWishlist();

  const isClient = isAuthenticated && !isAdmin && !isProductor;

  return (
    <header 
    style={{ 
        borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)", 
        backgroundColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.08)" 
      }}
        className="relative top-0 z-30 flex items-center justify-between border-b border-green-200 bg-green-100 px-4 py-4 shadow-sm md:px-8">
      <Link href="/producto" className="flex items-center gap-3">
        <Image
          src="/images/logo/tierra_agaves.png"
          width={100}
          height={35}
          alt="Tierra Agaves"
          className="object-contain"
        />
      </Link>

      <nav className="flex items-center gap-4">
        {isClient ? (
          <>
            <Link
              href="/tienda/compras"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <Package size={18} />
              <span className="hidden sm:inline">Mis compras</span>
            </Link>

            <Link
              href="/tienda/deseos"
              className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <Heart size={18} />
              <span className="hidden sm:inline">Favoritos</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/tienda/carrito"
              className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Carrito</span>
              {cantidadTotal > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {cantidadTotal > 9 ? "9+" : cantidadTotal}
                </span>
              )}
            </Link>

            <UserInfo />
          </>
        ) : (
          <>
            <Link
              href="/auth/sign-up"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Crear cuenta</span>
            </Link>

            <Link
              href="/auth/sign-in"
              className="flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <User size={18} />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>

            <Link
              href="/tienda/compras"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <Package size={18} />
              <span className="hidden sm:inline">Mis compras</span>
            </Link>

            <Link
              href="/tienda/carrito"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Carrito</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
