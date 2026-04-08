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

export function Sidebar() {
  const pathname = usePathname();
  const { user, isProductor } = useAuth();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed, toggleCollapse } =
    useSidebarContext();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const navData = getNavData(isProductor || user?.permisos?.includes("panel_productor") || false);

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "border-r border-stroke bg-white transition-[width] duration-300 ease-linear overflow-visible h-screen sticky top-0 dark:border-dark-3 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "",
          isOpen ? "" : "w-0",
          isCollapsed && !isMobile ? "w-24" : "max-w-[290px] w-full",
        )}
      >
        <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
          
          {/* Logo y botón collapse */}
          <div className="relative pr-4.5 flex items-center justify-between">
            {!isCollapsed && (
              <Link
                href={"/"}
                onClick={() => isMobile && toggleSidebar()}
                className="px-0 py-2.5 min-[850px]:py-0"
              >
                <Logo />
              </Link>
            )}

            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className={cn(
                  "p-1.5 hover:bg-gray-100 rounded-lg transition ml-auto dark:hover:bg-white/10",
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
          <div className="mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-10">
            {navData.map((section) => (
              <div key={section.label} className="mb-8">
                
                {!isCollapsed && (
                  <h2 className="mb-5 text-sm font-medium text-gray-500 dark:text-gray-4">
                    {section.label}
                  </h2>
                )}

                <ul className={cn(
                  "space-y-2",
                  isCollapsed ? "flex flex-col items-center gap-4" : ""
                )}>
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
                      <MenuItem
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 transition",
                          "hover:bg-[rgba(124,58,237,0.08)]",
                          isCollapsed ? "justify-center p-3" : ""
                        )}
                        as="link"
                        href={item.url}
                        isActive={pathname === item.url.split("#")[0]}
                        title={item.title}
                      >
                        <item.icon className={cn("shrink-0", isCollapsed ? "size-7" : "size-6")} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </MenuItem>

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
          </div>
        </div>
      </aside>
    </>
  );
}
