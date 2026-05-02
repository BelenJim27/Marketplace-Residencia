"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, X, Search, Play, Eye } from "lucide-react";
import { api, type Payout, type PayoutDetalle } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { formatPrice } from "@/lib/format-number";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

type Notice = { type: "success" | "error"; message: string };
const ESTADOS = ["pendiente", "en_proceso", "pagado", "fallido", "cancelado"] as const;
const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  pagado: "bg-green-100 text-green-800",
  fallido: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-700",
};

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
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
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
                <span className="text-gray-500">Estado:</span> {detalleModal.estado}
              </div>
            </div>
            <h3 className="mb-2 text-sm font-medium">Pedidos incluidos</h3>
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Pedido</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-right">Comisión</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {detalleModal.pedido_productor.map((pp) => (
                  <tr key={`${pp.id_pedido}-${pp.id_productor}`}>
                    <td className="px-3 py-2">#{pp.id_pedido}</td>
                    <td className="px-3 py-2">{pp.estado}</td>
                    <td className="px-3 py-2 text-right">{pp.subtotal_bruto ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{pp.comision_marketplace}</td>
                    <td className="px-3 py-2 text-right">{pp.monto_neto_productor ?? "—"}</td>
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
