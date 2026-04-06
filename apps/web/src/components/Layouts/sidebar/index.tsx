"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronLeft } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed, toggleCollapse } =
    useSidebarContext();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
          "border-r border-green-200 bg-green-100 transition-[width] duration-300 ease-linear overflow-visible h-screen sticky top-0",
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
                  "p-1.5 hover:bg-green-200 rounded-lg transition ml-auto",
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
            {NAV_DATA.map((section) => (
              <div key={section.label} className="mb-8">
                
                {!isCollapsed && (
                  <h2 className="mb-5 text-sm font-medium text-green-900">
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
                          "flex items-center gap-3 py-3 px-3 rounded-lg transition",
                          "hover:bg-green-200",
                          pathname === item.url &&
                            "bg-green-300 text-green-900 font-medium",
                          isCollapsed ? "justify-center p-3" : ""
                        )}
                        as="link"
                        href={item.url}
                        isActive={pathname === item.url}
                        title={item.title}
                      >
                        <item.icon className={cn("shrink-0", isCollapsed ? "size-7" : "size-6")} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </MenuItem>

                      {/* Menú flotante cuando está colapsado */}
                      {isCollapsed && hoveredItem === item.title && !isMobile && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 bg-green-900 text-white px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium shadow-lg pointer-events-none">
                          {item.title}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-green-900"></div>
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