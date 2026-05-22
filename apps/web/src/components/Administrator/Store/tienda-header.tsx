"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart, Package, User, UserPlus, Heart,
  Store, Home, ShoppingBag, Menu, X,
} from "lucide-react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { useAuth } from "@/context/AuthContext";
import { useCarrito } from "@/context/CarritoContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLocale } from "@/context/LocaleContext";
import { useNotificationPoller } from "@/hooks/useNotificationPoller";

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
  useNotificationPoller();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setHeaderVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        setHeaderVisible(false);
        setShowMobileMenu(false);
      } else if (currentY < lastScrollY.current - 5) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentY;
      setScrolled(currentY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
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
      {/* Spacer que ocupa el lugar del header fijo */}
      <div className="h-[57px]" aria-hidden="true" />

      {/* ══════════════════════════════════════════════════
          HEADER PRINCIPAL
      ══════════════════════════════════════════════════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          backgroundColor: isDark ? "#0D1A10" : "#2E4A33",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: scrolled ? "1px solid rgba(244,240,227,0.15)" : "1px solid rgba(244,240,227,0.08)",
          boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.2)" : "none",
          transition: "transform 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease",
        }}
        className={`z-30 flex items-center justify-between px-4 md:px-8 ${
          scrolled ? "py-2" : "py-3"
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
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </Link>

        {/* ── NAV DESKTOP (≥ md) ── */}
        <nav className="hidden md:flex items-center gap-0.5">
          {desktopNavItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{ color: "#F4F0E3" }}
              className="relative group flex flex-col items-center gap-1 px-3 py-2 transition-colors"
            >
              <span className="transition-transform group-hover:scale-110">{item.icon}</span>
              <span className="text-[11px] font-medium tracking-wide">{item.label}</span>
              {/* Subrayado dorado al hover */}
              <span
                style={{ backgroundColor: "#C97A3E" }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 rounded-full transition-all duration-200 group-hover:w-5"
              />
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
                style={{ color: "#F4F0E3" }}
                className="group relative flex flex-col items-center gap-1 px-3 py-2 transition-colors"
              >
                <User size={22} />
                <span className="text-[11px] font-medium tracking-wide">{t("Perfil")}</span>
                <span
                  style={{ backgroundColor: "#b88a4a" }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 rounded-full transition-all duration-200 group-hover:w-5"
                />
              </button>
              {showProfileMenu && (
                <div
                  style={{
                    backgroundColor: "#3A5C40",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    border: "1px solid rgba(244,240,227,0.15)",
                  }}
                  className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <Link
                    href="/auth/sign-in"
                    style={{ color: "#F4F0E3" }}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-[rgba(244,240,227,0.1)] text-sm font-medium transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User size={15} />{t("Ingresar")}
                  </Link>
                  <div style={{ height: "1px", background: "rgba(244,240,227,0.12)" }} />
                  <Link
                    href="/auth/sign-up"
                    style={{ color: "#F4F0E3" }}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-[rgba(244,240,227,0.1)] text-sm font-medium transition-colors"
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
              <UserInfo whiteText />
            </div>
          )}
        </nav>

        {/* ── CONTROLES MÓVIL (< md) ── */}
        <div className="flex md:hidden items-center gap-2">

          {/* Botón hamburguesa */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{ borderColor: "rgba(244,240,227,0.3)", color: "#F4F0E3" }}
            className="p-1.5 rounded-lg border hover:bg-[rgba(244,240,227,0.1)] transition-colors"
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
              backgroundColor: isDark ? "#0D1A10" : "#2E4A33",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(244,240,227,0.15)",
              borderBottom: "1px solid rgba(244,240,227,0.15)",
            }}
            className="fixed top-[57px] right-0 z-50 w-64 rounded-bl-2xl shadow-xl md:hidden"
          >
            <div className="flex flex-col p-4 gap-3">
              {isAuthenticated ? (
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <UserInfo whiteText />
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
                  style={{ color: "#F4F0E3" }}
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
          backgroundColor: isDark ? "#0D1A10" : "#2E4A33",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(244,240,227,0.15)",
          boxShadow: "0 -2px 16px rgba(0,0,0,0.2)",
        }}
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-1 md:hidden"
      >
        {bottomItems.map((item) => {
          const isActive = item.href && pathname.startsWith(item.href);
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{ color: isActive ? "#F4F0E3" : "rgba(244,240,227,0.55)" }}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 transition-all"
            >
              <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {item.badge != null && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
              {isActive && (
                <span
                  style={{ backgroundColor: "#b88a4a" }}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full"
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