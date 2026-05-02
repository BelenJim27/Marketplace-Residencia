"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingCart, Package, User, UserPlus, Heart, Store, Home, ShoppingBag } from "lucide-react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/Layouts/LanguageSwitcher";
import { useLocale } from "@/context/LocaleContext";

export function TiendaHeader() {
  const { user, isAuthenticated, isAdmin, isProductor } = useAuth();
  const { cantidadTotal } = useCarrito();
  const { cantidadTotal: wishlistCount } = useWishlist();
  const { t } = useLocale();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleProductsClick = () => {
    router.push("/producto");
  };

  const navBtnClass =
    "flex flex-col items-center gap-1 px-3 py-2 transition-colors text-[var(--tienda-nav-color)] hover:opacity-70";

  const HomeIcon = () => (
    <Link href="/Cliente/inicio" className={navBtnClass}>
      <Home size={24} />
      <span className="hidden sm:inline text-xs">{t("Inicio")}</span>
    </Link>
  );

  return (
    <header
      style={{
        borderColor: "var(--tienda-header-border)",
        backgroundColor: scrolled
          ? "var(--tienda-header-bg-scrolled)"
          : "var(--tienda-header-bg)",
      }}
      className={`sticky top-0 z-30 flex items-center justify-between border-b px-4 md:px-8 transition-all duration-300 ${
        scrolled ? "py-2 shadow-md" : "py-4 shadow-sm"
      }`}
    >
      <Link href="/producto" className="flex items-center gap-3">
        <Image
          src="/images/logo/tierra_agaves.png"
          width={scrolled ? 70 : 100}
          height={scrolled ? 25 : 35}
          alt="Tierra Agaves"
          className="object-contain transition-all duration-300"
        />
      </Link>

      <nav className="flex items-center gap-6">
        {isClient ? (
          <>
            <HomeIcon />

            <button onClick={handleProductsClick} className={navBtnClass}>
              <ShoppingBag size={24} />
              <span className="hidden sm:inline text-xs">Productos</span>
            </button>

            <button onClick={handleMyPurchasesClick} className={navBtnClass}>
              <Package size={24} />
              <span className="hidden sm:inline text-xs">{t("Mis compras")}</span>
            </button>

            <Link href="/tienda/deseos" className={`relative ${navBtnClass}`}>
              <Heart size={24} />
              <span className="hidden sm:inline text-xs">{t("Favoritos")}</span>
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

            <button onClick={handleCartClick} className={`relative ${navBtnClass}`}>
              <ShoppingCart size={24} />
              <span className="hidden sm:inline text-xs">{t("Carrito")}</span>
              {cantidadTotal > 0 && (
                <span className="absolute top-0 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {cantidadTotal > 9 ? "9+" : cantidadTotal}
                </span>
              )}
            </button>

            <button onClick={handleSellClick} className={navBtnClass}>
              <Store size={24} />
              <span className="hidden sm:inline text-xs">{t("Vender")}</span>
            </button>

            <UserInfo />
            <ThemeToggleSwitch />
            <LanguageSwitcher />
          </>
        ) : isAuthenticated ? (
          <>
            <HomeIcon />

            <button onClick={handleProductsClick} className={navBtnClass}>
              <ShoppingBag size={24} />
              <span className="hidden sm:inline text-xs">Productos</span>
            </button>

            <button onClick={handleMyPurchasesClick} className={navBtnClass}>
              <Package size={24} />
              <span className="hidden sm:inline text-xs">{t("Mis compras")}</span>
            </button>

            <button onClick={handleCartClick} className={`relative ${navBtnClass}`}>
              <ShoppingCart size={24} />
              <span className="hidden sm:inline text-xs">{t("Carrito")}</span>
            </button>

            <button onClick={handleSellClick} className={navBtnClass}>
              <Store size={24} />
              <span className="hidden sm:inline text-xs">{t("Vender")}</span>
            </button>

            <UserInfo />
            <ThemeToggleSwitch />
            <LanguageSwitcher />
          </>
        ) : (
          <>
            <HomeIcon />

            <button onClick={handleProductsClick} className={navBtnClass}>
              <ShoppingBag size={24} />
              <span className="hidden sm:inline text-xs">Productos</span>
            </button>

            <button onClick={handleSellClick} className={navBtnClass}>
              <Store size={24} />
              <span className="hidden sm:inline text-xs">{t("Vender")}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={navBtnClass}
              >
                <User size={24} />
                <span className="hidden sm:inline text-xs">{t("Perfil")}</span>
              </button>

              {showProfileMenu && (
                <div
                  style={{
                    backgroundColor: "var(--tienda-dropdown-bg)",
                    borderColor: "var(--tienda-dropdown-border)",
                  }}
                  className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg"
                >
                  <Link
                    href="/auth/sign-in"
                    style={{ color: "var(--tienda-nav-color)" }}
                    className="block px-4 py-2 transition-colors hover:opacity-70 rounded-t-lg"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>{t("Ingresar")}</span>
                    </div>
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    style={{
                      color: "var(--tienda-nav-color)",
                      borderColor: "var(--tienda-dropdown-border)",
                    }}
                    className="block px-4 py-2 transition-colors hover:opacity-70 rounded-b-lg border-t"
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
            <ThemeToggleSwitch />
            <LanguageSwitcher />
          </>
        )}
      </nav>
    </header>
  );
}