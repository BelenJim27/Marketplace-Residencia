"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();

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

      {/* LOGO MOBILE */}
      {isMobile && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt=""
            role="presentation"
          />
        </Link>
      )}

      {/* TÍTULO */}
      <div className="max-xl:hidden">
        <h1 className="mb-0.5 text-heading-5 font-bold text-green-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="font-medium text-green-800 dark:text-gray-300">
          Administrador
        </p>
      </div>

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
