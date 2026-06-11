"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/useMobile";
import { getCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CircleAlert, CircleCheckBig, CreditCard,
  AlertCircle, RefreshCw, Bell, CheckCircle,
  UserPlus, User, ShoppingBag, XCircle, Package,
} from "lucide-react";
import { BellIcon } from "./icons";

type AlertType = "stock_bajo" | "sin_existencias";

type StockAlert = {
  id: string;
  tipo: AlertType;
  tienda: string;
  producto: string;
  stock_actual: number;
  fecha: Date;
};

type DbNotif = {
  id_notificacion: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  url_accion: string | null;
  leido: boolean;
  creado_en: string;
};

const NOTIF_ICON: Record<string, { Icon: typeof Bell; bgClass: string; textClass: string }> = {
  // Tipos para cualquier usuario
  pago_pendiente_onboarding: { Icon: CreditCard,    bgClass: "bg-amber-100",  textClass: "text-amber-600"  },
  pago_confirmado:           { Icon: CheckCircle,   bgClass: "bg-green-100",  textClass: "text-green-600"  },
  pedido_pagado:             { Icon: CheckCircle,   bgClass: "bg-green-100",  textClass: "text-green-600"  },
  pago_fallido:              { Icon: AlertCircle,   bgClass: "bg-red-100",    textClass: "text-red-600"    },
  pago_reembolsado:          { Icon: RefreshCw,     bgClass: "bg-blue-100",   textClass: "text-blue-600"   },
  solicitud_productor:       { Icon: ShoppingBag,   bgClass: "bg-amber-100",  textClass: "text-amber-600"  },
  solicitud_aprobado:        { Icon: CheckCircle,   bgClass: "bg-green-100",  textClass: "text-green-600"  },
  solicitud_rechazado:       { Icon: XCircle,       bgClass: "bg-red-100",    textClass: "text-red-600"    },
  // Tipos exclusivos de admin
  nueva_solicitud_productor: { Icon: UserPlus,      bgClass: "bg-blue-100",   textClass: "text-blue-600"   },
  nuevo_usuario:             { Icon: User,          bgClass: "bg-green-100",  textClass: "text-green-600"  },
  stock_bajo_admin:          { Icon: Package,       bgClass: "bg-orange-100", textClass: "text-orange-600" },
  default:                   { Icon: Bell,          bgClass: "bg-gray-100",   textClass: "text-gray-600"   },
};

function getNotifIcon(tipo: string) {
  return NOTIF_ICON[tipo] ?? NOTIF_ICON.default;
}

export function Notification({ dark = false }: { dark?: boolean }) {
  const { user, isAdmin, isProductor } = useAuth();
  const token = getCookie("token") ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [dbNotifs, setDbNotifs] = useState<DbNotif[]>([]);
  const [visibleDbNotifs, setVisibleDbNotifs] = useState<DbNotif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  const dbNotifsRef = useRef<DbNotif[]>([]);
  dbNotifsRef.current = dbNotifs;

  // Carga DB notifications independientemente del dropdown — mantiene el badge actualizado
  useEffect(() => {
    if (!user?.id_usuario) return;
    let cancelled = false;

    const fetchDbNotifs = async () => {
      try {
        const res = await api.notificaciones.getByUser(user.id_usuario!, token);
        if (!cancelled)
          setDbNotifs((Array.isArray(res) ? res : []).filter((n) => !n.leido));
      } catch { /* best-effort */ }
    };

    fetchDbNotifs();
    const id = setInterval(fetchDbNotifs, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.id_usuario, token]);

  // Al abrir: snapshot de notifs no leídas + marcarlas leídas en BD → badge desaparece
  // Al cerrar: limpia alertas de stock y el snapshot visible
  useEffect(() => {
    if (!isOpen) {
      setAlerts([]);
      setVisibleDbNotifs([]);
      return;
    }
    const toMark = dbNotifsRef.current;
    setVisibleDbNotifs(toMark);
    setDbNotifs([]);
    toMark.forEach((notif) => {
      api.notificaciones.update(token, notif.id_notificacion, { leido: true }).catch(() => {});
    });
  }, [isOpen, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga alertas de stock solo cuando se abre el dropdown.
  // Las alertas las calcula el BACKEND (GET /productos/alertas-stock); aquí solo
  // se consumen para no fabricar notificaciones en el cliente.
  useEffect(() => {
    if (!isOpen || !user?.id_usuario) return;

    let cancelled = false;

    const loadStockAlerts = async () => {
      setIsLoading(true);
      try {
        if (isAdmin || !user?.id_productor) {
          if (!cancelled) setAlerts([]);
          return;
        }

        const res = await api.productos.getAlertasStock(token);
        if (cancelled) return;

        const nextAlerts = (Array.isArray(res) ? res : []).map((a) => ({
          id: a.id,
          tipo: a.tipo as AlertType,
          tienda: a.tienda,
          producto: a.producto,
          stock_actual: a.stock_actual,
          fecha: new Date(),
        })) satisfies StockAlert[];

        if (!cancelled) setAlerts(nextAlerts);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadStockAlerts();
    return () => { cancelled = true; };
  }, [isOpen, user?.id_usuario, user?.id_productor, isAdmin, token]);

  // Badge del ícono: solo notifs no leídas (dbNotifs se vacía al abrir el panel)
  const alertCount = useMemo(() => dbNotifs.length, [dbNotifs]);
  // Conteo dentro del panel abierto (snapshot + stock alerts)
  const panelCount = useMemo(() => visibleDbNotifs.length + alerts.length, [visibleDbNotifs, alerts]);

  // Link contextual al pie del panel
  const bottomLink = useMemo(() => {
    if (isAdmin && visibleDbNotifs.some((n) => ["nueva_solicitud_productor"].includes(n.tipo))) {
      return { href: "/Administrador/solicitudes-productores", label: "Ver solicitudes de productores" };
    }
    if (isAdmin && visibleDbNotifs.some((n) => n.tipo === "nuevo_usuario")) {
      return { href: "/Administrador/usuarios", label: "Ver usuarios" };
    }
    if (isAdmin) return null;
    if (alerts.length > 0) {
      return { href: "/dashboard/productor/productos", label: "Ver todos los productos" };
    }
    if (visibleDbNotifs.length > 0) {
      return { href: "/dashboard/productor/ingresos", label: "Ver mis ingresos" };
    }
    return null;
  }, [isAdmin, alerts, visibleDbNotifs]);

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger
        className={cn(
          "grid place-items-center outline-none transition-all duration-200",
          dark
            ? "rounded-xl border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
            : "size-12 rounded-full border bg-gray-2 text-dark hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary",
        )}
        aria-label="Ver notificaciones"
      >
        <span className="relative">
          <BellIcon />
          {alertCount > 0 && (
            <span className={cn(
              "absolute -right-1 -top-1 z-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white",
              dark ? "ring-2 ring-[#1F3A2E]" : "ring-2 ring-gray-2 dark:ring-dark-3",
            )}>
              {alertCount}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-white px-3.5 py-3 shadow-md dark:border-dark-3 dark:bg-gray-dark min-[350px]:min-w-[20rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">Notificaciones</span>
          {panelCount > 0 && (
            <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
              {panelCount} nueva{panelCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <ul className="mb-3 max-h-[23rem] space-y-1.5 overflow-y-auto">
          {isLoading ? (
            <li className="rounded-lg px-2 py-4 text-sm text-dark-5 dark:text-dark-6">Cargando...</li>
          ) : panelCount > 0 ? (
            <>
              {visibleDbNotifs.map((notif) => (
                <DbNotifItem
                  key={notif.id_notificacion}
                  notif={notif}
                  token={token}
                  onClose={() => setIsOpen(false)}
                  onMarkRead={() => setVisibleDbNotifs((prev) => prev.filter((n) => n.id_notificacion !== notif.id_notificacion))}
                />
              ))}
              {alerts.map((item) => (
                <NotificationItem key={item.id} alert={item} onClose={() => setIsOpen(false)} />
              ))}
            </>
          ) : (
            <li className="flex items-start gap-4 rounded-lg px-2 py-3 outline-none">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CircleCheckBig className="size-5" />
              </span>
              <div>
                <strong className="block text-sm font-medium text-dark dark:text-white">Todo en orden</strong>
                <span className="truncate text-sm font-medium text-dark-5 dark:text-dark-6">
                  No tienes notificaciones pendientes
                </span>
              </div>
            </li>
          )}
        </ul>

        {bottomLink && (
          <Link
            href={bottomLink.href}
            onClick={() => setIsOpen(false)}
            className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3"
          >
            {bottomLink.label}
          </Link>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

function DbNotifItem({
  notif, token, onClose, onMarkRead,
}: {
  notif: DbNotif;
  token: string;
  onClose: () => void;
  onMarkRead: () => void;
}) {
  const { Icon, bgClass, textClass } = getNotifIcon(notif.tipo);
  const urlAccion = notif.url_accion;

  const handleClick = async () => {
    try {
      await api.notificaciones.update(token, notif.id_notificacion, { leido: true });
      onMarkRead();
    } catch {
      // best-effort
    }
    onClose();
    if (urlAccion) window.location.href = urlAccion;
  };

  return (
    <li role="menuitem">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-4 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3 text-left"
      >
        <span className={`grid size-12 shrink-0 place-items-center rounded-full ${bgClass} dark:bg-opacity-15 ${textClass}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <strong className="block text-sm font-medium text-dark dark:text-white">{notif.titulo}</strong>
          <span className="line-clamp-2 text-sm font-medium text-dark-5 dark:text-dark-6">{notif.cuerpo}</span>
        </div>
      </button>
    </li>
  );
}

function NotificationItem({ alert, onClose }: { alert: StockAlert; onClose: () => void }) {
  const isOut = alert.tipo === "sin_existencias";
  const Icon = isOut ? CircleAlert : AlertTriangle;
  const badgeClasses = isOut
    ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
    : "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300";
  const title = isOut ? `Sin existencias — ${alert.producto}` : `Stock bajo — ${alert.producto}`;
  const subtitle = isOut
    ? `Agotado en ${alert.tienda}`
    : `Solo quedan ${alert.stock_actual} unidades en ${alert.tienda}`;

  return (
    <li role="menuitem">
      <Link
        href="/dashboard/productor/productos"
        onClick={onClose}
        className="flex items-center gap-4 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3"
      >
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", badgeClasses)}>
          <Icon className="size-5" />
        </span>
        <div>
          <strong className="block text-sm font-medium text-dark dark:text-white">{title}</strong>
          <span className="truncate text-sm font-medium text-dark-5 dark:text-dark-6">{subtitle}</span>
        </div>
      </Link>
    </li>
  );
}
