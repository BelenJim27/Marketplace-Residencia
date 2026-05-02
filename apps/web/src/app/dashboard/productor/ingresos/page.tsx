"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, DollarSign, TrendingUp, Receipt } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, type Payout } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  pagado: "bg-green-100 text-green-800",
  fallido: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-700",
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

  useEffect(() => {
    if (!isProductor || !user?.id_productor) {
      setLoading(false);
      return;
    }
    const token = getCookie("token") ?? "";
    setLoading(true);
    api.payouts
      .misPayouts(token, user.id_productor)
      .then((res) => setPayouts(res))
      .catch((err) => setError(err instanceof Error ? err.message : "Error cargando payouts"))
      .finally(() => setLoading(false));
  }, [isProductor, user?.id_productor]);

  const filtrados = useMemo(() => {
    const { desde, hasta } = getRangoFechas(rango, custom);
    return payouts.filter((p) => {
      const fecha = new Date(p.creado_en);
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

        {/* Tarjetas resumen */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card icon={<DollarSign />} label="Ingreso bruto" value={resumen.bruto.toFixed(2)} colorClass="text-blue-700" />
          <Card icon={<Receipt />} label="Comisión marketplace" value={resumen.comision.toFixed(2)} colorClass="text-red-600" />
          <Card icon={<TrendingUp />} label="Neto a recibir" value={resumen.neto.toFixed(2)} colorClass="text-green-700" />
          <Card icon={<Receipt />} label="# Payouts" value={String(resumen.cuenta)} colorClass="text-gray-700" />
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
                {!loading && filtrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
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
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2">{p.referencia_externa ?? "—"}</td>
                      <td className="px-3 py-2">
                        {p.procesado_en ? new Date(p.procesado_en).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className={`mb-2 flex items-center gap-2 text-sm text-gray-500 ${colorClass}`}>
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
