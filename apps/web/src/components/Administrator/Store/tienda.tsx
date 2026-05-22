// components/TiendaUI.tsx
import { Eye, Edit2, Trash2, MapPin, Store } from 'lucide-react';

export default function TiendaUI() {
  const tiendas = [
    { id: "#MZ-8821", nombre: "Guardianas del Mezcal", ubicacion: "San Vicente Coatlán, Sierra Sur", maestro: "Elena Ruiz", status: "ACTIVA" },
    { id: "#MZ-8902", nombre: "El Maguey Dorado", ubicacion: "Ejutla de Crespo, Sierra Sur", maestro: "Pedro Hernández", status: "ACTIVA" },
    { id: "#MZ-7741", nombre: "Raíces Oaxaqueñas", ubicacion: "Miahuatlán de Porfirio Díaz", maestro: "Sofía Luna", status: "INACTIVA" },
  ];

  return (
    <div className="w-full">
      {/* Contenedor principal sin padding lateral máximo */}
      <div className="w-full py-6">

        {/* HEADER: Con padding interno px-6 */}
        <div className="flex justify-between items-center mb-6 px-6">
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white tracking-tight">
              Gestión de Tiendas
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Administra las tiendas y puntos de venta registrados
            </p>
          </div>

          <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95">
            + Nueva Tienda
          </button>
        </div>

        {/* CARDS: Grid de 3 columnas para tiendas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 px-6">
          {[
            { label: "Total Tiendas", value: 128, color: "text-dark dark:text-white" },
            { label: "Activas", value: 114, color: "text-green-600 dark:text-green-400" },
            { label: "Inactivas", value: 14, color: "text-gray-400 dark:text-gray-500" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-dark p-5 rounded-2xl shadow-sm border border-stroke dark:border-dark-3"
            >
              <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
              <h2 className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</h2>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap gap-3 items-center mb-6 px-6">
          <div className="flex-grow min-w-[300px]">
            <input
              placeholder="Buscar por nombre, ubicación o dueño..."
              className="w-full border border-stroke dark:border-dark-3 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-dark-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button className="border border-stroke dark:border-dark-3 px-5 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-dark-2 hover:bg-gray-50 dark:hover:bg-dark-2/80 text-gray-700 dark:text-gray-200 transition-colors">
            Filtrar
          </button>
        </div>

        {/* TABLA: Edge-to-Edge */}
        <div className="bg-white dark:bg-gray-dark border-y border-stroke dark:border-dark-3 w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-2 dark:bg-dark-2 text-gray-400 dark:text-gray-300 text-[10px] font-bold uppercase tracking-widest border-b border-stroke dark:border-dark-3">
              <tr>
                <th className="py-4 px-6 w-16 text-center">Imagen</th>
                <th className="py-4 px-6">Tienda</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Maestro Mezcalero</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-dark-3">
              {tiendas.map((tienda, index) => (
                <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-dark-2/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-dark-2 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Store size={24} />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-sm text-dark dark:text-white">{tienda.nombre}</p>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">ID: {tienda.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-start gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <MapPin size={14} className="mt-0.5 text-gray-400 dark:text-gray-500" />
                      <span>{tienda.ubicacion}, <br/>Oaxaca</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-200">
                    {tienda.maestro}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      tienda.status === 'ACTIVA'
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                    }`}>
                      {tienda.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Ver detalle">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar">
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