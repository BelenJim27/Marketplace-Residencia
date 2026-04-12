"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { useAuth } from "@/context/AuthContext";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const { isAdmin, isProductor, isAuthenticated } = useAuth();

  const isClient = isAuthenticated && !isAdmin && !isProductor;

  const showLogo = isClient;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-green-200 bg-green-100 px-4 py-5 shadow-1 dark:border-gray-700 dark:bg-gray-900 md:px-5 2xl:px-10">
      
      {/* BOTÓN MENU */}
      <button
        onClick={toggleSidebar}
        className="rounded-lg border border-green-200 px-1.5 py-1 hover:bg-green-200 dark:border-gray-700 dark:hover:bg-gray-800 lg:hidden"
      >
        <MenuIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </button>

      {/* LOGO MOBILE - SÓLO CLIENTE */}
      {isMobile && showLogo && (
        <Link href={"/producto"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/tierra_agaves.png"}
            width={32}
            height={32}
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
      <div className="flex flex-1 items-center justify-end gap-2 min-[375px]:gap-4">
        
        {/* BUSCADOR */}
        <div className="relative w-full max-w-[300px]">
          <input
            type="search"
            placeholder="Search"
            className="flex w-full items-center gap-3.5 rounded-full border border-green-200 bg-white py-3 pl-[53px] pr-5 outline-none focus:border-green-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />

          <SearchIcon className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2" />
        </div>

        <ThemeToggleSwitch />
        <Notification />

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
