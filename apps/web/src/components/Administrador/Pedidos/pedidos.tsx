// components/PedidosUI.tsx
export default function Pedidos() {
  return (
    <div className="bg-gray-100 min-h-screen w-full">
      {/* Contenedor principal sin padding lateral máximo */}
      <div className="w-full py-6">
        
        {/* HEADER: Con padding interno px-6 */}
        <div className="flex justify-between items-center mb-6 px-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Gestión de Pedidos
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Administra y gestiona las órdenes de compra de mezcal
            </p>
          </div>

          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95">
            + Nuevo Pedido
          </button>
        </div>

        {/* CARDS: Grid de 5 columnas con padding lateral */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 px-6">
          {[
            { label: "Total Pedidos", value: "1,284", color: "text-slate-800" },
            { label: "Pendientes", value: "45", color: "text-amber-600" },
            { label: "Enviados", value: "128", color: "text-blue-600" },
            { label: "Completados", value: "1,056", color: "text-green-600" },
            { label: "Cancelados", value: "55", color: "text-red-500" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center"
            >
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
              <h2 className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</h2>
            </div>
          ))}
        </div>

        {/* FILTROS: Expandidos con padding lateral */}
        <div className="flex flex-wrap gap-3 items-center mb-6 px-6">
          <div className="flex-grow min-w-[300px]">
            <input
              placeholder="Buscar por ID, cliente o producto..."
              className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
            />
          </div>

          <div className="flex gap-2">
            <button className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors flex items-center gap-2">
              <span>Filtros</span>
            </button>
            <button className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors text-gray-600">
              Exportar CSV
            </button>
          </div>
        </div>

        {/* TABLA: Edge-to-Edge (Sin espacios extra en los tr para evitar hidratación) */}
        <div className="bg-white border-y border-gray-200 w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="py-4 px-6">ID Pedido</th>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* FILA 1 */}
              <tr className="hover:bg-gray-50/50 transition-colors group">
                <td className="py-4 px-6">
                  <span className="font-bold text-sm text-slate-800">#MZ-2041</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold">JR</span>
                    <span className="text-sm font-medium text-slate-700">Julián Rivera</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-500">12/10/2023</td>
                <td className="py-4 px-6 text-sm font-bold text-slate-700">$1,450.00 MXN</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase">
                    Pendiente
                  </span>
                </td>
                <td className="py-4 px-6 text-right text-lg">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-gray-200 rounded">✏️</button>
                    <button className="p-1 hover:bg-red-50 rounded text-red-500">🗑️</button>
                  </div>
                </td>
              </tr>

              {/* FILA 2 */}
              <tr className="hover:bg-gray-50/50 transition-colors group">
                <td className="py-4 px-6">
                  <span className="font-bold text-sm text-slate-800">#MZ-2038</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">MA</span>
                    <span className="text-sm font-medium text-slate-700">María Alcaraz</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-500">11/10/2023</td>
                <td className="py-4 px-6 text-sm font-bold text-slate-700">$2,100.00 MXN</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                    Enviado
                  </span>
                </td>
                <td className="py-4 px-6 text-right text-lg">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-gray-200 rounded">✏️</button>
                    <button className="p-1 hover:bg-red-50 rounded text-red-500">🗑️</button>
                  </div>
                </td>
              </tr>

              {/* FILA 3 */}
              <tr className="hover:bg-gray-50/50 transition-colors group">
                <td className="py-4 px-6">
                  <span className="font-bold text-sm text-slate-800">#MZ-2035</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">ST</span>
                    <span className="text-sm font-medium text-slate-700">Sergio Torres</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-500">10/10/2023</td>
                <td className="py-4 px-6 text-sm font-bold text-slate-700">$3,450.00 MXN</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase">
                    Completado
                  </span>
                </td>
                <td className="py-4 px-6 text-right text-lg">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-gray-200 rounded">✏️</button>
                    <button className="p-1 hover:bg-red-50 rounded text-red-500">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}