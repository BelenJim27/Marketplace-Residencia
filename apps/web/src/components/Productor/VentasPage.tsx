"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Eye, Plus } from "lucide-react";
import type { ReactNode } from "react";

type SaleStatus = "completada" | "pendiente" | "cancelada";

type SaleItem = {
  id: number;
  producto: string;
  tienda: string;
  precio_unitario: number;
  cantidad: number;
  status: SaleStatus;
  fecha: string;
};

type StoreItem = {
  id_tienda: number;
  nombre: string;
};

const MOCK_SALES: SaleItem[] = [
  {
    id: 1,
    producto: "Mezcal Espadín Joven 750ml",
    tienda: "Casa Ramirez Mezcal",
    precio_unitario: 680,
    cantidad: 2,
    status: "completada",
    fecha: "2026-04-01T12:30:00",
  },
  {
    id: 2,
    producto: "Mezcal Tobalá Reserva",
    tienda: "Destilados del Valle",
    precio_unitario: 1800,
    cantidad: 1,
    status: "pendiente",
    fecha: "2026-04-02T09:10:00",
  },
  {
    id: 3,
    producto: "Mezcal Ensamble Artesanal",
    tienda: "Casa Ramirez Mezcal",
    precio_unitario: 420,
    cantidad: 4,
    status: "cancelada",
    fecha: "2026-04-03T18:00:00",
  },
  {
    id: 4,
    producto: "Mezcal Cuishe Edición Limitada",
    tienda: "Destilados del Valle",
    precio_unitario: 320,
    cantidad: 3,
    status: "completada",
    fecha: "2026-04-04T14:40:00",
  },
];

export function VentasPage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("todos");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<SaleItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (authLoading || !user?.id_productor) return;

    let cancelled = false;

    const loadStores = async () => {
      if (!user?.id_productor) return;

      try {
        const data = await api.tiendas.getByProductor(user.id_productor);
        if (cancelled) return;
        setStores(Array.isArray(data) ? (data as StoreItem[]) : []);
      } catch {
        if (!cancelled) setStores([]);
      }
    };

    loadStores();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id_productor]);

  const filteredSales = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const minQty = minQuantity === "" ? null : Number(minQuantity);
    const maxQty = maxQuantity === "" ? null : Number(maxQuantity);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return MOCK_SALES.filter((sale) => {
      const saleDate = new Date(sale.fecha);
      const matchesQuery =
        !normalized ||
        sale.producto.toLowerCase().includes(normalized) ||
        sale.tienda.toLowerCase().includes(normalized);
      const matchesStore = storeFilter === "todos" || sale.tienda === storeFilter;
      const matchesQuantity =
        (minQty === null || Number.isNaN(minQty) ? true : sale.cantidad >= minQty) &&
        (maxQty === null || Number.isNaN(maxQty) ? true : sale.cantidad <= maxQty);
      const matchesStatus = statusFilter === "todos" || sale.status === statusFilter;
      const matchesDate =
        (!fromDate || saleDate >= fromDate) &&
        (!toDate || saleDate <= toDate);

      return matchesQuery && matchesStore && matchesQuantity && matchesStatus && matchesDate;
    });
  }, [query, storeFilter, minQuantity, maxQuantity, statusFilter, dateFrom, dateTo]);

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

  const totals = useMemo(() => {
    const totalVentas = filteredSales.length;
    const ingresos = filteredSales.reduce((sum, sale) => sum + sale.precio_unitario * sale.cantidad, 0);
    const pendientes = filteredSales.filter((sale) => sale.status === "pendiente").length;

    return { totalVentas, ingresos, pendientes };
  }, [filteredSales]);

  const stats = [
    { label: "Total Ventas", value: totals.totalVentas },
    { label: "Ingresos Totales (MXN)", value: formatCurrency(totals.ingresos) },
    { label: "Pendientes", value: totals.pendientes },
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <Breadcrumb pageName="Ventas" title="Ventas" />

      <div className="mb-6 flex flex-col gap-4 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Ventas</h1>
          <p className="text-sm text-gray-500">Consulta el estado de tus movimientos comerciales.</p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-opacity-90">
          <Plus size={18} />
          Nueva Venta
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} title={item.label} value={item.value} />
        ))}
      </div>

      <div className="mb-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por producto o tienda"
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2"
        />
      </div>

      <div className="mb-6 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 xl:grid-cols-6">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Filtro por Tienda</span>
            <select
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="todos">Todas las tiendas</option>
              {stores.map((store) => (
                <option key={store.id_tienda} value={store.nombre}>
                  {store.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Cant. mín</span>
            <input
              type="number"
              value={minQuantity}
              onChange={(event) => setMinQuantity(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Cant. máx</span>
            <input
              type="number"
              value={maxQuantity}
              onChange={(event) => setMaxQuantity(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Filtro por Estatus</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            >
              <option value="todos">Todos</option>
              <option value="completada">Completada</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-dark dark:text-white">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          <div className="flex items-end xl:col-span-1">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-lg border border-stroke px-4 py-3 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-white/5"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-gray-2 dark:bg-dark-2">
              <tr className="text-sm text-gray-500">
                <th className="px-5 py-4">Producto</th>
                <th className="px-5 py-4">Tienda</th>
                <th className="px-5 py-4">Precio unitario</th>
                <th className="px-5 py-4">Cantidad</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map((sale) => {
                const total = sale.precio_unitario * sale.cantidad;

                return (
                  <tr key={sale.id} className="border-t border-stroke text-sm dark:border-dark-3">
                    <td className="px-5 py-4 font-medium text-dark dark:text-white">{sale.producto}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{sale.tienda}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{formatCurrency(sale.precio_unitario)}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-3">{sale.cantidad}</td>
                    <td className="px-5 py-4 font-medium text-dark dark:text-white">{formatCurrency(total)}</td>
                    <td className="px-5 py-4">
                      <Badge status={sale.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(sale.fecha)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButton label="Ver detalle" icon={<Eye size={16} />} onClick={() => abrirDetalle(sale)} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Venta #{ventaSeleccionada.id}</p>
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
                  <DetailRow label="Precio unitario" value={formatCurrency(ventaSeleccionada.precio_unitario)} />
                  <DetailRow label="Cantidad" value={String(ventaSeleccionada.cantidad)} />
                  <div className="pt-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(ventaSeleccionada.precio_unitario * ventaSeleccionada.cantidad)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Información de la venta</p>
                <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  <DetailRow label="Tienda" value={ventaSeleccionada.tienda} />
                  <DetailRow label="Fecha" value={formatDateTime(ventaSeleccionada.fecha)} />
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
                  active={ventaSeleccionada.status !== "cancelada"}
                  done={ventaSeleccionada.status === "completada"}
                />
                <TimelineStep
                  title="Completado"
                  date=""
                  active={ventaSeleccionada.status === "completada"}
                  done={ventaSeleccionada.status === "completada"}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {ventaSeleccionada.status === "pendiente" ? (
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
              ) : ventaSeleccionada.status === "completada" ? (
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

function Badge({ status }: { status: SaleStatus }) {
  const className =
    status === "completada"
      ? "bg-green-50 text-green-700"
      : status === "pendiente"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}>{status}</span>;
}

function ActionButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-lg p-2 text-gray-500 transition hover:bg-[rgba(124,58,237,0.08)] hover:text-primary"
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

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const className =
    status === "completada"
      ? "bg-green-100 text-green-700"
      : status === "pendiente"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  const label = status === "completada" ? "Completada" : status === "pendiente" ? "Pendiente" : "Cancelada";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}
