"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Loader2, Plus, Pencil, Trash2, Mail, ShieldCheck, X } from "lucide-react";

interface Usuario {
  id_usuario: string;
  nombre: string;
  email: string;
  telefono?: string;
  estado?: string;
  fecha_registro?: string;
  usuario_rol?: Array<{
    id_rol: number;
    estado?: string;
    roles?: { nombre: string };
  }>;
}

export default function UsuariosUI() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({ nombre: "", email: "", telefono: "" });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("todos");

  const getToken = () => (typeof window !== "undefined" ? getCookie("token") : null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      const data = await api.usuarios.getAll();
      setUsuarios(data as Usuario[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");

      if (editingUser) {
        await api.usuarios.update(token, editingUser.id_usuario, {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
        });
      } else {
        await api.usuarios.create(token, {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
        });
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({ nombre: "", email: "", telefono: "" });
      fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.usuarios.delete(token, id);
      fetchUsuarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const openEdit = (user: Usuario) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono || "",
    });
    setShowModal(true);
  };

  const getUserRoles = (usuario: Usuario) => {
    return (
      usuario.usuario_rol
        ?.filter((ur) => ur.estado === "activo")
        .map((ur) => ur.roles?.nombre) || []
    );
  };

  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getColor = (nombre: string) => {
    const colors = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700"];
    const index = nombre.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      filterRole === "todos" ||
      getUserRoles(user).some((r) => r?.toLowerCase() === filterRole.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const activeUsers = usuarios.filter((u) => u.estado === "activo").length;
  const usersWithRoles = usuarios.filter((u) => (u.usuario_rol?.length || 0) > 0).length;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="animate-spin text-green-600" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Controla los accesos y permisos del personal</p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingUser(null);
            setFormData({ nombre: "", email: "", telefono: "" });
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} className="inline mr-2" />
          Invitar Usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Total Usuarios</p>
          <h2 className="text-2xl font-black mt-1 text-slate-800">{usuarios.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Activos</p>
          <h2 className="text-2xl font-black mt-1 text-green-600">{activeUsers}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Con Roles</p>
          <h2 className="text-2xl font-black mt-1 text-indigo-600">{usersWithRoles}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Pendientes</p>
          <h2 className="text-2xl font-black mt-1 text-amber-500">{usuarios.length - activeUsers}</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex-grow min-w-[300px]">
          <input
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-gray-200 p-2.5 rounded-xl bg-white text-sm text-gray-600 outline-none"
          >
            <option value="todos">Todos los Roles</option>
            <option value="administrador">Administrador</option>
            <option value="productor">Productor</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="py-4 px-6">Usuario</th>
                <th className="py-4 px-6">Rol / Permisos</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Fecha Registro</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((user) => (
                  <tr key={user.id_usuario} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${getColor(user.nombre)} flex items-center justify-center font-bold text-xs shadow-sm`}>
                          {getInitials(user.nombre)}
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
                        <ShieldCheck size={16} className={getUserRoles(user).some(r => r?.toLowerCase().includes("admin")) ? 'text-indigo-500' : 'text-slate-400'} />
                        {getUserRoles(user).length > 0 ? (
                          getUserRoles(user).map((rol, i) => (
                            <span key={i} className="font-medium">{rol}</span>
                          ))
                        ) : (
                          <span className="text-gray-400">Sin rol</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${user.estado === 'activo' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                        {user.estado || "Activo"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 font-medium">
                      {user.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id_usuario)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingUser ? "Editar Usuario" : "Invitar Usuario"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="correo@ejemplo.com"
                  required={!editingUser}
                  disabled={!!editingUser}
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Número telefónico"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-slate-600 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="animate-spin" size={16} />}
                  {editingUser ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}