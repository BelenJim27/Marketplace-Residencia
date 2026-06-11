"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Loader2, Plus, Pencil, Trash2, Shield, Key, User, X, Check, 
  UserPlus, Filter, ChevronLeft, ChevronRight 
} from "lucide-react";
import { getCookie } from "@/lib/cookies";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { SuccessToast } from "@/components/ui/SuccessToast";

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

  // ── Filtro de usuarios ───────────────────────────────────────────────────────
  const [rolFilter, setRolFilter] = useState<string>("todos");

  // ── Paginación de usuarios ───────────────────────────────────────────────────
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const USERS_PER_PAGE = 10;

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

  const deleteAlertRol     = useDeleteAlert("rol");
  const deleteAlertPermiso = useDeleteAlert("permiso");
  const successToast       = useSuccessToast("rol");

  const getToken = () => typeof window !== "undefined" ? getCookie("token") : null;

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (selectedRol) setSelectedPermisos(selectedRol.rol_permiso?.map((rp) => rp.permisos.id_permiso) || []);
  }, [selectedRol]);

  // Reiniciar a la página 1 cuando cambia el filtro de roles
  useEffect(() => {
    setCurrentUserPage(1);
  }, [rolFilter]);

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

  const handleCreateRol = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.roles.create(token, { nombre: formDataRol.nombre }); setShowModalRol(false); setFormDataRol({ nombre: "" }); fetchData(); successToast.mostrarRegistrado(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al crear rol"); }
    finally { setSaving(false); }
  };
  const handleUpdateRol = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingRol) return;
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.roles.update(token, editingRol.id_rol, { nombre: formDataRol.nombre }); setShowModalRol(false); setEditingRol(null); setFormDataRol({ nombre: "" }); fetchData(); successToast.mostrarActualizado(); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar"); }
    finally { setSaving(false); }
  };
  const handleDeleteRol = (id: number, nombre: string) => {
    deleteAlertRol.abrir(nombre, async () => {
      try { const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.roles.delete(token, id); fetchData(); }
      catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
    });
  };

  const handleCreatePermiso = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.permisos.create(token, { nombre: formDataPermiso.nombre }); setShowModalPermiso(false); setFormDataPermiso({ nombre: "" }); fetchData(); successToast.mostrar("Permiso creado correctamente."); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al crear"); }
    finally { setSaving(false); }
  };
  const handleUpdatePermiso = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingPermiso) return;
    try { setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.permisos.update(token, editingPermiso.id_permiso, { nombre: formDataPermiso.nombre }); setShowModalPermiso(false); setEditingPermiso(null); setFormDataPermiso({ nombre: "" }); fetchData(); successToast.mostrar("Permiso actualizado correctamente."); }
    catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar"); }
    finally { setSaving(false); }
  };
  const handleDeletePermiso = (id: number, nombre: string) => {
    deleteAlertPermiso.abrir(nombre, async () => {
      try { const token = getToken(); if (!token) throw new Error("No hay sesión activa"); await api.permisos.delete(token, id); fetchData(); }
      catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
    });
  };

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
      setShowModalPermisosRol(false); fetchData(); successToast.mostrar("Permisos del rol actualizados correctamente.");
    } catch (err) { setError(err instanceof Error ? err.message : "Error al guardar permisos"); }
    finally { setSaving(false); }
  };

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
      setShowModalAsignarRoles(false); fetchData(); successToast.mostrar("Roles del usuario actualizados correctamente.");
    } catch (err) { setError(err instanceof Error ? err.message : "Error al guardar roles"); }
    finally { setSaving(false); }
  };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); const token = getToken(); if (!token) throw new Error("No hay sesión activa");
      const response = await api.usuarios.create(token, { nombre: userFormData.nombre, email: userFormData.email, password: userFormData.password || undefined, apellido_paterno: userFormData.apellido_paterno || undefined, apellido_materno: userFormData.apellido_materno || undefined, telefono: userFormData.telefono || undefined, idioma_preferido: userFormData.idioma_preferido, moneda_preferida: userFormData.moneda_preferida }) as { id_usuario: string };
      if (selectedFotoFile) { const fd = new FormData(); fd.append("foto", selectedFotoFile); await api.usuarios.uploadPhoto(token, response.id_usuario, fd); }
      if (userFormData.id_rol) await api.usuariosRoles.assign(token, { id_usuario: response.id_usuario, id_rol: userFormData.id_rol });
      setShowModalUsuario(false); setSelectedFotoFile(null); setUserFormData({ nombre_usuario: "", nombre: "", foto_url: "", apellido_paterno: "", apellido_materno: "", email: "", password: "", telefono: "", idioma_preferido: "es", moneda_preferida: "MXN", id_rol: 0 }); fetchData(); successToast.mostrar("Usuario creado correctamente.");
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
      fetchData(); successToast.mostrar("Usuario actualizado correctamente.");
    } catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar usuario"); }
    finally { setSaving(false); }
  };

  const getRoleColor = (nombre: string) => {
    const colors: Record<string, string> = { admin: "bg-[#1F3A2E]/10 text-[#1F3A2E] border-[#1F3A2E]/20", administrador: "bg-[#1F3A2E]/10 text-[#1F3A2E] border-[#1F3A2E]/20", cliente: "bg-[#A8C26B]/20 text-[#3D6B3F] border-[#A8C26B]/40", productor: "bg-[#C97A3E]/15 text-[#C97A3E] border-[#C97A3E]/30" };
    return colors[nombre.toLowerCase()] || "bg-[#C5CFB0]/20 text-[#3D6B3F]/70 border-[#C5CFB0]";
  };
  const getUserRoles = (u: Usuario) => u.usuario_rol?.filter((ur) => ur.estado === "activo").map((ur) => ur.roles?.nombre) || [];

  // ── Lógica de filtrado de usuarios ───────────────────────────────────────────
  const usuariosFiltrados = usuarios.filter((u) => {
    if (rolFilter === "todos") return true;
    if (rolFilter === "sin_rol") return getUserRoles(u).length === 0;
    return getUserRoles(u).some((r) => r?.toLowerCase() === rolFilter.toLowerCase());
  });

  // ── Lógica de paginación de usuarios ─────────────────────────────────────────
  const totalUserPages = Math.ceil(usuariosFiltrados.length / USERS_PER_PAGE);
  const userStartIndex = (currentUserPage - 1) * USERS_PER_PAGE;
  const paginatedUsuarios = usuariosFiltrados.slice(userStartIndex, userStartIndex + USERS_PER_PAGE);

  // Conteos para los badges del filtro
  const conteos: Record<string, number> = {
    todos: usuarios.length,
    administrador: usuarios.filter((u) => getUserRoles(u).some((r) => r?.toLowerCase() === "administrador" || r?.toLowerCase() === "admin")).length,
    cliente: usuarios.filter((u) => getUserRoles(u).some((r) => r?.toLowerCase() === "cliente")).length,
    productor: usuarios.filter((u) => getUserRoles(u).some((r) => r?.toLowerCase() === "productor")).length,
    sin_rol: usuarios.filter((u) => getUserRoles(u).length === 0).length,
  };

  const inputCls      = "w-full rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] text-[#1F3A2E] p-3 text-sm outline-none focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 placeholder-[#3D6B3F]/40";
  const labelCls      = "mb-2 block text-sm font-medium text-[#1F3A2E]";
  const modalWrapCls  = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm";
  const modalBoxCls   = "w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)]";
  const modalHdrCls   = "flex items-center justify-between border-b border-[#C5CFB0] bg-[#1F3A2E] p-6";
  const checkboxRowCls= (active: boolean) => `flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${active ? "border-[#3D6B3F] bg-[#A8C26B]/10" : "border-[#C5CFB0] hover:bg-[#F4F0E3]"}`;
  const checkboxBoxCls= (active: boolean) => `mr-3 flex h-5 w-5 items-center justify-center rounded-md ${active ? "bg-[#3D6B3F] text-white" : "bg-[#C5CFB0]/30"}`;
  const btnCancel     = "flex-1 rounded-xl border border-[#C5CFB0] py-3 font-medium text-[#1F3A2E] transition-colors hover:bg-[#C5CFB0]/30";
  const btnSave       = "flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] py-3 font-medium text-white transition-colors hover:bg-[#1F3A2E] disabled:opacity-50";

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-[#3D6B3F]" size={40} /></div>;

  return (
    <div className="w-full">
      <DeleteAlertModal estado={deleteAlertRol.estado}     onClose={deleteAlertRol.cerrar} />
      <DeleteAlertModal estado={deleteAlertPermiso.estado} onClose={deleteAlertPermiso.cerrar} />
      <SuccessToast     toast={successToast.estado}        onClose={successToast.cerrar} />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Gestión de Roles y Permisos</h1>
          <p className="mt-0.5 text-sm text-[#3D6B3F]/70">Administra roles, permisos y usuarios del sistema</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-[#1F3A2E]/8 p-1 border border-[#C5CFB0]">
        {([["roles","Roles",Shield],["permisos","Permisos",Key]/* ,["usuarios","Usuarios",User] */] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors ${tab === key ? "bg-[#F4F0E3] text-[#3D6B3F] shadow-sm" : "text-[#3D6B3F]/60 hover:text-[#3D6B3F]"}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ── ROLES TAB ── */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingRol(null); setFormDataRol({ nombre: "" }); setShowModalRol(true); }}
              className="flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-4 sm:px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1F3A2E]"
            >
              <Plus size={18} /> Nuevo Rol
            </button>
          </div>

          <div className="hidden md:block overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#1F3A2E] text-[10px] font-bold uppercase tracking-widest text-white">
                <tr>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Permisos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CFB0]/30">
                {roles.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-sm text-[#3D6B3F]/70 bg-white">No hay roles registrados. Usa el botón "Nuevo Rol" para crear uno.</td></tr>
                ) : roles.map((rol) => (
                  <tr key={rol.id_rol} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${getRoleColor(rol.nombre)}`}>
                        <Shield size={14} className="mr-2" />{rol.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${rol.estado === "activo" ? "border-[#A8C26B]/40 bg-[#A8C26B]/20 text-[#3D6B3F]" : "border-[#C5CFB0] bg-[#C5CFB0]/30 text-[#3D6B3F]/60"}`}>{rol.estado}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {rol.rol_permiso?.length ? rol.rol_permiso.map((rp, i) => <span key={i} className="rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]">{rp.permisos.nombre}</span>) : <span className="text-sm text-[#3D6B3F]/50">Sin permisos</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openAsignarPermisos(rol)} className="rounded-lg p-2 text-[#3D6B3F]/40 transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Key size={16} /></button>
                        <button onClick={() => { setEditingRol(rol); setFormDataRol({ nombre: rol.nombre }); setShowModalRol(true); }} className="rounded-lg p-2 text-[#3D6B3F]/40 transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteRol(rol.id_rol, rol.nombre)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {roles.length === 0 ? (
              <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-8 text-center text-sm text-[#3D6B3F]/70">
                No hay roles registrados.
              </div>
            ) : roles.map((rol) => (
              <div key={rol.id_rol} className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${getRoleColor(rol.nombre)}`}>
                    <Shield size={14} className="mr-2" />{rol.nombre}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${rol.estado === "activo" ? "border-[#A8C26B]/40 bg-[#A8C26B]/20 text-[#3D6B3F]" : "border-[#C5CFB0] bg-[#C5CFB0]/30 text-[#3D6B3F]/60"}`}>
                    {rol.estado}
                  </span>
                </div>
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D6B3F]/50 mb-2">Permisos</p>
                  <div className="flex flex-wrap gap-1">
                    {rol.rol_permiso?.length ? rol.rol_permiso.map((rp, i) => <span key={i} className="rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]">{rp.permisos.nombre}</span>) : <span className="text-sm text-[#3D6B3F]/50">Sin permisos</span>}
                  </div>
                </div>
                <div className="flex gap-2 border-t border-[#C5CFB0] pt-3">
                  <button onClick={() => openAsignarPermisos(rol)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C5CFB0] py-2 text-xs font-medium text-[#1F3A2E] transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Key size={14} /> Permisos</button>
                  <button onClick={() => { setEditingRol(rol); setFormDataRol({ nombre: rol.nombre }); setShowModalRol(true); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C5CFB0] py-2 text-xs font-medium text-[#1F3A2E] transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Pencil size={14} /> Editar</button>
                  <button onClick={() => handleDeleteRol(rol.id_rol, rol.nombre)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C5CFB0] py-2 text-xs font-medium text-[#1F3A2E] transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200"><Trash2 size={14} /> Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PERMISOS TAB ── */}
      {tab === "permisos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingPermiso(null); setFormDataPermiso({ nombre: "" }); setShowModalPermiso(true); }} className="flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1F3A2E]">
              <Plus size={18} /> Nuevo Permiso
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {permisos.map((permiso) => (
              <div key={permiso.id_permiso} className="group rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(61,107,63,0.15)]">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3D6B3F]/10 text-[#3D6B3F]"><Key size={20} /></div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingPermiso(permiso); setFormDataPermiso({ nombre: permiso.nombre }); setShowModalPermiso(true); }} className="rounded-lg p-2 text-[#C5CFB0] opacity-0 transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F] group-hover:opacity-100"><Pencil size={16} /></button>
                    <button onClick={() => handleDeletePermiso(permiso.id_permiso, permiso.nombre)} className="rounded-lg p-2 text-[#C5CFB0] opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#1F3A2E]">{permiso.nombre}</h3>
                <p className="mt-1 text-xs text-[#3D6B3F]/50">ID: #{permiso.id_permiso}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USUARIOS TAB (sección comentada/deshabilitada) ── */}
      {false /* sección de usuarios comentada */ && tab === "usuarios" && (
        <div className="space-y-4">

          {/* Header con botón */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[#3D6B3F]/70">
              <Filter size={15} />
              <span>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? "s" : ""}</span>
            </div>
            <button onClick={() => setShowModalUsuario(true)} className="flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1F3A2E]">
              <UserPlus size={18} /> Nuevo Usuario
            </button>
          </div>

          {/* ── Filtros por rol ── */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "todos",         label: "Todos",          color: "bg-[#C5CFB0]/20 text-[#1F3A2E] border-[#C5CFB0]",                   activeColor: "bg-[#1F3A2E] text-white border-[#1F3A2E]" },
              { key: "administrador", label: "Administrador",  color: "bg-[#1F3A2E]/8 text-[#1F3A2E] border-[#1F3A2E]/20", activeColor: "bg-[#1F3A2E] text-white border-[#1F3A2E]" },
              { key: "cliente",       label: "Cliente",        color: "bg-[#A8C26B]/15 text-[#3D6B3F] border-[#A8C26B]/30",       activeColor: "bg-[#3D6B3F] text-white border-[#3D6B3F]" },
              { key: "productor",     label: "Productor",      color: "bg-[#C97A3E]/10 text-[#C97A3E] border-[#C97A3E]/20",       activeColor: "bg-[#C97A3E] text-white border-[#C97A3E]" },
              { key: "sin_rol",       label: "Sin rol",        color: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-800",                   activeColor: "bg-red-500 text-white border-red-500" },
            ].map(({ key, label, color, activeColor }) => (
              <button
                key={key}
                onClick={() => setRolFilter(key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${rolFilter === key ? activeColor : color}`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${rolFilter === key ? "bg-white/20" : "bg-black/10 dark:bg-white/10"}`}>
                  {conteos[key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Wrapper contenedor de Tabla y Cards para unificar bordes y diseño con paginación */}
          <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)] bg-white">
            
            {/* Tabla desktop */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#1F3A2E] text-[10px] font-bold uppercase tracking-widest text-white">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Roles</th>
                    <th className="px-6 py-4">Fecha Registro</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5CFB0]/30">
                  {paginatedUsuarios.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-sm text-[#3D6B3F]/70 bg-white">No hay usuarios con este tipo de rol.</td></tr>
                  ) : (
                    paginatedUsuarios.map((usuario) => (
                      <tr key={usuario.id_usuario} className="odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A8C26B]/20 text-xs font-bold text-[#3D6B3F]">{usuario.nombre?.charAt(0).toUpperCase()}</div>
                            <span className="font-medium text-[#1F3A2E]">{usuario.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#1F3A2E]/70">{usuario.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {getUserRoles(usuario).length > 0 ? getUserRoles(usuario).map((rol, i) => <span key={i} className="rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]">{rol}</span>) : <span className="text-sm text-[#3D6B3F]/50">Sin roles</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#1F3A2E]/60">{usuario.fecha_registro ? new Date(usuario.fecha_registro).toLocaleDateString("es-MX") : "-"}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditUsuario(usuario)} className="rounded-lg p-2 text-[#3D6B3F]/40 transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Pencil size={16} /></button>
                            <button onClick={() => openAsignarRoles(usuario)} className="rounded-lg p-2 text-[#3D6B3F]/40 transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Shield size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="md:hidden space-y-3 p-4 bg-[#F4F0E3]/20">
              {paginatedUsuarios.length === 0 ? (
                <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-8 text-center text-sm text-[#3D6B3F]/70">
                  No hay usuarios con este tipo de rol.
                </div>
              ) : (
                paginatedUsuarios.map((usuario) => (
                  <div key={usuario.id_usuario} className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A8C26B]/20 text-sm font-bold text-[#3D6B3F]">{usuario.nombre?.charAt(0).toUpperCase()}</div>
                      <div>
                        <span className="font-medium text-[#1F3A2E] block">{usuario.nombre}</span>
                        <span className="text-xs text-[#1F3A2E]/60">{usuario.email}</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D6B3F]/50 mb-1">Roles</p>
                      <div className="flex flex-wrap gap-1">
                        {getUserRoles(usuario).length > 0 ? getUserRoles(usuario).map((rol, i) => <span key={i} className="rounded-full bg-[#3D6B3F]/10 px-2 py-0.5 text-xs font-medium text-[#3D6B3F]">{rol}</span>) : <span className="text-sm text-[#3D6B3F]/50">Sin roles</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-[#C5CFB0] pt-3">
                      <button onClick={() => handleEditUsuario(usuario)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C5CFB0] py-2 text-xs font-medium text-[#1F3A2E] transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Pencil size={14} /> Editar</button>
                      <button onClick={() => openAsignarRoles(usuario)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C5CFB0] py-2 text-xs font-medium text-[#1F3A2E] transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F]"><Shield size={14} /> Roles</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Controles de Paginación de Usuarios ── */}
            {totalUserPages > 1 && (
              <div className="bg-[#F4F0E3] px-4 py-3 border-t border-[#C5CFB0] flex items-center justify-between sm:px-6">
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#1F3A2E]">
                      Mostrando del <span className="font-medium">{userStartIndex + 1}</span> al{" "}
                      <span className="font-medium">
                        {Math.min(userStartIndex + USERS_PER_PAGE, usuariosFiltrados.length)}
                      </span>{" "}
                      de <span className="font-medium">{usuariosFiltrados.length}</span> usuarios
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentUserPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentUserPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#C5CFB0] bg-white text-sm font-medium text-[#3D6B3F] hover:bg-[#F4F0E3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="sr-only">Anterior</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-[#C5CFB0] bg-white text-sm font-medium text-[#1F3A2E]">
                        Página {currentUserPage} de {totalUserPages}
                      </span>
                      <button
                        onClick={() => setCurrentUserPage((prev) => Math.min(prev + 1, totalUserPages))}
                        disabled={currentUserPage === totalUserPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#C5CFB0] bg-white text-sm font-medium text-[#3D6B3F] hover:bg-[#F4F0E3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="sr-only">Siguiente</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: NUEVO / EDITAR ROL ══════════════════════ */}
      {showModalRol && (
        <div className={modalWrapCls}>
          <div className={modalBoxCls}>
            <div className={modalHdrCls}>
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-[#A8C26B]" />
                <h2 className="text-lg font-bold text-white">{editingRol ? "Editar Rol" : "Nuevo Rol"}</h2>
              </div>
              <button onClick={() => setShowModalRol(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={editingRol ? handleUpdateRol : handleCreateRol} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nombre del rol</label>
                <input className={inputCls} placeholder="Ej: moderador" value={formDataRol.nombre} onChange={(e) => setFormDataRol({ nombre: e.target.value })} required autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModalRol(false)} className={btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving} className={btnSave}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingRol ? "Guardar cambios" : "Crear rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: NUEVO / EDITAR PERMISO ══════════════════ */}
      {showModalPermiso && (
        <div className={modalWrapCls}>
          <div className={modalBoxCls}>
            <div className={modalHdrCls}>
              <div className="flex items-center gap-3">
                <Key size={20} className="text-[#A8C26B]" />
                <h2 className="text-lg font-bold text-white">{editingPermiso ? "Editar Permiso" : "Nuevo Permiso"}</h2>
              </div>
              <button onClick={() => setShowModalPermiso(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={editingPermiso ? handleUpdatePermiso : handleCreatePermiso} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nombre del permiso</label>
                <input className={inputCls} placeholder="Ej: ver_reportes" value={formDataPermiso.nombre} onChange={(e) => setFormDataPermiso({ nombre: e.target.value })} required autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModalPermiso(false)} className={btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving} className={btnSave}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingPermiso ? "Guardar cambios" : "Crear permiso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ASIGNAR PERMISOS A ROL ══════════════════ */}
      {showModalPermisosRol && selectedRol && (
        <div className={modalWrapCls}>
          <div className="w-full max-w-lg rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] max-h-[90vh] flex flex-col">
            <div className={modalHdrCls}>
              <div className="flex items-center gap-3">
                <Key size={20} className="text-[#A8C26B]" />
                <div>
                  <h2 className="text-lg font-bold text-white">Permisos del rol</h2>
                  <p className="text-xs text-white/60">{selectedRol.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowModalPermisosRol(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-2 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#1F3A2E]/70">{selectedPermisos.length} de {permisos.length} seleccionados</span>
                <button type="button" onClick={handleSelectAllPermisos} className="text-xs font-semibold text-[#3D6B3F] hover:underline">
                  {selectAllPermisos ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
              {permisos.map((p) => {
                const active = selectedPermisos.includes(p.id_permiso);
                return (
                  <label key={p.id_permiso} className={checkboxRowCls(active)}>
                    <span className={checkboxBoxCls(active)}>{active && <Check size={12} />}</span>
                    <span className="text-sm font-medium text-[#1F3A2E]">{p.nombre}</span>
                    <input type="checkbox" className="sr-only" checked={active} onChange={() => togglePermiso(p.id_permiso)} />
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3 p-6 border-t border-[#C5CFB0]">
              <button onClick={() => setShowModalPermisosRol(false)} className={btnCancel}>Cancelar</button>
              <button onClick={handleSavePermisosRol} disabled={saving} className={btnSave}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Guardar permisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: NUEVO / EDITAR USUARIO ══════════════════ */}
      {showModalUsuario && (
        <div className={modalWrapCls}>
          <div className="w-full max-w-xl rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] max-h-[90vh] flex flex-col">
            <div className={modalHdrCls}>
              <div className="flex items-center gap-3">
                <User size={20} className="text-[#A8C26B]" />
                <h2 className="text-lg font-bold text-white">{editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}</h2>
              </div>
              <button onClick={() => { setShowModalUsuario(false); setEditingUsuario(null); }} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={editingUsuario ? handleUpdateUsuario : handleCreateUsuario} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input className={inputCls} placeholder="Nombre" value={userFormData.nombre} onChange={(e) => setUserFormData({ ...userFormData, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls}>Nombre de usuario</label>
                  <input className={inputCls} placeholder="nombre_usuario" value={userFormData.nombre_usuario} onChange={(e) => setUserFormData({ ...userFormData, nombre_usuario: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Apellido paterno</label>
                  <input className={inputCls} placeholder="Apellido paterno" value={userFormData.apellido_paterno} onChange={(e) => setUserFormData({ ...userFormData, apellido_paterno: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Apellido materno</label>
                  <input className={inputCls} placeholder="Apellido materno" value={userFormData.apellido_materno} onChange={(e) => setUserFormData({ ...userFormData, apellido_materno: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Correo electrónico *</label>
                <input type="email" className={inputCls} placeholder="email@ejemplo.com" value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>{editingUsuario ? "Nueva contraseña (vacío para no cambiar)" : "Contraseña *"}</label>
                <input type="password" className={inputCls} placeholder="••••••••" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} required={!editingUsuario} />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input className={inputCls} placeholder="+52 000 000 0000" value={userFormData.telefono} onChange={(e) => setUserFormData({ ...userFormData, telefono: e.target.value })} />
              </div>
              {!editingUsuario && (
                <div>
                  <label className={labelCls}>Rol inicial</label>
                  <select className={inputCls} value={userFormData.id_rol} onChange={(e) => setUserFormData({ ...userFormData, id_rol: Number(e.target.value) })}>
                    <option value={0}>Sin rol</option>
                    {roles.map((r) => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModalUsuario(false); setEditingUsuario(null); }} className={btnCancel}>Cancelar</button>
                <button type="submit" disabled={saving} className={btnSave}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingUsuario ? "Guardar cambios" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ASIGNAR ROLES A USUARIO ═════════════════ */}
      {showModalAsignarRoles && selectedUser && (
        <div className={modalWrapCls}>
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] shadow-[0_24px_48px_rgba(31,58,46,0.25)] max-h-[90vh] flex flex-col">
            <div className={modalHdrCls}>
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-[#A8C26B]" />
                <div>
                  <h2 className="text-lg font-bold text-white">Asignar Roles</h2>
                  <p className="text-xs text-white/60">{selectedUser.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowModalAsignarRoles(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-2 overflow-y-auto flex-1">
              {roles.map((rol) => {
                const active = selectedUserRoles.includes(rol.id_rol);
                return (
                  <label key={rol.id_rol} className={checkboxRowCls(active)}>
                    <span className={checkboxBoxCls(active)}>{active && <Check size={12} />}</span>
                    <span className="text-sm font-medium text-[#1F3A2E]">{rol.nombre}</span>
                    <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleUserRole(rol.id_rol)} />
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3 p-6 border-t border-[#C5CFB0]">
              <button onClick={() => setShowModalAsignarRoles(false)} className={btnCancel}>Cancelar</button>
              <button onClick={handleSaveUserRoles} disabled={saving} className={btnSave}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Guardar roles
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
