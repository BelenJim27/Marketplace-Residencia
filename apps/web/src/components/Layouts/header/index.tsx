"use client";

import { SearchIcon } from "@/assets/icons";
import { useSidebarContext } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { MenuIcon, CloseIcon } from "./icons";
import { Notification } from "./notification";
import { UserInfo } from "./user-info";
import { useNotificationPoller } from "@/hooks/useNotificationPoller";

export function Header() {
  const { toggleSidebar, isOpen } = useSidebarContext();
  const { } = useAuth();
  useNotificationPoller();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#C5CFB0]/50 bg-[#F4F0E3] px-4 py-3 shadow-[0_1px_6px_rgba(31,58,46,0.06)] md:px-6">

      {/* Botón hamburguesa — solo mobile */}
      <button
        onClick={toggleSidebar}
        className="flex-shrink-0 rounded-xl border border-[#C5CFB0] bg-white p-2 text-[#1F3A2E] hover:bg-[#1F3A2E] hover:text-white transition-all duration-200 lg:hidden"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Acciones derecha */}
      <div className="flex items-center gap-2">
        {/* Buscar — solo hasta md */}
        <button className="rounded-xl border border-[#C5CFB0] bg-white p-2 text-[#1F3A2E] hover:bg-[#1F3A2E] hover:text-white transition-all duration-200 md:hidden">
          <SearchIcon className="h-5 w-5" />
        </button>

        <Notification />

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
