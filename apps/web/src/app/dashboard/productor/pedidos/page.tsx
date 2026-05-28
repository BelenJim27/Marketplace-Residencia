"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

interface PedidoProductor {
  id_pedido: number;
  estado_productor: string;
  estado_pedido: string;
  cliente: { nombre: string; email: string };
  total_parcial: number;
  moneda: string;
  fecha_creacion: string;
  detalles: any[];
}

const ESTADOS = ["todos", "pendiente", "confirmado", "preparando", "enviado", "entregado"];
const PAGE_SIZE = 10;

function estadoBadgeCls(estado: string) {
  switch (estado) {
    case "entregado": return "bg-[#A8C26B]/20 text-[#3D6B3F]";
    case "enviado": return "bg-blue-100 text-blue-800";
    case "preparando": return "bg-amber-100 text-amber-800";
    case "confirmado": return "bg-[#C5CFB0]/40 text-[#1F3A2E]";
    default: return "bg-[#C97A3E]/15 text-[#C97A3E]";
  }
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function PedidosProductor() {
  const { user, isProductor } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoProductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isProductor || !user?.id_productor) {
      setLoading(false);
      return;
    }

    const fetchPedidos = async () => {
      try {
        const token = getCookie("token") || "";
        const res = await api.pedidos.getMisPedidosByProductor(token, user.id_productor!);
        setPedidos(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [user, isProductor]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado]);

  const pedidosFiltrados = useMemo(
    () => pedidos.filter((p) => filtroEstado === "todos" || p.estado_productor === filtroEstado),
    [pedidos, filtroEstado],
  );

  const totalPages = Math.max(1, Math.ceil(pedidosFiltrados.length / PAGE_SIZE));

  const pedidosPaginados = useMemo(
    () => pedidosFiltrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [pedidosFiltrados, currentPage],
  );

  const from = pedidosFiltrados.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, pedidosFiltrados.length);

  if (!isProductor) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">No tienes acceso a esta página.</div>;
  }

  const btnPageBase = "rounded-lg border border-[#C5CFB0] px-3 py-1.5 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/20 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Mis Pedidos</h1>
        <p className="text-sm text-[#3D6B3F]/70">Gestiona y consulta los pedidos de tus tiendas.</p>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filtroEstado === estado
                ? "bg-[#3D6B3F] text-white"
                : "border border-[#C5CFB0] text-[#1F3A2E] hover:bg-[#C5CFB0]/20"
            }`}
          >
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] px-5 py-10 text-center text-[#3D6B3F]/60">
          {filtroEstado === "todos" ? "No tienes pedidos aún" : `No hay pedidos en estado "${filtroEstado}"`}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#1F3A2E]">
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                    <th className="px-5 py-4">Pedido ID</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Productos</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosPaginados.map((pedido) => (
                    <tr key={pedido.id_pedido}
                      className="border-t border-[#C5CFB0]/30 bg-white text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20">
                      <td className="px-5 py-4 font-medium text-[#1F3A2E]">#{pedido.id_pedido}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-[#1F3A2E]">{pedido.cliente.nombre}</div>
                        <div className="text-xs text-[#3D6B3F]/60">{pedido.cliente.email}</div>
                      </td>
                      <td className="px-5 py-4 text-[#3D6B3F]/70">
                        {pedido.detalles.length} producto{pedido.detalles.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-4 font-medium text-[#1F3A2E]">
                        {pedido.total_parcial.toFixed(2)} {pedido.moneda}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${estadoBadgeCls(pedido.estado_productor)}`}>
                          {pedido.estado_productor}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#3D6B3F]/60">
                        {new Date(pedido.fecha_creacion).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/productor/pedidos/${pedido.id_pedido}`}
                          className="rounded-xl border border-[#C5CFB0] px-3 py-1.5 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/20"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] px-5 py-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)] sm:flex-row sm:justify-between">
            <p className="text-sm text-[#3D6B3F]/70">
              {from}–{to} de {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className={btnPageBase}>‹</button>
              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`el-${i}`} className="px-2 text-sm text-[#3D6B3F]/50">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      p === currentPage
                        ? "bg-[#3D6B3F] text-white"
                        : "border border-[#C5CFB0] text-[#1F3A2E] hover:bg-[#C5CFB0]/20"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className={btnPageBase}>›</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
