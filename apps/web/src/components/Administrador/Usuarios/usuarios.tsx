// components/UsuariosUI.tsx
import { Mail, ShieldCheck, Edit2, Trash2 } from 'lucide-react';

export default function UsuariosUI() {
  const usuarios = [
    { id: 1, nombre: "Ana Martínez", email: "ana.m@mezcal.com", rol: "Administrador", status: "Activo", iniciales: "AM", color: "bg-indigo-100 text-indigo-700" },
    { id: 2, nombre: "Carlos Ruiz", email: "c.ruiz@mezcal.com", rol: "Editor", status: "Activo", iniciales: "CR", color: "bg-emerald-100 text-emerald-700" },
    { id: 3, nombre: "Sofía López", email: "sofia.l@mezcal.com", rol: "Visualizador", status: "Inactivo", iniciales: "SL", color: "bg-gray-100 text-gray-700" },
    { id: 4, nombre: "Ricardo Gómez", email: "r.gomez@mezcal.com", rol: "Editor", status: "Activo", iniciales: "RG", color: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controla los accesos y permisos del personal</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95">
          + Invitar Usuario
        </button>
      </div>

      {/* CARDS DE RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Usuarios", value: "12", color: "text-slate-800" },
          { label: "Administradores", value: "3", color: "text-indigo-600" },
          { label: "Activos ahora", value: "5", color: "text-green-600" },
          { label: "Pendientes", value: "2", color: "text-amber-500" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
            <h2 className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</h2>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex-grow min-w-[300px]">
          <input
            placeholder="Buscar por nombre o correo..."
            className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select className="border border-gray-200 p-2.5 rounded-xl bg-white text-sm text-gray-600 outline-none">
            <option>Todos los Roles</option>
            <option>Administrador</option>
            <option>Editor</option>
          </select>
          <button className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors">
            Exportar Lista
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="py-4 px-6">Usuario</th>
                <th className="py-4 px-6">Rol / Permisos</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Última Conexión</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${user.color} flex items-center justify-center font-bold text-xs shadow-sm`}>
                        {user.iniciales}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{user.nombre}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail size={12} /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <ShieldCheck size={16} className={user.rol === 'Administrador' ? 'text-indigo-500' : 'text-slate-400'} />
                      <span className="font-medium">{user.rol}</span>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${user.status === 'Activo' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {user.status}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-xs text-gray-500 font-medium">
                    Hace 2 horas
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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