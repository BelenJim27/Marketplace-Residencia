// components/TiendaUI.tsx
import { Eye, Edit2, Trash2, MapPin, Store } from 'lucide-react';

export default function TiendaUI() {
  const tiendas = [
    { id: "#MZ-8821", nombre: "Guardianas del Mezcal", ubicacion: "San Vicente Coatlán, Sierra Sur", maestro: "Elena Ruiz", status: "ACTIVA" },
    { id: "#MZ-8902", nombre: "El Maguey Dorado", ubicacion: "Ejutla de Crespo, Sierra Sur", maestro: "Pedro Hernández", status: "ACTIVA" },
    { id: "#MZ-7741", nombre: "Raíces Oaxaqueñas", ubicacion: "Miahuatlán de Porfirio Díaz", maestro: "Sofía Luna", status: "INACTIVA" },
  ];

  return (
    <div className="bg-gray-100 min-h-screen w-full">
      {/* Contenedor principal sin padding lateral máximo */}
      <div className="w-full py-6">
        
        {/* HEADER: Con padding interno px-6 */}
        <div className="flex justify-between items-center mb-6 px-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Gestión de Tiendas
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Administra las tiendas y puntos de venta registrados
            </p>
          </div>

          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95">
            + Nueva Tienda
          </button>
        </div>

        {/* CARDS: Grid de 3 columnas para tiendas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 px-6">
          {[
            { label: "Total Tiendas", value: 128, color: "text-slate-800" },
            { label: "Activas", value: 114, color: "text-green-600" },
            { label: "Inactivas", value: 14, color: "text-gray-400" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200"
            >
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
              <h2 className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</h2>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap gap-3 items-center mb-6 px-6">
          <div className="flex-grow min-w-[300px]">
            <input
              placeholder="Buscar por nombre, ubicación o dueño..."
              className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
            />
          </div>
          <button className="border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors">
            Filtrar
          </button>
        </div>

        {/* TABLA: Edge-to-Edge */}
        <div className="bg-white border-y border-gray-200 w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 w-16 text-center">Imagen</th>
                <th className="py-4 px-6">Tienda</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Maestro Mezcalero</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tiendas.map((tienda, index) => (
                <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                      <Store size={24} />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-sm text-slate-800">{tienda.nombre}</p>
                    <span className="text-[10px] font-mono text-gray-400">ID: {tienda.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-start gap-1 text-xs text-slate-600">
                      <MapPin size={14} className="mt-0.5 text-gray-400" />
                      <span>{tienda.ubicacion}, <br/>Oaxaca</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-700">
                    {tienda.maestro}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      tienda.status === 'ACTIVA' 
                        ? 'bg-green-50 text-green-700 border-green-100' 
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {tienda.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalle">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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