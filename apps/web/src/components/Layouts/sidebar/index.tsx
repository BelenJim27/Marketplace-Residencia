"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getNavData } from "./data";
import { ArrowLeftIcon, ChevronLeft } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, LogOut } from "lucide-react";
import { useProductorCategorias } from "../../../hooks/useProductorCategorias";
import { getCookie } from "@/lib/cookies";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";


export function Sidebar() {
  const pathname = usePathname();
  const { isProductor, isAdmin, logout } = useAuth();
  const { data: session } = useSession();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed, toggleCollapse } =
    useSidebarContext();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const menus: string[] = [];
    if (pathname.startsWith("/dashboard/productor/archivos")) menus.push("Archivos");
    if (pathname.includes("/categorias") || pathname.includes("/productos")) menus.push("Inventario");
    return menus;
  });

  const token = getCookie("token") ?? "";
  const { tieneLotes } = useProductorCategorias(token, isAdmin);
  const navData = getNavData(isProductor, isAdmin, tieneLotes);

  const isFilesRoute = pathname.startsWith("/dashboard/productor/archivos");

  const isItemActive = (item: { url?: string; children?: Array<{ url: string }> }) => {
    if (item.children?.length) {
      return item.children.some((child) => pathname === child.url) || (item.url ? pathname === item.url : false);
    }
    return item.url ? pathname === item.url : false;
  };

  const isMenuOpen = (title: string) => openMenus.includes(title) || (title === "Archivos" && isFilesRoute);

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col h-screen sticky top-0 transition-all duration-300 ease-linear overflow-hidden",
          "bg-[#1F3A2E]",
          isMobile
            ? isOpen
              ? "translate-x-0 fixed bottom-0 top-0 left-0 z-50 w-[250px] max-w-[85vw]"
              : "-translate-x-full fixed bottom-0 top-0 left-0 z-50 w-[250px] max-w-[85vw]"
            : isCollapsed
              ? "w-[68px]"
              : "w-[245px]",
          !isOpen && !isMobile && "w-0",
        )}
      >
        <div className="flex h-full flex-col">

          {/* Logo + collapse button */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            {!isCollapsed && (
              <Link href="/" onClick={() => isMobile && toggleSidebar()}>
                <Image
                  src="/fotos/mezcanea.png"
                  width={150}
                  height={60}
                  alt="Mezcanea"
                  className="object-contain brightness-0 invert"
                  priority
                />
              </Link>
            )}

            {isCollapsed && (
              <Link href="/" className="mx-auto">
                <Image
                  src="/fotos/mezcanea.png"
                  width={42}
                  height={42}
                  alt="Mezcanea"
                  className="object-contain brightness-0 invert"
                  priority
                />
              </Link>
            )}

            {!isMobile && !isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="ml-2 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white/80 transition-all duration-200"
                title="Colapsar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {!isMobile && isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="absolute right-1 top-5 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white/80 transition-all duration-200"
                title="Expandir"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            )}

            {isMobile && isOpen && (
              <button onClick={toggleSidebar} className="ml-auto p-1.5 text-white/50 hover:text-white">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
          >
            {navData.map((section) => (
              <div key={section.label} className="mb-2">
                {!isCollapsed && (
                  <p className="mb-1 px-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">
                    {section.label}
                  </p>
                )}

                <ul className="space-y-[2px]">
                  {section.items.map((item) => {
                    const active = isItemActive(item);
                    const isDirectLink = !item.children?.length && !!item.url;
                    const showTab = active && isDirectLink && !isCollapsed;

                    return (
                      <li
                        key={item.title}
                        className={cn(
                          "relative",
                          showTab && "-mr-px z-10 sidebar-tab-active",
                        )}
                        onMouseEnter={() => isCollapsed && setHoveredItem(item.title)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        {item.children?.length ? (
                          <>
                            <MenuItem
                              as="button"
                              onClick={() =>
                                setOpenMenus((cur) =>
                                  cur.includes(item.title)
                                    ? cur.filter((m) => m !== item.title)
                                    : [...cur, item.title],
                                )
                              }
                              isActive={active}
                              title={item.title}
                              className={cn(
                                "flex w-full items-center gap-3 px-4 py-2.5 transition-all duration-200",
                                active
                                  ? "rounded-[20px] bg-white/[0.15] text-white"
                                  : "rounded-xl text-white/70 hover:bg-white/[0.07] hover:text-white/90",
                                isCollapsed && "justify-center px-2",
                              )}
                            >
                              <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-white/50")} />
                              {!isCollapsed && (
                                <span className="flex min-w-0 flex-1 items-center justify-between text-[14.5px] font-medium">
                                  <span className="truncate">{item.title}</span>
                                  <ChevronDown className={cn("h-3.5 w-3.5 text-white/30 transition-transform", isMenuOpen(item.title) && "rotate-180")} />
                                </span>
                              )}
                            </MenuItem>

                            {!isCollapsed && isMenuOpen(item.title) && (
                              <ul className="mt-0.5 space-y-[2px] pl-3">
                                {item.children.map((child) => {
                                  const childActive = pathname === child.url;
                                  const showChildTab = childActive && !isCollapsed;
                                  return (
                                    <li
                                      key={child.title}
                                      className={cn(
                                        "relative",
                                        showChildTab && "-mr-px z-10 sidebar-tab-active",
                                      )}
                                    >
                                      <MenuItem
                                        as="link"
                                        href={child.url}
                                        isActive={childActive}
                                        title={child.title}
                                        className={cn(
                                          "flex items-center gap-3 px-4 py-2 transition-all duration-200",
                                          showChildTab
                                            ? "rounded-l-[20px] rounded-r-none bg-[#F4F0E3] text-[#1F3A2E]"
                                            : childActive
                                            ? "rounded-xl bg-white/[0.15] text-white"
                                            : "rounded-xl text-white/50 hover:bg-white/[0.07] hover:text-white/80",
                                        )}
                                      >
                                        <child.icon className={cn("h-4 w-4 shrink-0", showChildTab ? "text-[#1F3A2E]" : childActive ? "text-white" : "text-white/40")} />
                                        <span className="text-[14.5px] font-medium truncate">{child.title}</span>
                                      </MenuItem>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </>
                        ) : item.url ? (
                          <MenuItem
                            as="link"
                            href={item.url}
                            isActive={active}
                            title={item.title}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 transition-all duration-200",
                              showTab
                                ? "rounded-l-[20px] rounded-r-none bg-[#F4F0E3] text-[#1F3A2E]"
                                : active
                                ? "rounded-xl bg-white/[0.15] text-white"
                                : "rounded-xl text-white/70 hover:bg-white/[0.07] hover:text-white/90",
                              isCollapsed && "justify-center px-2",
                            )}
                          >
                            <item.icon className={cn("h-[18px] w-[18px] shrink-0", showTab ? "text-[#1F3A2E]" : active ? "text-white" : "text-white/50")} />
                            {!isCollapsed && <span className="text-[14.5px] font-medium truncate">{item.title}</span>}
                          </MenuItem>
                        ) : null}

                        {/* Tooltip when collapsed */}
                        {isCollapsed && hoveredItem === item.title && !isMobile && (
                          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#1F3A2E] border border-white/10 px-3 py-1.5 text-[14.5px] font-medium text-white shadow-xl">
                            {item.title}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#1F3A2E]" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div className="px-2 pb-5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-white/50 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400",
                isCollapsed && "justify-center px-2",
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span className="text-[14.5px] font-medium">Cerrar sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Logout modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Cerrar sesión</h3>
            <p className="mt-2 text-sm text-[#3D6B3F]/70">¿Estás seguro que deseas cerrar sesión?</p>
            <div className="mt-6 flex gap-3 border-t border-[#C5CFB0] pt-4">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-[#C5CFB0] px-4 py-2.5 text-sm font-semibold text-[#1F3A2E] transition hover:bg-[#C5CFB0]/30"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
