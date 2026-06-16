"use client";

import { useSidebarContext } from "@/context/SidebarContext";
import { MenuIcon, CloseIcon } from "./icons";
import { Notification } from "./notification";
import { UserInfo } from "./user-info";
import { useNotificationPoller } from "@/hooks/useNotificationPoller";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";

function useDateLabel() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const str = now.toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      setLabel(str.charAt(0).toUpperCase() + str.slice(1));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

export function Header() {
  const { toggleSidebar, isOpen } = useSidebarContext();
  useNotificationPoller();
  const dateLabel = useDateLabel();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-[#1F3A2E] px-4 py-3 shadow-[0_2px_16px_rgba(0,0,0,0.28)] md:px-6">

      {/* Hamburguesa — mobile */}
      <button
        onClick={toggleSidebar}
        className="flex-shrink-0 rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition-all duration-200 lg:hidden"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div className="flex-1" />

      {/* Acciones derecha */}
      <div className="flex items-center gap-2">

        {/* Fecha — md+ */}
        {dateLabel && (
          <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white/80 text-sm font-medium select-none">
            <Calendar className="h-4 w-4 text-white/50 flex-shrink-0" />
            <span>{dateLabel}</span>
          </div>
        )}

        <Notification dark />

        <div className="shrink-0">
          <UserInfo whiteText />
        </div>
      </div>
    </header>
  );
}
