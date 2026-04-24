"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Loader2, Plus, Pencil, Trash2, Mail, ShieldCheck, X, User } from "lucide-react";

interface Rol { id_rol: number; nombre: string }

interface Usuario {
  id_usuario: string;
  nombre_usuario?: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  foto_url?: string;
  email: string;
  telefono?: string;
  idioma_preferido?: string;
  moneda_preferida?: string;
  estado?: string;
  fecha_registro?: string;
  usuario_rol?: Array<{ id_rol: number; estado?: string; roles?: { nombre: string } }>;
}

interface UserFormData {
  nombre_usuario: string; nombre: string; foto_url: string;
  apellido_paterno: string; apellido_materno: string;
  email: string; password: string; telefono: string;
  idioma_preferido: string; moneda_preferida: string; id_rol: number;
}

const DEFAULT_FORM: UserFormData = {
  nombre_usuario: "", nombre: "", foto_url: "", apellido_paterno: "", apellido_materno: "",
  email: "", password: "", telefono: "", idioma_preferido: "es", moneda_preferida: "MXN", id_rol: 0,
};

export default function UsuariosUI() {
  const [usuarios, setUsuarios]           = useState<Usuario[]>([]);
  const [roles, setRoles]                 = useState<Rol[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [showModalUsuario, setShowModal]  = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [userFormData, setUserFormData]   = useState<UserFormData>(DEFAULT_FORM);
  const [selectedFotoFile, setSelectedFotoFile] = useState<File | null>(null);
  const [saving, setSaving]               = useState(false);
  const [searchTerm, setSearchTerm]       = useState("");
  const [filterRole, setFilterRole]       = useState("todos");

  const getToken = () => typeof window !== "undefined" ? getCookie("token") : null;

  useEffect(() => { fetchUsuarios(); fetchRoles(); }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      const data = await api.usuarios.getAll(token);
      setUsuarios(data as Usuario[]);
    } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar usuarios"); }
    finally { setLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await api.roles.getAll(token);
      setRoles(data as Rol[]);
    } catch { /* roles no críticos */ }
  };

  const closeModal = () => { setShowModal(false); setEditingUsuario(null); setSelectedFotoFile(null); setUserFormData(DEFAULT_FORM); };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.usuarios.create(token, { ...userFormData });
      closeModal(); fetchUsuarios();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al crear usuario"); }
    finally { setSaving(false); }
  };

  const handleUpdateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsuario) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      const payload: Partial<UserFormData> = { ...userFormData };
      if (!payload.password) delete payload.password;
      await api.usuarios.update(token, editingUsuario.id_usuario, payload);
      closeModal(); fetchUsuarios();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar usuario"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.usuarios.delete(token, id);
      fetchUsuarios();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
  };

  const openEdit = (user: Usuario) => {
    setEditingUsuario(user);
    setUserFormData({
      nombre_usuario: user.nombre_usuario || "", nombre: user.nombre, foto_url: user.foto_url || "",
      apellido_paterno: user.apellido_paterno || "", apellido_materno: user.apellido_materno || "",
      email: user.email, password: "", telefono: user.telefono || "",
      idioma_preferido: user.idioma_preferido || "es", moneda_preferida: user.moneda_preferida || "MXN",
      id_rol: user.usuario_rol?.find((ur) => ur.estado === "activo")?.id_rol || 0,
    });
    setSelectedFotoFile(null);
    setShowModal(true);
  };

  const getUserRoles = (u: Usuario) => u.usuario_rol?.filter((ur) => ur.estado === "activo").map((ur) => ur.roles?.nombre) || [];

  const getInitials = (nombre: string) => nombre.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getColor = (nombre: string) => {
    const colors = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700"];
    return colors[nombre.charCodeAt(0) % colors.length];
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchesSearch = searchTerm === "" || user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole   = filterRole === "todos" || getUserRoles(user).some((r) => r?.toLowerCase() === filterRole.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const activeUsers    = usuarios.filter((u) => u.estado === "activo").length;
  const usersWithRoles = usuarios.filter((u) => (u.usuario_rol?.length || 0) > 0).length;

  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-3 text-slate-800 dark:text-white p-3 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-gray-400 dark:placeholder-dark-6";
  const labelCls = "mb-2 block text-sm font-medium text-slate-700 dark:text-dark-7";

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-green-600" size={40} /></div>;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-dark-6 text-sm mt-0.5">Controla los accesos y permisos del personal</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setEditingUsuario(null); setUserFormData(DEFAULT_FORM); }}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 w-full sm:w-auto"
        >
          <Plus size={18} className="inline mr-2" /> Nuevo Usuario
        </button>
      </div>

      {/* Error */}
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Usuarios", value: usuarios.length,      color: "text-slate-800 dark:text-white" },
          { label: "Activos",        value: activeUsers,           color: "text-green-600" },
          { label: "Con Roles",      value: usersWithRoles,        color: "text-indigo-600" },
          { label: "Pendientes",     value: usuarios.length - activeUsers, color: "text-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-dark-2 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-3">
            <p className="text-gray-400 dark:text-dark-6 text-[10px] font-bold uppercase tracking-widest">{label}</p>
            <h2 className={`text-2xl font-black mt-1 ${color}`}>{value}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex-grow min-w-[300px]">
          <input
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2 text-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-dark-6 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2 text-slate-600 dark:text-white p-2.5 rounded-xl text-sm outline-none"
        >
          <option value="todos">Todos los Roles</option>
          {roles.map((r) => <option key={r.id_rol} value={r.nombre.toLowerCase()}>{r.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-2 border border-gray-200 dark:border-dark-3 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50/50 dark:bg-dark-3 text-gray-400 dark:text-dark-6 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100 dark:border-dark-3">
              <tr>
                <th className="py-4 px-6">Usuario</th>
                <th className="py-4 px-6">Rol / Permisos</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Fecha Registro</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-3">
              {filteredUsuarios.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500 dark:text-dark-6">No se encontraron usuarios</td></tr>
              ) : (
                filteredUsuarios.map((user) => (
                  <tr key={user.id_usuario} className="hover:bg-gray-50/50 dark:hover:bg-dark-3/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {user.foto_url ? (
                          <img src={user.foto_url} alt={user.nombre} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${getColor(user.nombre)} flex items-center justify-center font-bold text-xs shadow-sm`}>{getInitials(user.nombre)}</div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{user.nombre} {user.apellido_paterno}</p>
                          <p className="text-xs text-gray-400 dark:text-dark-6 flex items-center gap-1"><Mail size={12} /> {user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-dark-6">
                        <ShieldCheck size={16} className={getUserRoles(user).some((r) => r?.toLowerCase().includes("admin")) ? "text-indigo-500" : "text-slate-400"} />
                        {getUserRoles(user).length > 0 ? getUserRoles(user).map((rol, i) => <span key={i} className="font-medium">{rol}</span>) : <span className="text-gray-400 dark:text-dark-6">Sin rol</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${user.estado === "activo" ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 dark:bg-dark-3 text-gray-500 dark:text-dark-6 border-gray-100 dark:border-dark-4"}`}>
                        {user.estado || "Activo"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 dark:text-dark-6 font-medium">
                      {user.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(user)}         className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(user.id_usuario)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-2 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-3 p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={closeModal} className="text-gray-400 dark:text-dark-6 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre de Usuario</label>
                  <input type="text" value={userFormData.nombre_usuario} onChange={(e) => setUserFormData({ ...userFormData, nombre_usuario: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input type="text" value={userFormData.nombre} onChange={(e) => setUserFormData({ ...userFormData, nombre: e.target.value })} className={inputCls} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Apellido Paterno</label>
                  <input type="text" value={userFormData.apellido_paterno} onChange={(e) => setUserFormData({ ...userFormData, apellido_paterno: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido Materno</label>
                  <input type="text" value={userFormData.apellido_materno} onChange={(e) => setUserFormData({ ...userFormData, apellido_materno: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Foto</label>
                <div className="flex items-center gap-4">
                  {userFormData.foto_url || selectedFotoFile ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-green-500">
                      <img src={selectedFotoFile ? URL.createObjectURL(selectedFotoFile) : userFormData.foto_url} alt="Preview" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => { setSelectedFotoFile(null); setUserFormData({ ...userFormData, foto_url: "" }); }} className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-dark-3 bg-gray-50 dark:bg-dark-3"><User size={24} className="text-gray-400 dark:text-dark-6" /></div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-3 px-4 py-2 text-sm font-medium text-slate-600 dark:text-dark-6 hover:bg-gray-50 dark:hover:bg-dark-3">
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) setSelectedFotoFile(file); }} className="hidden" />
                    Subir foto
                  </label>
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>{editingUsuario ? "Password (opcional)" : "Password"}</label>
                <input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} className={inputCls} required={!editingUsuario} placeholder={editingUsuario ? "Dejar vacío para mantener actual" : ""} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input type="text" value={userFormData.telefono} onChange={(e) => setUserFormData({ ...userFormData, telefono: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Idioma Preferido</label>
                  <select value={userFormData.idioma_preferido} onChange={(e) => setUserFormData({ ...userFormData, idioma_preferido: e.target.value })} className={inputCls}>
                    <option value="es">Español</option><option value="en">English</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="pt">Português</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Moneda Preferida</label>
                  <select value={userFormData.moneda_preferida} onChange={(e) => setUserFormData({ ...userFormData, moneda_preferida: e.target.value })} className={inputCls}>
                    <option value="MXN">MXN - Peso Mexicano</option><option value="USD">USD - Dólar</option><option value="EUR">EUR - Euro</option><option value="GBP">GBP - Libra</option><option value="BRL">BRL - Real</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Asignar Rol</label>
                <select value={userFormData.id_rol} onChange={(e) => setUserFormData({ ...userFormData, id_rol: parseInt(e.target.value) || 0 })} className={inputCls}>
                  <option value={0}>Seleccionar rol...</option>
                  {roles.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-gray-100 dark:border-dark-3 p-6">
              <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-gray-200 dark:border-dark-3 py-3 font-medium text-slate-600 dark:text-dark-6 transition-colors hover:bg-gray-50 dark:hover:bg-dark-3">Cancelar</button>
              <button
                type="button"
                onClick={(e) => editingUsuario ? handleUpdateUsuario(e as unknown as React.FormEvent) : handleCreateUsuario(e as unknown as React.FormEvent)}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                {editingUsuario ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}