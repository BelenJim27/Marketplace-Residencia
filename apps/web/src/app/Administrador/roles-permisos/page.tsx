"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Plus, Pencil, Trash2, Shield, Key, User, X, Check, UserPlus, ChevronDown, ChevronRight } from "lucide-react";
import { getCookie } from "@/lib/cookies";

interface Permiso {
  id_permiso: number;
  nombre: string;
}

interface Rol {
  id_rol: number;
  nombre: string;
  estado: string;
  fecha_creacion?: string;
  rol_permiso?: { permisos: Permiso }[];
}

interface Usuario {
  id_usuario: string;
  nombre_usuario?: string;
  nombre: string;
  foto_url?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email: string;
  telefono?: string;
  idioma_preferido?: string;
  moneda_preferida?: string;
  fecha_registro?: string;
  usuario_rol?: { id_rol: number; estado?: string; roles?: { nombre: string } }[];
}

export default function RolesPermisosPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [tab, setTab] = useState<"roles" | "permisos" | "usuarios">("roles");
  
  const [showModalRol, setShowModalRol] = useState(false);
  const [showModalPermiso, setShowModalPermiso] = useState(false);
  const [showModalPermisosRol, setShowModalPermisosRol] = useState(false);
  const [showModalUsuario, setShowModalUsuario] = useState(false);
  const [showModalAsignarRoles, setShowModalAsignarRoles] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<number[]>([]);
  const [selectAllPermisos, setSelectAllPermisos] = useState(false);

  const PERMISOS_CLIENTE = [
    "ver_productos", "crear_pedido", "ver_pedidos", "ver_tienda",
    "ver_inventario", "panel_cliente"
  ];
  const PERMISOS_PRODUCTOR = [
    "ver_productos", "crear_producto", "editar_producto", "eliminar_producto",
    "ver_inventario", "crear_inventario", "editar_inventario",
    "ver_pedidos", "editar_pedido", "ver_tienda", "crear_tienda", "editar_tienda",
    "panel_productor"
  ];
  
  const [formDataRol, setFormDataRol] = useState({ nombre: "" });
  const [formDataPermiso, setFormDataPermiso] = useState({ nombre: "" });
  const [selectedPermisos, setSelectedPermisos] = useState<number[]>([]);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [editingPermiso, setEditingPermiso] = useState<Permiso | null>(null);
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null);
  
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [userFormData, setUserFormData] = useState({
    nombre_usuario: "",
    nombre: "",
    foto_url: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    password: "",
    telefono: "",
    idioma_preferido: "es",
    moneda_preferida: "MXN",
    id_rol: 0,
  });
  const [selectedFotoFile, setSelectedFotoFile] = useState<File | null>(null);
  
  const [saving, setSaving] = useState(false);

  const getToken = () => (typeof window !== "undefined" ? getCookie("token") : null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRol) {
      const ids = selectedRol.rol_permiso?.map(rp => rp.permisos.id_permiso) || [];
      setSelectedPermisos(ids);
    }
  }, [selectedRol]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");

      const [rolesRes, permisosRes, usuariosRes] = await Promise.all([
        api.roles.getAll(token),
        api.permisos.getAll(token),
        api.usuarios.getAll(token),
      ]);

      setRoles(rolesRes as Rol[]);
      setPermisos(permisosRes as Permiso[]);
      setUsuarios(usuariosRes as Usuario[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRol = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");

      await api.roles.create(token, { nombre: formDataRol.nombre });
      setShowModalRol(false);
      setFormDataRol({ nombre: "" });
      fetchData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al crear rol";
      console.error("❌ Error:", errorMsg);
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRol = async (id: number) => {
    if (!confirm("¿Eliminar este rol?")) return;
    try {
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.roles.delete(token, id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleEditRol = (rol: Rol) => {
    setEditingRol(rol);
    setFormDataRol({ nombre: rol.nombre });
    setShowModalRol(true);
  };

  const handleUpdateRol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRol) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.roles.update(token, editingRol.id_rol, { nombre: formDataRol.nombre });
      setShowModalRol(false);
      setEditingRol(null);
      setFormDataRol({ nombre: "" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePermiso = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📝 handleCreatePermiso llamado", formDataPermiso);
    try {
      setSaving(true);
      const token = getToken();
      console.log("🔑 Token:", token);
      if (!token) throw new Error("No hay sesión activa");

      const result = await api.permisos.create(token, { nombre: formDataPermiso.nombre });
      console.log("✅ Resultado:", result);
      setShowModalPermiso(false);
      setFormDataPermiso({ nombre: "" });
      fetchData();
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermiso = async (id: number) => {
    if (!confirm("¿Eliminar este permiso?")) return;
    try {
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.permisos.delete(token, id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleEditPermiso = (permiso: Permiso) => {
    setEditingPermiso(permiso);
    setFormDataPermiso({ nombre: permiso.nombre });
    setShowModalPermiso(true);
  };

  const handleUpdatePermiso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermiso) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.permisos.update(token, editingPermiso.id_permiso, { nombre: formDataPermiso.nombre });
      setShowModalPermiso(false);
      setEditingPermiso(null);
      setFormDataPermiso({ nombre: "" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const openAsignarRoles = (usuario: Usuario) => {
    setSelectedUser(usuario);
    setSelectedUserRoles(
      usuario.usuario_rol?.filter(ur => ur.estado === "activo").map(ur => ur.id_rol) || []
    );
    setShowModalAsignarRoles(true);
  };

  const toggleUserRole = (id: number) => {
    setSelectedUserRoles(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSaveUserRoles = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");

      const currentRoles = selectedUser.usuario_rol?.filter(ur => ur.estado === "activo").map(ur => ur.id_rol) || [];

      for (const idRol of selectedUserRoles) {
        if (!currentRoles.includes(idRol)) {
          await api.usuariosRoles.assign(token, { id_usuario: selectedUser.id_usuario, id_rol: idRol });
        }
      }

      for (const idRol of currentRoles) {
        if (!selectedUserRoles.includes(idRol)) {
          await api.usuariosRoles.remove(token, selectedUser.id_usuario, idRol);
        }
      }

      setShowModalAsignarRoles(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar roles");
    } finally {
      setSaving(false);
    }
  };

  const togglePermiso = (id: number) => {
    setSelectedPermisos(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const openAsignarPermisos = (rol: Rol) => {
    const ids = rol.rol_permiso?.map(rp => rp.permisos.id_permiso) || [];
    setSelectedRol(rol);
    setSelectedPermisos(ids);
    setSelectAllPermisos(false);
    setShowModalPermisosRol(true);
  };

  const handleSelectAllPermisos = () => {
    if (selectAllPermisos) {
      setSelectedPermisos(selectedRol?.rol_permiso?.map(rp => rp.permisos.id_permiso) || []);
    } else {
      setSelectedPermisos(permisos.map(p => p.id_permiso));
    }
    setSelectAllPermisos(!selectAllPermisos);
  };

  const handleSavePermisosRol = async () => {
    if (!selectedRol) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");

      const currentPermisos = selectedRol.rol_permiso?.map(rp => rp.permisos.id_permiso) || [];

      for (const idPermiso of selectedPermisos) {
        if (!currentPermisos.includes(idPermiso)) {
          await api.rolesPermisos.assign(token, { id_rol: selectedRol.id_rol, id_permiso: idPermiso });
        }
      }

      for (const idPermiso of currentPermisos) {
        if (!selectedPermisos.includes(idPermiso)) {
          await api.rolesPermisos.remove(token, selectedRol.id_rol, idPermiso);
        }
      }

      setShowModalPermisosRol(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar permisos");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    console.log("📝 Creando usuario...", userFormData);
    try {
      setSaving(true);
      setError(null);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      
      const payload = {
        nombre: userFormData.nombre,
        email: userFormData.email,
        password: userFormData.password || undefined,
        apellido_paterno: userFormData.apellido_paterno || undefined,
        apellido_materno: userFormData.apellido_materno || undefined,
        telefono: userFormData.telefono || undefined,
        idioma_preferido: userFormData.idioma_preferido,
        moneda_preferida: userFormData.moneda_preferida,
      };
      
      console.log("📤 Payload:", payload);
      const response = await api.usuarios.create(token, payload) as { id_usuario: string };
      console.log("✅ Usuario creado:", response);
      
      if (selectedFotoFile) {
        const formData = new FormData();
        formData.append("foto", selectedFotoFile);
        await api.usuarios.uploadPhoto(token, response.id_usuario, formData);
      }
      
      if (userFormData.id_rol) {
        await api.usuariosRoles.assign(token, { id_usuario: response.id_usuario, id_rol: userFormData.id_rol });
      }
      
      setShowModalUsuario(false);
      setSelectedFotoFile(null);
      setUserFormData({
        nombre_usuario: "",
        nombre: "",
        foto_url: "",
        apellido_paterno: "",
        apellido_materno: "",
        email: "",
        password: "",
        telefono: "",
        idioma_preferido: "es",
        moneda_preferida: "MXN",
        id_rol: 0,
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleEditUsuario = (usuario: Usuario) => {
    const rolAsignado = usuario.usuario_rol?.find(ur => ur.estado === "activo");
    setEditingUsuario(usuario);
    setSelectedFotoFile(null);
    setUserFormData({
      nombre_usuario: usuario.nombre_usuario || "",
      nombre: usuario.nombre || "",
      foto_url: usuario.foto_url || "",
      apellido_paterno: usuario.apellido_paterno || "",
      apellido_materno: usuario.apellido_materno || "",
      email: usuario.email || "",
      password: "",
      telefono: usuario.telefono || "",
      idioma_preferido: usuario.idioma_preferido || "es",
      moneda_preferida: usuario.moneda_preferida || "MXN",
      id_rol: rolAsignado?.id_rol || 0,
    });
    setShowModalUsuario(true);
  };

  const handleUpdateUsuario = async (e: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!editingUsuario) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      
      const payload: Record<string, unknown> = {
        nombre: userFormData.nombre,
        apellido_paterno: userFormData.apellido_paterno || undefined,
        apellido_materno: userFormData.apellido_materno || undefined,
        email: userFormData.email,
        telefono: userFormData.telefono || undefined,
        idioma_preferido: userFormData.idioma_preferido,
        moneda_preferida: userFormData.moneda_preferida,
      };
      
      if (userFormData.password) {
        payload.password = userFormData.password;
      }
      
      await api.usuarios.update(token, editingUsuario.id_usuario, payload);
      
      if (selectedFotoFile) {
        const formData = new FormData();
        formData.append("foto", selectedFotoFile);
        await api.usuarios.uploadPhoto(token, editingUsuario.id_usuario, formData);
      }
      
      const currentRoles = editingUsuario.usuario_rol?.filter(ur => ur.estado === "activo").map(ur => ur.id_rol) || [];
      const newRoleId = userFormData.id_rol;
      
      if (newRoleId && !currentRoles.includes(newRoleId)) {
        await api.usuariosRoles.assign(token, { id_usuario: editingUsuario.id_usuario, id_rol: newRoleId });
      } else if (newRoleId === 0 && currentRoles.length > 0) {
        for (const idRol of currentRoles) {
          await api.usuariosRoles.remove(token, editingUsuario.id_usuario, idRol);
        }
      }
      
      setShowModalUsuario(false);
      setEditingUsuario(null);
      setSelectedFotoFile(null);
      setUserFormData({
        nombre_usuario: "",
        nombre: "",
        foto_url: "",
        apellido_paterno: "",
        apellido_materno: "",
        email: "",
        password: "",
        telefono: "",
        idioma_preferido: "es",
        moneda_preferida: "MXN",
        id_rol: 0,
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario");
    } finally {
      setSaving(false);
    }
  };

  const getRoleColor = (nombre: string) => {
    const colors: Record<string, string> = {
      admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
      administrador: "bg-indigo-100 text-indigo-700 border-indigo-200",
      cliente: "bg-green-100 text-green-700 border-green-200",
      productor: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[nombre.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getUserRoles = (usuario: Usuario) => {
    return usuario.usuario_rol?.filter(ur => ur.estado === "activo").map(ur => ur.roles?.nombre) || [];
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="animate-spin text-green-600" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Gestión de Roles y Permisos
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Administra roles, permisos y usuarios del sistema
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">cerrar</button>
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {[
          { key: "roles" as const, label: "Roles", icon: Shield },
          { key: "permisos" as const, label: "Permisos", icon: Key },
          { key: "usuarios" as const, label: "Usuarios", icon: User },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingRol(null);
                setFormDataRol({ nombre: "" });
                setShowModalRol(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
            >
              <Plus size={18} /> Nuevo Rol
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Permisos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((rol) => (
                  <tr key={rol.id_rol} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${getRoleColor(rol.nombre)}`}>
                        <Shield size={14} className="mr-2" />
                        {rol.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        rol.estado === "activo"
                          ? "border-green-100 bg-green-50 text-green-700"
                          : "border-gray-100 bg-gray-50 text-gray-500"
                      }`}>
                        {rol.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {rol.rol_permiso?.length ? (
                          rol.rol_permiso.map((rp, i) => (
                            <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {rp.permisos.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">Sin permisos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openAsignarPermisos(rol)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => handleEditRol(rol)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRol(rol.id_rol)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
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
      )}

      {tab === "permisos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingPermiso(null);
                setFormDataPermiso({ nombre: "" });
                setShowModalPermiso(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
            >
              <Plus size={18} /> Nuevo Permiso
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {permisos.map((permiso) => (
              <div
                key={permiso.id_permiso}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Key size={20} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditPermiso(permiso)}
                      className="rounded-lg p-2 text-gray-300 opacity-0 transition-colors hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePermiso(permiso.id_permiso)}
                      className="rounded-lg p-2 text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">{permiso.nombre}</h3>
                <p className="mt-1 text-xs text-gray-400">ID: #{permiso.id_permiso}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowModalUsuario(true)}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
            >
              <UserPlus size={18} /> Nuevo Usuario
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Roles</th>
                  <th className="px-6 py-4">Fecha Registro</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id_usuario} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                          {usuario.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{usuario.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{usuario.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getUserRoles(usuario).length > 0 ? (
                          getUserRoles(usuario).map((rol, i) => (
                            <span key={i} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              {rol}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">Sin roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {usuario.fecha_registro
                        ? new Date(usuario.fecha_registro).toLocaleDateString("es-MX")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditUsuario(usuario)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => openAsignarRoles(usuario)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600"
                        >
                          <Shield size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModalRol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingRol ? "Editar Rol" : "Nuevo Rol"}
              </h3>
              <button onClick={() => setShowModalRol(false)} className="text-gray-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingRol ? handleUpdateRol : handleCreateRol} className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre del Rol
                </label>
                <input
                  type="text"
                  value={formDataRol.nombre}
                  onChange={(e) => setFormDataRol({ nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Ej: administrador, cliente"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModalRol(false)}
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
                  {editingRol ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalPermiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingPermiso ? "Editar Permiso" : "Nuevo Permiso"}
              </h3>
<button
              onClick={() => {
                setShowModalPermiso(false);
                setEditingPermiso(null);
                setFormDataPermiso({ nombre: "" });
              }}
              className="text-gray-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={editingPermiso ? handleUpdatePermiso : handleCreatePermiso} className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre del Permiso
                </label>
                <input
                  type="text"
                  value={formDataPermiso.nombre}
                  onChange={(e) => setFormDataPermiso({ nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Ej: gestionar_usuarios"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">
                  Formato: acción_objeto (ej: crear_producto)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalPermiso(false);
                    setEditingPermiso(null);
                    setFormDataPermiso({ nombre: "" });
                  }}
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
                  {editingPermiso ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalPermisosRol && selectedRol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Asignar Permisos al Rol
                </h3>
                <p className="text-sm text-gray-500">{selectedRol.nombre}</p>
              </div>
              <button
                onClick={() => setShowModalPermisosRol(false)}
                className="text-gray-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Selecciona los permisos para este rol:
                </p>
                <button
                  type="button"
                  onClick={handleSelectAllPermisos}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  {selectAllPermisos ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ids = permisos
                      .filter(p => PERMISOS_CLIENTE.includes(p.nombre))
                      .map(p => p.id_permiso);
                    setSelectedPermisos(ids);
                  }}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  + Cliente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ids = permisos
                      .filter(p => PERMISOS_PRODUCTOR.includes(p.nombre))
                      .map(p => p.id_permiso);
                    setSelectedPermisos(ids);
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  + Productor
                </button>
              </div>
              <div className="space-y-2">
                {permisos.map((permiso) => (
                  <label
                    key={permiso.id_permiso}
                    className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                      selectedPermisos.includes(permiso.id_permiso)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermisos.includes(permiso.id_permiso)}
                      onChange={() => togglePermiso(permiso.id_permiso)}
                      className="sr-only"
                    />
                    <div
                      className={`mr-3 flex h-5 w-5 items-center justify-center rounded-md ${
                        selectedPermisos.includes(permiso.id_permiso)
                          ? "bg-green-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {selectedPermisos.includes(permiso.id_permiso) && <Check size={14} />}
                    </div>
                    <span className="font-medium text-slate-700">{permiso.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 p-6">
              <button
                onClick={() => setShowModalPermisosRol(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-slate-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePermisosRol}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}
              </h3>
              <button
                onClick={() => {
                  setShowModalUsuario(false);
                  setEditingUsuario(null);
                  setSelectedFotoFile(null);
                  setUserFormData({
                    nombre_usuario: "",
                    nombre: "",
                    foto_url: "",
                    apellido_paterno: "",
                    apellido_materno: "",
                    email: "",
                    password: "",
                    telefono: "",
                    idioma_preferido: "es",
                    moneda_preferida: "MXN",
                    id_rol: 0,
                  });
                }}
                className="text-gray-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingUsuario ? handleUpdateUsuario : handleCreateUsuario} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={userFormData.nombre_usuario}
                    onChange={(e) => setUserFormData({ ...userFormData, nombre_usuario: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nombre</label>
                  <input
                    type="text"
                    value={userFormData.nombre}
                    onChange={(e) => setUserFormData({ ...userFormData, nombre: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Apellido Paterno</label>
                  <input
                    type="text"
                    value={userFormData.apellido_paterno}
                    onChange={(e) => setUserFormData({ ...userFormData, apellido_paterno: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Apellido Materno</label>
                  <input
                    type="text"
                    value={userFormData.apellido_materno}
                    onChange={(e) => setUserFormData({ ...userFormData, apellido_materno: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Foto</label>
                <div className="flex items-center gap-4">
                  {userFormData.foto_url || selectedFotoFile ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-green-500">
                      <img 
                        src={selectedFotoFile ? URL.createObjectURL(selectedFotoFile) : userFormData.foto_url} 
                        alt="Preview" 
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFotoFile(null);
                          setUserFormData({ ...userFormData, foto_url: "" });
                        }}
                        className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50">
                      <User size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSelectedFotoFile(file);
                        }}
                        className="hidden"
                      />
                      Subir foto
                    </label>
                    {selectedFotoFile && (
                      <p className="mt-1 text-xs text-gray-500">{selectedFotoFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  required
                />
              </div>

              {!editingUsuario && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    required={!editingUsuario}
                    placeholder={editingUsuario ? "Dejar vacío para mantener" : ""}
                  />
                </div>
              )}

              {editingUsuario && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password (opcional)</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="Dejar vacío para mantener actual"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="text"
                  value={userFormData.telefono}
                  onChange={(e) => setUserFormData({ ...userFormData, telefono: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Idioma Preferido</label>
                  <select
                    value={userFormData.idioma_preferido}
                    onChange={(e) => setUserFormData({ ...userFormData, idioma_preferido: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Moneda Preferida</label>
                  <select
                    value={userFormData.moneda_preferida}
                    onChange={(e) => setUserFormData({ ...userFormData, moneda_preferida: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - Libra Esterlina</option>
                    <option value="BRL">BRL - Real Brasileño</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Asignar Rol</label>
                <select
                  value={userFormData.id_rol}
                  onChange={(e) => setUserFormData({ ...userFormData, id_rol: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                >
                  <option value={0}>Seleccionar rol...</option>
                  {roles.map((rol) => (
                    <option key={rol.id_rol} value={rol.id_rol}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </form>
            <div className="flex gap-3 border-t border-gray-100 p-6">
              <button
                type="button"
                onClick={() => {
                  setShowModalUsuario(false);
                  setEditingUsuario(null);
                  setSelectedFotoFile(null);
                  setUserFormData({
                    nombre_usuario: "",
                    nombre: "",
                    foto_url: "",
                    apellido_paterno: "",
                    apellido_materno: "",
                    email: "",
                    password: "",
                    telefono: "",
                    idioma_preferido: "es",
                    moneda_preferida: "MXN",
                    id_rol: 0,
                  });
                }}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-slate-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingUsuario) {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handleUpdateUsuario(fakeEvent);
                  } else {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handleCreateUsuario(fakeEvent);
                  }
                }}
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

      {showModalAsignarRoles && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Asignar Roles al Usuario
                </h3>
                <p className="text-sm text-gray-500">{selectedUser.nombre}</p>
              </div>
              <button
                onClick={() => setShowModalAsignarRoles(false)}
                className="text-gray-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-4 text-sm text-gray-600">
                Selecciona los roles para este usuario:
              </p>
              <div className="space-y-2">
                {roles.map((rol) => (
                  <label
                    key={rol.id_rol}
                    className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                      selectedUserRoles.includes(rol.id_rol)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserRoles.includes(rol.id_rol)}
                      onChange={() => toggleUserRole(rol.id_rol)}
                      className="sr-only"
                    />
                    <div
                      className={`mr-3 flex h-5 w-5 items-center justify-center rounded-md ${
                        selectedUserRoles.includes(rol.id_rol)
                          ? "bg-green-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {selectedUserRoles.includes(rol.id_rol) && <Check size={14} />}
                    </div>
                    <span className="font-medium text-slate-700">{rol.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 p-6">
              <button
                onClick={() => setShowModalAsignarRoles(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-slate-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUserRoles}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}