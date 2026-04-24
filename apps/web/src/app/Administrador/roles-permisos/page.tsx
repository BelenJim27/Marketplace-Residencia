"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Plus, Pencil, Trash2, Shield, Key, User, X, Check, UserPlus } from "lucide-react";
import { getCookie } from "@/lib/cookies";

interface Permiso { id_permiso: number; nombre: string }
interface Rol {
  id_rol: number; nombre: string; estado: string; fecha_creacion?: string;
  rol_permiso?: { permisos: Permiso }[];
}
interface Usuario {
  id_usuario: string; nombre_usuario?: string; nombre: string; foto_url?: string;
  apellido_paterno?: string; apellido_materno?: string; email: string; telefono?: string;
  idioma_preferido?: string; moneda_preferida?: string; fecha_registro?: string;
  usuario_rol?: { id_rol: number; estado?: string; roles?: { nombre: string } }[];
}

export default function RolesPermisosPage() {
  const [roles, setRoles]       = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<"roles" | "permisos" | "usuarios">("roles");

  const [showModalRol, setShowModalRol]           = useState(false);
  const [showModalPermiso, setShowModalPermiso]   = useState(false);
  const [showModalPermisosRol, setShowModalPermisosRol] = useState(false);
  const [showModalUsuario, setShowModalUsuario]   = useState(false);
  const [showModalAsignarRoles, setShowModalAsignarRoles] = useState(false);

  const [selectedUser, setSelectedUser]           = useState<Usuario | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<number[]>([]);
  const [selectAllPermisos, setSelectAllPermisos] = useState(false);
  const [formDataRol, setFormDataRol]             = useState({ nombre: "" });
  const [formDataPermiso, setFormDataPermiso]     = useState({ nombre: "" });
  const [selectedPermisos, setSelectedPermisos]   = useState<number[]>([]);
  const [editingRol, setEditingRol]               = useState<Rol | null>(null);
  const [editingPermiso, setEditingPermiso]       = useState<Permiso | null>(null);
  const [selectedRol, setSelectedRol]             = useState<Rol | null>(null);
  const [editingUsuario, setEditingUsuario]       = useState<Usuario | null>(null);
  const [userFormData, setUserFormData] = useState({
    nombre_usuario: "", nombre: "", foto_url: "", apellido_paterno: "", apellido_materno: "",
    email: "", password: "", telefono: "", idioma_preferido: "es", moneda_preferida: "MXN", id_rol: 0,
  });
  const [selectedFotoFile, setSelectedFotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const PERMISOS_CLIENTE   = ["ver_productos","crear_pedido","ver_pedidos","ver_tienda","ver_inventario","panel_cliente"];
  const PERMISOS_PRODUCTOR = ["ver_productos","crear_producto","editar_producto","eliminar_producto","ver_inventario","crear_inventario","editar_inventario","ver_pedidos","editar_pedido","ver_tienda","crear_tienda","editar_tienda","panel_productor"];

  const getToken = () => typeof window !== "undefined" ? getCookie("token") : null;

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (selectedRol) setSelectedPermisos(selectedRol.rol_permiso?.map((rp) => rp.permisos.id_permiso) || []);
  }, [selectedRol]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      const [rolesRes, permisosRes, usuariosRes] = await Promise.all([api.roles.getAll(token), api.permisos.getAll(token), api.usuarios.getAll(token)]);
      setRoles(rolesRes as Rol[]); setPermisos(permisosRes as Permiso[]); setUsuarios(usuariosRes as Usuario[]);
    } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar datos"); }
    finally { setLoading(false); }
  };

  // ── Rol handlers ────────────────────────────────────────────────────────────
  const handleCreateRol = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.roles.create(token, { nombre: formDataRol.nombre }); setShowModalRol(false); setFormDataRol({ nombre: "" }); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al crear rol"); }
    finally { setSaving(false); }
  };
  const handleUpdateRol = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingRol) return;
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.roles.update(token, editingRol.id_rol, { nombre: formDataRol.nombre }); setShowModalRol(false); setEditingRol(null); setFormDataRol({ nombre: "" }); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar"); }
    finally { setSaving(false); }
  };
  const handleDeleteRol = async (id: number) => {
    if (!confirm("¿Eliminar este rol?")) return;
    try { const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.roles.delete(token, id); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
  };

  // ── Permiso handlers ─────────────────────────────────────────────────────────
  const handleCreatePermiso = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.permisos.create(token, { nombre: formDataPermiso.nombre }); setShowModalPermiso(false); setFormDataPermiso({ nombre: "" }); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al crear"); }
    finally { setSaving(false); }
  };
  const handleUpdatePermiso = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingPermiso) return;
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.permisos.update(token, editingPermiso.id_permiso, { nombre: formDataPermiso.nombre }); setShowModalPermiso(false); setEditingPermiso(null); setFormDataPermiso({ nombre: "" }); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar"); }
    finally { setSaving(false); }
  };
  const handleDeletePermiso = async (id: number) => {
    if (!confirm("¿Eliminar este permiso?")) return;
    try { const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.permisos.delete(token, id); fetchData(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
  };

  // ── Permisos-Rol handlers ────────────────────────────────────────────────────
  const openAsignarPermisos = (rol: Rol) => {
    setSelectedRol(rol); setSelectedPermisos(rol.rol_permiso?.map((rp) => rp.permisos.id_permiso) || []); setSelectAllPermisos(false); setShowModalPermisosRol(true);
  };
  const togglePermiso = (id: number) => setSelectedPermisos((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const handleSelectAllPermisos = () => { setSelectedPermisos(selectAllPermisos ? (selectedRol?.rol_permiso?.map((rp) => rp.permisos.id_permiso) || []) : permisos.map((p) => p.id_permiso)); setSelectAllPermisos(!selectAllPermisos); };
  const handleSavePermisosRol = async () => {
    if (!selectedRol) return;
    try {
      setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa");
      const current = selectedRol.rol_permiso?.map((rp) => rp.permisos.id_permiso) || [];
      for (const id of selectedPermisos) { if (!current.includes(id)) await api.rolesPermisos.assign(token, { id_rol: selectedRol.id_rol, id_permiso: id }); }
      for (const id of current) { if (!selectedPermisos.includes(id)) await api.rolesPermisos.remove(token, selectedRol.id_rol, id); }
      setShowModalPermisosRol(false); fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al guardar permisos"); }
    finally { setSaving(false); }
  };

  // ── Usuario-roles handlers ───────────────────────────────────────────────────
  const openAsignarRoles = (usuario: Usuario) => {
    setSelectedUser(usuario); setSelectedUserRoles(usuario.usuario_rol?.filter((ur) => ur.estado === "activo").map((ur) => ur.id_rol) || []); setShowModalAsignarRoles(true);
  };
  const toggleUserRole = (id: number) => setSelectedUserRoles((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const handleSaveUserRoles = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa");
      const current = selectedUser.usuario_rol?.filter((ur) => ur.estado === "activo").map((ur) => ur.id_rol) || [];
      for (const id of selectedUserRoles) { if (!current.includes(id)) await api.usuariosRoles.assign(token, { id_usuario: selectedUser.id_usuario, id_rol: id }); }
      for (const id of current) { if (!selectedUserRoles.includes(id)) await api.usuariosRoles.remove(token, selectedUser.id_usuario, id); }
      setShowModalAsignarRoles(false); fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al guardar roles"); }
    finally { setSaving(false); }
  };

  // ── Usuario CRUD handlers ────────────────────────────────────────────────────
  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa");
      const response = await api.usuarios.create(token, { nombre: userFormData.nombre, email: userFormData.email, password: userFormData.password || undefined, apellido_paterno: userFormData.apellido_paterno || undefined, apellido_materno: userFormData.apellido_materno || undefined, telefono: userFormData.telefono || undefined, idioma_preferido: userFormData.idioma_preferido, moneda_preferida: userFormData.moneda_preferida }) as { id_usuario: string };
      if (selectedFotoFile) { const fd = new FormData(); fd.append("foto", selectedFotoFile); await api.usuarios.uploadPhoto(token, response.id_usuario, fd); }
      if (userFormData.id_rol) await api.usuariosRoles.assign(token, { id_usuario: response.id_usuario, id_rol: userFormData.id_rol });
      setShowModalUsuario(false); setSelectedFotoFile(null); setUserFormData({ nombre_usuario: "", nombre: "", foto_url: "", apellido_paterno: "", apellido_materno: "", email: "", password: "", telefono: "", idioma_preferido: "es", moneda_preferida: "MXN", id_rol: 0 }); fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al crear usuario"); }
    finally { setSaving(false); }
  };
  const handleEditUsuario = (usuario: Usuario) => {
    const rolAsignado = usuario.usuario_rol?.find((ur) => ur.estado === "activo");
    setEditingUsuario(usuario); setSelectedFotoFile(null);
    setUserFormData({ nombre_usuario: usuario.nombre_usuario || "", nombre: usuario.nombre || "", foto_url: usuario.foto_url || "", apellido_paterno: usuario.apellido_paterno || "", apellido_materno: usuario.apellido_materno || "", email: usuario.email || "", password: "", telefono: usuario.telefono || "", idioma_preferido: usuario.idioma_preferido || "es", moneda_preferida: usuario.moneda_preferida || "MXN", id_rol: rolAsignado?.id_rol || 0 });
    setShowModalUsuario(true);
  };
  const handleUpdateUsuario = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingUsuario) return;
    try {
      setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa");
      const payload: Record<string, unknown> = { nombre: userFormData.nombre, apellido_paterno: userFormData.apellido_paterno || undefined, apellido_materno: userFormData.apellido_materno || undefined, email: userFormData.email, telefono: userFormData.telefono || undefined, idioma_preferido: userFormData.idioma_preferido, moneda_preferida: userFormData.moneda_preferida };
      if (userFormData.password) payload.password = userFormData.password;
      await api.usuarios.update(token, editingUsuario.id_usuario, payload);
      if (selectedFotoFile) { const fd = new FormData(); fd.append("foto", selectedFotoFile); await api.usuarios.uploadPhoto(token, editingUsuario.id_usuario, fd); }
      setShowModalUsuario(false); setEditingUsuario(null); setSelectedFotoFile(null);
      setUserFormData({ nombre_usuario: "", nombre: "", foto_url: "", apellido_paterno: "", apellido_materno: "", email: "", password: "", telefono: "", idioma_preferido: "es", moneda_preferida: "MXN", id_rol: 0 });
      fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar usuario"); }
    finally { setSaving(false); }
  };

  const getRoleColor = (nombre: string) => {
    const colors: Record<string, string> = { admin: "bg-indigo-100 text-indigo-700 border-indigo-200", administrador: "bg-indigo-100 text-indigo-700 border-indigo-200", cliente: "bg-green-100 text-green-700 border-green-200", productor: "bg-amber-100 text-amber-700 border-amber-200" };
    return colors[nombre.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
  };
  const getUserRoles = (u: Usuario) => u.usuario_rol?.filter((ur) => ur.estado === "activo").map((ur) => ur.roles?.nombre) || [];

  // ── Shared classes ───────────────────────────────────────────────────────────
  const inputCls      = "w-full rounded-xl border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-3 text-slate-800 dark:text-white p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 placeholder-gray-400 dark:placeholder-dark-6";
  const labelCls      = "mb-2 block text-sm font-medium text-slate-700 dark:text-dark-7";
  const modalWrapCls  = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  const modalBoxCls   = "w-full max-w-md rounded-2xl bg-white dark:bg-dark-2 shadow-2xl";
  const modalHdrCls   = "flex items-center justify-between border-b border-gray-100 dark:border-dark-3 p-6";
  const checkboxRowCls= (active: boolean) => `flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${active ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-3"}`;
  const checkboxBoxCls= (active: boolean) => `mr-3 flex h-5 w-5 items-center justify-center rounded-md ${active ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-dark-3"}`;
  const btnCancel     = "flex-1 rounded-xl border border-gray-200 dark:border-dark-3 py-3 font-medium text-slate-600 dark:text-dark-6 transition-colors hover:bg-gray-50 dark:hover:bg-dark-3";
  const btnSave       = "flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50";

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-green-600" size={40} /></div>;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Gestión de Roles y Permisos</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-6">Administra roles, permisos y usuarios del sistema</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 dark:bg-dark-3 p-1">
        {([["roles","Roles",Shield],["permisos","Permisos",Key],["usuarios","Usuarios",User]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${tab === key ? "bg-white dark:bg-dark-2 text-green-700 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-dark-6 hover:text-gray-700 dark:hover:text-white"}`}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {/* ── ROLES TAB ── */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingRol(null); setFormDataRol({ nombre: "" }); setShowModalRol(true); }} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700">
              <Plus size={18} /> Nuevo Rol
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-gray-100 dark:border-dark-3 bg-gray-50/50 dark:bg-dark-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">
                <tr>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Permisos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-3">
                {roles.map((rol) => (
                  <tr key={rol.id_rol} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-dark-3/50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${getRoleColor(rol.nombre)}`}>
                        <Shield size={14} className="mr-2" />{rol.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${rol.estado === "activo" ? "border-green-100 bg-green-50 text-green-700" : "border-gray-100 dark:border-dark-3 bg-gray-50 dark:bg-dark-3 text-gray-500 dark:text-dark-6"}`}>{rol.estado}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {rol.rol_permiso?.length ? rol.rol_permiso.map((rp, i) => <span key={i} className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">{rp.permisos.nombre}</span>) : <span className="text-sm text-gray-400 dark:text-dark-6">Sin permisos</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openAsignarPermisos(rol)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"><Key size={16} /></button>
                        <button onClick={() => { setEditingRol(rol); setFormDataRol({ nombre: rol.nombre }); setShowModalRol(true); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteRol(rol.id_rol)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PERMISOS TAB ── */}
      {tab === "permisos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingPermiso(null); setFormDataPermiso({ nombre: "" }); setShowModalPermiso(true); }} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700">
              <Plus size={18} /> Nuevo Permiso
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {permisos.map((permiso) => (
              <div key={permiso.id_permiso} className="group rounded-2xl border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"><Key size={20} /></div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingPermiso(permiso); setFormDataPermiso({ nombre: permiso.nombre }); setShowModalPermiso(true); }} className="rounded-lg p-2 text-gray-300 opacity-0 transition-colors hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"><Pencil size={16} /></button>
                    <button onClick={() => handleDeletePermiso(permiso.id_permiso)} className="rounded-lg p-2 text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">{permiso.nombre}</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-6">ID: #{permiso.id_permiso}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USUARIOS TAB ── */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowModalUsuario(true)} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700">
              <UserPlus size={18} /> Nuevo Usuario
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-3 bg-white dark:bg-dark-2">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-gray-100 dark:border-dark-3 bg-gray-50/50 dark:bg-dark-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-6">
                <tr>
                  <th className="px-6 py-4">Usuario</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Roles</th><th className="px-6 py-4">Fecha Registro</th><th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-3">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id_usuario} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-dark-3/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-xs font-bold text-green-700 dark:text-green-400">{usuario.nombre?.charAt(0).toUpperCase()}</div>
                        <span className="font-medium text-slate-800 dark:text-white">{usuario.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-dark-6">{usuario.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getUserRoles(usuario).length > 0 ? getUserRoles(usuario).map((rol, i) => <span key={i} className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">{rol}</span>) : <span className="text-sm text-gray-400 dark:text-dark-6">Sin roles</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-dark-6">{usuario.fecha_registro ? new Date(usuario.fecha_registro).toLocaleDateString("es-MX") : "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditUsuario(usuario)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                        <button onClick={() => openAsignarRoles(usuario)}  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600"><Shield size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Rol ── */}
      {showModalRol && (
        <div className={modalWrapCls}><div className={modalBoxCls}>
          <div className={modalHdrCls}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingRol ? "Editar Rol" : "Nuevo Rol"}</h3>
            <button onClick={() => setShowModalRol(false)} className="text-gray-400 dark:text-dark-6 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
          </div>
          <form onSubmit={editingRol ? handleUpdateRol : handleCreateRol} className="p-6">
            <div className="mb-4">
              <label className={labelCls}>Nombre del Rol</label>
              <input type="text" value={formDataRol.nombre} onChange={(e) => setFormDataRol({ nombre: e.target.value })} className={inputCls} placeholder="Ej: administrador, cliente" required />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowModalRol(false)} className={btnCancel}>Cancelar</button>
              <button type="submit" disabled={saving} className={btnSave}>{saving && <Loader2 className="animate-spin" size={16} />}{editingRol ? "Actualizar" : "Crear"}</button>
            </div>
          </form>
        </div></div>
      )}

      {/* ── Modal Permiso ── */}
      {showModalPermiso && (
        <div className={modalWrapCls}><div className={modalBoxCls}>
          <div className={modalHdrCls}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingPermiso ? "Editar Permiso" : "Nuevo Permiso"}</h3>
            <button onClick={() => { setShowModalPermiso(false); setEditingPermiso(null); setFormDataPermiso({ nombre: "" }); }} className="text-gray-400 dark:text-dark-6 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
          </div>
          <form onSubmit={editingPermiso ? handleUpdatePermiso : handleCreatePermiso} className="p-6">
            <div className="mb-4">
              <label className={labelCls}>Nombre del Permiso</label>
              <input type="text" value={formDataPermiso.nombre} onChange={(e) => setFormDataPermiso({ nombre: e.target.value })} className={inputCls} placeholder="Ej: gestionar_usuarios" required />
              <p className="mt-2 text-xs text-gray-400 dark:text-dark-6">Formato: acción_objeto (ej: crear_producto)</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModalPermiso(false); setEditingPermiso(null); setFormDataPermiso({ nombre: "" }); }} className={btnCancel}>Cancelar</button>
              <button type="submit" disabled={saving} className={btnSave}>{saving && <Loader2 className="animate-spin" size={16} />}{editingPermiso ? "Actualizar" : "Crear"}</button>
            </div>
          </form>
        </div></div>
      )}

      {/* ── Modal Permisos-Rol ── */}
      {showModalPermisosRol && selectedRol && (
        <div className={modalWrapCls}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-2 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className={modalHdrCls}>
              <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Asignar Permisos al Rol</h3><p className="text-sm text-gray-500 dark:text-dark-6">{selectedRol.nombre}</p></div>
              <button onClick={() => setShowModalPermisosRol(false)} className="text-gray-400 dark:text-dark-6 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-dark-6">Selecciona los permisos:</p>
                <button type="button" onClick={handleSelectAllPermisos} className="text-sm font-medium text-green-600 hover:text-green-700">{selectAllPermisos ? "Deseleccionar todos" : "Seleccionar todos"}</button>
              </div>
              <div className="mb-4 flex gap-2">
                <button type="button" onClick={() => setSelectedPermisos(permisos.filter((p) => PERMISOS_CLIENTE.includes(p.nombre)).map((p) => p.id_permiso))} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">+ Cliente</button>
                <button type="button" onClick={() => setSelectedPermisos(permisos.filter((p) => PERMISOS_PRODUCTOR.includes(p.nombre)).map((p) => p.id_permiso))} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">+ Productor</button>
              </div>
              <div className="space-y-2">
                {permisos.map((permiso) => (
                  <label key={permiso.id_permiso} className={checkboxRowCls(selectedPermisos.includes(permiso.id_permiso))}>
                    <input type="checkbox" checked={selectedPermisos.includes(permiso.id_permiso)} onChange={() => togglePermiso(permiso.id_permiso)} className="sr-only" />
                    <div className={checkboxBoxCls(selectedPermisos.includes(permiso.id_permiso))}>{selectedPermisos.includes(permiso.id_permiso) && <Check size={14} />}</div>
                    <span className="font-medium text-slate-700 dark:text-white">{permiso.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 dark:border-dark-3 p-6">
              <button onClick={() => setShowModalPermisosRol(false)} className={btnCancel}>Cancelar</button>
              <button onClick={handleSavePermisosRol} disabled={saving} className={btnSave}>{saving && <Loader2 className="animate-spin" size={16} />}Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Usuario ── */}
      {showModalUsuario && (
        <div className={modalWrapCls}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-2 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className={modalHdrCls}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={() => { setShowModalUsuario(false); setEditingUsuario(null); setSelectedFotoFile(null); }} className="text-gray-400 dark:text-dark-6 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Nombre de Usuario</label><input type="text" value={userFormData.nombre_usuario} onChange={(e) => setUserFormData({ ...userFormData, nombre_usuario: e.target.value })} className={inputCls} required /></div>
                <div><label className={labelCls}>Nombre</label><input type="text" value={userFormData.nombre} onChange={(e) => setUserFormData({ ...userFormData, nombre: e.target.value })} className={inputCls} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Apellido Paterno</label><input type="text" value={userFormData.apellido_paterno} onChange={(e) => setUserFormData({ ...userFormData, apellido_paterno: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Apellido Materno</label><input type="text" value={userFormData.apellido_materno} onChange={(e) => setUserFormData({ ...userFormData, apellido_materno: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Email</label><input type="email" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className={inputCls} required /></div>
              <div><label className={labelCls}>{editingUsuario ? "Password (opcional)" : "Password"}</label><input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} className={inputCls} required={!editingUsuario} placeholder={editingUsuario ? "Dejar vacío para mantener" : ""} /></div>
              <div><label className={labelCls}>Teléfono</label><input type="text" value={userFormData.telefono} onChange={(e) => setUserFormData({ ...userFormData, telefono: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Idioma</label><select value={userFormData.idioma_preferido} onChange={(e) => setUserFormData({ ...userFormData, idioma_preferido: e.target.value })} className={inputCls}><option value="es">Español</option><option value="en">English</option><option value="fr">Français</option></select></div>
                <div><label className={labelCls}>Moneda</label><select value={userFormData.moneda_preferida} onChange={(e) => setUserFormData({ ...userFormData, moneda_preferida: e.target.value })} className={inputCls}><option value="MXN">MXN</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
              </div>
              <div><label className={labelCls}>Asignar Rol</label><select value={userFormData.id_rol} onChange={(e) => setUserFormData({ ...userFormData, id_rol: parseInt(e.target.value) || 0 })} className={inputCls}><option value={0}>Seleccionar rol...</option>{roles.map((rol) => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre}</option>)}</select></div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 dark:border-dark-3 p-6">
              <button type="button" onClick={() => { setShowModalUsuario(false); setEditingUsuario(null); setSelectedFotoFile(null); }} className={btnCancel}>Cancelar</button>
              <button type="button" onClick={(e) => { const fakeEvent = { preventDefault: () => {} } as React.FormEvent; editingUsuario ? handleUpdateUsuario(fakeEvent) : handleCreateUsuario(fakeEvent); }} disabled={saving} className={btnSave}>{saving && <Loader2 className="animate-spin" size={16} />}{editingUsuario ? "Actualizar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Asignar Roles ── */}
      {showModalAsignarRoles && selectedUser && (
        <div className={modalWrapCls}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-2 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className={modalHdrCls}>
              <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Asignar Roles al Usuario</h3><p className="text-sm text-gray-500 dark:text-dark-6">{selectedUser.nombre}</p></div>
              <button onClick={() => setShowModalAsignarRoles(false)} className="text-gray-400 dark:text-dark-6 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-4 text-sm text-gray-600 dark:text-dark-6">Selecciona los roles para este usuario:</p>
              <div className="space-y-2">
                {roles.map((rol) => (
                  <label key={rol.id_rol} className={checkboxRowCls(selectedUserRoles.includes(rol.id_rol))}>
                    <input type="checkbox" checked={selectedUserRoles.includes(rol.id_rol)} onChange={() => toggleUserRole(rol.id_rol)} className="sr-only" />
                    <div className={checkboxBoxCls(selectedUserRoles.includes(rol.id_rol))}>{selectedUserRoles.includes(rol.id_rol) && <Check size={14} />}</div>
                    <span className="font-medium text-slate-700 dark:text-white">{rol.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 dark:border-dark-3 p-6">
              <button onClick={() => setShowModalAsignarRoles(false)} className={btnCancel}>Cancelar</button>
              <button onClick={handleSaveUserRoles} disabled={saving} className={btnSave}>{saving && <Loader2 className="animate-spin" size={16} />}Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}