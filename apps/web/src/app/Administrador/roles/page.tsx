"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Plus, Pencil, Trash2, Shield, X } from "lucide-react";
import { getCookie } from "@/lib/cookies";

interface Rol {
  id_rol: number;
  nombre: string;
  estado: string;
  fecha_creacion?: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [formData, setFormData] = useState({ nombre: "" });
  const [saving, setSaving] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? getCookie("token") : null;

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
        const data = await api.roles.getAll(token);
      setRoles(data as Rol[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar roles");
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

      if (editingRol) {
        await api.roles.update(token, editingRol.id_rol, {
          nombre: formData.nombre,
        });
      } else {
        await api.roles.create(token, { nombre: formData.nombre });
      }

      setShowModal(false);
      setEditingRol(null);
      setFormData({ nombre: "" });
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este rol?")) return;
    try {
      const token = getToken();
      if (!token) throw new Error("No hay sesión activa");
      await api.roles.delete(token, id);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const openEdit = (rol: Rol) => {
    setEditingRol(rol);
    setFormData({ nombre: rol.nombre });
    setShowModal(true);
  };

  const getRoleColor = (nombre: string) => {
    const colors: Record<string, string> = {
      admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
      administrador: "bg-indigo-100 text-indigo-700 border-indigo-200",
      cliente: "bg-green-100 text-green-700 border-green-200",
      productor: "bg-amber-100 text-amber-700 border-amber-200",
      editor: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return (
      colors[nombre.toLowerCase()] ||
      "bg-gray-100 text-gray-700 border-gray-200"
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Gestión de Roles
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Administra los roles del sistema
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingRol(null);
            setFormData({ nombre: "" });
          }}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 active:scale-95"
        >
          <Plus size={18} /> Nuevo Rol
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Total Roles
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-800">
            {roles.length}
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Activos
          </p>
          <h2 className="mt-1 text-2xl font-black text-green-600">
            {roles.filter((r) => r.estado === "activo").length}
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Inactivos
          </p>
          <h2 className="mt-1 text-2xl font-black text-gray-400">
            {roles.filter((r) => r.estado !== "activo").length}
          </h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha Creación</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((rol) => (
                  <tr
                    key={rol.id_rol}
                    className="group transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">
                      #{rol.id_rol}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${getRoleColor(rol.nombre)}`}
                      >
                        <Shield size={14} className="mr-2" />
                        {rol.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${rol.estado === "activo" ? "border-green-100 bg-green-50 text-green-700" : "border-gray-100 bg-gray-50 text-gray-500"}`}
                      >
                        {rol.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {rol.fecha_creacion
                        ? new Date(rol.fecha_creacion).toLocaleDateString(
                            "es-MX",
                          )
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(rol)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(rol.id_rol)}
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
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingRol ? "Editar Rol" : "Nuevo Rol"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre del Rol
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Ej: administrador, cliente, productor"
                  required
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
                  {editingRol ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
