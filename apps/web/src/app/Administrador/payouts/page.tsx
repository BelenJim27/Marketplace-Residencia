"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, X, Search, Play, Eye, Undo2 } from "lucide-react";
import { api, type Payout, type PayoutDetalle } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { formatPrice } from "@/lib/format-number";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

type Notice = { type: "success" | "error"; message: string };
const ESTADOS = ["pendiente", "en_proceso", "procesado", "pagado", "fallido", "agotado", "cancelado"] as const;
const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-gray-200 text-gray-800",
  en_proceso: "bg-blue-100 text-blue-800",
  procesado: "bg-green-100 text-green-800",
  pagado: "bg-emerald-200 text-emerald-800",
  fallido: "bg-orange-100 text-orange-800",
  agotado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-300 text-gray-700",
};

const ESTADOS_MANUALES = ["pendiente", "en_proceso", "procesado", "pagado", "fallido", "cancelado"] as const;

export default function PayoutsAdminPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroProductor, setFiltroProductor] = useState("");

  const [genForm, setGenForm] = useState({ desde: "", hasta: "", proveedor: "" });
  const [generando, setGenerando] = useState(false);
  const [genResultado, setGenResultado] = useState<{ creados: number; payouts: { id_payout: string; id_productor: number; moneda: string; cuenta: number }[] } | null>(null);

  const [estadoModal, setEstadoModal] = useState<Payout | null>(null);
  const [estadoForm, setEstadoForm] = useState({ estado: "pendiente", referencia_externa: "", notas: "" });
  const [updatingEstado, setUpdatingEstado] = useState(false);

  const [detalleModal, setDetalleModal] = useState<PayoutDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [reembolsando, setReembolsando] = useState<string | null>(null);

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

  useEffect(() => {
    load();
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
    if (!confirm(`¿Estás seguro de que deseas reembolsar el payout #${p.id_payout}? Esta acción no se puede deshacer.`)) {
      return;
    }
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
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
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
      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">Período de retención activo</p>
            <p className="mt-1 text-xs">Los pagos se retienen hasta la entrega confirmada + período configurado para proteger contra disputas y chargebacks. Usa la sección de generación para liberar pagos manuales cuando sea necesario.</p>
          </div>
        </div>
      </section>

      {/* Generar payouts */}
      <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-medium">Generar payouts por periodo</h2>
        <form onSubmit={handleGenerar} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm">Desde</label>
            <input
              type="date"
              value={genForm.desde}
              onChange={(e) => setGenForm((p) => ({ ...p, desde: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Hasta</label>
            <input
              type="date"
              value={genForm.hasta}
              onChange={(e) => setGenForm((p) => ({ ...p, hasta: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Proveedor (opcional)</label>
            <input
              value={genForm.proveedor}
              onChange={(e) => setGenForm((p) => ({ ...p, proveedor: e.target.value }))}
              placeholder="stripe_connect / spei / ach"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <button
            type="submit"
            disabled={generando}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {generando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Generar
          </button>
        </form>
        {genResultado && (
          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
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

      {/* Listado */}
      <section className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium">Listado</h2>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              placeholder="id_productor"
              value={filtroProductor}
              onChange={(e) => setFiltroProductor(e.target.value)}
              className="rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-gray-500">Total bruto</div>
            <div className="font-medium">{formatPrice(totales.bruto)}</div>
          </div>
          <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-gray-500">Total comisión</div>
            <div className="font-medium">{formatPrice(totales.comision)}</div>
          </div>
          <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-gray-500">Total neto</div>
            <div className="font-medium">{formatPrice(totales.neto)}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
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
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center">
                    <Loader2 className="mx-auto animate-spin" size={20} />
                  </td>
                </tr>
              )}
              {!loading && payouts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                    Sin payouts
                  </td>
                </tr>
              )}
              {!loading &&
                payouts.map((p) => (
                  <tr key={p.id_payout}>
                    <td className="px-3 py-2">#{p.id_payout}</td>
                    <td className="px-3 py-2">
                      {p.productores?.razon_social ?? `Productor #${p.id_productor}`}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(p.periodo_desde).toLocaleDateString()} →{" "}
                      {new Date(p.periodo_hasta).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">{Number(p.monto_bruto).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{Number(p.monto_comision).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">{Number(p.monto_neto).toFixed(2)}</td>
                    <td className="px-3 py-2">{p.moneda}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${ESTADO_BADGE[p.estado] ?? "bg-gray-100"}`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(p.estado === "procesado" || p.estado === "pagado") && (
                        <button
                          onClick={() => handleReembolsar(p)}
                          disabled={reembolsando === p.id_payout}
                          className="mr-2 inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
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
                        className="mr-2 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        <Eye size={12} /> Detalle
                      </button>
                      <button
                        onClick={() => openEstado(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        Cambiar estado
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {estadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Payout #{estadoModal.id_payout}</h2>
              <button onClick={() => setEstadoModal(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEstadoSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">Estado</label>
                <select
                  value={estadoForm.estado}
                  onChange={(e) => setEstadoForm((p) => ({ ...p, estado: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {ESTADOS_MANUALES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">El estado "agotado" se asigna automáticamente tras 5 intentos fallidos.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm">Referencia externa</label>
                <input
                  value={estadoForm.referencia_externa}
                  onChange={(e) => setEstadoForm((p) => ({ ...p, referencia_externa: e.target.value }))}
                  placeholder="ID transferencia / payout Stripe"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Notas</label>
                <textarea
                  value={estadoForm.notas}
                  onChange={(e) => setEstadoForm((p) => ({ ...p, notas: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEstadoModal(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingEstado}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      )}

      {detalleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Detalle payout #{detalleModal.id_payout}</h2>
              <button onClick={() => setDetalleModal(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Productor:</span>{" "}
                {detalleModal.productores?.razon_social ?? `#${detalleModal.id_productor}`}
              </div>
              <div>
                <span className="text-gray-500">Moneda:</span> {detalleModal.moneda}
              </div>
              <div>
                <span className="text-gray-500">Bruto:</span> {Number(detalleModal.monto_bruto).toFixed(2)}
              </div>
              <div>
                <span className="text-gray-500">Comisión:</span> {Number(detalleModal.monto_comision).toFixed(2)}
              </div>
              <div>
                <span className="text-gray-500">Neto:</span>{" "}
                <strong>{Number(detalleModal.monto_neto).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-gray-500">Estado:</span>{" "}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${ESTADO_BADGE[detalleModal.estado] ?? "bg-gray-100"}`}>
                  {detalleModal.estado}
                </span>
              </div>
              {(detalleModal.estado === "fallido" || detalleModal.estado === "agotado") && (
                <div className="col-span-2 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                  <div className="mb-2 text-sm font-medium text-orange-800 dark:text-orange-200">Diagnóstico de error</div>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-gray-500">Intentos: </span>
                      <span className="font-medium">{detalleModal.intentos ?? 0}/5</span>
                    </div>
                    {detalleModal.ultimo_error && (
                      <div>
                        <span className="text-gray-500">Último error: </span>
                        <span className="font-mono text-red-700 dark:text-red-400">{detalleModal.ultimo_error}</span>
                      </div>
                    )}
                    {detalleModal.proximo_reintento && (
                      <div>
                        <span className="text-gray-500">Próximo reintento: </span>
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
            <h3 className="mb-2 text-sm font-medium">Pedidos incluidos</h3>
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              <p className="font-medium">Desglose transparente de ingresos:</p>
              <p className="mt-1">El subtotal bruto incluye: items del producto + IVA prorrateado + envío prorrateado. La comisión se aplica sobre este monto total para garantizar transparencia en el cálculo.</p>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Pedido</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Subtotal Bruto*</th>
                  <th className="px-3 py-2 text-right">Comisión</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {detalleModal.pedido_productor.map((pp) => (
                  <tr key={`${pp.id_pedido}-${pp.id_productor}`}>
                    <td className="px-3 py-2">#{pp.id_pedido}</td>
                    <td className="px-3 py-2">{pp.estado}</td>
                    <td className="px-3 py-2 text-right font-medium">{pp.subtotal_bruto ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{pp.comision_marketplace}</td>
                    <td className="px-3 py-2 text-right font-medium">{pp.monto_neto_productor ?? "—"}</td>
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
