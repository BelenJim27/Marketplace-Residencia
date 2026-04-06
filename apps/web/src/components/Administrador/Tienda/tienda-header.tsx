"use client";

import Link from "next/link";
import { ShoppingCart, Package, User, UserPlus } from "lucide-react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { useAuth } from "@/context/AuthContext";

export function TiendaHeader() {
  const { user, isAuthenticated, isAdmin, isProductor } = useAuth();

  const isClient = isAuthenticated && !isAdmin && !isProductor;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-green-200 bg-green-100 px-4 py-4 shadow-sm md:px-8">
      <Link href="/producto" className="flex items-center gap-2">
        <span className="text-2xl font-bold text-green-800">Tienda</span>
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
              href="/tienda/carrito"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-green-700 transition-colors hover:bg-green-50"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Carrito</span>
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
