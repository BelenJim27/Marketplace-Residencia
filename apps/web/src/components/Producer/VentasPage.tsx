"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Eye, Plus } from "lucide-react";
import type { ReactNode } from "react";

type SaleItem = {
  id_pedido: number;
  id_detalle: number;
  producto: string;
  tienda: string;
  precio_unitario: number;
  cantidad: number;
  total: number;
  status: string;
  fecha: string;
  moneda: string;
  moneda_referencia: string;
  pais_destino_iso2?: string | null;
  tipo_cambio?: number | null;
  pedido_total: number;
};

type StoreItem = {
  id_tienda: number;
  nombre: string;
};

type SalesResponse = {
  resumen: {
    totalVentas: number;
    ingresosTotales: number;
    pendientes: number;
  };
  ventas: SaleItem[];
};

export default function VentasPage() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("todos");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [summary, setSummary] = useState<SalesResponse["resumen"]>({
    totalVentas: 0,
    ingresosTotales: 0,
    pendientes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<SaleItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id_productor || !token) {
      setLoading(false);
      setError("No fue posible identificar el productor autenticado.");
      setStores([]);
      setSales([]);
      setSummary({ totalVentas: 0, ingresosTotales: 0, pendientes: 0 });
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      if (!user?.id_productor) return;

      try {
        setLoading(true);
        setError(null);

        const [storesData, salesData] = await Promise.all([
          api.tiendas.getByProductor(user.id_productor, token),
          api.pedidos.getMineSales(token),
        ]);

        if (cancelled) return;
        setStores(Array.isArray(storesData) ? (storesData as StoreItem[]) : []);
        setSales(Array.isArray((salesData as SalesResponse).ventas) ? (salesData as SalesResponse).ventas : []);
        setSummary((salesData as SalesResponse).resumen ?? { totalVentas: 0, ingresosTotales: 0, pendientes: 0 });
      } catch (err) {
        if (!cancelled) {
          setStores([]);
          setSales([]);
          setSummary({ totalVentas: 0, ingresosTotales: 0, pendientes: 0 });
          setError(err instanceof Error ? err.message : "No fue posible cargar las ventas");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, token, user?.id_productor]);

  const availableStatuses = useMemo(
    () => Array.from(new Set(sales.map((sale) => normalizeStatus(sale.status)))).sort(),
    [sales],
  );

  const filteredSales = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const minQty = minQuantity === "" ? null : Number(minQuantity);
    const maxQty = maxQuantity === "" ? null : Number(maxQuantity);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return sales.filter((sale) => {
      const saleDate = new Date(sale.fecha);
      const matchesQuery =
        !normalized ||
        sale.producto.toLowerCase().includes(normalized) ||
        sale.tienda.toLowerCase().includes(normalized);
      const matchesStore = storeFilter === "todos" || sale.tienda === storeFilter;
      const matchesQuantity =
        (minQty === null || Number.isNaN(minQty) ? true : sale.cantidad >= minQty) &&
        (maxQty === null || Number.isNaN(maxQty) ? true : sale.cantidad <= maxQty);
      const matchesStatus =
        statusFilter === "todos" || normalizeStatus(sale.status) === statusFilter;
      const matchesDate =
        (!fromDate || saleDate >= fromDate) &&
        (!toDate || saleDate <= toDate);

      return matchesQuery && matchesStore && matchesQuantity && matchesStatus && matchesDate;
    });
  }, [query, sales, storeFilter, minQuantity, maxQuantity, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setQuery("");
    setStoreFilter("todos");
    setMinQuantity("");
    setMaxQuantity("");
    setStatusFilter("todos");
    setDateFrom("");
    setDateTo("");
  };

  function abrirDetalle(venta: SaleItem) {
    setVentaSeleccionada(venta);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setVentaSeleccionada(null);
  }

  const stats = [
    { label: "Total Ventas", value: summary.totalVentas },
    { label: "Ingresos Totales", value: formatCurrency(summary.ingresosTotales) },
    { label: "Pendientes", value: summary.pendientes },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] overflow-hidden">

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Ventas</h1>
          <p className="text-sm text-gray-500">Consulta el estado de tus movimientos comerciales.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} title={item.label} value={item.value} />
        ))}
      </div>

      <div className="mb-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark overflow-hidden">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por producto o tienda"
          className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      <div className="mb-6 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 xl:flex-nowrap">
          <label className="block min-w-0 flex-[1.3]">
            <span className="mb-1 block text-xs font-medium text-dark dark:text-white">Tienda</span>
            <select
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="todos">Todas las tiendas</option>
              {stores.map((store) => (
                <option key={store.id_tienda} value={store.nombre}>
                  {store.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-dark dark:text-white">Cant. min</span>
            <input
              type="number"
              value={minQuantity}
              onChange={(event) => setMinQuantity(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-dark dark:text-white">Cant. max</span>
            <input
              type="number"
              value={maxQuantity}
              onChange={(event) => setMaxQuantity(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-dark dark:text-white">Estatus</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="todos">Todos</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-dark dark:text-white">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-dark dark:text-white">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <div className="flex min-w-[120px] items-end xl:w-auto">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="bg-gray-2 dark:bg-dark-2">
              <tr className="text-xs text-gray-500">
                <th className="w-[22%] px-3 py-3">Producto</th>
                <th className="w-[18%] px-3 py-3">Tienda</th>
                <th className="w-[13%] px-3 py-3">P. unit.</th>
                <th className="w-[9%] px-3 py-3">Cant.</th>
                <th className="w-[13%] px-3 py-3">Total</th>
                <th className="w-[10%] px-3 py-3">Status</th>
                <th className="w-[11%] px-3 py-3">Fecha</th>
                <th className="w-[4%] px-3 py-3 text-right">Acc.</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map((sale) => {
                return (
                  <tr key={`${sale.id_pedido}-${sale.id_detalle}`} className="border-t border-stroke text-xs dark:border-dark-3">
                    <td className="px-3 py-3 font-medium text-dark dark:text-white">
                      <span className="block truncate" title={sale.producto}>{sale.producto}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-3">
                      <span className="block truncate" title={sale.tienda}>{sale.tienda}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-3 whitespace-nowrap">{formatCurrency(sale.precio_unitario, sale.moneda)}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-3">{sale.cantidad}</td>
                    <td className="px-3 py-3 font-medium text-dark dark:text-white whitespace-nowrap">{formatCurrency(sale.total, sale.moneda)}</td>
                    <td className="px-3 py-3">
                      <Badge status={sale.status} />
                    </td>
                    <td className="px-3 py-3 text-gray-500">{formatDate(sale.fecha)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <ActionButton label="Ver detalle" icon={<Eye size={16} />} onClick={() => abrirDetalle(sale)} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                    No hay ventas para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && ventaSeleccionada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={cerrarModal}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:text-gray-100"
            style={{ transform: modalAbierto ? "scale(1)" : "scale(0.95)", opacity: modalAbierto ? 1 : 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Detalle de Venta</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pedido #{ventaSeleccionada.id_pedido}</p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Información del producto</p>
                <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  <DetailRow label="Producto" value={ventaSeleccionada.producto} />
                  <DetailRow label="Precio unitario" value={formatCurrency(ventaSeleccionada.precio_unitario, ventaSeleccionada.moneda)} />
                  <DetailRow label="Cantidad" value={String(ventaSeleccionada.cantidad)} />
                  <div className="pt-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(ventaSeleccionada.total, ventaSeleccionada.moneda)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Información de la venta</p>
                <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  <DetailRow label="Tienda" value={ventaSeleccionada.tienda} />
                  <DetailRow label="Fecha" value={formatDateTime(ventaSeleccionada.fecha)} />
                  <DetailRow label="Moneda" value={ventaSeleccionada.moneda} />
                  <DetailRow label="Total del pedido" value={formatCurrency(ventaSeleccionada.pedido_total, ventaSeleccionada.moneda)} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <SaleStatusBadge status={ventaSeleccionada.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Línea de tiempo</p>
              <div className="mt-4 space-y-4">
                <TimelineStep
                  title="Pedido recibido"
                  date={formatDateTime(ventaSeleccionada.fecha)}
                  active
                  done
                />
                <TimelineStep
                  title="En proceso"
                  date=""
                  active={!isCancelledStatus(ventaSeleccionada.status)}
                  done={isCompletedStatus(ventaSeleccionada.status)}
                />
                <TimelineStep
                  title="Completado"
                  date=""
                  active={isCompletedStatus(ventaSeleccionada.status)}
                  done={isCompletedStatus(ventaSeleccionada.status)}
                />
              </div>
            </div>

              <div className="mt-5 flex items-center justify-between gap-3">
              {normalizeStatus(ventaSeleccionada.status) === "pendiente" ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                  >
                    Marcar como completada
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    Cancelar venta
                  </button>
                </>
              ) : isCompletedStatus(ventaSeleccionada.status) ? (
                <p className="text-sm font-medium text-green-600">✓ Venta completada</p>
              ) : (
                <p className="text-sm font-medium text-red-600">✗ Venta cancelada</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-2 text-2xl font-bold text-dark dark:text-white">{value}</div>
    </div>
  );
}

 function Badge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const className = isCompletedStatus(normalized)
    ? "bg-green-50 text-green-700"
    : normalized === "pendiente"
      ? "bg-amber-50 text-amber-700"
      : isCancelledStatus(normalized)
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium capitalize ${className}`}>{formatStatusLabel(normalized)}</span>;
}

function ActionButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-[rgba(124,58,237,0.08)] hover:text-primary"
    >
      {icon}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-100 text-right">{value}</span>
    </div>
  );
}

function SaleStatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const className = isCompletedStatus(normalized)
    ? "bg-green-100 text-green-700"
    : normalized === "pendiente"
      ? "bg-amber-100 text-amber-700"
      : isCancelledStatus(normalized)
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-700";

  const label = formatStatusLabel(normalized);

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function TimelineStep({
  title,
  date,
  active,
  done,
}: {
  title: string;
  date: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`grid size-8 place-items-center rounded-full border ${done ? "border-green-500 bg-green-500 text-white" : active ? "border-gray-400 bg-gray-200 text-gray-600 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200" : "border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"}`}
        >
          {done ? "✓" : active ? "🔄" : "○"}
        </div>
        <div className="mt-1 h-8 w-px bg-gray-200 dark:bg-gray-600" />
      </div>
      <div>
        <p className={`font-medium ${done ? "text-green-600" : "text-gray-700 dark:text-gray-200"}`}>{title}</p>
        {date ? <p className="text-xs text-gray-500 dark:text-gray-400">{date}</p> : null}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isCompletedStatus(status: string) {
  return ["completada", "completado", "pagado", "entregado"].includes(normalizeStatus(status));
}

function isCancelledStatus(status: string) {
  return ["cancelada", "cancelado", "rechazado"].includes(normalizeStatus(status));
}
