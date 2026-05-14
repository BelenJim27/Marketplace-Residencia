"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ShoppingCart, Package, User, UserPlus, Heart,
  Store, Home, ShoppingBag, Menu, X,
} from "lucide-react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter, usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/Layouts/LanguageSwitcher";
import CurrencySwitcher from "@/components/Layouts/CurrencySwitcher";
import { useLocale } from "@/context/LocaleContext";

interface NavItem {
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  href?: string;
  badge?: number;
}

export function TiendaHeader() {
  const { user, isAuthenticated, isAdmin, isProductor } = useAuth();
  const { cantidadTotal } = useCarrito();
  const { cantidadTotal: wishlistCount } = useWishlist();
  const { t } = useLocale();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setShowProfileMenu(false);
    setShowMobileMenu(false);
  }, [pathname]);

  const isClient = isAuthenticated && !isAdmin && !isProductor;

  const handleCartClick = () => router.push(isAuthenticated ? "/tienda/carrito" : "/auth/sign-in");
  const handleMyPurchasesClick = () => router.push(isAuthenticated ? "/tienda/compras" : "/auth/sign-in");
  const handleSellClick = () => {
    if (!isAuthenticated) router.push("/dashboard/productor/unirse?vender=true");
    else if (user?.roles?.some((r) => ["PRODUCTOR", "productor"].includes(r))) router.push("/dashboard/productor");
    else router.push("/dashboard/productor/solicitar");
  };

  // ─── Clases base ────────────────────────────────────────────
  const navBtnClass =
    "flex flex-col items-center gap-1 px-3 py-2 transition-colors text-[var(--tienda-nav-color)] hover:opacity-70";

  // ─── Nav items por estado de autenticación ───────────────────
  const clientNavItems: NavItem[] = [
    { label: t("Inicio"),      icon: <Home size={22} />,         onClick: () => router.push("/Cliente/inicio"),  href: "/Cliente/inicio" },
    { label: "Productos",      icon: <ShoppingBag size={22} />,  onClick: () => router.push("/producto"),        href: "/producto" },
    { label: t("Mis compras"), icon: <Package size={22} />,      onClick: handleMyPurchasesClick,                href: "/tienda/compras" },
    {
      label: t("Favoritos"),
      icon: <Heart size={22} />,
      onClick: () => router.push("/tienda/deseos"),
      href: "/tienda/deseos",
      badge: wishlistCount > 0 ? wishlistCount : undefined,
    },
    {
      label: t("Carrito"),
      icon: <ShoppingCart size={22} />,
      onClick: handleCartClick,
      href: "/tienda/carrito",
      badge: cantidadTotal > 0 ? cantidadTotal : undefined,
    },
    { label: t("Vender"),      icon: <Store size={22} />,        onClick: handleSellClick },
  ];

  const authNavItems: NavItem[] = [
    { label: t("Inicio"),      icon: <Home size={22} />,         onClick: () => router.push("/Cliente/inicio"),  href: "/Cliente/inicio" },
    { label: "Productos",      icon: <ShoppingBag size={22} />,  onClick: () => router.push("/producto"),        href: "/producto" },
    { label: t("Mis compras"), icon: <Package size={22} />,      onClick: handleMyPurchasesClick,                href: "/tienda/compras" },
    {
      label: t("Carrito"),
      icon: <ShoppingCart size={22} />,
      onClick: handleCartClick,
      href: "/tienda/carrito",
      badge: cantidadTotal > 0 ? cantidadTotal : undefined,
    },
    { label: t("Vender"),      icon: <Store size={22} />,        onClick: handleSellClick },
  ];

  // Nav items desktop para guest — SIN "Ingresar" (va en dropdown Perfil)
  const guestNavItemsDesktop: NavItem[] = [
    { label: t("Inicio"),   icon: <Home size={22} />,        onClick: () => router.push("/Cliente/inicio"), href: "/Cliente/inicio" },
    { label: "Productos",   icon: <ShoppingBag size={22} />, onClick: () => router.push("/producto"),       href: "/producto" },
    { label: t("Vender"),   icon: <Store size={22} />,       onClick: handleSellClick },
  ];

  // Nav items móvil (bottom nav) para guest — CON "Ingresar"
  const guestNavItems: NavItem[] = [
    { label: t("Inicio"),   icon: <Home size={22} />,        onClick: () => router.push("/Cliente/inicio"), href: "/Cliente/inicio" },
    { label: "Productos",   icon: <ShoppingBag size={22} />, onClick: () => router.push("/producto"),       href: "/producto" },
    { label: t("Vender"),   icon: <Store size={22} />,       onClick: handleSellClick },
    { label: t("Ingresar"), icon: <User size={22} />,        onClick: () => router.push("/auth/sign-in"),  href: "/auth/sign-in" },
  ];

  // Desktop usa guestNavItemsDesktop (sin Ingresar, va en dropdown Perfil)
  const desktopNavItems = isClient ? clientNavItems : isAuthenticated ? authNavItems : guestNavItemsDesktop;
  // Móvil bottom nav usa lista completa (con Ingresar para guest)
  const navItems = isClient ? clientNavItems : isAuthenticated ? authNavItems : guestNavItems;
  const bottomItems = navItems.slice(0, 5);

  return (
    <>
      {/* ══════════════════════════════════════════════════
          HEADER PRINCIPAL
      ══════════════════════════════════════════════════ */}
      <header
        style={{
          borderColor: "var(--tienda-header-border)",
          backgroundColor: scrolled
            ? "var(--tienda-header-bg-scrolled)"
            : "var(--tienda-header-bg)",
        }}
        className={`sticky top-0 z-30 flex items-center justify-between border-b px-4 md:px-8 transition-all duration-300 ${
          scrolled ? "py-2 shadow-md" : "py-3 shadow-sm"
        }`}
      >
        {/* Logo */}
        <Link href="/producto" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/logo/tierra_agaves.png"
            width={scrolled ? 70 : 90}
            height={scrolled ? 25 : 32}
            alt="Tierra Agaves"
            className="object-contain transition-all duration-300"
          />
        </Link>

        {/* ── NAV DESKTOP (≥ md) ── */}
        <nav className="hidden md:flex items-center gap-1">
          {desktopNavItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`relative ${navBtnClass}`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
              {item.badge != null && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Perfil dropdown (solo guest) */}
          {!isAuthenticated && (
            <div className="relative ml-1">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={navBtnClass}
              >
                <User size={22} />
                <span className="text-xs">{t("Perfil")}</span>
              </button>
              {showProfileMenu && (
                <div
                  style={{
                    backgroundColor: "var(--tienda-dropdown-bg)",
                    borderColor: "var(--tienda-dropdown-border)",
                  }}
                  className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg z-50"
                >
                  <Link
                    href="/auth/sign-in"
                    style={{ color: "var(--tienda-nav-color)" }}
                    className="flex items-center gap-2 px-4 py-2.5 hover:opacity-70 rounded-t-lg text-sm"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User size={15} />{t("Ingresar")}
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    style={{ color: "var(--tienda-nav-color)", borderColor: "var(--tienda-dropdown-border)" }}
                    className="flex items-center gap-2 px-4 py-2.5 hover:opacity-70 rounded-b-lg border-t text-sm"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <UserPlus size={15} />{t("Crear cuenta")}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Controles */}
          {isAuthenticated && (
            <div className="ml-1 shrink-0">
              <UserInfo />
            </div>
          )}
          <ThemeToggleSwitch />
          <CurrencySwitcher />
          <LanguageSwitcher />
        </nav>

        {/* ── CONTROLES MÓVIL (< md) ── */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggleSwitch />
          <CurrencySwitcher />
          <LanguageSwitcher />

          {/* Botón hamburguesa — abre drawer con opciones extra */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{ borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.3)" }}
            className="p-1.5 rounded-lg border hover:opacity-70"
            aria-label="Menú"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          DRAWER MÓVIL (extras: UserInfo + opciones de cuenta)
      ══════════════════════════════════════════════════ */}
      {showMobileMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div
            style={{
              backgroundColor: "var(--tienda-header-bg-scrolled, #fff)",
              borderColor: "var(--tienda-header-border)",
            }}
            className="fixed top-[57px] right-0 z-50 w-64 border-l border-b rounded-bl-2xl shadow-xl md:hidden"
          >
            <div className="flex flex-col p-4 gap-3">
              {isAuthenticated ? (
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <UserInfo />
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <Link
                    href="/auth/sign-in"
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium bg-green-700 text-white hover:bg-green-800 transition"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <User size={16} /> {t("Ingresar")}
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    style={{ borderColor: "rgba(var(--color-primary-rgb,45,122,62),0.4)", color: "var(--tienda-nav-color)" }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border hover:opacity-70 transition"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <UserPlus size={16} /> {t("Crear cuenta")}
                  </Link>
                </div>
              )}

              {/* Items extra que no caben en el bottom nav (solo cliente con 6+ items) */}
              {navItems.slice(5).map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.onClick(); setShowMobileMenu(false); }}
                  style={{ color: "var(--tienda-nav-color)" }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:opacity-70 transition text-left"
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge != null && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          BOTTOM NAV (móvil, ≤ md)
      ══════════════════════════════════════════════════ */}
      <nav
        style={{
          backgroundColor: "var(--tienda-header-bg-scrolled, #fff)",
          borderColor: "var(--tienda-header-border)",
        }}
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t px-2 py-1 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      >
        {bottomItems.map((item) => {
          const isActive = item.href && pathname.startsWith(item.href);
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{ color: isActive ? "var(--color-primary, #1A5D3B)" : "var(--tienda-nav-color)" }}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 transition-all"
            >
              <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
              {item.badge != null && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
              {isActive && (
                <span
                  style={{ backgroundColor: "var(--color-primary, #1A5D3B)" }}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Espaciado para que el contenido no quede tapado por el bottom nav */}
      <div className="h-14 md:hidden" aria-hidden="true" />
    </>
  );
}