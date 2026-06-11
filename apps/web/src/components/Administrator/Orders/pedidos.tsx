"use client";

import { useEffect, useMemo, useState } from "react";
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
}

interface Pedido {
  id_pedido: number;
  estado: string;
  total: string | number;
  fecha_creacion: string;
  usuarios?: { nombre: string; email: string };
  detalle_pedido?: DetallePedido[];
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

// ── Modal de detalle ──────────────────────────────────────────────────────────
function ViewModal({ pedido, productoresMap, onClose }: {
  pedido: Pedido;
  productoresMap: Map<number, Productor>;
  onClose: () => void;
}) {
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
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-[0_24px_48px_rgba(31,58,46,0.25)] overflow-hidden border border-[#C5CFB0]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-[#1F3A2E]">
          <div>
            <h2 className="text-xl font-extrabold text-white [font-family:'Playfair_Display',serif]">
              Detalles del Pedido
            </h2>
            <p className="text-xs text-white/60">ID: #{pedido.id_pedido}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all duration-200"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Cliente */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1F3A2E]">Cliente</label>
            <input
              type="text"
              value={pedido.usuarios?.nombre || "—"}
              disabled
              className="w-full px-4 py-2 text-sm bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-70"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1F3A2E]">Email</label>
            <input
              type="text"
              value={pedido.usuarios?.email || "—"}
              disabled
              className="w-full px-4 py-2 text-sm bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-70"
            />
          </div>

          {/* Fecha + Total */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#1F3A2E]">Fecha</label>
              <input
                type="text"
                value={pedido.fecha_creacion ? formatDate(pedido.fecha_creacion) : "—"}
                disabled
                className="w-full px-4 py-2 text-sm bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-70"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#1F3A2E]">Total</label>
              <input
                type="text"
                value={formatTotal(pedido.total)}
                disabled
                className="w-full px-4 py-2 text-sm bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-70 font-semibold"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1F3A2E]">Estado</label>
            <div className="flex items-center px-4 py-2 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLES[pedido.estado] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {pedido.estado}
              </span>
            </div>
          </div>

          {/* Productores */}
          {productoresEnPedido.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#1F3A2E]">Productor(es)</label>
              <div className="flex flex-wrap gap-1.5 px-4 py-2.5 bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl min-h-[38px]">
                {productoresEnPedido.map((pr) => (
                  <span
                    key={pr.id_productor}
                    className="inline-flex rounded-full bg-[#3D6B3F]/10 px-2.5 py-0.5 text-xs font-medium text-[#3D6B3F]"
                  >
                    {productorLabel(pr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-[#C5CFB0]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#F4F0E3] text-[#1F3A2E] text-sm font-medium rounded-xl border border-[#C5CFB0] hover:bg-[#C5CFB0]/30 transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de edición ──────────────────────────────────────────────────────────
function EditModal({ pedido, token, onClose, onSaved }: {
  pedido: Pedido;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, setEstado] = useState(pedido.estado);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const handleSave = async () => {
    if (estado === pedido.estado) { onClose(); return; }
    try {
      setSaving(true);
      setErr(null);
      await api.pedidos.update(token, String(pedido.id_pedido), { estado });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-[0_24px_48px_rgba(31,58,46,0.25)] overflow-hidden border border-[#C5CFB0]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-[#1F3A2E]">
          <div>
            <h2 className="text-xl font-extrabold text-white [font-family:'Playfair_Display',serif]">
              Editar Pedido
            </h2>
            <p className="text-xs text-white/60">ID: #{pedido.id_pedido}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Cliente (solo lectura) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1F3A2E]">Cliente</label>
            <input
              type="text"
              value={pedido.usuarios?.nombre || "—"}
              disabled
              className="w-full px-4 py-2 text-sm bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] opacity-60"
            />
          </div>

          {/* Estado (editable) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1F3A2E]">Estado del pedido</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-4 py-3 text-base bg-[#F4F0E3] border border-[#C5CFB0] rounded-xl text-[#1F3A2E] outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent transition-all"
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {err && (
            <p className="text-sm text-red-600">{err}</p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-[#C5CFB0]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 bg-[#F4F0E3] text-[#1F3A2E] text-sm font-medium rounded-xl border border-[#C5CFB0] hover:bg-[#C5CFB0]/30 transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-[#3D6B3F] text-white text-sm font-medium rounded-xl hover:bg-[#1F3A2E] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [viewPedido, setViewPedido]         = useState<Pedido | null>(null);
  const [editPedido, setEditPedido]         = useState<Pedido | null>(null);

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
      await api.pedidos.delete(token ?? "", String(pedido.id_pedido));
      await fetchPedidos();
      successToast.mostrar("Pedido eliminado correctamente.");
    });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
      <div className="bg-[#F4F0E3] rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-5 space-y-3">
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
        <div className="overflow-x-auto rounded-2xl border border-[#C5CFB0]">
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
                          <button
                            onClick={() => setViewPedido(pedido)}
                            title="Ver detalle"
                            className="p-1.5 text-[#3D6B3F]/50 hover:text-[#3D6B3F] hover:bg-[#A8C26B]/20 rounded-lg transition-all duration-200"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setEditPedido(pedido)}
                            title="Editar estado"
                            className="p-1.5 text-[#3D6B3F]/50 hover:text-[#C97A3E] hover:bg-[#C97A3E]/10 rounded-lg transition-all duration-200"
                          >
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
      {viewPedido && (
        <ViewModal
          pedido={viewPedido}
          productoresMap={productoresMap}
          onClose={() => setViewPedido(null)}
        />
      )}
      {editPedido && (
        <EditModal
          pedido={editPedido}
          token={token}
          onClose={() => setEditPedido(null)}
          onSaved={fetchPedidos}
        />
      )}

      <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />
      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />
    </div>
  );
}
