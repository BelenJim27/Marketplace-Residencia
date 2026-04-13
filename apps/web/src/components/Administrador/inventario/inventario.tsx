// components/InventarioUI.tsx
export default function InventarioUI() {
  return (
    <div className="bg-gray-100 min-h-screen w-full">
      {/* Contenedor principal: Sin padding lateral máximo para abarcar todo el ancho gris */}
      <div className="w-full py-6">
        
        {/* HEADER: Con padding interno para que el texto no toque el borde de la ventana */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-4 sm:px-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Gestión de Inventarios</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Administra el stock y existencias de mezcales
            </p>
          </div>

          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 w-full sm:w-auto">
            + Nuevo Producto
          </button>
        </div>

        {/* CARDS: Grid de 5 columnas con padding lateral */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 px-6">
          {[
            { label: "Productos activos", value: 18, color: "text-slate-800" },
            { label: "Agotados", value: 3, color: "text-red-600" },
            { label: "Borradores", value: 5, color: "text-gray-400" },
            { label: "Artesanales", value: 12, color: "text-slate-800" },
            { label: "Ancestrales", value: 6, color: "text-slate-800" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-center"
            >
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
              <h2 className={`text-3xl font-black mt-1 ${item.color}`}>{item.value}</h2>
            </div>
          ))}
        </div>

        {/* FILTROS: Ocupando el ancho disponible con padding lateral */}
        <div className="flex flex-wrap gap-3 items-center mb-6 px-6">
          <div className="flex-grow min-w-[300px]">
            <input
              placeholder="Buscar mezcal o maestro..."
              className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
            />
          </div>

          <div className="flex gap-2">
            <select className="border border-gray-200 p-2.5 rounded-xl bg-white text-sm text-gray-600 outline-none focus:border-green-500">
              <option>Tipo: Todos</option>
            </select>

            <select className="border border-gray-200 p-2.5 rounded-xl bg-white text-sm text-gray-600 outline-none focus:border-green-500">
              <option>Agave: Todos</option>
            </select>

            <button className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors">
              Otros filtros
            </button>

            <button className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors text-gray-600">
              Exportar CSV
            </button>
          </div>
        </div>

        {/* TABLA: Edge-to-Edge (Borde a Borde) */}
        <div className="bg-white border-y border-gray-200 w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="py-4 px-6">Producto</th>
                <th className="py-4 px-6">Maestro & Tipo</th>
                <th className="py-4 px-6">Precio</th>
                <th className="py-4 px-6 w-1/4">Stock</th>
                <th className="py-4 px-6 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* FILA 1 */}
              <tr className="hover:bg-gray-50/50 transition-colors group">
                <td className="py-4 px-6">
                  <p className="font-bold text-sm text-slate-800 group-hover:text-green-700 transition-colors">Mezcal Espadín Joven</p>
                  <p className="text-xs text-gray-400">750ml · Santiago Matatlán</p>
                </td>
                <td className="py-4 px-6">
                  <p className="text-sm text-slate-700">Beto Valenzuela</p>
                  <span className="text-green-600 text-[9px] font-black tracking-tighter bg-green-50 px-1.5 py-0.5 rounded">ARTESANAL</span>
                </td>
                <td className="py-4 px-6 text-sm font-semibold text-slate-600">$850.00</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 w-8">45 u.</span>
                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full w-[80%]" />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                    ● Activo
                  </span>
                </td>
              </tr>

              {/* FILA 2 */}
              <tr className="hover:bg-gray-50/50 transition-colors group border-t border-gray-50">
                <td className="py-4 px-6">
                  <p className="font-bold text-sm text-slate-800 group-hover:text-green-700 transition-colors">Mezcal Tobalá</p>
                  <p className="text-xs text-gray-400">750ml · Santa Catarina Minas</p>
                </td>
                <td className="py-4 px-6">
                  <p className="text-sm text-slate-700">Lalo Ángeles</p>
                  <span className="text-orange-500 text-[9px] font-black tracking-tighter bg-orange-50 px-1.5 py-0.5 rounded">ANCESTRAL</span>
                </td>
                <td className="py-4 px-6 text-sm font-semibold text-slate-600">$1,420.00</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 w-8">5 u.</span>
                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full w-[15%]" />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase">
                    ● Bajo Stock
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}