"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Eye, X, Check, AlertCircle, Loader2, ShoppingBag } from "lucide-react";

// ─── Tipos y Estilos ──────────────────────────────────────────────────────────

const statusStyles = {
  pendiente:  "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completada: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completado: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pagado:     "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  entregado:  "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelada:  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelado:  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  activo:     "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  disponible: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function normalizeStatus(s) {
  return (s ?? "").trim().toLowerCase();
}
function isCompleted(s) {
  return ["completada", "completado", "pagado", "entregado"].includes(normalizeStatus(s));
}
function formatStatusLabel(s) {
  const n = normalizeStatus(s);
  return n.charAt(0).toUpperCase() + n.slice(1).replace(/_/g, " ");
}
function formatCurrency(value, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  );
}

function Badge({ status }) {
  const n = normalizeStatus(status);
  const cls = statusStyles[n] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {formatStatusLabel(status)}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-800 dark:text-gray-100">{value}</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrdenesView() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";

  // Filtros
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Datos
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ totalVentas: 0, ingresosTotales: 0 });
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // ─── Carga ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id_productor || !token) {
      setLoading(false);
      setError("No fue posible identificar el productor.");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [storesData, salesData] = await Promise.all([
          api.tiendas.getByProductor(user.id_productor, token),
          api.pedidos.getMineSales(token),
        ]);
        setStores(Array.isArray(storesData) ? storesData : []);
        setSales(Array.isArray(salesData?.ventas) ? salesData.ventas : []);
        setSummary({
          totalVentas: salesData?.resumen?.totalVentas ?? 0,
          ingresosTotales: salesData?.resumen?.ingresosTotales ?? 0
        });
      } catch (err) {
        setError("Error al cargar datos.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, token, user?.id_productor]);

  // ─── Filtrado ─────────────────────────────────────────────────────────────

  // Se excluyen los estados solicitados de la lista de filtros
  const availableStatuses = useMemo(() => {
    const excluded = ["en proceso", "finalizado", "rechazado", "vendido", "en_proceso"];
    const set = new Set(
      sales
        .map((s) => normalizeStatus(s.status))
        .filter((s) => !excluded.includes(s))
    );
    return Array.from(set).sort();
  }, [sales]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return sales.filter((s) => {
      const nStatus = normalizeStatus(s.status);
      const excluded = ["en proceso", "finalizado", "rechazado", "vendido", "en_proceso"];
      
      // Filtro base: no mostrar los estados eliminados
      if (excluded.includes(nStatus)) return false;

      const saleDate = new Date(s.fecha);
      return (
        (!q || s.producto.toLowerCase().includes(q) || s.tienda.toLowerCase().includes(q)) &&
        (storeFilter === "todos" || s.tienda === storeFilter) &&
        (statusFilter === "todos" || nStatus === statusFilter) &&
        (!fromDate || saleDate >= fromDate) &&
        (!toDate || saleDate <= toDate)
      );
    });
  }, [sales, query, storeFilter, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setQuery(""); setStoreFilter("todos"); setStatusFilter("todos");
    setDateFrom(""); setDateTo("");
  };

  if (loading) return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="animate-spin text-green-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold dark:text-white">Órdenes recibidas</h1>
        </div>

        {/* Stats: Tarjetas de "En proceso" y "Finalizado" eliminadas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard title="Total órdenes" value={summary.totalVentas} />
          <StatCard title="Ingresos MXN" value={formatCurrency(summary.ingresosTotales)} />
        </div>

        {/* Filtros */}
        <div className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto..."
            className="w-full rounded-lg border dark:border-gray-600 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 dark:text-white"
          />
          
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[150px]">
              <span className="text-xs text-gray-500">Tienda</span>
              <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-full mt-1 rounded-lg border dark:border-gray-600 dark:bg-gray-700 p-2 text-sm dark:text-white">
                <option value="todos">Todas las tiendas</option>
                {stores.map(s => <option key={s.id_tienda} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </label>

            <label className="flex-1 min-w-[150px]">
              <span className="text-xs text-gray-500">Estado</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full mt-1 rounded-lg border dark:border-gray-600 dark:bg-gray-700 p-2 text-sm dark:text-white">
                <option value="todos">Todos los estados</option>
                {availableStatuses.map(s => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
              </select>
            </label>

            <button onClick={clearFilters} className="px-4 py-2 text-sm border rounded-lg dark:text-gray-300">Limpiar</button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Tienda</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filtered.map((orden) => (
                <tr key={`${orden.id_pedido}-${orden.id_detalle}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium dark:text-white">{orden.producto}</td>
                  <td className="px-4 py-3 dark:text-gray-400">{orden.tienda}</td>
                  <td className="px-4 py-3 font-bold dark:text-white">{formatCurrency(orden.total)}</td>
                  <td className="px-4 py-3"><Badge status={orden.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(orden.fecha)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setOrdenSeleccionada(orden); setModalAbierto(true); }} className="p-1.5 text-gray-400 hover:text-green-600"><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}