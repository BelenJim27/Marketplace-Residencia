"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, AlertCircle, CheckCircle2, X, Search,
  ExternalLink, TriangleAlert, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { formatMXN } from "@/lib/format-number";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { SuccessToast } from "@/components/ui/SuccessToast";

type Notice = { type: "error"; message: string };

type PagoReembolso = {
  id_pago: number;
  id_pedido: number;
  proveedor: string | null;
  payment_intent_id: string | null;
  estado: string;
  monto: string;
  moneda: string;
  creado_en: string;
  pedidos?: {
    id_pedido: number;
    estado: string;
    total: string;
    moneda: string;
    usuarios?: { nombre: string; apellido_paterno: string | null; email: string };
  } | null;
};

const ESTADOS_FILTRO = [
  { value: "", label: "Todos" },
  { value: "reembolso_pendiente_manual", label: "Pendiente manual" },
  { value: "reembolsado", label: "Reembolsado" },
  { value: "completado", label: "Completado" },
  { value: "fallido", label: "Fallido" },
];

const BADGE: Record<string, string> = {
  reembolso_pendiente_manual: "bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/30",
  reembolsado: "bg-[#A8C26B]/20 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B] border border-[#A8C26B]/40",
  completado: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30",
  fallido: "bg-[#C97A3E]/20 dark:bg-[#C97A3E]/25 text-[#C97A3E] dark:text-[#E8A87C] border border-[#C97A3E]/40",
  pendiente: "bg-[#C5CFB0]/30 dark:bg-[#3D6B3F]/10 text-[#3D6B3F]/70 dark:text-[#A8C26B]/50 border border-[#C5CFB0] dark:border-[#3D6B3F]/30",
};

const ITEMS_PER_PAGE = 10;

export default function ReembolsosAdminPage() {
  return (
    <PermissionGate requiredPermissions={["gestionar_reembolsos"]}>
      <ReembolsosAdminPageContent />
    </PermissionGate>
  );
}

function ReembolsosAdminPageContent() {
  const [pagos, setPagos] = useState<PagoReembolso[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("reembolso_pendiente_manual");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [modalPago, setModalPago] = useState<PagoReembolso | null>(null);
  const [notasModal, setNotasModal] = useState("");

  const token = getCookie("token") ?? "";
  const successToast = useSuccessToast("reembolso");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.pagos.listar(token, { estado: filtroEstado || undefined });
      setPagos(data);
      setCurrentPage(1);
    } catch (e) {
      setNotice({ type: "error", message: e instanceof Error ? e.message : "Error cargando pagos" });
    } finally {
      setLoading(false);
    }
  }, [token, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  const pendientesManual = pagos.filter((p) => p.estado === "reembolso_pendiente_manual").length;

  const pagosFiltrados = pagos.filter((p) => {
    if (!filtroBusqueda) return true;
    const q = filtroBusqueda.toLowerCase();
    return (
      String(p.id_pago).includes(q) ||
      String(p.id_pedido).includes(q) ||
      p.pedidos?.usuarios?.email?.toLowerCase().includes(q) ||
      p.payment_intent_id?.toLowerCase().includes(q) ||
      false
    );
  });

  const totalPages = Math.ceil(pagosFiltrados.length / ITEMS_PER_PAGE);
  const paginated = pagosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  async function handleResolverManual() {
    if (!modalPago) return;
    setResolviendo(modalPago.id_pago);
    try {
      await api.pagos.resolverManual(token, modalPago.id_pago, notasModal || undefined);
      setModalPago(null);
      setNotasModal("");
      await load();
      successToast.mostrar(`Pago #${modalPago?.id_pago ?? ""} marcado como reembolsado correctamente.`);
    } catch (e) {
      setNotice({ type: "error", message: e instanceof Error ? e.message : "Error al resolver" });
    } finally {
      setResolviendo(null);
    }
  }

  function abrirModal(p: PagoReembolso) {
    setModalPago(p);
    setNotasModal("");
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb pageName="Reembolsos" />

      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />

      {/* Aviso flash (solo errores) */}
      {notice && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-2 text-sm text-red-800 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{notice.message}</span>
          <button className="ml-auto" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Banner de alerta cuando hay pendientes */}
      {pendientesManual > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100 shadow-[0_2px_8px_rgba(200,50,50,0.08)]">
          <TriangleAlert size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold">
              {pendientesManual} reembolso{pendientesManual > 1 ? "s" : ""} requiere{pendientesManual > 1 ? "n" : ""} reconciliación manual
            </p>
            <p className="mt-1 text-red-700 dark:text-red-300 text-xs leading-relaxed">
              Estos pagos fueron reembolsados al cliente (vía Stripe o PayPal) pero
              al menos una transferencia hacia un productor no pudo revertirse automáticamente.
              Debes verificar en tu dashboard de Stripe que las transferencias hayan sido revertidas
              manualmente antes de marcar como resuelto.
            </p>
          </div>
        </div>
      )}

      {/* Info sobre el flujo */}
      <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3D6B3F] dark:text-[#A8C26B]" />
          <div className="text-sm text-[#1F3A2E] dark:text-[#E8E3D5]">
            <p className="font-semibold">¿Qué es un reembolso pendiente manual?</p>
            <p className="mt-1 text-xs text-[#3D6B3F]/70 dark:text-[#A8C26B]/60 leading-relaxed">
              Ocurre cuando el reembolso al comprador se procesó exitosamente en Stripe/PayPal,
              pero la reversión de la transferencia al productor falló (cuenta suspendida, disputa
              activa, etc.). El sistema bloqueó el reembolso parcial para evitar inconsistencias.
              Acción requerida: revisar en Stripe Dashboard → Transfers, revertir manualmente si
              aplica y luego marcar como resuelto aquí.
            </p>
          </div>
        </div>
      </section>

      {/* Tabla principal */}
      <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">
            Listado de reembolsos
          </h2>
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setCurrentPage(1); }}
            className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] focus:border-[#3D6B3F] focus:outline-none"
          >
            {ESTADOS_FILTRO.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3D6B3F]/40" size={14} />
            <input
              placeholder="Buscar por ID, email o intent..."
              value={filtroBusqueda}
              onChange={(e) => { setFiltroBusqueda(e.target.value); setCurrentPage(1); }}
              className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] py-2 pl-9 pr-3 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder:text-[#3D6B3F]/40 dark:placeholder:text-[#A8C26B]/30 w-64 focus:border-[#3D6B3F] focus:outline-none"
            />
          </div>
          <button
            onClick={load}
            className="ml-auto rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all"
          >
            Actualizar
          </button>
        </div>

        {/* Cards resumen */}
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-3">
            <div className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60 text-xs">Total en vista</div>
            <div className="text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5]">{pagosFiltrados.length}</div>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-3">
            <div className="text-red-700 dark:text-red-300 text-xs">Pendientes manual</div>
            <div className="text-lg font-bold text-red-800 dark:text-red-300">{pendientesManual}</div>
          </div>
          <div className="rounded-xl border border-[#A8C26B]/40 dark:border-[#A8C26B]/30 bg-[#A8C26B]/10 dark:bg-[#A8C26B]/15 p-3">
            <div className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60 text-xs">Reembolsados</div>
            <div className="text-lg font-bold text-[#3D6B3F] dark:text-[#A8C26B]">
              {pagos.filter((p) => p.estado === "reembolsado").length}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <table className="min-w-full divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20 text-sm">
            <thead className="bg-[#1F3A2E] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Pago</th>
                <th className="px-3 py-2 text-left">Pedido</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center bg-white dark:bg-[#0f1a10]">
                    <Loader2 className="mx-auto animate-spin text-[#3D6B3F]" size={22} />
                  </td>
                </tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[#3D6B3F]/60 dark:text-[#A8C26B]/50 bg-white dark:bg-[#0f1a10]">
                    No hay registros para el filtro seleccionado
                  </td>
                </tr>
              )}
              {!loading &&
                paginated.map((p) => {
                  const cliente = p.pedidos?.usuarios;
                  const nombreCliente = cliente
                    ? `${cliente.nombre} ${cliente.apellido_paterno ?? ""}`.trim()
                    : "—";
                  return (
                    <tr
                      key={p.id_pago}
                      className="odd:bg-white dark:odd:bg-[#0f1a10] even:bg-[#F4F0E3]/40 dark:even:bg-[#1a2a1f] hover:bg-[#C5CFB0]/20 dark:hover:bg-[#2d4a2e]/40 transition-all duration-150"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        <div className="font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">#{p.id_pago}</div>
                        {p.payment_intent_id && (
                          <div className="text-[#3D6B3F]/50 dark:text-[#A8C26B]/40 truncate max-w-[120px]" title={p.payment_intent_id}>
                            {p.payment_intent_id.slice(0, 18)}…
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[#1F3A2E] dark:text-[#E8E3D5] font-medium">#{p.id_pedido}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{nombreCliente}</div>
                        {cliente?.email && (
                          <div className="text-[#3D6B3F]/60 dark:text-[#A8C26B]/50 text-xs">{cliente.email}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.proveedor === "stripe"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                            : p.proveedor === "paypal"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                            : "bg-[#C5CFB0]/30 dark:bg-[#3D6B3F]/10 text-[#3D6B3F]/70 dark:text-[#A8C26B]/50"
                        }`}>
                          {p.proveedor ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">
                        {formatMXN(p.monto)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${BADGE[p.estado] ?? "bg-[#C5CFB0]/30 dark:bg-[#3D6B3F]/10 text-[#3D6B3F]/70 dark:text-[#A8C26B]/50"}`}>
                          {p.estado === "reembolso_pendiente_manual" ? "⚠ Pendiente manual" : p.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">
                        {new Date(p.creado_en).toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.estado === "reembolso_pendiente_manual" && (
                            <button
                              onClick={() => abrirModal(p)}
                              disabled={resolviendo === p.id_pago}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#A8C26B]/60 dark:border-[#A8C26B]/40 bg-[#A8C26B]/15 dark:bg-[#A8C26B]/10 px-2 py-1 text-xs text-[#3D6B3F] dark:text-[#A8C26B] font-medium hover:bg-[#A8C26B]/30 dark:hover:bg-[#A8C26B]/20 disabled:opacity-50 transition-all"
                            >
                              {resolviendo === p.id_pago
                                ? <Loader2 size={12} className="animate-spin" />
                                : <CheckCircle2 size={12} />}
                              Marcar resuelto
                            </button>
                          )}
                          <a
                            href={`/Administrador/pedidos?id=${p.id_pedido}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-2 py-1 text-xs text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all"
                          >
                            <ExternalLink size={11} /> Pedido
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-4 py-3 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <p className="text-sm text-[#1F3A2E] dark:text-[#E8E3D5]">
              Mostrando{" "}
              <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
              <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, pagosFiltrados.length)}</span>{" "}
              de <span className="font-semibold">{pagosFiltrados.length}</span>
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] dark:text-[#A8C26B] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40 hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/60 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] dark:text-[#A8C26B] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40 hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/60 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </section>

      {/* Modal de confirmación para resolver manual */}
      {modalPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#0f1a10] p-6 shadow-[0_24px_48px_rgba(31,58,46,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">
                Confirmar resolución manual
              </h2>
              <button onClick={() => setModalPago(null)} aria-label="Cerrar" className="text-[#1F3A2E] dark:text-[#E8E3D5]">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-800 dark:text-red-300">
              <p className="font-semibold mb-1">⚠ Antes de continuar verifica:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-red-700 dark:text-red-400">
                <li>Que la transferencia al productor haya sido revertida en Stripe Dashboard</li>
                <li>Que el cliente ya recibió su reembolso en su banco</li>
                <li>Que el pedido #{modalPago.id_pedido} esté cancelado</li>
              </ul>
            </div>

            <div className="mb-4 text-sm space-y-1 text-[#1F3A2E] dark:text-[#E8E3D5]">
              <div><span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Pago:</span> #{modalPago.id_pago}</div>
              <div><span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Monto:</span> {formatMXN(modalPago.monto)}</div>
              <div><span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Proveedor:</span> {modalPago.proveedor ?? "—"}</div>
              {modalPago.payment_intent_id && (
                <div className="font-mono text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/40 break-all">
                  {modalPago.payment_intent_id}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80">
                Notas de reconciliación (opcional)
              </label>
              <textarea
                value={notasModal}
                onChange={(e) => setNotasModal(e.target.value)}
                placeholder="Ej: Transfer tr_xxx revertido manualmente el 01/06/2026"
                rows={3}
                className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder:text-[#3D6B3F]/40 dark:placeholder:text-[#A8C26B]/30 focus:border-[#3D6B3F] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalPago(null)}
                className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolverManual}
                disabled={resolviendo === modalPago.id_pago}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm text-white hover:bg-[#1F3A2E] disabled:opacity-60 transition-all"
              >
                {resolviendo === modalPago.id_pago && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                <CheckCircle2 size={14} />
                Confirmar resolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
