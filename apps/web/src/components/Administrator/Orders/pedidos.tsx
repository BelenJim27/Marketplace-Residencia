"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, Pencil, Trash2, Loader2, Package, ChevronLeft, ChevronRight, Search, X, FilterX } from "lucide-react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";
import { SuccessToast } from "@/components/ui/SuccessToast";

const PAGE_SIZE = 10;

const ESTADOS = ["pendiente", "confirmado", "preparando", "enviado", "entregado", "cancelado"] as const;

interface Productor {
  id_productor: number;
  nombre_marca: string | null;
  marca?: string | null;
  usuarios?: { nombre: string; apellido_paterno: string };
}

interface DetallePedido {
  id_detalle: number;
  id_productor: number | null;
  productores?: Productor | null;
  cantidad?: number;
  precio_compra?: string | number;
  moneda_compra?: string;
  productos?: { nombre: string; imagen_principal_url?: string | null } | null;
}

interface Envio {
  id_envio: number;
  estado: string;
  numero_rastreo?: string | null;
  transportistas?: { nombre: string } | null;
}

interface Pedido {
  id_pedido: number;
  estado: string;
  total: string | number;
  moneda?: string;
  fecha_creacion: string;
  usuarios?: { nombre: string; email: string };
  detalle_pedido?: DetallePedido[];
  envios?: Envio[];
}

const STATUS_STYLES: Record<string, string> = {
  pendiente:  "bg-[#C97A3E]/15 text-[#C97A3E] border-[#C97A3E]/30",
  confirmado: "bg-[#3D6B3F]/10 text-[#3D6B3F] border-[#3D6B3F]/20",
  preparando: "bg-[#1F3A2E]/10 text-[#1F3A2E] border-[#1F3A2E]/20",
  enviado:    "bg-[#A8C26B]/20 text-[#3D6B3F] border-[#A8C26B]/40",
  entregado:  "bg-[#A8C26B]/25 text-[#3D6B3F] border-[#A8C26B]/50",
  cancelado:  "bg-red-50 text-red-600 border-red-100",
};

const AVATAR_COLORS = [
  "bg-[#C97A3E]/20 text-[#C97A3E]",
  "bg-[#3D6B3F]/15 text-[#3D6B3F]",
  "bg-[#A8C26B]/25 text-[#1F3A2E]",
  "bg-[#1F3A2E]/15 text-[#1F3A2E]",
  "bg-[#C5CFB0]/40 text-[#3D6B3F]",
];

function getInitials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatTotal(total: string | number): string {
  const num = typeof total === "string" ? parseFloat(total) : total;
  if (isNaN(num)) return String(total);
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
}

function productorLabel(p: Productor): string {
  const nombre = p.usuarios ? `${p.usuarios.nombre} ${p.usuarios.apellido_paterno}`.trim() : "";
  const marca  = p.nombre_marca ?? p.marca ?? null;
  return marca ? `${marca}${nombre ? ` (${nombre})` : ""}` : nombre || `Productor #${p.id_productor}`;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Pedidos() {
  const token = getCookie("token") ?? "";

  const [pedidos, setPedidos]               = useState<Pedido[]>([]);
  const [productoresMap, setProductoresMap] = useState<Map<number, Productor>>(new Map());
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [searchTerm, setSearchTerm]         = useState("");
  const [productorFilter, setProductorFilter] = useState<string>("");
  const [page, setPage]                     = useState(1);
  const [detalleModal, setDetalleModal]     = useState<Pedido | null>(null);
  const [editModal, setEditModal]           = useState<Pedido | null>(null);

  const deleteAlert  = useDeleteAlert("pedido");
  const successToast = useSuccessToast("pedido");

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      setError(null);
      const pedidosData = await api.pedidos.getAll();
      setPedidos(pedidosData as Pedido[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductores = async () => {
    try {
      const data = await api.productores.getAll();
      const map = new Map<number, Productor>();
      for (const p of data as Productor[]) {
        map.set(Number(p.id_productor), p);
      }
      setProductoresMap(map);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    fetchPedidos();
    fetchProductores();
  }, []);

  // Todos los productores registrados (no solo los que aparecen en pedidos)
  const productores = useMemo(
    () =>
      [...productoresMap.values()].sort((a, b) =>
        productorLabel(a).localeCompare(productorLabel(b)),
      ),
    [productoresMap],
  );

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filterNum = productorFilter !== "" ? Number(productorFilter) : null;
    return pedidos.filter((p) => {
      const matchSearch =
        term === "" ||
        String(p.id_pedido).includes(term) ||
        p.usuarios?.nombre?.toLowerCase().includes(term) ||
        p.estado?.toLowerCase().includes(term);

      const matchProductor =
        filterNum === null ||
        (p.detalle_pedido ?? []).some((d) => Number(d.id_productor) === filterNum);

      return matchSearch && matchProductor;
    });
  }, [pedidos, searchTerm, productorFilter]);

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearchTerm("");
    setProductorFilter("");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const counts = {
    total:      pedidos.length,
    pendiente:  pedidos.filter((p) => p.estado === "pendiente").length,
    enviado:    pedidos.filter((p) => p.estado === "enviado").length,
    completado: pedidos.filter((p) => p.estado === "entregado").length,
    cancelado:  pedidos.filter((p) => p.estado === "cancelado").length,
  };

  const handleDelete = (pedido: Pedido) => {
    const nombre = `#${pedido.id_pedido}${pedido.usuarios?.nombre ? ` — ${pedido.usuarios.nombre}` : ""}`;
    deleteAlert.abrir(nombre, async () => {
      const token = getCookie("token") || "";
      await api.pedidos.delete(token, String(pedido.id_pedido));
      await fetchPedidos();
      successToast.mostrar("Pedido eliminado correctamente.");
    });
  };

  const handleEstadoActualizado = async () => {
    setEditModal(null);
    await fetchPedidos();
    successToast.mostrar("Estado actualizado correctamente.");
  };

  const handleExportCSV = () => {
    const rows = [
      ["ID Pedido", "Cliente", "Email", "Fecha", "Total", "Estado"],
      ...filtered.map((p) => [
        String(p.id_pedido),
        p.usuarios?.nombre ?? "—",
        p.usuarios?.email ?? "—",
        p.fecha_creacion ? formatDate(p.fecha_creacion) : "—",
        formatTotal(p.total),
        p.estado,
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "pedidos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#3D6B3F]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchPedidos} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1F3A2E] tracking-tight [font-family:'Playfair_Display',serif]">
          Gestión de Pedidos
        </h1>
        <p className="text-[#3D6B3F]/70 text-sm mt-0.5">
          Administra y gestiona las órdenes de compra de mezcal
        </p>
      </div>

      {/* Stats */}
      <div data-tour="pedidos-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Pedidos",  value: counts.total,      color: "text-[#1F3A2E]" },
          { label: "Pendientes",     value: counts.pendiente,  color: "text-[#C97A3E]" },
          { label: "Enviados",       value: counts.enviado,    color: "text-[#3D6B3F]" },
          { label: "Completados",    value: counts.completado, color: "text-[#3D6B3F]" },
          { label: "Cancelados",     value: counts.cancelado,  color: "text-red-500"   },
        ].map((s) => (
          <div key={s.label} className="bg-[#F4F0E3] p-5 rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <p className="text-sm font-semibold text-[#3D6B3F]/70 uppercase tracking-wider">{s.label}</p>
            <h2 className={`text-2xl font-bold mt-1 [font-family:'DM_Sans',sans-serif] ${s.color}`}>{s.value.toLocaleString()}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div data-tour="pedidos-filtros" className="bg-[#F4F0E3] rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-5 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Búsqueda */}
          <div className="relative flex-grow min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3D6B3F]/40" />
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
              placeholder="Buscar por ID, cliente o estado..."
              className="w-full border border-[#C5CFB0] pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent transition-all bg-white text-[#1F3A2E] placeholder-[#3D6B3F]/50"
            />
          </div>

          {/* Filtro productor */}
          <select
            value={productorFilter}
            onChange={(e) => { setProductorFilter(e.target.value); resetPage(); }}
            className="border border-[#C5CFB0] bg-white px-4 py-2.5 rounded-xl text-sm text-[#1F3A2E] outline-none focus:ring-2 focus:ring-[#3D6B3F] transition-all min-w-[200px]"
          >
            <option value="">Todos los productores</option>
            {productores.map((p) => (
              <option key={p.id_productor} value={String(p.id_productor)}>
                {productorLabel(p)}
              </option>
            ))}
          </select>

          {/* Limpiar filtros */}
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 bg-white text-[#C97A3E] text-sm font-medium px-4 py-2.5 rounded-xl border border-[#C97A3E]/30 hover:bg-[#C97A3E]/10 transition-all duration-200"
          >
            <FilterX size={15} />
            Limpiar filtros
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-[#F4F0E3] text-[#1F3A2E] text-sm font-medium px-4 py-2.5 rounded-xl border border-[#C5CFB0] hover:bg-[#C5CFB0]/30 transition-all duration-200"
          >
            Exportar CSV
          </button>
        </div>

        {/* Tabla */}
        <div data-tour="pedidos-tabla" className="overflow-x-auto rounded-2xl border border-[#C5CFB0]">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead className="bg-[#1F3A2E] text-xs font-semibold text-white uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ID Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Productor(es)</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CFB0]/30">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#3D6B3F]/70 text-sm bg-white">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No hay pedidos
                  </td>
                </tr>
              ) : (
                paginated.map((pedido) => {
                  const productoresEnPedido = [
                    ...new Set(
                      (pedido.detalle_pedido ?? [])
                        .map((d) => d.id_productor)
                        .filter((id): id is number => id != null),
                    ),
                  ]
                    .map((id) => productoresMap.get(id))
                    .filter((p): p is Productor => p !== undefined);

                  return (
                    <tr key={pedido.id_pedido} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-all duration-200">
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm text-[#1F3A2E]">#{pedido.id_pedido}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full ${getAvatarColor(pedido.id_pedido)} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                            {getInitials(pedido.usuarios?.nombre)}
                          </span>
                          <span className="text-sm font-medium text-[#1F3A2E]">
                            {pedido.usuarios?.nombre || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {productoresEnPedido.length === 0 ? (
                            <span className="text-sm text-[#3D6B3F]/50">—</span>
                          ) : (
                            productoresEnPedido.map((pr) => (
                              <span
                                key={pr.id_productor}
                                className="inline-flex rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]"
                              >
                                {productorLabel(pr)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#3D6B3F]/70">
                        {pedido.fecha_creacion ? formatDate(pedido.fecha_creacion) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[#1F3A2E]">
                        {formatTotal(pedido.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLES[pedido.estado] ?? "bg-[#C5CFB0]/30 text-[#3D6B3F]/70 border-[#C5CFB0]"}`}>
                          {pedido.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-1">
                          <button onClick={() => setDetalleModal(pedido)} title="Ver detalles" className="p-1.5 text-[#3D6B3F]/50 hover:text-[#3D6B3F] hover:bg-[#A8C26B]/20 rounded-lg transition-all duration-200">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => setEditModal(pedido)} title="Editar estado" className="p-1.5 text-[#3D6B3F]/50 hover:text-[#C97A3E] hover:bg-[#C97A3E]/10 rounded-lg transition-all duration-200">
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(pedido)}
                            title="Eliminar"
                            className="p-1.5 text-[#3D6B3F]/50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <p className="text-sm text-[#1F3A2E]">
              Mostrando <span className="font-semibold">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold">{Math.min(page * PAGE_SIZE, filtered.length)}</span> de <span className="font-semibold">{filtered.length}</span> pedidos
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Modales */}
      <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />
      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />

      {detalleModal && (
        <DetallePedidoModal
          pedido={detalleModal}
          productoresMap={productoresMap}
          onClose={() => setDetalleModal(null)}
        />
      )}

      {editModal && (
        <EditarEstadoPedidoModal
          pedido={editModal}
          onClose={() => setEditModal(null)}
          onSaved={handleEstadoActualizado}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-[#C5CFB0]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C5CFB0] bg-[#F4F0E3]">
          <h2 className="text-lg font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">{title}</h2>
          <button onClick={onClose} className="p-1 text-[#3D6B3F]/60 hover:text-[#1F3A2E] rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[#C5CFB0] bg-[#F4F0E3]/60 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLES[estado] ?? "bg-[#C5CFB0]/30 text-[#3D6B3F]/70 border-[#C5CFB0]"}`}>
      {estado}
    </span>
  );
}

function DetallePedidoModal({
  pedido,
  productoresMap,
  onClose,
}: {
  pedido: Pedido;
  productoresMap: Map<number, Productor>;
  onClose: () => void;
}) {
  const [data, setData]       = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const fetchDetalle = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getCookie("token") || "";
        const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${base}/pedidos/${pedido.id_pedido}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        if (!cancelado) setData(json as Pedido);
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchDetalle();
    return () => { cancelado = true; };
  }, [pedido.id_pedido]);

  const moneda = data?.moneda ?? pedido.moneda ?? "MXN";
  const envio  = data?.envios?.[0];

  return (
    <ModalShell title={`Pedido #${pedido.id_pedido}`} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin text-[#3D6B3F]" />
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm py-4">{error}</p>
      ) : data ? (
        <div className="space-y-4 text-sm">
          {/* Resumen */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#1F3A2E]">{data.usuarios?.nombre || "—"}</p>
              {data.usuarios?.email && <p className="text-[#3D6B3F]/70">{data.usuarios.email}</p>}
              <p className="text-[#3D6B3F]/70 mt-1">
                {data.fecha_creacion ? formatDate(data.fecha_creacion) : "—"}
              </p>
            </div>
            <EstadoBadge estado={data.estado} />
          </div>

          <div className="flex justify-between border-y border-[#C5CFB0]/40 py-2">
            <span className="text-[#3D6B3F]/70">Total</span>
            <span className="font-bold text-[#1F3A2E]">{formatTotal(data.total)}</span>
          </div>

          {/* Productos */}
          <div>
            <p className="font-semibold text-[#1F3A2E] mb-2">Productos</p>
            <ul className="space-y-2">
              {(data.detalle_pedido ?? []).map((d) => {
                const pr = d.id_productor != null ? productoresMap.get(d.id_productor) : undefined;
                const subtotal =
                  d.precio_compra != null && d.cantidad != null
                    ? Number(d.precio_compra) * d.cantidad
                    : null;
                return (
                  <li key={d.id_detalle} className="flex items-start justify-between gap-3 bg-[#F4F0E3]/50 rounded-xl px-3 py-2">
                    <div>
                      <p className="font-medium text-[#1F3A2E]">{d.productos?.nombre ?? `Producto #${d.id_detalle}`}</p>
                      <p className="text-[#3D6B3F]/70 text-xs">
                        {pr ? productorLabel(pr) : "—"}
                        {d.cantidad != null && ` · ${d.cantidad} u.`}
                      </p>
                    </div>
                    {subtotal != null && (
                      <span className="font-semibold text-[#1F3A2E] whitespace-nowrap">{formatTotal(subtotal)}</span>
                    )}
                  </li>
                );
              })}
              {(data.detalle_pedido ?? []).length === 0 && (
                <li className="text-[#3D6B3F]/60">Sin productos en este pedido.</li>
              )}
            </ul>
          </div>

          {/* Envío */}
          <div>
            <p className="font-semibold text-[#1F3A2E] mb-1">Envío</p>
            {!envio ? (
              <p className="text-[#3D6B3F]/60">Aún no hay envío registrado.</p>
            ) : (
              <div className="text-[#3D6B3F]/80 space-y-0.5">
                <p>Estado: <span className="font-medium text-[#1F3A2E]">{envio.estado}</span></p>
                {envio.transportistas?.nombre && (
                  <p>Transportista: <span className="font-medium text-[#1F3A2E]">{envio.transportistas.nombre}</span></p>
                )}
                {envio.numero_rastreo && (
                  <p>Rastreo: <span className="font-mono font-medium text-[#1F3A2E]">{envio.numero_rastreo}</span></p>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#3D6B3F]/50">Moneda: {moneda}</p>
        </div>
      ) : null}
    </ModalShell>
  );
}

const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

function EditarEstadoPedidoModal({
  pedido,
  onClose,
  onSaved,
}: {
  pedido: Pedido;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, setEstado]   = useState(pedido.estado);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = getCookie("token") || "";
      await api.pedidos.update(token, String(pedido.id_pedido), { estado });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Editar estado · Pedido #${pedido.id_pedido}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#3D6B3F] border border-[#C5CFB0] hover:bg-[#C5CFB0]/30 disabled:opacity-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || estado === pedido.estado}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#3D6B3F] hover:bg-[#1F3A2E] disabled:opacity-50 transition-all inline-flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block font-medium text-[#1F3A2E]">Estado del pedido</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="w-full border border-[#C5CFB0] bg-white px-4 py-2.5 rounded-xl text-[#1F3A2E] outline-none focus:ring-2 focus:ring-[#3D6B3F] transition-all capitalize"
        >
          {STATUS_OPTIONS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </ModalShell>
  );
}
