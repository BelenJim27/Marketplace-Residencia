"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface OrderDetail {
  id_pedido: number;
  estado_productor: string;
  pedido: {
    id_usuario: string;
    usuarios: { nombre: string; email: string };
    total: number;
    moneda: string;
    direccion_envio_snapshot: any;
  };
  detalles: any[];
  envio: { numero_rastreo?: string; estado?: string } | null;
  desglose?: {
    subtotal_bruto: string | null;
    comision_marketplace: string;
    monto_neto_productor: string | null;
    moneda: string | null;
    id_comision_aplicada: number | null;
    id_payout: string | null;
  };
}

export default function DetalleOrdenProductor() {
  const { id } = useParams();
  const { user, isProductor } = useAuth();
  const [orden, setOrden] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [numeroRastreo, setNumeroRastreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isProductor || !user?.id_productor) {
      setLoading(false);
      return;
    }

    const fetchOrden = async () => {
      try {
        const token = getCookie("token") || "";
        const res = await fetch(`/pedidos/productor/${id}/${user.id_productor}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        setOrden(res);
        setNuevoEstado(res.estado_productor);
        setNumeroRastreo(res.envio?.numero_rastreo || "");
      } catch (err) {
        setError("Error al cargar la orden");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrden();
  }, [user, isProductor, id]);

  const handleActualizarEstado = async () => {
    if (!orden || !user?.id_productor) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getCookie("token") || "";
      await fetch(`/pedidos/productor/${orden.id_pedido}/${user.id_productor}/estado`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      }).then((r) => r.json());

      setSuccess("Estado actualizado correctamente");
      setOrden({ ...orden, estado_productor: nuevoEstado });
    } catch (err) {
      setError("Error al actualizar el estado");
    } finally {
      setSaving(false);
    }
  };

  const handleActualizarTracking = async () => {
    if (!orden || !user?.id_productor || !numeroRastreo) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getCookie("token") || "";
      await fetch(`/pedidos/productor/${orden.id_pedido}/${user.id_productor}/tracking`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ numero_rastreo: numeroRastreo }),
      }).then((r) => r.json());

      setSuccess("Número de rastreo guardado correctamente");
    } catch (err) {
      setError("Error al guardar el número de rastreo");
    } finally {
      setSaving(false);
    }
  };

  if (!isProductor) {
    return <div className="p-4">No tienes acceso a esta página.</div>;
  }

  if (loading) {
    return (
      <div>
        <Breadcrumb pageName="Detalle de Orden" />
        <div className="text-center py-8">Cargando orden...</div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div>
        <Breadcrumb pageName="Detalle de Orden" />
        <div className="text-center py-8 text-red-600">No se encontró la orden</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb pageName={`Orden #${orden.id_pedido}`} />
      <div className="max-w-4xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Cliente */}
          <div className="bg-white p-6 rounded-lg border border-gray-300">
            <h2 className="text-lg font-bold mb-4">Cliente</h2>
            <div>
              <div className="font-medium">{orden.pedido.usuarios.nombre}</div>
              <div className="text-sm text-gray-600">{orden.pedido.usuarios.email}</div>
            </div>
          </div>

          {/* Estado */}
          <div className="bg-white p-6 rounded-lg border border-gray-300">
            <h2 className="text-lg font-bold mb-4">Cambiar Estado</h2>
            <div className="space-y-2">
              <select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="preparando">Preparando</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
              </select>
              <button
                onClick={handleActualizarEstado}
                disabled={saving || nuevoEstado === orden.estado_productor}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? "Guardando..." : "Actualizar Estado"}
              </button>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white p-6 rounded-lg border border-gray-300 mb-6">
          <h2 className="text-lg font-bold mb-4">Productos</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Producto</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Cantidad</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Precio Unitario</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {orden.detalles.map((detalle) => (
                  <tr key={detalle.id_detalle}>
                    <td className="border border-gray-300 px-4 py-2">{detalle.productos?.nombre}</td>
                    <td className="border border-gray-300 px-4 py-2">{detalle.cantidad}</td>
                    <td className="border border-gray-300 px-4 py-2">{detalle.precio_compra}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {(Number(detalle.precio_compra) * detalle.cantidad).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Desglose para mi tienda */}
        {orden.desglose && (
          <div className="bg-white p-6 rounded-lg border border-gray-300 mb-6">
            <h2 className="text-lg font-bold mb-4">Desglose para mi tienda</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span>Subtotal bruto</span>
                <span className="font-medium">
                  {orden.desglose.subtotal_bruto
                    ? `${Number(orden.desglose.subtotal_bruto).toFixed(2)} ${orden.desglose.moneda ?? ""}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2 text-red-600">
                <span>
                  Comisión marketplace
                  {orden.desglose.subtotal_bruto && Number(orden.desglose.subtotal_bruto) > 0 && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({((Number(orden.desglose.comision_marketplace) / Number(orden.desglose.subtotal_bruto)) * 100).toFixed(2)}%)
                    </span>
                  )}
                </span>
                <span>− {Number(orden.desglose.comision_marketplace).toFixed(2)} {orden.desglose.moneda ?? ""}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-green-700">
                <span>Neto a recibir</span>
                <span>
                  {orden.desglose.monto_neto_productor
                    ? `${Number(orden.desglose.monto_neto_productor).toFixed(2)} ${orden.desglose.moneda ?? ""}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-xs text-gray-600">
                <span>Estado del pago</span>
                <span>
                  {orden.desglose.id_payout
                    ? `Incluido en payout #${orden.desglose.id_payout}`
                    : "Pendiente de payout"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rastreo */}
        <div className="bg-white p-6 rounded-lg border border-gray-300 mb-6">
          <h2 className="text-lg font-bold mb-4">Información de Envío</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Número de Rastreo FedEx</label>
              <input
                type="text"
                value={numeroRastreo}
                onChange={(e) => setNumeroRastreo(e.target.value)}
                placeholder="Ingresa el número de guía FedEx"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <button
              onClick={handleActualizarTracking}
              disabled={saving || !numeroRastreo}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {saving ? "Guardando..." : "Guardar Tracking"}
            </button>
            {orden.envio?.numero_rastreo && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm text-gray-600">Rastreo registrado:</div>
                <div className="font-medium">{orden.envio.numero_rastreo}</div>
              </div>
            )}
          </div>
        </div>

        {/* Dirección de Envío */}
        <div className="bg-white p-6 rounded-lg border border-gray-300">
          <h2 className="text-lg font-bold mb-4">Dirección de Envío</h2>
          {orden.pedido.direccion_envio_snapshot && (
            <div className="text-sm space-y-1">
              {orden.pedido.direccion_envio_snapshot.calle && (
                <div>
                  {orden.pedido.direccion_envio_snapshot.calle}{" "}
                  {orden.pedido.direccion_envio_snapshot.numero}
                </div>
              )}
              {orden.pedido.direccion_envio_snapshot.colonia && (
                <div>{orden.pedido.direccion_envio_snapshot.colonia}</div>
              )}
              {orden.pedido.direccion_envio_snapshot.ciudad && (
                <div>
                  {orden.pedido.direccion_envio_snapshot.ciudad},{" "}
                  {orden.pedido.direccion_envio_snapshot.estado}
                </div>
              )}
              {orden.pedido.direccion_envio_snapshot.codigo_postal && (
                <div>CP {orden.pedido.direccion_envio_snapshot.codigo_postal}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
