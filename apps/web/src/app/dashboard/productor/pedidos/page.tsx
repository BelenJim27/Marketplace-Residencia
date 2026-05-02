"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

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

export default function PedidosProductor() {
  const { user, isProductor } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoProductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");

  useEffect(() => {
    if (!isProductor || !user?.id_productor) {
      setLoading(false);
      return;
    }

    const fetchPedidos = async () => {
      try {
        const token = getCookie("token") || "";
        const res = await api.pedidos.getMisPedidos(token);
        setPedidos(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [user, isProductor]);

  const pedidosFiltrados = pedidos.filter((p) =>
    filtroEstado === "todos" ? true : p.estado_productor === filtroEstado
  );

  if (!isProductor) {
    return <div className="p-4">No tienes acceso a esta página.</div>;
  }

  return (
    <div>
      <Breadcrumb pageName="Mis Pedidos" />
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mis Pedidos</h1>
          <div className="flex gap-2">
            {["todos", "pendiente", "confirmado", "preparando", "enviado", "entregado"].map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  filtroEstado === estado
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {estado.charAt(0).toUpperCase() + estado.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando pedidos...</div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filtroEstado === "todos"
              ? "No tienes pedidos aún"
              : `No hay pedidos en estado "${filtroEstado}"`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Pedido ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Cliente</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Productos</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Total</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Estado</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Fecha</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido) => (
                  <tr key={pedido.id_pedido} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">#{pedido.id_pedido}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="text-sm">
                        <div className="font-medium">{pedido.cliente.nombre}</div>
                        <div className="text-gray-600">{pedido.cliente.email}</div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {pedido.detalles.length} producto{pedido.detalles.length !== 1 ? "s" : ""}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">
                      {pedido.total_parcial.toFixed(2)} {pedido.moneda}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          pedido.estado_productor === "entregado"
                            ? "bg-green-100 text-green-800"
                            : pedido.estado_productor === "enviado"
                            ? "bg-blue-100 text-blue-800"
                            : pedido.estado_productor === "preparando"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {pedido.estado_productor}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {new Date(pedido.fecha_creacion).toLocaleDateString("es-MX")}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Link
                        href={`/dashboard/productor/pedidos/${pedido.id_pedido}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
