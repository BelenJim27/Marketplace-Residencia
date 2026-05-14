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
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleAlert, CircleCheckBig, DollarSign, CreditCard, AlertCircle, RefreshCw, Bell, CheckCircle } from "lucide-react";
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

type ProductItem = {
  id_producto?: number;
  id_tienda?: number;
  nombre?: string;
  stock?: number | string | null;
};

type StoreItem = {
  id_tienda?: number;
  nombre?: string;
};

const NOTIF_ICON: Record<string, { Icon: typeof Bell; bgClass: string; textClass: string; defaultUrl?: string }> = {
  pago_pendiente_onboarding: { Icon: CreditCard, bgClass: "bg-amber-100", textClass: "text-amber-600", defaultUrl: "/dashboard/productor/ingresos" },
  pago_confirmado: { Icon: CheckCircle, bgClass: "bg-green-100", textClass: "text-green-600" },
  pedido_pagado: { Icon: CheckCircle, bgClass: "bg-green-100", textClass: "text-green-600" },
  pago_fallido: { Icon: AlertCircle, bgClass: "bg-red-100", textClass: "text-red-600" },
  pago_reembolsado: { Icon: RefreshCw, bgClass: "bg-blue-100", textClass: "text-blue-600" },
  default: { Icon: Bell, bgClass: "bg-gray-100", textClass: "text-gray-600" },
};

function getNotifIcon(tipo: string) {
  return NOTIF_ICON[tipo] ?? NOTIF_ICON.default;
}

export function Notification() {
  const { user } = useAuth();
  const token = getCookie("token") ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [dbNotifs, setDbNotifs] = useState<DbNotif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadAlerts = async () => {
      setIsLoading(true);

      try {
        // Fetch DB notifications (for any authenticated user)
        let fetchedDbNotifs: DbNotif[] = [];
        if (user) {
          try {
            const notifRes = await api.notificaciones.getAll(token);
            fetchedDbNotifs = (Array.isArray(notifRes) ? notifRes : []).filter((n) => !n.leido);
          } catch {
            // Best-effort: if notifications fetch fails, continue without them
          }
        }

        if (cancelled) return;
        if (user) setDbNotifs(fetchedDbNotifs);

        // Fetch stock alerts (only for producers)
        if (!user?.id_productor) {
          if (!cancelled) setAlerts([]);
          return;
        }

        const [productsRes, storesRes] = await Promise.all([
          api.productos.getByProductor(user.id_productor, token),
          api.tiendas.getByProductor(user.id_productor, token),
        ]);

        if (cancelled) return;

        const products = Array.isArray(productsRes) ? (productsRes as ProductItem[]) : [];
        const stores = Array.isArray(storesRes) ? (storesRes as StoreItem[]) : [];
        const storeMap = new Map(stores.map((store) => [Number(store.id_tienda), store.nombre || `Tienda #${store.id_tienda}`]));

        const demoFallbackStocks = [0, 4, 18, 9, 22, 12];

        const nextAlerts = products
          .map((product, index) => {
            const stock = Number(
              product.stock ?? demoFallbackStocks[index % demoFallbackStocks.length],
            );

            if (Number.isNaN(stock) || stock > 10) return null;

            const tiendaNombre = storeMap.get(Number(product.id_tienda)) || `Tienda #${product.id_tienda ?? "-"}`;
            const tipo: AlertType = stock === 0 ? "sin_existencias" : "stock_bajo";

            return {
              id: globalThis.crypto?.randomUUID?.() ?? `alert-${product.id_producto ?? index}-${Date.now()}`,
              tipo,
              tienda: tiendaNombre,
              producto: product.nombre || "Producto sin nombre",
              stock_actual: stock,
              fecha: new Date(),
            } satisfies StockAlert;
          })
          .filter(Boolean) as StockAlert[];

        nextAlerts.sort((a, b) => {
          if (a.tipo !== b.tipo) return a.tipo === "sin_existencias" ? -1 : 1;
          return a.producto.localeCompare(b.producto);
        });

        setAlerts(nextAlerts);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id_productor, user, token]);

  const alertCount = useMemo(() => alerts.length + dbNotifs.length, [alerts, dbNotifs]);

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="View Notifications"
      >
        <span className="relative">
          <BellIcon />

          {alertCount > 0 && (
            <span
              className={cn(
                "absolute -right-1 -top-1 z-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-2 ring-gray-2 dark:ring-dark-3",
              )}
            >
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
          <span className="text-lg font-medium text-dark dark:text-white">
            Alertas
          </span>
          {alertCount > 0 ? (
            <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
              {alertCount} alertas
            </span>
          ) : null}
        </div>

        <ul className="mb-3 max-h-[23rem] space-y-1.5 overflow-y-auto">
          {isLoading ? (
            <li className="rounded-lg px-2 py-4 text-sm text-dark-5 dark:text-dark-6">Cargando alertas...</li>
          ) : alertCount > 0 ? (
            <>
              {dbNotifs.map((notif) => (
                <DbNotifItem
                  key={notif.id_notificacion}
                  notif={notif}
                  token={token}
                  onClose={() => setIsOpen(false)}
                  onMarkRead={() => setDbNotifs((prev) => prev.filter((n) => n.id_notificacion !== notif.id_notificacion))}
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
                  No hay alertas pendientes
                </span>
              </div>
            </li>
          )}
        </ul>

        {alerts.length > 0 && (
          <Link
            href="/dashboard/productor/productos"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
          >
            Ver todos los productos
          </Link>
        )}
        {dbNotifs.length > 0 && (
          <Link
            href="/dashboard/productor/ingresos"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg border border-amber-300 bg-amber-50 p-2 text-center text-sm font-medium tracking-wide text-amber-700 outline-none transition-colors hover:bg-amber-100 focus:bg-amber-100 focus-visible:border-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 dark:focus-visible:border-amber-600"
          >
            Ver mis ingresos
          </Link>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

function DbNotifItem({
  notif,
  token,
  onClose,
  onMarkRead,
}: {
  notif: DbNotif;
  token: string;
  onClose: () => void;
  onMarkRead: () => void;
}) {
  const { Icon, bgClass, textClass } = getNotifIcon(notif.tipo);
  const urlAccion = notif.url_accion ?? (notif.tipo === "pago_pendiente_onboarding" ? "/dashboard/productor/ingresos" : null);

  const handleClick = async () => {
    try {
      await api.notificaciones.update(token, notif.id_notificacion, { leido: true });
      onMarkRead();
    } catch {
      // Best-effort: even if marking fails, navigate away
    }
    onClose();
    if (urlAccion) {
      window.location.href = urlAccion;
    }
  };

  return (
    <li role="menuitem">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-4 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3 text-left"
      >
        <span className={`grid size-14 shrink-0 place-items-center rounded-full ${bgClass} dark:bg-opacity-15 ${textClass}`}>
          <Icon className="size-6" />
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
  const title = isOut ? `Sin existencias - ${alert.producto}` : `Stock bajo - ${alert.producto}`;
  const subtitle = isOut
    ? `Producto agotado en ${alert.tienda}`
    : `Solo quedan ${alert.stock_actual} unidades en ${alert.tienda}`;

  return (
    <li role="menuitem">
      <Link
        href="/dashboard/productor/productos"
        onClick={onClose}
        className="flex items-center gap-4 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3"
      >
        <span className={cn("grid size-14 shrink-0 place-items-center rounded-full", badgeClasses)}>
          <Icon className="size-6" />
        </span>

        <div>
          <strong className="block text-sm font-medium text-dark dark:text-white">{title}</strong>
          <span className="truncate text-sm font-medium text-dark-5 dark:text-dark-6">{subtitle}</span>
        </div>
      </Link>
    </li>
  );
}
