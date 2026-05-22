"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";

const MOCK_PEDIDOS = [
  { id: "MZ-2041", cliente: "Julián Rivera",  initials: "JR", color: "bg-orange-100 text-orange-700", fecha: "12/10/2023", total: "$1,450.00 MXN", estado: "Pendiente"  },
  { id: "MZ-2038", cliente: "María Alcaraz",  initials: "MA", color: "bg-blue-100 text-blue-700",     fecha: "11/10/2023", total: "$2,100.00 MXN", estado: "Enviado"    },
  { id: "MZ-2035", cliente: "Sergio Torres",  initials: "ST", color: "bg-green-100 text-green-700",   fecha: "10/10/2023", total: "$3,450.00 MXN", estado: "Completado" },
];

const STATS = [
  { label: "Total Pedidos", value: "1,284", color: "text-slate-800 dark:text-white"  },
  { label: "Pendientes",    value: "45",    color: "text-amber-600"                  },
  { label: "Enviados",      value: "128",   color: "text-blue-600"                   },
  { label: "Completados",   value: "1,056", color: "text-green-600"                  },
  { label: "Cancelados",    value: "55",    color: "text-red-500"                    },
];

const STATUS_STYLES: Record<string, string> = {
  Pendiente:  "bg-amber-50 text-amber-600 border-amber-100",
  Enviado:    "bg-blue-50 text-blue-600 border-blue-100",
  Completado: "bg-green-50 text-green-700 border-green-100",
  Cancelado:  "bg-red-50 text-red-600 border-red-100",
};

export default function Pedidos() {
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Gestión de Pedidos
          </h1>
          <p className="text-gray-500 dark:text-dark-6 text-sm mt-0.5">
            Administra y gestiona las órdenes de compra de mezcal
          </p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 w-full sm:w-auto">
          + Nuevo Pedido
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {STATS.map((item) => (
          <div key={item.label} className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">{item.label}</p>
            <h2 className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="bg-white dark:bg-dark-2 rounded-2xl border border-gray-100 dark:border-dark-3 p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-grow min-w-[300px]">
            <input
              placeholder="Buscar por ID, cliente o producto..."
              className="w-full border border-gray-200 dark:border-dark-3 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white dark:bg-dark-2 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-dark-6"
            />
          </div>
          <button className="border border-gray-200 dark:border-dark-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-dark-2 hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors text-gray-700 dark:text-dark-6">
            Exportar CSV
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-dark-3 bg-white dark:bg-dark-2 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/50 dark:bg-dark-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6 border-b border-gray-100 dark:border-dark-3">
              <tr>
                <th className="py-4 px-6">ID Pedido</th>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {MOCK_PEDIDOS.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-3/50 transition-colors group">
                  <td className="py-4 px-6">
                    <span className="font-bold text-sm text-slate-800 dark:text-white">#{pedido.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full ${pedido.color} flex items-center justify-center text-[10px] font-bold shrink-0`}>{pedido.initials}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{pedido.cliente}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500 dark:text-dark-6">{pedido.fecha}</td>
                  <td className="py-4 px-6 text-sm font-bold text-slate-700 dark:text-slate-200">{pedido.total}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${STATUS_STYLES[pedido.estado] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                      {pedido.estado}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-end items-center gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Eye size={16} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
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
