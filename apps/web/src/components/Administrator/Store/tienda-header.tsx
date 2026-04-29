"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Package, User, UserPlus, Heart, Store, Home } from "lucide-react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/Layouts/LanguageSwitcher";
import { useLocale } from "@/context/LocaleContext"; // Importamos el hook

export function TiendaHeader() {
  const { user, isAuthenticated, isAdmin, isProductor } = useAuth();
  const { cantidadTotal } = useCarrito();
  const { cantidadTotal: wishlistCount } = useWishlist();
  const { t } = useLocale(); // Extraemos la función de traducción 't'
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

  const isClient = isAuthenticated && !isAdmin && !isProductor;

  const handleCartClick = () => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
    } else {
      router.push("/tienda/carrito");
    }
  };

  const handleMyPurchasesClick = () => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
    } else {
      router.push("/tienda/compras");
    }
  };

  const handleSellClick = () => {
    if (!isAuthenticated) {
      router.push("/Productor?vender=true");
    } else if (user?.roles?.some((r) => ["PRODUCTOR", "productor"].includes(r))) {
      router.push("/Productor/productor");
    } else {
      router.push("/Productor/solicitar");
    }
  };

  const HomeIcon = () => (
    <Link
      href="/Cliente/inicio"
      className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
    >
      <Home size={24} />
      <span className="hidden sm:inline text-xs">{t("Inicio")}</span>
    </Link>
  );

  return (
    <header
      style={{
        borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)",
        backgroundColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.08)",
      }}
      className="relative top-0 z-30 flex items-center justify-between border-b border-green-200 bg-green-100 px-4 py-4 shadow-sm md:px-8"
    >
      <Link href="/producto" className="flex items-center gap-3">
        <Image
          src="/images/logo/tierra_agaves.png"
          width={100}
          height={35}
          alt="Tierra Agaves"
          className="object-contain"
        />
      </Link>

      <nav className="flex items-center gap-6">
        {isClient ? (
          <>
            <HomeIcon />

            <button
              onClick={handleMyPurchasesClick}
              className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <Package size={24} />
              <span className="hidden sm:inline text-xs">{t("Mis compras")}</span>
            </button>

            <Link
              href="/tienda/deseos"
              className="relative flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <Heart size={24} />
              <span className="hidden sm:inline text-xs">{t("Favoritos")}</span>
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={handleCartClick}
              className="relative flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <ShoppingCart size={24} />
              <span className="hidden sm:inline text-xs">{t("Carrito")}</span>
              {cantidadTotal > 0 && (
                <span className="absolute top-0 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {cantidadTotal > 9 ? "9+" : cantidadTotal}
                </span>
              )}
            </button>

            <button
              onClick={handleSellClick}
              className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <Store size={24} />
              <span className="hidden sm:inline text-xs">{t("Vender")}</span>
            </button>

            <ThemeToggleSwitch />
            <LanguageSwitcher />
            <UserInfo />
          </>
        ) : isAuthenticated ? (
          <>
            <HomeIcon />

            <button
              onClick={handleMyPurchasesClick}
              className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <Package size={24} />
              <span className="hidden sm:inline text-xs">{t("Mis compras")}</span>
            </button>

            <button
              onClick={handleCartClick}
              className="relative flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <ShoppingCart size={24} />
              <span className="hidden sm:inline text-xs">{t("Carrito")}</span>
            </button>

            <button
              onClick={handleSellClick}
              className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <Store size={24} />
              <span className="hidden sm:inline text-xs">{t("Vender")}</span>
            </button>

            <ThemeToggleSwitch />
            <LanguageSwitcher />
            <UserInfo />
          </>
        ) : (
          <>
            <HomeIcon />

            <button
              onClick={handleSellClick}
              className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
            >
              <Store size={24} />
              <span className="hidden sm:inline text-xs">{t("Vender")}</span>
            </button>

            <ThemeToggleSwitch />
            <LanguageSwitcher />
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex flex-col items-center gap-1 px-3 py-2 text-green-700 transition-colors hover:text-green-600"
              >
                <User size={24} />
                <span className="hidden sm:inline text-xs">{t("Perfil")}</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-green-200 bg-white shadow-lg">
                  <Link
                    href="/auth/sign-in"
                    className="block px-4 py-2 text-green-700 transition-colors hover:bg-green-50 rounded-t-lg"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>{t("Ingresar")}</span>
                    </div>
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="block px-4 py-2 text-green-700 transition-colors hover:bg-green-50 rounded-b-lg border-t border-green-200"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus size={16} />
                      <span>{t("Crear cuenta")}</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
    </header>
  );
}