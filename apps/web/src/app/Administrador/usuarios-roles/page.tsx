"use client";

import { Loader2, Plus, Pencil, Trash2, User, X, Check } from "lucide-react";

interface Usuario {
  id_usuario: string;
  nombre: string;
  email: string;
  telefono?: string;
  fecha_registro?: string;
  usuario_rol?: {
    id_rol: number;
    estado?: string;
    roles?: { nombre: string };
  }[];
}

interface Rol {
  id_rol: number;
  nombre: string;
}

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? getCookie("token") : null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesiÃ³n activa");

      const [usuariosRes, rolesRes] = await Promise.all([
        api.usuarios.getAll(),
        api.roles.getAll(),
      ]);

      setUsuarios(usuariosRes as Usuario[]);
      setRoles(rolesRes as Rol[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const openAssignRoles = (usuario: Usuario) => {
    setSelectedUser(usuario);
    setSelectedRoles(
      usuario.usuario_rol
        ?.filter((ur) => ur.estado === "activo")
        .map((ur) => ur.id_rol) || [],
    );
    setShowModal(true);
  };

  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesiÃ³n activa");

      const currentRoles =
        selectedUser.usuario_rol
          ?.filter((ur) => ur.estado === "activo")
          .map((ur) => ur.id_rol) || [];

      for (const rolId of selectedRoles) {
        if (!currentRoles.includes(rolId)) {
          await api.usuariosRoles.assign(token, {
            id_usuario: selectedUser.id_usuario,
            id_rol: rolId,
          });
        }
      }

      for (const rolId of currentRoles) {
        if (!selectedRoles.includes(rolId)) {
          await api.usuariosRoles.remove(token, selectedUser.id_usuario, rolId);
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar roles");
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (rolId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(rolId)
        ? prev.filter((id) => id !== rolId)
        : [...prev, rolId],
    );
  };

  const getUserRoles = (usuario: Usuario) => {
    return (
      usuario.usuario_rol
        ?.filter((ur) => ur.estado === "activo")
        .map((ur) => ur.roles?.nombre) || []
    );
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
            GestiÃ³n de Usuarios y Roles
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Asigna roles a los usuarios del sistema
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Total Usuarios
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-800">
            {usuarios.length}
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Roles Disponibles
          </p>
          <h2 className="mt-1 text-2xl font-black text-indigo-600">
            {roles.length}
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Usuarios con Roles
          </p>
          <h2 className="mt-1 text-2xl font-black text-green-600">
            {usuarios.filter((u) => (u.usuario_rol?.length || 0) > 0).length}
          </h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
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
                <tr
                  key={usuario.id_usuario}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                        {usuario.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">
                        {usuario.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {usuario.email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(usuario).length > 0 ? (
                        getUserRoles(usuario).map((rol, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                          >
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
                      ? new Date(usuario.fecha_registro).toLocaleDateString(
                          "es-MX",
                        )
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openAssignRoles(usuario)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                Asignar Roles
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-600">
                Selecciona los roles para{" "}
                <strong>{selectedUser?.nombre}</strong>
              </p>
              <div className="space-y-2">
                {roles.map((rol) => (
                  <label
                    key={rol.id_rol}
                    className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                      selectedRoles.includes(rol.id_rol)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(rol.id_rol)}
                      onChange={() => toggleRole(rol.id_rol)}
                      className="sr-only"
                    />
                    <div
                      className={`mr-3 flex h-5 w-5 items-center justify-center rounded-md ${
                        selectedRoles.includes(rol.id_rol)
                          ? "bg-green-600 text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {selectedRoles.includes(rol.id_rol) && (
                        <Check size={14} />
                      )}
                    </div>
                    <span className="font-medium text-slate-700">
                      {rol.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-medium text-slate-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignRoles}
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
