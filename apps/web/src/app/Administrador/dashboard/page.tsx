"use client";

import { useState, useEffect } from "react";
import { PaymentsOverviewChart } from "@/components/Charts/payments-overview/chart";
import { WeeksProfitChart } from "@/components/Charts/weeks-profit/chart";

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { label: "Ventas Totales", value: "$45,231", change: "+12.5%", up: true },
    { label: "Pedidos", value: "1,234", change: "+8.2%", up: true },
    { label: "Productos", value: "89", change: "+3.1%", up: true },
    { label: "Usuarios", value: "567", change: "-2.3%", up: false },
  ];

  const chartData = {
    payments: {
      received: [
        { x: "Ene", y: 4500 },
        { x: "Feb", y: 5200 },
        { x: "Mar", y: 4800 },
        { x: "Abr", y: 6100 },
        { x: "May", y: 5900 },
        { x: "Jun", y: 7200 },
      ],
      due: [
        { x: "Ene", y: 3200 },
        { x: "Feb", y: 3800 },
        { x: "Mar", y: 4100 },
        { x: "Abr", y: 3500 },
        { x: "May", y: 4200 },
        { x: "Jun", y: 4800 },
      ],
    },
    profit: {
      sales: [
        { x: "Lun", y: 45 },
        { x: "Mar", y: 50 },
        { x: "Mié", y: 38 },
        { x: "Jue", y: 65 },
        { x: "Vie", y: 58 },
        { x: "Sáb", y: 82 },
        { x: "Dom", y: 71 },
      ],
      revenue: [
        { x: "Lun", y: 28 },
        { x: "Mar", y: 35 },
        { x: "Mié", y: 22 },
        { x: "Jue", y: 45 },
        { x: "Vie", y: 38 },
        { x: "Sáb", y: 55 },
        { x: "Dom", y: 48 },
      ],
    },
  };

  const recentOrders = [
    {
      id: "#1001",
      cliente: "Juan Pérez",
      producto: "Mezcal Espadín",
      cantidad: 3,
      total: "$2,550",
      estado: "Completado",
    },
    {
      id: "#1002",
      cliente: "María García",
      producto: "Mezcal Tobalá",
      cantidad: 2,
      total: "$3,200",
      estado: "Pendiente",
    },
    {
      id: "#1003",
      cliente: "Carlos López",
      producto: "Mezcal Tobaziche",
      cantidad: 5,
      total: "$4,750",
      estado: "Enviado",
    },
    {
      id: "#1004",
      cliente: "Ana Martínez",
      producto: "Mezcal Espadín",
      cantidad: 1,
      total: "$850",
      estado: "Completado",
    },
    {
      id: "#1005",
      cliente: "Roberto Sánchez",
      producto: "Mezcal Arroqueño",
      cantidad: 4,
      total: "$5,600",
      estado: "Pendiente",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500">Bienvenido al panel de administración</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="dark:border-form-strokedark dark:bg-form-input rounded-[10px] border border-stroke bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                {stat.label}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  stat.up
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-bold text-dark dark:text-white">
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="dark:border-form-strokedark dark:bg-form-input col-span-12 rounded-[10px] border border-stroke bg-white p-6 shadow-sm xl:col-span-8">
          <h4 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Ventas Mensuales
          </h4>
          <PaymentsOverviewChart data={chartData.payments} />
        </div>

        <div className="dark:border-form-strokedark dark:bg-form-input col-span-12 rounded-[10px] border border-stroke bg-white p-6 shadow-sm xl:col-span-4">
          <h4 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Ganancias por Semana
          </h4>
          <WeeksProfitChart data={chartData.profit} />
        </div>
      </div>

      <div className="dark:border-form-strokedark dark:bg-form-input rounded-[10px] border border-stroke bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-lg font-semibold text-dark dark:text-white">
          Pedidos Recientes
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="dark:border-form-strokedark border-b border-stroke">
                <th className="py-3 text-left text-sm font-medium text-gray-500">
                  ID
                </th>
                <th className="py-3 text-left text-sm font-medium text-gray-500">
                  Cliente
                </th>
                <th className="py-3 text-left text-sm font-medium text-gray-500">
                  Producto
                </th>
                <th className="py-3 text-left text-sm font-medium text-gray-500">
                  Cantidad
                </th>
                <th className="py-3 text-left text-sm font-medium text-gray-500">
                  Total
                </th>
                <th className="py-3 text-left text-sm font-medium text-gray-500">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, i) => (
                <tr
                  key={i}
                  className="dark:border-form-strokedark border-b border-stroke"
                >
                  <td className="py-3 text-sm text-dark dark:text-white">
                    {order.id}
                  </td>
                  <td className="py-3 text-sm text-gray-500">
                    {order.cliente}
                  </td>
                  <td className="py-3 text-sm text-gray-500">
                    {order.producto}
                  </td>
                  <td className="py-3 text-sm text-gray-500">
                    {order.cantidad}
                  </td>
                  <td className="py-3 text-sm font-medium text-dark dark:text-white">
                    {order.total}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        order.estado === "Completado"
                          ? "bg-green-500/10 text-green-500"
                          : order.estado === "Pendiente"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {order.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
