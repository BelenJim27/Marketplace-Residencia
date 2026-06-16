"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Eye, LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
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
  resumen: { totalVentas: number; ingresosTotales: number };
  ventas: SaleItem[];
};

const PAGE_SIZE = 10;


export default function VentasPage() {
  const { user, loading: authLoading, isAdmin, isProductor } = useAuth();
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
    totalVentas: 0, ingresosTotales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<SaleItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id_productor || !token) {
      setLoading(false);
      setError("No fue posible identificar el productor autenticado.");
      return;
    }
    let cancelled = false;
    const loadData = async () => {
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
        setSummary((salesData as SalesResponse).resumen ?? { totalVentas: 0, ingresosTotales: 0 });
      } catch (err) {
        if (!cancelled) {
          setStores([]); setSales([]);
          setSummary({ totalVentas: 0, ingresosTotales: 0 });
          setError(err instanceof Error ? err.message : "No fue posible cargar las ventas");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [authLoading, token, user?.id_productor]);

  const availableStatuses = useMemo(
    () => Array.from(new Set(sales.map((s) => normalizeStatus(s.status)))).sort(),
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
      return (
        (!normalized || sale.producto.toLowerCase().includes(normalized) || sale.tienda.toLowerCase().includes(normalized)) &&
        (storeFilter === "todos" || sale.tienda === storeFilter) &&
        (minQty === null || Number.isNaN(minQty) || sale.cantidad >= minQty) &&
        (maxQty === null || Number.isNaN(maxQty) || sale.cantidad <= maxQty) &&
        (statusFilter === "todos" || normalizeStatus(sale.status) === statusFilter) &&
        (!fromDate || saleDate >= fromDate) &&
        (!toDate || saleDate <= toDate)
      );
    });
  }, [query, sales, storeFilter, minQuantity, maxQuantity, statusFilter, dateFrom, dateTo]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [query, storeFilter, minQuantity, maxQuantity, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const pagedSales = useMemo(
    () => filteredSales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredSales, currentPage],
  );
  const from = filteredSales.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filteredSales.length);

  const clearFilters = () => {
    setQuery(""); setStoreFilter("todos"); setMinQuantity(""); setMaxQuantity("");
    setStatusFilter("todos"); setDateFrom(""); setDateTo("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
      </div>
    );
  }

  const inp = "w-full rounded-lg border border-[#C5CFB0] bg-transparent px-3 py-2 text-sm text-[#1F3A2E] outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20 placeholder:text-[#3D6B3F]/40";
  const lbl = "mb-1 block text-xs font-medium text-[#1F3A2E]/70";
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)] flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Ventas</h1>
          <p className="text-sm text-[#3D6B3F]/70">Consulta el estado de tus movimientos comerciales.</p>
        </div>
        <Link
          href={isAdmin ? "/Administrador/dashboard" : "/dashboard/productor"}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-[#1F3A2E] bg-[#1F3A2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a4f3a]"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Ir al panel</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Total Ventas", value: summary.totalVentas },
          { label: "Ingresos Totales", value: formatCurrency(summary.ingresosTotales) },
        ].map((item) => (
          <Card key={item.label} title={item.label} value={item.value} />
        ))}
      </div>

      {/* Search + Filters — single compact card */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-3 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por producto o tienda"
          className={`${inp} mb-3`}
        />
        <div className="flex flex-wrap items-end gap-2 xl:flex-nowrap">
          <label className="block min-w-0 flex-[1.5]">
            <span className={lbl}>Tienda</span>
            <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className={inp}>
              <option value="todos">Todas las tiendas</option>
              {stores.map((s) => <option key={s.id_tienda} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="block min-w-0 flex-1">
            <span className={lbl}>Cant. mín</span>
            <input type="number" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} className={inp} />
          </label>
          <label className="block min-w-0 flex-1">
            <span className={lbl}>Cant. máx</span>
            <input type="number" value={maxQuantity} onChange={(e) => setMaxQuantity(e.target.value)} className={inp} />
          </label>
          <label className="block min-w-0 flex-1">
            <span className={lbl}>Estatus</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inp}>
              <option value="todos">Todos</option>
              {availableStatuses.map((s) => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
            </select>
          </label>
          <label className="block min-w-0 flex-1">
            <span className={lbl}>Desde</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inp} />
          </label>
          <label className="block min-w-0 flex-1">
            <span className={lbl}>Hasta</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inp} />
          </label>
          <button type="button" onClick={clearFilters}
            className="shrink-0 rounded-lg border border-[#C5CFB0] px-3 py-2 text-xs font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/20">
            Limpiar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed text-left">
            <thead className="bg-[#1F3A2E]">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                <th className="w-[22%] px-3 py-3">Producto</th>
                <th className="w-[18%] px-3 py-3">Tienda</th>
                <th className="w-[13%] px-3 py-3">P. unit.</th>
                <th className="w-[9%] px-3 py-3">Cant.</th>
                <th className="w-[13%] pl-3 pr-1 py-3">Total</th>
                <th className="w-[10%] pl-1 pr-3 py-3">Status</th>
                <th className="w-[11%] px-3 py-3">Fecha</th>
                <th className="w-[4%] px-3 py-3 text-right">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {pagedSales.map((sale) => (
                <tr key={`${sale.id_pedido}-${sale.id_detalle}`}
                  className="border-t border-[#C5CFB0]/30 bg-white text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20">
                  <td className="px-3 py-3 font-medium text-[#1F3A2E]">
                    <span className="block truncate" title={sale.producto}>{sale.producto}</span>
                  </td>
                  <td className="px-3 py-3 text-[#3D6B3F]/70">
                    <span className="block truncate" title={sale.tienda}>{sale.tienda}</span>
                  </td>
                  <td className="px-3 py-3 text-[#3D6B3F]/70 whitespace-nowrap">{formatCurrency(sale.precio_unitario, sale.moneda)}</td>
                  <td className="px-3 py-3 text-[#3D6B3F]/70">{sale.cantidad}</td>
                  <td className="pl-3 pr-1 py-3 font-medium text-[#1F3A2E] whitespace-nowrap">{formatCurrency(sale.total, sale.moneda)}</td>
                  <td className="pl-1 pr-3 py-3"><Badge status={sale.status} /></td>
                  <td className="px-3 py-3 text-[#3D6B3F]/60">{formatDate(sale.fecha)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <ActionButton label="Ver detalle" icon={<Eye size={15} />} onClick={() => { setVentaSeleccionada(sale); setModalAbierto(true); }} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[#3D6B3F]/60">No hay ventas para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <p className="text-sm text-[#1F3A2E]">
            Mostrando <span className="font-semibold">{from}</span>–<span className="font-semibold">{to}</span> de <span className="font-semibold">{filteredSales.length}</span> venta{filteredSales.length !== 1 ? "s" : ""}
          </p>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
              Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && ventaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { setModalAbierto(false); setVentaSeleccionada(null); }}>
          <div role="dialog" aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Detalle de Venta</h2>
                <p className="text-sm text-[#3D6B3F]/70">Pedido #{ventaSeleccionada.id_pedido}</p>
              </div>
              <button type="button" onClick={() => { setModalAbierto(false); setVentaSeleccionada(null); }}
                className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-[#C5CFB0]/20 hover:text-[#1F3A2E]" aria-label="Cerrar modal">
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F3A2E]/40">Información del producto</p>
                <div className="mt-3 space-y-3 text-sm">
                  <DetailRow label="Producto" value={ventaSeleccionada.producto} />
                  <DetailRow label="Precio unitario" value={formatCurrency(ventaSeleccionada.precio_unitario, ventaSeleccionada.moneda)} />
                  <DetailRow label="Cantidad" value={String(ventaSeleccionada.cantidad)} />
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F3A2E]/40">Total</p>
                    <p className="text-2xl font-bold text-[#3D6B3F]">{formatCurrency(ventaSeleccionada.total, ventaSeleccionada.moneda)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F3A2E]/40">Información de la venta</p>
                <div className="mt-3 space-y-3 text-sm">
                  <DetailRow label="Tienda" value={ventaSeleccionada.tienda} />
                  <DetailRow label="Fecha" value={formatDateTime(ventaSeleccionada.fecha)} />
                  <DetailRow label="Moneda" value={ventaSeleccionada.moneda} />
                  <DetailRow label="Total del pedido" value={formatCurrency(ventaSeleccionada.pedido_total, ventaSeleccionada.moneda)} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#3D6B3F]/70">Status</span>
                    <SaleStatusBadge status={ventaSeleccionada.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#C5CFB0] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F3A2E]/40">Línea de tiempo</p>
              <div className="mt-3 space-y-3">
                <TimelineStep title="Pedido recibido" date={formatDateTime(ventaSeleccionada.fecha)} active done />
                <TimelineStep title="En proceso" date="" active={!isCancelledStatus(ventaSeleccionada.status)} done={isCompletedStatus(ventaSeleccionada.status)} />
                <TimelineStep title="Completado" date="" active={isCompletedStatus(ventaSeleccionada.status)} done={isCompletedStatus(ventaSeleccionada.status)} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              {normalizeStatus(ventaSeleccionada.status) === "pendiente" ? (
                <>
                  <button type="button" className="rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F3A2E]">Marcar como completada</button>
                  <button type="button" className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Cancelar venta</button>
                </>
              ) : isCompletedStatus(ventaSeleccionada.status) ? (
                <p className="text-sm font-medium text-[#3D6B3F]">✓ Venta completada</p>
              ) : (
                <p className="text-sm font-medium text-red-600">✗ Venta cancelada</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <p className="text-sm text-[#3D6B3F]/70">{title}</p>
      <div className="mt-1 text-2xl font-bold text-[#1F3A2E]">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const n = normalizeStatus(status);
  const cls = isCompletedStatus(n) ? "bg-[#A8C26B]/20 text-[#3D6B3F]"
    : n === "pendiente" ? "bg-[#C97A3E]/15 text-[#C97A3E]"
    : isCancelledStatus(n) ? "bg-red-50 text-red-700"
    : "bg-[#C5CFB0]/30 text-[#1F3A2E]";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>{formatStatusLabel(n)}</span>;
}

function ActionButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" title={label} onClick={onClick}
      className="rounded-lg p-1.5 text-[#3D6B3F]/50 transition hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]">
      {icon}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#3D6B3F]/70">{label}</span>
      <span className="font-medium text-[#1F3A2E] text-right">{value}</span>
    </div>
  );
}

function SaleStatusBadge({ status }: { status: string }) {
  const n = normalizeStatus(status);
  const cls = isCompletedStatus(n) ? "bg-[#A8C26B]/30 text-[#3D6B3F]"
    : n === "pendiente" ? "bg-[#C97A3E]/20 text-[#C97A3E]"
    : isCancelledStatus(n) ? "bg-red-100 text-red-700"
    : "bg-[#C5CFB0]/30 text-[#1F3A2E]";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{formatStatusLabel(n)}</span>;
}

function TimelineStep({ title, date, active, done }: { title: string; date: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`grid size-7 place-items-center rounded-full border text-xs ${done ? "border-[#3D6B3F] bg-[#3D6B3F] text-white" : active ? "border-[#C5CFB0] bg-[#F4F0E3] text-[#3D6B3F]" : "border-[#C5CFB0] bg-white text-[#3D6B3F]/40"}`}>
          {done ? "✓" : active ? "↻" : "○"}
        </div>
        <div className="mt-1 h-6 w-px bg-[#C5CFB0]/50" />
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? "text-[#3D6B3F]" : "text-[#1F3A2E]"}`}>{title}</p>
        {date && <p className="text-xs text-[#3D6B3F]/60">{date}</p>}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateTime(v: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
}
function formatCurrency(v: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}
function formatDate(v: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));
}
function normalizeStatus(s: string) { return s.trim().toLowerCase(); }
function formatStatusLabel(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function isCompletedStatus(s: string) { return ["completada", "completado", "pagado", "entregado"].includes(normalizeStatus(s)); }
function isCancelledStatus(s: string) { return ["cancelada", "cancelado", "rechazado"].includes(normalizeStatus(s)); }
