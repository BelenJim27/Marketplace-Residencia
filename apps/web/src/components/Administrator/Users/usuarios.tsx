"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { Loader2, Plus, Pencil, Trash2, Mail, ShieldCheck, X, User, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { AlertService } from "@/shared/alerts";
import Image from "next/image";

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
  const deleteAlert = useDeleteAlert("usuario");
  const successToast = useSuccessToast("usuario");

  // --- Paginación ---
  const [currentPage, setCurrentPage]     = useState(1);
  const itemsPerPage = 10;

  const getToken = () => typeof window !== "undefined" ? (getCookie("token") ?? "") : "";

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? (getCookie("token") ?? "") : "";
      const data = await api.usuarios.getAll(token);
      setUsuarios(data as Usuario[]);
    } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar usuarios"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchUsuarios();
    const fetchRoles = async () => {
      try {
        const token = typeof window !== "undefined" ? (getCookie("token") ?? "") : "";
        const data = await api.roles.getAll(token);
        setRoles(data as Rol[]);
      } catch { /* roles no críticos */ }
    };
    fetchRoles();
  }, [fetchUsuarios]);

  const closeModal = () => { setShowModal(false); setEditingUsuario(null); setSelectedFotoFile(null); setUserFormData(DEFAULT_FORM); };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = getToken();
      await api.usuarios.create(token, { ...userFormData });
      closeModal(); fetchUsuarios();
      successToast.mostrarRegistrado();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al crear usuario"); }
    finally { setSaving(false); }
  };

  const handleUpdateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsuario) return;
    try {
      setSaving(true);
      const token = getToken();
      const payload: Partial<UserFormData> = { ...userFormData };
      if (!payload.password) delete payload.password;
      await api.usuarios.update(token, editingUsuario.id_usuario, payload);
      closeModal(); fetchUsuarios();
      successToast.mostrarActualizado();
    } catch (err) { setError(err instanceof Error ? err.message : "Error al actualizar usuario"); }
    finally { setSaving(false); }
  };

  const handleDelete = (usuario: Usuario) => {
    const nombre = [usuario.nombre, usuario.apellido_paterno].filter(Boolean).join(" ");
    deleteAlert.abrir(nombre, async () => {
      try {
        const token = getToken();
        await api.usuarios.delete(token, usuario.id_usuario);
        fetchUsuarios();
        successToast.mostrar("Usuario eliminado correctamente.");
      } catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
    });
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
    const colors = ["bg-[#A8C26B]/25 text-[#1F3A2E]", "bg-[#3D6B3F]/15 text-[#3D6B3F]", "bg-[#C97A3E]/20 text-[#C97A3E]", "bg-[#1F3A2E]/15 text-[#1F3A2E]"];
    return colors[nombre.charCodeAt(0) % colors.length];
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchesSearch = searchTerm === "" || user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole   = filterRole === "todos" || getUserRoles(user).some((r) => r?.toLowerCase() === filterRole.toLowerCase());
    return matchesSearch && matchesRole;
  });

  // --- Lógica de Paginación ---
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const currentUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeUsers    = usuarios.filter((u) => !u.estado || u.estado === "activo").length;
  const usersWithRoles = usuarios.filter((u) => (u.usuario_rol?.length || 0) > 0).length;

  const inputCls = "w-full rounded-xl border border-[#C5CFB0] px-3 py-2 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/50 bg-[#F4F0E3] focus:outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent transition-all";
  const labelCls = "block text-sm font-medium text-[#1F3A2E] mb-1";

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  return (
    <div className="w-full">
      <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />
      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F3A2E] tracking-tight [font-family:'Playfair_Display',serif]">Gestión de Usuarios</h1>
          <p className="text-[#3D6B3F]/70 text-sm mt-0.5">Controla los accesos y permisos del personal</p>
        </div>
        <button
          data-tour="btn-nuevo-usuario"
          onClick={() => { setShowModal(true); setEditingUsuario(null); setUserFormData(DEFAULT_FORM); }}
          className="bg-[#3D6B3F] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#1F3A2E] transition-all duration-200 active:scale-95 w-full sm:w-auto"
        >
          <Plus size={18} className="inline mr-2" /> Nuevo Usuario
        </button>
      </div>

      {/* Error */}
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Stats */}
      <div data-tour="usuarios-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Usuarios", value: usuarios.length,      color: "text-[#1F3A2E] dark:text-[#B8DCA8]" },
          { label: "Activos",        value: activeUsers,           color: "text-[#3D6B3F] dark:text-[#7FBB7F]" },
          { label: "Con Roles",      value: usersWithRoles,        color: "text-[#3D6B3F] dark:text-[#7FBB7F]" },
          { label: "Pendientes",     value: usuarios.length - activeUsers, color: "text-[#C97A3E]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#F4F0E3] dark:bg-[#111C16] rounded-2xl border border-[#C5CFB0] dark:border-[#2A4830] shadow-[0_2px_8px_rgba(61,107,63,0.08)] p-5 flex flex-col gap-1">
            <p className="text-sm font-semibold text-[#3D6B3F]/70 dark:text-[#7A9E6E] uppercase tracking-wider">{label}</p>
            <h2 className={`text-2xl font-bold mt-1 [font-family:'DM_Sans',sans-serif] ${color}`}>{value}</h2>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div data-tour="usuarios-filtros" className="flex flex-wrap gap-3 items-center mb-6">
        <div className="flex-grow min-w-[300px]">
          <input
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-[#C5CFB0] dark:border-[#2A4830] bg-[#F4F0E3] dark:bg-[#111C16] text-[#1F3A2E] dark:text-[#B8DCA8] placeholder-[#3D6B3F]/50 dark:placeholder-[#5A8060]/70 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent transition-all"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-[#C5CFB0] dark:border-[#2A4830] bg-[#F4F0E3] dark:bg-[#111C16] text-[#1F3A2E] dark:text-[#B8DCA8] p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#3D6B3F] focus:border-transparent"
        >
          <option value="todos">Todos los Roles</option>
          {roles.map((r) => <option key={r.id_rol} value={r.nombre.toLowerCase()}>{r.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      <div data-tour="usuarios-tabla" className="border border-[#C5CFB0] dark:border-[#2A4830] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#1F3A2E] text-xs font-semibold text-white uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Rol / Permisos</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha Registro</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5CFB0]/30 dark:divide-[#2A4830]/30">
              {currentUsuarios.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#3D6B3F]/70 dark:text-[#7A9E6E] bg-white dark:bg-[#0F1A13]">No se encontraron usuarios</td></tr>
              ) : (
                currentUsuarios.map((user) => (
                  <tr key={user.id_usuario} className="odd:bg-white dark:odd:bg-[#0F1A13] even:bg-[#F4F0E3]/40 dark:even:bg-[#111C16]/60 hover:bg-[#C5CFB0]/20 dark:hover:bg-[#1A2E22]/40 transition-all duration-200 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.foto_url ? (
                          <Image src={user.foto_url} alt={user.nombre} width={40} height={40} className="rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${getColor(user.nombre)} flex items-center justify-center font-bold text-xs shadow-sm`}>{getInitials(user.nombre)}</div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-[#1F3A2E] dark:text-[#B8DCA8]">{user.nombre} {user.apellido_paterno}</p>
                          <p className="text-xs text-[#3D6B3F]/60 dark:text-[#5A8060]/80 flex items-center gap-1"><Mail size={12} /> {user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[#1F3A2E] dark:text-[#B8DCA8]">
                        <ShieldCheck size={16} className={getUserRoles(user).some((r) => r?.toLowerCase().includes("admin")) ? "text-[#3D6B3F] dark:text-[#7FBB7F]" : "text-[#C5CFB0] dark:text-[#2A4830]"} />
                        {getUserRoles(user).length > 0 ? getUserRoles(user).map((rol, i) => <span key={i} className="font-medium">{rol}</span>) : <span className="text-[#3D6B3F]/50 dark:text-[#5A8060]">Sin rol</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.estado === "activo" ? "bg-[#A8C26B]/20 text-[#3D6B3F] dark:text-[#A8C26B]" : "bg-[#C97A3E]/15 text-[#C97A3E]"}`}>
                        {user.estado || "Activo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#3D6B3F]/70 dark:text-[#7A9E6E] font-medium">
                      {user.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(user)} className="p-1.5 text-[#3D6B3F]/50 hover:text-[#3D6B3F] hover:bg-[#A8C26B]/20 dark:hover:bg-[#A8C26B]/10 rounded-lg transition-all duration-200"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(user)} className="p-1.5 text-[#3D6B3F]/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-[#C5CFB0] dark:border-[#2A4830] px-4 py-3 sm:px-6 mt-4 bg-white dark:bg-[#0F1A13] rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-xl border border-[#C5CFB0] dark:border-[#2A4830] bg-white dark:bg-[#111C16] px-4 py-2 text-sm font-medium text-[#1F3A2E] dark:text-[#B8DCA8] hover:bg-[#F4F0E3] dark:hover:bg-[#1A2E22] disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-xl border border-[#C5CFB0] dark:border-[#2A4830] bg-white dark:bg-[#111C16] px-4 py-2 text-sm font-medium text-[#1F3A2E] dark:text-[#B8DCA8] hover:bg-[#F4F0E3] dark:hover:bg-[#1A2E22] disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#1F3A2E] dark:text-[#B8DCA8]">
                Mostrando <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredUsuarios.length)}</span> de <span className="font-semibold">{filteredUsuarios.length}</span> usuarios
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] dark:text-[#7A9E6E] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#2A4830] hover:bg-[#F4F0E3] dark:hover:bg-[#1A2E22] focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] dark:text-[#B8DCA8] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#2A4830] focus:z-20 focus:outline-offset-0">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] dark:text-[#7A9E6E] ring-1 ring-inset ring-[#C5CFB0] dark:ring-[#2A4830] hover:bg-[#F4F0E3] dark:hover:bg-[#1A2E22] focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Siguiente</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-[0_24px_48px_rgba(31,58,46,0.25)] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-[#1F3A2E] p-6">
              <h3 className="text-lg font-bold text-white [font-family:'Playfair_Display',serif]">{editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={closeModal} className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-all duration-200"><X size={20} /></button>
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
                      <Image src={selectedFotoFile ? URL.createObjectURL(selectedFotoFile) : userFormData.foto_url} alt="Preview" width={0} height={0} sizes="100vw" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => { setSelectedFotoFile(null); setUserFormData({ ...userFormData, foto_url: "" }); }} className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#C5CFB0] bg-[#F4F0E3]"><User size={24} className="text-[#3D6B3F]/50" /></div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#C5CFB0] px-4 py-2 text-sm font-medium text-[#1F3A2E] hover:bg-[#C5CFB0]/20 transition-all duration-200">
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 500 * 1024) { AlertService.showWarning("La imagen debe pesar menos de 500 KB."); e.target.value = ""; return; } setSelectedFotoFile(file); }} className="hidden" />
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
                    <option value="MXN">MXN - Peso Mexicano</option><option value="USD">USD - Dólar</option>
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
            <div className="flex gap-3 border-t border-[#C5CFB0] p-6 bg-[#F4F0E3]/50">
              <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-[#C5CFB0] py-3 text-sm font-medium text-[#1F3A2E] hover:bg-[#C5CFB0]/30 transition-all duration-200">Cancelar</button>
              <button
                type="button"
                onClick={(e) => editingUsuario ? handleUpdateUsuario(e as unknown as React.FormEvent) : handleCreateUsuario(e as unknown as React.FormEvent)}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] py-3 text-sm font-medium text-white hover:bg-[#1F3A2E] transition-all duration-200 disabled:opacity-50"
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