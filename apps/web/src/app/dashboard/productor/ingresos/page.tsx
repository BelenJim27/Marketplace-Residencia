"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, DollarSign, TrendingUp, Receipt, CreditCard, CheckCircle2, Eye, X, HelpCircle, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, type Payout } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { formatPrice } from "@/lib/format-number";

type ConnectStatus = {
  connected: boolean;
  account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  onboarding_completed: boolean;
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-gray-200 text-gray-800",
  en_proceso: "bg-blue-100 text-blue-800",
  procesado: "bg-green-100 text-green-800",
  pagado: "bg-emerald-200 text-emerald-800",
  fallido: "bg-orange-100 text-orange-800",
  agotado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-300 text-gray-700",
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
      .catch((err) => setError(err instanceof Error ? err.message: "Error cargando datos"))
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

  const filtrados = useMemo(() => {
    const { desde, hasta } = getRangoFechas(rango, custom);
    return payouts.filter((p) => {
      const fecha = new Date(p.periodo_desde);
      return fecha >= desde && fecha <= hasta;
    });
  }, [payouts, rango, custom]);

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
      <div className="p-4">
        <Breadcrumb pageName="Mis Ingresos" />
        <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">
          Esta sección es exclusiva para productores.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb pageName="Mis Ingresos" />
      <div className="max-w-6xl mx-auto p-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Stripe Connect — onboarding / status */}
        {connect && (
          <div className="mb-4">
            {!connect.onboarding_completed ? (
              <div className="flex flex-col gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
                <div className="flex items-start gap-3">
                  <CreditCard size={20} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {connect.connected
                        ? "Termina la verificación de tu cuenta de pago"
                        : "Conecta tu cuenta de pago para recibir tus ventas"}
                    </p>
                    <p className="mt-0.5 text-blue-800 dark:text-blue-200">
                      {connect.connected
                        ? "Stripe necesita más información para habilitar cobros y depósitos. Continúa donde lo dejaste."
                        : "Crearemos una cuenta Stripe Express a tu nombre. Stripe verifica tu identidad y deposita directo a tu banco."}
                    </p>
                    {connectError && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{connectError}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={conectarStripe}
                  disabled={connectLoading}
                  className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {connectLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {connect.connected ? "Continuar verificación" : "Conectar cuenta de pago"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100">
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={rango}
            onChange={(e) => setRango(e.target.value as RangoPeriodo)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="mes_actual">Este mes</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="personalizado">Personalizado</option>
          </select>
          {rango === "personalizado" && (
            <>
              <input
                type="date"
                value={custom.desde}
                onChange={(e) => setCustom((p) => ({ ...p, desde: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <span>→</span>
              <input
                type="date"
                value={custom.hasta}
                onChange={(e) => setCustom((p) => ({ ...p, hasta: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </>
          )}
        </div>

        {/* Banner de información sobre retención de pagos */}
        <div className="mb-4 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Período de retención de pagos</p>
            <p className="mt-0.5">
              Los pagos se retienen desde que confirmas la entrega. Esto protege tanto al comprador como a ti contra posibles chargebacks. El plazo varía según la configuración de la plataforma (típicamente 3-5 días). Después de este período, tu dinero se transferirá automáticamente.
            </p>
          </div>
        </div>

        {/* Banner de payouts agotados */}
        {filtrados.some((p) => p.estado === "agotado") && (
          <div className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Transferencias bloqueadas</p>
              <p className="mt-0.5">
                Tus pagos no pudieron procesarse después de 5 intentos automáticos. Esto puede ocurrir por: (1) Onboarding incompleto en tu cuenta Stripe, (2) Disputas/chargebacks abiertos, o (3) Problemas con tu cuenta bancaria. Verifica tu cuenta de Stripe o{" "}
                <a href="mailto:soporte@marketplace.com?subject=Ayuda%20con%20payout%20agotado" className="font-medium underline">
                  contacta a soporte
                </a>{" "}
                para resolver.
              </p>
            </div>
          </div>
        )}

        {/* Banner de payouts pendientes */}
        {filtrados.some((p) => p.estado === "pendiente") && (
          <div className="mb-4 flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Liquidaciones pendientes</p>
              <p className="mt-0.5">Tienes {filtrados.filter((p) => p.estado === "pendiente").length} liquidaciones que serán procesadas próximamente via transferencia bancaria.</p>
            </div>
          </div>
        )}

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card
            icon={<DollarSign />}
            label="Ventas totales"
            value={ingresosResumen?.ventas_totales ?? "0.00"}
            colorClass="text-blue-700"
            tooltip="Items vendidos (sin impuestos/envío)"
          />
          <Card
            icon={<DollarSign />}
            label="Bruto total"
            value={ingresosResumen?.bruto_total ?? "0.00"}
            colorClass="text-indigo-700"
            tooltip="Ventas + IVA prorrateado + envío prorrateado"
          />
          <Card
            icon={<Receipt />}
            label="Comisión marketplace"
            value={ingresosResumen?.comision_total ?? "0.00"}
            colorClass="text-red-600"
            tooltip="Comisión aplicada sobre el bruto total"
          />
          <Card
            icon={<TrendingUp />}
            label="Recibido"
            value={ingresosResumen?.ingresos_recibidos ?? "0.00"}
            colorClass="text-green-700"
            tooltip="Dinero transferido a tu cuenta"
          />
          <Card
            icon={<Receipt />}
            label="Pendiente"
            value={ingresosResumen?.pendiente_recibir ?? "0.00"}
            colorClass="text-amber-700"
            tooltip="En período de retención o en proceso"
          />
        </div>

        {/* Tabla de payouts */}
        <div className="rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-medium">Mis payouts</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cada payout agrupa los pedidos liberados de un periodo.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Periodo</th>
                  <th className="px-3 py-2 text-right">Bruto</th>
                  <th className="px-3 py-2 text-right">Comisión</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2 text-left">Moneda</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Referencia</th>
                  <th className="px-3 py-2 text-left">Procesado</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center">
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </td>
                  </tr>
                )}
                {!loading && filtrados.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                      Aún no tienes payouts en este periodo.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtrados.map((p) => (
                    <tr key={p.id_payout}>
                      <td className="px-3 py-2">#{p.id_payout}</td>
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
                          title={p.estado === "agotado" ? "Falló 5 veces — contacta a soporte" : p.estado === "fallido" ? "Se reintentará automáticamente" : undefined}
                        >
                          {p.estado}
                        </span>
                        {p.estado === "fallido" && p.proximo_reintento && (
                          <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                            Se reintentará el{" "}
                            {new Date(p.proximo_reintento).toLocaleString("es-MX", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                        {p.estado === "agotado" && (
                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {p.ultimo_error && <span className="block truncate">{p.ultimo_error}</span>}
                            <a
                              href="mailto:soporte@marketplace.com?subject=Ayuda%20con%20payout%20agotado"
                              className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <HelpCircle size={12} /> Contactar soporte
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{p.referencia_externa ?? "—"}</td>
                      <td className="px-3 py-2">
                        {p.procesado_en ? new Date(p.procesado_en).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {p.pedido_productor && p.pedido_productor.length > 0 && (
                          <button
                            onClick={() => setDetalleModal(p)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                          >
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

        {/* Modal de detalle */}
        {detalleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Detalle payout #{detalleModal.id_payout}</h2>
                <button
                  onClick={() => setDetalleModal(null)}
                  aria-label="Cerrar"
                  className="rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Periodo:</span>{" "}
                  {new Date(detalleModal.periodo_desde).toLocaleDateString()} →{" "}
                  {new Date(detalleModal.periodo_hasta).toLocaleDateString()}
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
                {detalleModal.referencia_externa && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Referencia Stripe:</span>{" "}
                    <span className="font-mono text-xs">{detalleModal.referencia_externa}</span>
                  </div>
                )}
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
                        <div className="text-red-600 dark:text-red-400">Sin reintentos programados</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {detalleModal.pedido_productor && detalleModal.pedido_productor.length > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-sm font-medium">Pedidos incluidos</h3>
                  <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                    <p className="font-medium flex items-center gap-2">
                      <Info size={14} /> Desglose transparente
                    </p>
                    <p className="mt-1">
                      El subtotal bruto incluye: tus productos + tu parte del IVA (prorrateado) + tu parte del envío (prorrateado). La comisión se aplica sobre este monto total. Esto garantiza que ves exactamente cuánto generó cada pedido.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
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
                          <tr key={pp.id_pedido}>
                            <td className="px-3 py-2">#{pp.id_pedido}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {pp.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{pp.subtotal_bruto ?? "—"}</td>
                            <td className="px-3 py-2 text-right">{pp.comision_marketplace}</td>
                            <td className="px-3 py-2 text-right font-medium text-green-700 dark:text-green-300">{pp.monto_neto_productor ?? "—"}</td>
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
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  colorClass,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className={`mb-2 flex items-center gap-2 text-sm text-gray-500 ${colorClass}`}>
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <span>{label}</span>
        {tooltip && (
          <span className="ml-1 text-xs text-gray-400" title={tooltip}>
            <HelpCircle size={14} className="inline" />
          </span>
        )}
      </div>
      <div className={`text-2xl font-semibold ${colorClass}`}>{value}</div>
      {tooltip && (
        <p className="mt-2 text-xs text-gray-500">{tooltip}</p>
      )}
    </div>
  );
}
