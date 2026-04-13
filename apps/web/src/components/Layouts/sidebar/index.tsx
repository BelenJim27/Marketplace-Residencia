"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getNavData } from "./data";
import { ArrowLeftIcon, ChevronLeft } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, LogOut } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, isProductor, isAdmin, logout } = useAuth();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed, toggleCollapse } =
    useSidebarContext();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(() =>
    pathname.startsWith("/dashboard/productor/archivos") ? ["Archivos"] : [],
  );
  const navData = getNavData(isProductor || user?.permisos?.includes("panel_productor") || false, isAdmin || user?.roles?.some((r) => ["administrador", "ADMIN"].includes(r)) || false);
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
      {/* Overlay para móvil cuando sidebar abierto */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
          style={{ 
            borderColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.25)", 
            backgroundColor: "rgba(var(--color-primary-rgb, 45, 122, 62), 0.08)" 
          }}
          className={cn(
            "border-r transition-all duration-300 ease-linear overflow-hidden h-screen sticky top-0 dark:border-gray-800 dark:bg-gray-900",
            isMobile 
              ? isOpen 
                ? "translate-x-0 fixed bottom-0 top-0 left-0 z-50 w-[280px] max-w-[85vw]" 
                : "-translate-x-full fixed bottom-0 top-0 left-0 z-50 w-[280px] max-w-[85vw]"
              : isCollapsed 
                ? "w-24" 
                : "max-w-[290px] w-full",
            !isOpen && !isMobile && "w-0",
          )}
        >
        <div className="flex h-full flex-col py-6 md:py-10 pl-4 md:pl-[25px] pr-2 md:pr-[7px]">
          
          {/* Logo y botón collapse */}
          <div className="relative pr-2 md:pr-4.5 flex items-center justify-between">
            {!isCollapsed && (
              <Link
                href={"/"}
                onClick={() => isMobile && toggleSidebar()}
                className="px-0 py-2 md:py-2.5"
              >
                <Logo />
              </Link>
            )}

            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className={cn(
                  "p-1.5 hover:bg-white/60 rounded-lg transition ml-auto dark:hover:bg-white/10",
                  isCollapsed ? "ml-1" : ""
                )}
                title={isCollapsed ? "Expandir" : "Colapsar"}
              >
                <ChevronLeft className={cn(
                  "size-5 transition-transform duration-300",
                  isCollapsed ? "rotate-180" : ""
                )} />
              </button>
            )}

            {isMobile && isOpen && (
              <button
                onClick={toggleSidebar}
                className="ml-auto p-1.5"
              >
                <ArrowLeftIcon className="size-7" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-4 md:mt-6 flex-1 overflow-y-auto pr-2 md:pr-3">
            {navData.map((section) => (
              <div key={section.label} className="mb-6 md:mb-8">
                
                {!isCollapsed && (
                  <h2 className="mb-3 md:mb-5 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                    {section.label}
                  </h2>
                )}

                <ul className={cn("space-y-1 md:space-y-2", isCollapsed ? "flex flex-col items-center gap-2 md:gap-4" : "")}>
                  {section.items.map((item) => (
                    <li 
                      key={item.title} 
                      className={cn(
                        "relative",
                        isCollapsed ? "w-12" : ""
                      )}
                      onMouseEnter={() => isCollapsed && setHoveredItem(item.title)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {item.children?.length ? (
                        <>
                          <MenuItem
                            className={cn(
                              "group flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2.5 md:py-3 transition",
                              "hover:bg-white/60 dark:hover:bg-white/10",
                              isCollapsed ? "justify-center p-2 md:p-3" : ""
                            )}
                            as="button"
                            onClick={() =>
                              setOpenMenus((current) =>
                                current.includes(item.title)
                                  ? current.filter((menu) => menu !== item.title)
                                  : [...current, item.title]
                              )
                            }
                            isActive={isItemActive(item)}
                            title={item.title}
                          >
                            <item.icon className={cn("shrink-0 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white", isCollapsed ? "size-6 md:size-7" : "size-5 md:size-6", isItemActive(item) && "text-gray-900 dark:text-white")} />
                            {!isCollapsed && (
                              <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm md:text-base">
                                <span className="truncate">{item.title}</span>
                                <ChevronDown className={cn("size-3 md:size-4 transition-transform text-gray-500 dark:text-gray-400", isMenuOpen(item.title) && "rotate-180")} />
                              </span>
                            )}
                          </MenuItem>

                          {!isCollapsed && isMenuOpen(item.title) && (
                            <div className="mt-1 md:mt-2 space-y-1 md:space-y-2 pl-3 md:pl-4">
                              {item.children.map((child) => (
                                <MenuItem
                                  key={child.title}
                                  className="group flex items-center gap-2 md:gap-3 rounded-lg py-2 md:py-2.5 pl-5 md:pl-7 pr-2 md:pr-3 transition hover:bg-white/60 dark:hover:bg-white/10"
                                  as="link"
                                  href={child.url}
                                  isActive={pathname === child.url}
                                  title={child.title}
                                >
                                  <child.icon className={cn("size-4 md:size-5 shrink-0 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white", pathname === child.url && "text-gray-900 dark:text-white")} />
                                  <span className="text-sm truncate">{child.title}</span>
                                </MenuItem>
                              ))}
                            </div>
                          )}
                        </>
                      ) : item.url ? (
                        <MenuItem
                          className={cn(
                            "group flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2.5 md:py-3 transition",
                            "hover:bg-white/60 dark:hover:bg-white/10",
                            isCollapsed ? "justify-center p-2 md:p-3" : ""
                          )}
                          as="link"
                          href={item.url}
                          isActive={isItemActive(item)}
                          title={item.title}
                        >
                          <item.icon className={cn("shrink-0 text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white", isCollapsed ? "size-6 md:size-7" : "size-5 md:size-6", isItemActive(item) && "text-gray-900 dark:text-white")} />
                          {!isCollapsed && <span className="text-sm md:text-base truncate">{item.title}</span>}
                        </MenuItem>
                      ) : null
                    }
                      {/* Menú flotante cuando está colapsado */}
                      {isCollapsed && hoveredItem === item.title && !isMobile && (
                          <div className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-lg pointer-events-none">
                            {item.title}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-primary"></div>
                          </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="mt-6 md:mt-8 border-t border-gray-300 pt-4 md:pt-5 dark:border-gray-700">
              <MenuItem
                as="button"
                isActive={false}
                title="Cerrar sesión"
                onClick={() => setShowLogoutConfirm(true)}
                className={cn(
                  "group flex w-full items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-2.5 md:py-3 text-gray-600 transition hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400",
                  isCollapsed ? "justify-center p-2 md:p-3" : "",
                )}
              >
                <LogOut className={cn("shrink-0 text-current", isCollapsed ? "size-6 md:size-7" : "size-5 md:size-6")} />
                {!isCollapsed && <span className="text-sm md:text-base">Cerrar sesión</span>}
              </MenuItem>
            </div>
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-base sm:text-lg font-semibold text-dark dark:text-white">Cerrar sesión</h3>
            <p className="mt-2 text-sm text-gray-500">¿Estás seguro que deseas cerrar sesión?</p>

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 border-t border-gray-300 pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full sm:w-auto rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="w-full sm:w-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
