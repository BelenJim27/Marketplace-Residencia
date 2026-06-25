// @ts-nocheck — tipos pendientes de revisar (pre-existentes antes de activar strict TS build)
"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, X, Search, Play, Eye, Undo2, ChevronLeft, ChevronRight } from "lucide-react";
import { api, type Payout, type PayoutDetalle } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { formatMXN, formatPrice } from "@/lib/format-number";
import { PermissionGate } from "@/components/auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { AlertService } from "@/shared/alerts/alert.service";

type Notice = { type: "success" | "error"; message: string };
const ESTADOS = ["pendiente", "en_proceso", "procesado", "pagado", "fallido", "agotado", "cancelado"] as const;
const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-[#C97A3E]/15 dark:bg-[#C97A3E]/20 text-[#C97A3E] dark:text-[#E8A87C] border border-[#C97A3E]/30",
  en_proceso: "bg-[#3D6B3F]/10 dark:bg-[#3D6B3F]/20 text-[#3D6B3F] dark:text-[#A8C26B] border border-[#3D6B3F]/20",
  procesado: "bg-[#A8C26B]/20 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B] border border-[#A8C26B]/40",
  pagado: "bg-[#A8C26B]/25 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B] border border-[#A8C26B]/50",
  fallido: "bg-[#C97A3E]/20 dark:bg-[#C97A3E]/25 text-[#C97A3E] dark:text-[#E8A87C] border border-[#C97A3E]/40",
  agotado: "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30",
  cancelado: "bg-[#C5CFB0]/30 dark:bg-[#3D6B3F]/10 text-[#3D6B3F]/70 dark:text-[#A8C26B]/50 border border-[#C5CFB0] dark:border-[#3D6B3F]/30",
};

const ESTADOS_MANUALES = ["pendiente", "en_proceso", "procesado", "pagado", "fallido", "cancelado"] as const;

type ResumenPendiente = {
  id_productor: number;
  nombre: string;
  resumen_por_moneda: {
    moneda: string;
    pedidos_pendientes: number;
    monto_bruto_total: string;
    comision_total: string;
    monto_neto_total: string;
  }[];
  metodos_disponibles: {
    stripe: boolean;
    paypal: boolean;
  };
};

export default function PayoutsAdminPage() {
  return (
    <PermissionGate requiredPermissions={["gestionar_payouts"]}>
      <PayoutsAdminPageContent />
    </PermissionGate>
  );
}

function PayoutsAdminPageContent() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroProductor, setFiltroProductor] = useState("");

  const [resumenPendientes, setResumenPendientes] = useState<ResumenPendiente[]>([]);
  const [resumenLoading, setResumenLoading] = useState(false);

  const [genForm, setGenForm] = useState({ desde: "", hasta: "", proveedor: "" });
  const [generando, setGenerando] = useState(false);
  const [genResultado, setGenResultado] = useState<{ creados: number; payouts: { id_payout: string; id_productor: number; moneda: string; cuenta: number }[] } | null>(null);

  const [estadoModal, setEstadoModal] = useState<Payout | null>(null);
  const [estadoForm, setEstadoForm] = useState({ estado: "pendiente", referencia_externa: "", notas: "" });
  const [updatingEstado, setUpdatingEstado] = useState(false);

  const [detalleModal, setDetalleModal] = useState<PayoutDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [reembolsando, setReembolsando] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const token = getCookie("token") ?? "";

  async function load() {
    setLoading(true);
    try {
      const q: { id_productor?: number; estado?: string } = {};
      if (filtroEstado) q.estado = filtroEstado;
      if (filtroProductor) q.id_productor = Number(filtroProductor);
      const data = await api.payouts.list(token, q);
      setPayouts(data);
    } catch (e) {
      setNotice({ type: "error", message: e instanceof Error ? e.message : "Error cargando payouts" });
    } finally {
      setLoading(false);
    }
  }

  async function loadResumenPendientes() {
    setResumenLoading(true);
    try {
      const data = await api.payouts.resumenPendientes(token);
      setResumenPendientes(data);
    } catch (e) {
      setNotice({ type: "error", message: e instanceof Error ? e.message : "Error cargando resumen" });
    } finally {
      setResumenLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadResumenPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroProductor]);

  async function handleGenerar(e: React.FormEvent) {
    e.preventDefault();
    if (!genForm.desde || !genForm.hasta) {
      setNotice({ type: "error", message: "Selecciona el rango de fechas" });
      return;
    }
    setGenerando(true);
    setGenResultado(null);
    try {
      const res = await api.payouts.generar(token, {
        desde: genForm.desde,
        hasta: genForm.hasta,
        proveedor: genForm.proveedor || undefined,
      });
      setGenResultado(res);
      setNotice({ type: "success", message: `${res.creados} payouts creados` });
      await load();
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Error generando payouts" });
    } finally {
      setGenerando(false);
    }
  }

  function openEstado(p: Payout) {
    setEstadoModal(p);
    setEstadoForm({ estado: p.estado, referencia_externa: p.referencia_externa ?? "", notas: p.notas ?? "" });
  }

  async function handleEstadoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!estadoModal) return;
    setUpdatingEstado(true);
    try {
      await api.payouts.actualizarEstado(token, estadoModal.id_payout, {
        estado: estadoForm.estado,
        referencia_externa: estadoForm.referencia_externa || undefined,
        notas: estadoForm.notas || undefined,
      });
      setNotice({ type: "success", message: "Estado actualizado" });
      setEstadoModal(null);
      await load();
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Error actualizando" });
    } finally {
      setUpdatingEstado(false);
    }
  }

  async function handleReembolsar(p: Payout) {
    const confirmed = await AlertService.showConfirm({
      title: "Confirmar reembolso",
      text: `¿Estás seguro de que deseas reembolsar el payout #${p.id_payout}? Esta acción no se puede deshacer.`,
      variant: "danger",
    });
    if (!confirmed) return;
    setReembolsando(p.id_payout);
    try {
      const token = getCookie("token") ?? "";
      const idPago = p.id_payout;
      await api.pagos.reembolsar(token, idPago);
      setNotice({ type: "success", message: `Payout #${p.id_payout} reembolsado exitosamente` });
      await load();
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Error al reembolsar" });
    } finally {
      setReembolsando(null);
    }
  }

  async function openDetalle(p: Payout) {
    setDetalleLoading(true);
    try {
      const det = await api.payouts.get(token, p.id_payout);
      setDetalleModal(det);
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Error cargando detalle" });
    } finally {
      setDetalleLoading(false);
    }
  }

  const totalPages = Math.ceil(payouts.length / itemsPerPage);
  const paginatedPayouts = payouts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totales = useMemo(() => {
    return payouts.reduce(
      (acc, p) => {
        acc.bruto += Number(p.monto_bruto);
        acc.comision += Number(p.monto_comision);
        acc.neto += Number(p.monto_neto);
        return acc;
      },
      { bruto: 0, comision: 0, neto: 0 },
    );
  }, [payouts]);

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb pageName="Payouts" />

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${
            notice.type === "success"
              ? "border-[#A8C26B]/40 dark:border-[#A8C26B]/30 bg-[#A8C26B]/10 dark:bg-[#A8C26B]/15 text-[#3D6B3F] dark:text-[#A8C26B]"
              : "border-red-300 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notice.message}</span>
          <button className="ml-auto" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {payouts.some((p) => p.estado === "agotado") && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Hay payouts agotados que requieren intervención manual</p>
            <p className="mt-0.5 text-red-700 dark:text-red-300">
              Estos pagos fallaron después de 5 intentos automáticos. Causas comunes: onboarding incompleto en Stripe, disputas/chargebacks activos, o problemas en la cuenta bancaria. Revisa el diagnóstico en cada payout y contacta al productor.
            </p>
          </div>
          <button
            onClick={() => setFiltroEstado("agotado")}
            className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
          >
            Ver agotados
          </button>
        </div>
      )}

      {/* Información de retención configurable */}
      <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3D6B3F] dark:text-[#A8C26B]" />
          <div className="flex-1 text-sm text-[#1F3A2E] dark:text-[#E8E3D5]">
            <p className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">Período de retención activo</p>
            <p className="mt-1 text-xs text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Los pagos se retienen hasta la entrega confirmada + período configurado para proteger contra disputas y chargebacks. Usa la sección de generación para liberar pagos manuales cuando sea necesario.</p>
          </div>
        </div>
      </section>

      {/* Generar payouts */}
      <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h2 className="mb-3 text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Generar payouts por periodo</h2>
        <form onSubmit={handleGenerar} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-[#1F3A2E] dark:text-[#A8C26B]/80">Desde</label>
            <input
              type="date"
              value={genForm.desde}
              onChange={(e) => setGenForm((p) => ({ ...p, desde: e.target.value }))}
              className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] focus:border-[#3D6B3F] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#1F3A2E] dark:text-[#A8C26B]/80">Hasta</label>
            <input
              type="date"
              value={genForm.hasta}
              onChange={(e) => setGenForm((p) => ({ ...p, hasta: e.target.value }))}
              className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] focus:border-[#3D6B3F] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#1F3A2E] dark:text-[#A8C26B]/80">Proveedor (opcional)</label>
            <input
              value={genForm.proveedor}
              onChange={(e) => setGenForm((p) => ({ ...p, proveedor: e.target.value }))}
              placeholder="stripe_connect / spei / ach"
              className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder:text-[#3D6B3F]/40 dark:placeholder:text-[#A8C26B]/30 focus:border-[#3D6B3F] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={generando}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm text-white hover:bg-[#1F3A2E] disabled:opacity-60 transition-all duration-200"
          >
            {generando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Generar
          </button>
        </form>
        {genResultado && (
          <div className="mt-3 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] p-3 text-sm text-[#1F3A2E] dark:text-[#E8E3D5]">
            <div className="font-medium">Resultado: {genResultado.creados} payouts</div>
            {genResultado.payouts.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {genResultado.payouts.map((p) => (
                  <li key={p.id_payout}>
                    Payout #{p.id_payout} — productor #{p.id_productor} — {p.moneda} — {p.cuenta} pedidos
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Pendientes por productor */}
      <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h2 className="mb-3 text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Pendientes por distribuir</h2>
        {resumenLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-[#3D6B3F]" size={20} />
          </div>
        ) : resumenPendientes.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-[#0f1a10] p-6 text-center text-[#3D6B3F]/60 dark:text-[#A8C26B]/50 border border-[#C5CFB0] dark:border-[#3D6B3F]/30">
            No hay pagos pendientes de distribuir
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40">
            <table className="min-w-full divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20 text-sm">
              <thead className="bg-[#1F3A2E] text-white text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Productor</th>
                  <th className="px-3 py-2 text-left">Moneda</th>
                  <th className="px-3 py-2 text-center">Pedidos</th>
                  <th className="px-3 py-2 text-right">Monto Bruto</th>
                  <th className="px-3 py-2 text-right">Comisión</th>
                  <th className="px-3 py-2 text-right">A Pagar</th>
                  <th className="px-3 py-2 text-left">Métodos</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20">
                {resumenPendientes.flatMap((productor) =>
                  productor.resumen_por_moneda.map((moneda, idx) => (
                    <tr key={`${productor.id_productor}-${moneda.moneda}-${idx}`} className="odd:bg-white dark:odd:bg-[#0f1a10] even:bg-[#F4F0E3]/40 dark:even:bg-[#1a2a1f] hover:bg-[#C5CFB0]/20 dark:hover:bg-[#2d4a2e]/40 transition-all duration-150">
                      {idx === 0 && (
                        <td className="px-3 py-2" rowSpan={productor.resumen_por_moneda.length}>
                          <span className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{productor.nombre}</span>
                          <span className="ml-2 text-[#3D6B3F]/50 dark:text-[#A8C26B]/50">#{productor.id_productor}</span>
                        </td>
                      )}
                      <td className="px-3 py-2 text-[#1F3A2E] dark:text-[#D4CEBF]">{moneda.moneda}</td>
                      <td className="px-3 py-2 text-center text-[#1F3A2E] dark:text-[#D4CEBF]">{moneda.pedidos_pendientes}</td>
                      <td className="px-3 py-2 text-right text-[#1F3A2E] dark:text-[#D4CEBF]">{formatMXN(moneda.monto_bruto_total)}</td>
                      <td className="px-3 py-2 text-right text-[#C97A3E] dark:text-[#E8A87C]">{formatMXN(moneda.comision_total)}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{formatMXN(moneda.monto_neto_total)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {productor.metodos_disponibles.stripe && (
                            <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-800 dark:text-blue-300">
                              ● Stripe
                            </span>
                          )}
                          {productor.metodos_disponibles.paypal && (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-300">
                              ● PayPal
                            </span>
                          )}
                          {!productor.metodos_disponibles.stripe && !productor.metodos_disponibles.paypal && (
                            <span className="rounded-full bg-[#C5CFB0]/30 dark:bg-[#3D6B3F]/10 px-2 py-0.5 text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/50">
                              ○ Sin método
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!productor.metodos_disponibles.stripe && !productor.metodos_disponibles.paypal ? (
                          <span className="text-xs text-[#3D6B3F]/50 dark:text-[#A8C26B]/40">Sin método</span>
                        ) : (
                          <select
                            defaultValue=""
                            onChange={async (e) => {
                              const proveedor = e.target.value;
                              if (!proveedor) return;
                              const hoy = new Date().toISOString().split("T")[0];
                              const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                              setGenerando(true);
                              try {
                                const res = await api.payouts.generar(token, {
                                  desde: hace30,
                                  hasta: hoy,
                                  proveedor,
                                  id_productor: productor.id_productor,
                                });
                                setNotice({ type: "success", message: `Payout ejecutado: ${res.creados} registro(s)` });
                                await loadResumenPendientes();
                              } catch (err) {
                                setNotice({ type: "error", message: err instanceof Error ? err.message : "Error generando payout" });
                              } finally {
                                setGenerando(false);
                              }
                            }}
                            className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-2 py-1 text-xs text-[#1F3A2E] dark:text-[#E8E3D5]"
                          >
                            <option value="">Pagar con...</option>
                            {productor.metodos_disponibles.stripe && <option value="stripe">Stripe</option>}
                            {productor.metodos_disponibles.paypal && <option value="paypal">PayPal</option>}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Listado */}
      <section className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Listado</h2>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5]"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3D6B3F]/40" size={14} />
            <input
              placeholder="id_productor"
              value={filtroProductor}
              onChange={(e) => setFiltroProductor(e.target.value)}
              className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#0f1a10] py-2 pl-9 pr-3 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder:text-[#3D6B3F]/40 dark:placeholder:text-[#A8C26B]/30"
            />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-3">
            <div className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Total bruto</div>
            <div className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{formatPrice(totales.bruto)}</div>
          </div>
          <div className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-3">
            <div className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Total comisión</div>
            <div className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{formatPrice(totales.comision)}</div>
          </div>
          <div className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] p-3">
            <div className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Total neto</div>
            <div className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{formatPrice(totales.neto)}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <table className="min-w-full divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20 text-sm">
            <thead className="bg-[#1F3A2E] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Productor</th>
                <th className="px-3 py-2 text-left">Periodo</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2 text-right">Comisión</th>
                <th className="px-3 py-2 text-right">Neto</th>
                <th className="px-3 py-2 text-left">Moneda</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center bg-white dark:bg-[#0f1a10]">
                    <Loader2 className="mx-auto animate-spin text-[#3D6B3F]" size={20} />
                  </td>
                </tr>
              )}
              {!loading && payouts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-[#3D6B3F]/70 dark:text-[#A8C26B]/50 bg-white dark:bg-[#0f1a10]">
                    Sin payouts
                  </td>
                </tr>
              )}
              {!loading &&
                paginatedPayouts.map((p) => (
                  <tr key={p.id_payout} className="odd:bg-white dark:odd:bg-[#0f1a10] even:bg-[#F4F0E3]/40 dark:even:bg-[#1a2a1f] hover:bg-[#C5CFB0]/20 dark:hover:bg-[#2d4a2e]/40 transition-all duration-200">
                    <td className="px-3 py-2 text-[#1F3A2E] dark:text-[#D4CEBF]">#{p.id_payout}</td>
                    <td className="px-3 py-2 text-[#1F3A2E] dark:text-[#D4CEBF]">
                      {p.productores?.razon_social ?? `Productor #${p.id_productor}`}
                    </td>
                    <td className="px-3 py-2 text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">
                      {new Date(p.periodo_desde).toLocaleDateString()} →{" "}
                      {new Date(p.periodo_hasta).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right text-[#1F3A2E] dark:text-[#D4CEBF]">{formatMXN(p.monto_bruto)}</td>
                    <td className="px-3 py-2 text-right text-[#1F3A2E] dark:text-[#D4CEBF]">{formatMXN(p.monto_comision)}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{formatMXN(p.monto_neto)}</td>
                    <td className="px-3 py-2 text-[#1F3A2E] dark:text-[#D4CEBF]">{p.moneda}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${ESTADO_BADGE[p.estado] ?? "bg-[#C5CFB0]/20 dark:bg-[#3D6B3F]/10 text-[#3D6B3F]/60 dark:text-[#A8C26B]/50"}`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(p.estado === "procesado" || p.estado === "pagado") && (
                        <button
                          onClick={() => handleReembolsar(p)}
                          disabled={reembolsando === p.id_payout}
                          className="mr-2 inline-flex items-center gap-1 rounded-md border border-red-300 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 disabled:opacity-50"
                        >
                          {reembolsando === p.id_payout ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Undo2 size={12} />
                          )}
                          Reembolsar
                        </button>
                      )}
                      <button
                        onClick={() => openDetalle(p)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-2 py-1 text-xs text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F] dark:hover:bg-[#1F3A2E]/60 transition-all duration-200"
                      >
                        <Eye size={12} /> Detalle
                      </button>
                      <button
                        onClick={() => openEstado(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/40 px-2 py-1 text-xs text-[#3D6B3F] dark:text-[#A8C26B] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all duration-200"
                      >
                        Cambiar estado
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-3 mt-4 bg-white dark:bg-[#1a2a1f] rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <p className="text-sm text-[#1F3A2E] dark:text-[#E8E3D5]">
              Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, payouts.length)}</span> de <span className="font-semibold">{payouts.length}</span> payouts
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] dark:text-[#A8C26B] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40 hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/60 disabled:opacity-50">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40">
                Página {currentPage} de {totalPages}
              </span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] dark:text-[#A8C26B] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#3D6B3F]/40 hover:bg-[#F4F0E3] dark:hover:bg-[#1F3A2E]/60 disabled:opacity-50">
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </section>

      {estadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] dark:bg-[#0f1a10] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-[0_24px_48px_rgba(31,58,46,0.25)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Payout #{estadoModal.id_payout}</h2>
              <button onClick={() => setEstadoModal(null)} aria-label="Cerrar" className="text-[#1F3A2E] dark:text-[#E8E3D5]">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEstadoSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80">Estado</label>
                <select
                  value={estadoForm.estado}
                  onChange={(e) => setEstadoForm((p) => ({ ...p, estado: e.target.value }))}
                  className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] focus:border-[#3D6B3F] focus:outline-none"
                >
                  {ESTADOS_MANUALES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#3D6B3F]/60 dark:text-[#A8C26B]/50">El estado &ldquo;agotado&rdquo; se asigna automáticamente tras 5 intentos fallidos.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80">Referencia externa</label>
                <input
                  value={estadoForm.referencia_externa}
                  onChange={(e) => setEstadoForm((p) => ({ ...p, referencia_externa: e.target.value }))}
                  placeholder="ID transferencia / payout Stripe"
                  className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] placeholder:text-[#3D6B3F]/40 dark:placeholder:text-[#A8C26B]/30 focus:border-[#3D6B3F] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80">Notas</label>
                <textarea
                  value={estadoForm.notas}
                  onChange={(e) => setEstadoForm((p) => ({ ...p, notas: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-white dark:bg-[#1a2a1f] px-3 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] focus:border-[#3D6B3F] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEstadoModal(null)}
                  className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2 text-sm text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingEstado}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm text-white hover:bg-[#1F3A2E] disabled:opacity-60 transition-all duration-200"
                >
                  {updatingEstado && <Loader2 size={14} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalleLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      )}

      {detalleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#F4F0E3] dark:bg-[#0f1a10] border border-[#C5CFB0] dark:border-[#3D6B3F]/40 shadow-[0_24px_48px_rgba(31,58,46,0.25)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Detalle payout #{detalleModal.id_payout}</h2>
              <button onClick={() => setDetalleModal(null)} aria-label="Cerrar" className="text-[#1F3A2E] dark:text-[#E8E3D5]">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-[#1F3A2E] dark:text-[#E8E3D5]">
              <div>
                <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Productor:</span>{" "}
                {detalleModal.productores?.razon_social ?? `#${detalleModal.id_productor}`}
              </div>
              <div>
                <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Moneda:</span> {detalleModal.moneda}
              </div>
              <div>
                <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Bruto:</span> {formatMXN(detalleModal.monto_bruto)}
              </div>
              <div>
                <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Comisión:</span> {formatMXN(detalleModal.monto_comision)}
              </div>
              <div>
                <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Neto:</span>{" "}
                <strong>{formatMXN(detalleModal.monto_neto)}</strong>
              </div>
              <div>
                <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Estado:</span>{" "}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${ESTADO_BADGE[detalleModal.estado] ?? "bg-[#C5CFB0]/20 dark:bg-[#3D6B3F]/10"}`}>
                  {detalleModal.estado}
                </span>
              </div>
              {(detalleModal.estado === "fallido" || detalleModal.estado === "agotado") && (
                <div className="col-span-2 rounded-xl border border-[#C97A3E]/30 dark:border-[#C97A3E]/20 bg-[#C97A3E]/8 dark:bg-[#C97A3E]/10 p-3">
                  <div className="mb-2 text-sm font-medium text-[#C97A3E] dark:text-[#E8A87C]">Diagnóstico de error</div>
                  <div className="space-y-1 text-xs">
                    <div className="text-[#1F3A2E] dark:text-[#D4CEBF]">
                      <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Intentos: </span>
                      <span className="font-medium">{detalleModal.intentos ?? 0}/5</span>
                    </div>
                    {detalleModal.ultimo_error && (
                      <div>
                        <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Último error: </span>
                        <span className="font-mono text-red-700 dark:text-red-400">{detalleModal.ultimo_error}</span>
                      </div>
                    )}
                    {detalleModal.proximo_reintento && (
                      <div className="text-[#1F3A2E] dark:text-[#D4CEBF]">
                        <span className="text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">Próximo reintento: </span>
                        <span className="font-medium">
                          {new Date(detalleModal.proximo_reintento).toLocaleString("es-MX", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {detalleModal.estado === "agotado" && (
                          <span className="ml-2 text-red-600 dark:text-red-400">(Agotado - requiere intervención)</span>
                        )}
                      </div>
                    )}
                    {detalleModal.estado === "agotado" && !detalleModal.proximo_reintento && (
                      <div className="text-red-600 dark:text-red-400">Sin reintentos programados - contacta a soporte</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <h3 className="mb-2 text-sm font-bold text-[#1F3A2E] dark:text-[#E8E3D5]">Pedidos incluidos</h3>
            <div className="mb-3 rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1a2a1f] p-3 text-xs text-[#3D6B3F]/70 dark:text-[#A8C26B]/60">
              <p className="font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">Desglose transparente de ingresos:</p>
              <p className="mt-1">El subtotal bruto incluye: items del producto + IVA prorrateado + envío prorrateado. La comisión se aplica sobre este monto total para garantizar transparencia en el cálculo.</p>
            </div>
            <table className="min-w-full divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20 text-sm">
              <thead className="bg-[#1F3A2E] text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Pedido</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Subtotal Bruto*</th>
                  <th className="px-3 py-2 text-right">Comisión</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#3D6B3F]/20">
                {detalleModal.pedido_productor.map((pp) => (
                  <tr key={`${pp.id_pedido}-${pp.id_productor}`} className="odd:bg-white dark:odd:bg-[#0f1a10] even:bg-[#F4F0E3]/40 dark:even:bg-[#1a2a1f]">
                    <td className="px-3 py-2 text-[#1F3A2E] dark:text-[#D4CEBF]">#{pp.id_pedido}</td>
                    <td className="px-3 py-2 text-[#1F3A2E] dark:text-[#D4CEBF]">{pp.estado}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{pp.subtotal_bruto ? formatMXN(pp.subtotal_bruto) : "—"}</td>
                    <td className="px-3 py-2 text-right text-[#1F3A2E] dark:text-[#D4CEBF]">{pp.comision_marketplace ? formatMXN(pp.comision_marketplace) : "—"}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{pp.monto_neto_productor ? formatMXN(pp.monto_neto_productor) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
