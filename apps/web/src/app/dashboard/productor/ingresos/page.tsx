"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, DollarSign, TrendingUp, Receipt, CreditCard, CheckCircle2, Eye, X, HelpCircle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, type Payout } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

type ConnectStatus = {
  connected: boolean;
  account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  onboarding_completed: boolean;
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-[#C5CFB0]/30 text-[#1F3A2E]",
  en_proceso: "bg-blue-100 text-blue-800",
  procesado: "bg-[#A8C26B]/20 text-[#3D6B3F]",
  pagado: "bg-[#A8C26B]/30 text-[#1F3A2E]",
  fallido: "bg-[#C97A3E]/15 text-[#C97A3E]",
  agotado: "bg-red-100 text-red-700",
  cancelado: "bg-[#C5CFB0]/20 text-[#3D6B3F]/60",
};

type RangoPeriodo = "mes_actual" | "mes_anterior" | "personalizado";

function getRangoFechas(rango: RangoPeriodo, custom?: { desde: string; hasta: string }) {
  const ahora = new Date();
  if (rango === "mes_actual") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return { desde, hasta: ahora };
  }
  if (rango === "mes_anterior") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
    return { desde, hasta };
  }
  return {
    desde: custom?.desde ? new Date(custom.desde) : new Date(ahora.getFullYear(), 0, 1),
    hasta: custom?.hasta ? new Date(custom.hasta) : ahora,
  };
}

export default function IngresosProductorPage() {
  const { user, isProductor } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rango, setRango] = useState<RangoPeriodo>("mes_actual");
  const [custom, setCustom] = useState({ desde: "", hasta: "" });

  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [detalleModal, setDetalleModal] = useState<Payout | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [ingresosResumen, setIngresosResumen] = useState<{
    ventas_totales: string;
    comision_total: string;
    bruto_total: string;
    ingresos_recibidos: string;
    pendiente_recibir: string;
    total_pedidos: number;
    total_payouts: number;
  } | null>(null);

  useEffect(() => {
    if (!isProductor || !user?.id_productor) {
      setLoading(false);
      return;
    }
    const token = getCookie("token") ?? "";
    setLoading(true);
    Promise.all([
      api.payouts.misPayouts(token, user.id_productor),
      api.pagos.ingresos.getResumen(token, user.id_productor),
      api.pagos.connect.status(token).catch(() => null),
    ])
      .then(([payoutsRes, resumenRes, connectRes]) => {
        setPayouts(payoutsRes);
        setIngresosResumen(resumenRes);
        if (connectRes) setConnect(connectRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error cargando datos"))
      .finally(() => setLoading(false));
  }, [isProductor, user?.id_productor]);

  const conectarStripe = async () => {
    setConnectLoading(true);
    setConnectError(null);
    try {
      const token = getCookie("token") ?? "";
      const res = await api.pagos.connect.onboard(token);
      window.location.href = res.url;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "No se pudo iniciar la conexión con Stripe");
      setConnectLoading(false);
    }
  };

  useEffect(() => { setCurrentPage(1); }, [rango, custom]);

  const filtrados = useMemo(() => {
    const { desde, hasta } = getRangoFechas(rango, custom);
    return payouts.filter((p) => {
      const fecha = new Date(p.periodo_desde);
      return fecha >= desde && fecha <= hasta;
    });
  }, [payouts, rango, custom]);

  const totalPages = Math.ceil(filtrados.length / itemsPerPage);
  const paginatedPayouts = filtrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resumen = useMemo(() => {
    return filtrados.reduce(
      (acc, p) => {
        acc.bruto += Number(p.monto_bruto);
        acc.comision += Number(p.monto_comision);
        acc.neto += Number(p.monto_neto);
        acc.cuenta += 1;
        return acc;
      },
      { bruto: 0, comision: 0, neto: 0, cuenta: 0 },
    );
  }, [filtrados]);

  if (!isProductor) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Esta sección es exclusiva para productores.
      </div>
    );
  }

  const inputCls = "rounded-xl border border-[#C5CFB0] bg-transparent px-4 py-2.5 text-sm text-[#1F3A2E] outline-none focus:border-[#3D6B3F] focus:ring-1 focus:ring-[#3D6B3F]/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Mis Ingresos</h1>
        <p className="text-sm text-[#3D6B3F]/70">Consulta tus payouts y el estado de tus pagos.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Stripe Connect */}
      {connect && (
        <div>
          {!connect.onboarding_completed ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CreditCard size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[#1F3A2E]">
                    {connect.connected ? "Termina la verificación de tu cuenta de pago" : "Conecta tu cuenta de pago para recibir tus ventas"}
                  </p>
                  <p className="mt-0.5 text-blue-800">
                    {connect.connected
                      ? "Stripe necesita más información para habilitar cobros y depósitos."
                      : "Crearemos una cuenta Stripe Express a tu nombre para recibir depósitos directos."}
                  </p>
                  {connectError && <p className="mt-1 text-xs text-red-600">{connectError}</p>}
                </div>
              </div>
              <button onClick={conectarStripe} disabled={connectLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1F3A2E] disabled:opacity-60">
                {connectLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                {connect.connected ? "Continuar verificación" : "Conectar cuenta de pago"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-[#A8C26B]/50 bg-[#A8C26B]/10 p-4 text-sm text-[#3D6B3F]">
              <CheckCircle2 size={16} />
              <span>
                Cuenta de pago conectada · Cobros: {connect.charges_enabled ? "habilitados" : "pendientes"} · Depósitos:{" "}
                {connect.payouts_enabled ? "habilitados" : "pendientes"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Selector de periodo */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <select value={rango} onChange={(e) => setRango(e.target.value as RangoPeriodo)} className={inputCls}>
          <option value="mes_actual">Este mes</option>
          <option value="mes_anterior">Mes anterior</option>
          <option value="personalizado">Personalizado</option>
        </select>
        {rango === "personalizado" && (
          <>
            <input type="date" value={custom.desde} onChange={(e) => setCustom((p) => ({ ...p, desde: e.target.value }))} className={inputCls} />
            <span className="text-[#3D6B3F]/60">→</span>
            <input type="date" value={custom.hasta} onChange={(e) => setCustom((p) => ({ ...p, hasta: e.target.value }))} className={inputCls} />
          </>
        )}
      </div>

      {/* Info banners */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Período de retención de pagos</p>
          <p className="mt-0.5">Los pagos se retienen desde que confirmas la entrega. El plazo típico es 3-5 días, después de lo cual el dinero se transfiere automáticamente.</p>
        </div>
      </div>

      {filtrados.some((p) => p.estado === "agotado") && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Transferencias bloqueadas</p>
            <p className="mt-0.5">
              Tus pagos no pudieron procesarse después de 5 intentos. Verifica tu cuenta de Stripe o{" "}
              <a href="mailto:soporte@marketplace.com?subject=Ayuda%20con%20payout%20agotado" className="font-medium underline">
                contacta a soporte
              </a>.
            </p>
          </div>
        </div>
      )}

      {filtrados.some((p) => p.estado === "pendiente") && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Liquidaciones pendientes</p>
            <p className="mt-0.5">Tienes {filtrados.filter((p) => p.estado === "pendiente").length} liquidaciones que serán procesadas próximamente.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <SummaryCard icon={<DollarSign />} label="Ventas totales" value={ingresosResumen?.ventas_totales ?? "0.00"} colorClass="text-blue-700" tooltip="Items vendidos (sin impuestos/envío)" />
        <SummaryCard icon={<DollarSign />} label="Bruto total" value={ingresosResumen?.bruto_total ?? "0.00"} colorClass="text-[#3D6B3F]" tooltip="Ventas + IVA prorrateado + envío prorrateado" />
        <SummaryCard icon={<Receipt />} label="Comisión marketplace" value={ingresosResumen?.comision_total ?? "0.00"} colorClass="text-red-600" tooltip="Comisión aplicada sobre el bruto total" />
        <SummaryCard icon={<TrendingUp />} label="Recibido" value={ingresosResumen?.ingresos_recibidos ?? "0.00"} colorClass="text-[#3D6B3F]" tooltip="Dinero transferido a tu cuenta" />
        <SummaryCard icon={<Receipt />} label="Pendiente" value={ingresosResumen?.pendiente_recibir ?? "0.00"} colorClass="text-[#C97A3E]" tooltip="En período de retención o en proceso" />
      </div>

      {/* Payouts table */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="border-b border-[#C5CFB0]/50 bg-[#F4F0E3] p-5">
          <h2 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Mis payouts</h2>
          <p className="text-sm text-[#3D6B3F]/70">Cada payout agrupa los pedidos liberados de un periodo.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#1F3A2E]">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                <th className="px-4 py-4">ID</th>
                <th className="px-4 py-4">Periodo</th>
                <th className="px-4 py-4 text-right">Bruto</th>
                <th className="px-4 py-4 text-right">Comisión</th>
                <th className="px-4 py-4 text-right">Neto</th>
                <th className="px-4 py-4">Moneda</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-4 py-4">Referencia</th>
                <th className="px-4 py-4">Procesado</th>
                <th className="px-4 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto animate-spin text-[#3D6B3F]" size={20} />
                  </td>
                </tr>
              )}
              {!loading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[#3D6B3F]/60">
                    Aún no tienes payouts en este periodo.
                  </td>
                </tr>
              )}
              {!loading && paginatedPayouts.map((p) => (
                <tr key={p.id_payout}
                  className="border-t border-[#C5CFB0]/30 bg-white transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20">
                  <td className="px-4 py-3 font-medium text-[#1F3A2E]">#{p.id_payout}</td>
                  <td className="px-4 py-3 text-[#3D6B3F]/70">
                    {new Date(p.periodo_desde).toLocaleDateString()} → {new Date(p.periodo_hasta).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[#3D6B3F]/70">{Number(p.monto_bruto).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-[#3D6B3F]/70">{Number(p.monto_comision).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1F3A2E]">{Number(p.monto_neto).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#3D6B3F]/70">{p.moneda}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[p.estado] ?? "bg-[#C5CFB0]/30 text-[#1F3A2E]"}`}
                      title={p.estado === "agotado" ? "Falló 5 veces — contacta a soporte" : p.estado === "fallido" ? "Se reintentará automáticamente" : undefined}>
                      {p.estado}
                    </span>
                    {p.estado === "fallido" && p.proximo_reintento && (
                      <div className="mt-1 text-xs text-[#C97A3E]">
                        Se reintentará el {new Date(p.proximo_reintento).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {p.estado === "agotado" && (
                      <div className="mt-1 text-xs text-red-600">
                        {p.ultimo_error && <span className="block truncate">{p.ultimo_error}</span>}
                        <a href="mailto:soporte@marketplace.com?subject=Ayuda%20con%20payout%20agotado"
                          className="mt-1 inline-flex items-center gap-1 text-[#3D6B3F] hover:underline">
                          <HelpCircle size={12} /> Contactar soporte
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#3D6B3F]/60">{p.referencia_externa ?? "—"}</td>
                  <td className="px-4 py-3 text-[#3D6B3F]/60">
                    {p.procesado_en ? new Date(p.procesado_en).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.pedido_productor && p.pedido_productor.length > 0 && (
                      <button onClick={() => setDetalleModal(p)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#C5CFB0] px-3 py-1.5 text-xs font-medium text-[#1F3A2E] transition hover:bg-[#C5CFB0]/20">
                        <Eye size={12} /> Ver pedidos
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <p className="text-sm text-[#1F3A2E]">
            Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtrados.length)}</span> de <span className="font-semibold">{filtrados.length}</span> payouts
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

      {/* Detail modal */}
      {detalleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
                Detalle payout #{detalleModal.id_payout}
              </h2>
              <button onClick={() => setDetalleModal(null)} aria-label="Cerrar"
                className="rounded-lg p-2 text-[#3D6B3F]/50 hover:bg-[#C5CFB0]/20 hover:text-[#1F3A2E]">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#3D6B3F]/70">Periodo:</span>{" "}{new Date(detalleModal.periodo_desde).toLocaleDateString()} → {new Date(detalleModal.periodo_hasta).toLocaleDateString()}</div>
              <div><span className="text-[#3D6B3F]/70">Moneda:</span> {detalleModal.moneda}</div>
              <div><span className="text-[#3D6B3F]/70">Bruto:</span> {Number(detalleModal.monto_bruto).toFixed(2)}</div>
              <div><span className="text-[#3D6B3F]/70">Comisión:</span> {Number(detalleModal.monto_comision).toFixed(2)}</div>
              <div><span className="text-[#3D6B3F]/70">Neto:</span> <strong className="text-[#1F3A2E]">{Number(detalleModal.monto_neto).toFixed(2)}</strong></div>
              <div>
                <span className="text-[#3D6B3F]/70">Estado:</span>{" "}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[detalleModal.estado] ?? "bg-[#C5CFB0]/30 text-[#1F3A2E]"}`}>
                  {detalleModal.estado}
                </span>
              </div>
              {detalleModal.referencia_externa && (
                <div className="col-span-2">
                  <span className="text-[#3D6B3F]/70">Referencia Stripe:</span>{" "}
                  <span className="font-mono text-xs text-[#1F3A2E]">{detalleModal.referencia_externa}</span>
                </div>
              )}
              {(detalleModal.estado === "fallido" || detalleModal.estado === "agotado") && (
                <div className="col-span-2 rounded-xl border border-[#C97A3E]/30 bg-[#C97A3E]/5 p-3">
                  <div className="mb-2 text-sm font-semibold text-[#C97A3E]">Diagnóstico de error</div>
                  <div className="space-y-1 text-xs">
                    <div><span className="text-[#3D6B3F]/70">Intentos: </span><span className="font-medium text-[#1F3A2E]">{detalleModal.intentos ?? 0}/5</span></div>
                    {detalleModal.ultimo_error && (
                      <div><span className="text-[#3D6B3F]/70">Último error: </span><span className="font-mono text-red-600">{detalleModal.ultimo_error}</span></div>
                    )}
                    {detalleModal.proximo_reintento && (
                      <div>
                        <span className="text-[#3D6B3F]/70">Próximo reintento: </span>
                        <span className="font-medium text-[#1F3A2E]">
                          {new Date(detalleModal.proximo_reintento).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {detalleModal.estado === "agotado" && <span className="ml-2 text-red-600">(Agotado — requiere intervención)</span>}
                      </div>
                    )}
                    {detalleModal.estado === "agotado" && !detalleModal.proximo_reintento && (
                      <div className="text-red-600">Sin reintentos programados</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {detalleModal.pedido_productor && detalleModal.pedido_productor.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 text-sm font-semibold text-[#1F3A2E]">Pedidos incluidos</h3>
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#A8C26B]/40 bg-[#A8C26B]/10 p-3 text-xs text-[#3D6B3F]">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <p>El subtotal bruto incluye: tus productos + tu parte del IVA (prorrateado) + tu parte del envío (prorrateado).</p>
                </div>
                <div className="overflow-hidden rounded-xl border border-[#C5CFB0]">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead className="bg-[#1F3A2E]">
                      <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                        <th className="px-4 py-3">Pedido</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Subtotal Bruto*</th>
                        <th className="px-4 py-3 text-right">Comisión</th>
                        <th className="px-4 py-3 text-right">Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleModal.pedido_productor.map((pp) => (
                        <tr key={pp.id_pedido}
                          className="border-t border-[#C5CFB0]/30 bg-white odd:bg-white even:bg-[#F4F0E3]/40">
                          <td className="px-4 py-2.5 font-medium text-[#1F3A2E]">#{pp.id_pedido}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex rounded-full bg-[#A8C26B]/20 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]">{pp.estado}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-[#1F3A2E]">{pp.subtotal_bruto ?? "—"}</td>
                          <td className="px-4 py-2.5 text-right text-[#3D6B3F]/70">{pp.comision_marketplace}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-[#3D6B3F]">{pp.monto_neto_productor ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, value, colorClass, tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
      <div className="mb-2 flex items-center gap-2 text-sm text-[#3D6B3F]/70">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <span>{label}</span>
        {tooltip && (
          <span className="ml-1 text-[#3D6B3F]/40" title={tooltip}><HelpCircle size={12} className="inline" /></span>
        )}
      </div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      {tooltip && <p className="mt-2 text-[10px] text-[#3D6B3F]/50">{tooltip}</p>}
    </div>
  );
}
