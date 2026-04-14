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

export function Header() {
  const { toggleSidebar, isOpen, isMobile } = useSidebarContext();
  const { isAdmin, isProductor, isAuthenticated } = useAuth();

  const isClient = isAuthenticated && !isAdmin && !isProductor;

  const showLogo = isClient;

return (
    <header 
      style={{ 
        borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)", 
        backgroundColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.08)" 
      }} 
      className="sticky top-0 z-30 flex items-center justify-between border-b border-green-200 bg-green-100 px-4 py-4 shadow-sm md:px-8">
      
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
      
  

      {/* DERECHA */}
      <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2 md:gap-4">
        
        {/* BUSCADOR - ocultar en mobile pequeño 
        <div className="hidden sm:hidden md:block relative w-full max-w-[200px] lg:max-w-[300px]">
          <input
            type="search"
            placeholder="Buscar productos..."
            style={{ borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)" }}
            className="flex w-full items-center gap-3.5 rounded-full border bg-white py-2 md:py-3 pl-[40px] md:pl-[53px] pr-3 md:pr-5 text-sm md:text-base outline-none focus:border-[var(--color-primary)] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />

          <SearchIcon className="pointer-events-none absolute left-3 md:left-5 top-1/2 -translate-y-1/2" />
        </div>*/}

        {/* Icono buscar visible solo en tablet/md */}
        <button style={{ borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)" }} className="md:hidden p-2 rounded-lg border hover:opacity-80 dark:border-gray-700 dark:hover:bg-gray-800">
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
