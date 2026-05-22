"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { api } from "@/lib/api";

interface Pedido {
  id_pedido: number;
  estado: string;
  total: string | number;
  fecha_creacion: string;
  usuarios?: { nombre: string; email: string };
  detalle_pedido?: unknown[];
}

const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-600 border-amber-100",
  confirmado: "bg-blue-50 text-blue-600 border-blue-100",
  preparando: "bg-indigo-50 text-indigo-600 border-indigo-100",
  enviado: "bg-cyan-50 text-cyan-600 border-cyan-100",
  entregado: "bg-green-50 text-green-700 border-green-100",
  cancelado: "bg-red-50 text-red-600 border-red-100",
};

const AVATAR_COLORS = [
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTotal(total: string | number): string {
  const num = typeof total === "string" ? parseFloat(total) : total;
  if (isNaN(num)) return String(total);
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.pedidos.getAll();
      setPedidos(data as Pedido[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = pedidos.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      term === "" ||
      String(p.id_pedido).includes(term) ||
      p.usuarios?.nombre?.toLowerCase().includes(term) ||
      p.estado?.toLowerCase().includes(term)
    );
  });

  const counts = {
    total: pedidos.length,
    pendiente: pedidos.filter((p) => p.estado === "pendiente").length,
    enviado: pedidos.filter((p) => p.estado === "enviado").length,
    completado: pedidos.filter((p) => p.estado === "entregado").length,
    cancelado: pedidos.filter((p) => p.estado === "cancelado").length,
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchPedidos}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Gestión de Pedidos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Administra y gestiona las órdenes de compra de mezcal
          </p>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} pedidos
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">Total Pedidos</p>
          <h2 className="text-2xl font-black mt-1 text-slate-800 dark:text-white">{counts.total.toLocaleString()}</h2>
        </div>
        <div className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">Pendientes</p>
          <h2 className="text-2xl font-black mt-1 text-amber-600">{counts.pendiente}</h2>
        </div>
        <div className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">Enviados</p>
          <h2 className="text-2xl font-black mt-1 text-blue-600">{counts.enviado}</h2>
        </div>
        <div className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">Completados</p>
          <h2 className="text-2xl font-black mt-1 text-green-600">{counts.completado}</h2>
        </div>
        <div className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">Cancelados</p>
          <h2 className="text-2xl font-black mt-1 text-red-500">{counts.cancelado}</h2>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-2xl border border-gray-100 dark:border-dark-3 p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="flex-grow min-w-[300px]">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, cliente o estado..."
              className="w-full border border-gray-200 dark:border-dark-3 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white dark:bg-dark-2 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-dark-6"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="border border-gray-200 dark:border-dark-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-dark-2 hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors text-gray-700 dark:text-dark-6"
          >
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-dark-3">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-dark-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6 border-b border-gray-100 dark:border-dark-3">
              <tr>
                <th className="py-4 px-6">ID Pedido</th>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No hay pedidos
                  </td>
                </tr>
              ) : (
                filtered.map((pedido) => (
                  <tr key={pedido.id_pedido} className="hover:bg-gray-50/50 dark:hover:bg-dark-3/50 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">#{pedido.id_pedido}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full ${getAvatarColor(pedido.id_pedido)} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                          {getInitials(pedido.usuarios?.nombre)}
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {pedido.usuarios?.nombre || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 dark:text-dark-6">
                      {pedido.fecha_creacion ? formatDate(pedido.fecha_creacion) : "—"}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-700 dark:text-slate-200">
                      {formatTotal(pedido.total)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLES[pedido.estado] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Eye size={16} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
