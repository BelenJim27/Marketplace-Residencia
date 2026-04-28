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
import { AlertTriangle, CircleAlert, CircleCheckBig } from "lucide-react";
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

export function Notification() {
  const { user } = useAuth();
  const token = getCookie("token") ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadAlerts = async () => {
      setIsLoading(true);

      try {
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
  }, [isOpen, user?.id_productor, token]);

  const alertCount = useMemo(() => alerts.length, [alerts]);

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
            alerts.map((item) => <NotificationItem key={item.id} alert={item} onClose={() => setIsOpen(false)} />)
          ) : (
            <li className="flex items-start gap-4 rounded-lg px-2 py-3 outline-none">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CircleCheckBig className="size-5" />
              </span>
              <div>
                <strong className="block text-sm font-medium text-dark dark:text-white">Todo en orden</strong>
                <span className="truncate text-sm font-medium text-dark-5 dark:text-dark-6">
                  No hay productos con stock bajo
                </span>
              </div>
            </li>
          )}
        </ul>

        <Link
          href="/dashboard/productor/productos"
          onClick={() => setIsOpen(false)}
          className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
        >
          Ver todos los productos
        </Link>
      </DropdownContent>
    </Dropdown>
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
