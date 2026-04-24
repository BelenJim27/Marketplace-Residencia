"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { useAuth } from "@/context/AuthContext";
import { MenuIcon, CloseIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { Home } from "lucide-react";

export function Header() {
  const { toggleSidebar, isOpen, isMobile } = useSidebarContext();
  const { isAdmin, isProductor, isAuthenticated } = useAuth();

  const isClient = isAuthenticated && !isAdmin && !isProductor;
  const showLogo = isClient;

  return (
    <header
      style={{
        borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)",
        backgroundColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.08)",
      }}
      className="sticky top-0 z-30 flex items-center justify-between border-b border-green-200 bg-green-100 px-4 py-4 shadow-sm md:px-8"
    >
      {/* BOTÓN MENU HAMBURGUESA */}
      <button
        onClick={toggleSidebar}
        style={{ borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)" }}
        className="rounded-lg border p-1.5 hover:opacity-80 dark:border-gray-700 dark:hover:bg-gray-800 lg:hidden"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* LOGO MOBILE - SÓLO CLIENTE */}
      {isMobile && showLogo && (
        <Link href={"/producto"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/tierra_agaves.png"}
            width={28}
            height={28}
            alt="Tierra Agaves"
            role="presentation"
            className="object-contain"
          />
        </Link>
      )}

      {/* LOGO DESKTOP - SÓLO CLIENTE */}
      {!isMobile && showLogo && (
        <Link href={"/producto"} className="hidden lg:flex items-center">
          <Image
            src={"/images/logo/tierra_agaves.png"}
            width={80}
            height={40}
            alt="Tierra Agaves"
            role="presentation"
            className="object-contain"
          />
        </Link>
      )}

      // DERECHA
      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2 md:gap-4">

        {/* ✅ ÍCONO INICIO - siempre visible */}
        <Link
          href="/Cliente/inicio"
          className="flex flex-col items-center gap-0.5 text-[#2d7a3e] hover:opacity-80 transition-opacity"
          title="Ir al inicio"
        >
          <Home className="size-6" />
          <span className="text-[10px] font-semibold hidden sm:block">Inicio</span>
        </Link>

        {/* Icono buscar visible solo en tablet/md */}
        <button
          style={{ borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)" }}
          className="md:hidden p-2 rounded-lg border hover:opacity-80 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <SearchIcon className="size-5" />
        </button>

        <ThemeToggleSwitch />
        <Notification />

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}