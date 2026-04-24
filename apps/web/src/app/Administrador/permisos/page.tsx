"use client";

import { Loader2, Plus, Trash2, Key, X } from "lucide-react";

interface Permiso {
  id_permiso: number;
  nombre: string;
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: "" });
  const [saving, setSaving] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? getCookie("token") : null;

  useEffect(() => {
    fetchPermisos();
  }, []);

  const fetchPermisos = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesiÃ³n activa");
      const data = await api.permisos.getAll();
      setPermisos(data as Permiso[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar permisos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = getToken();
      if (!token) throw new Error("No hay sesiÃ³n activa");
      await api.permisos.create(token, { nombre: formData.nombre });
      setShowModal(false);
      setFormData({ nombre: "" });
      fetchPermisos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Â¿EstÃ¡s seguro de eliminar este permiso?")) return;
    try {
      const token = getToken();
      if (!token) throw new Error("No hay sesiÃ³n activa");
      await api.permisos.delete(token, id);
      fetchPermisos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const getPermisoIcon = (nombre: string) => {
    const icons: Record<string, string> = {
      crear_producto: "bg-blue-100 text-blue-700",
      editar_producto: "bg-amber-100 text-amber-700",
      eliminar_producto: "bg-red-100 text-red-700",
      ver_inventario: "bg-green-100 text-green-700",
      gestionar_usuarios: "bg-purple-100 text-purple-700",
      gestionar_roles: "bg-indigo-100 text-indigo-700",
    };
    return icons[nombre.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            GestiÃ³n de Permisos
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Administra los permisos del sistema
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 active:scale-95"
        >
          <Plus size={18} /> Nuevo Permiso
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Total Permisos
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-800">
            {permisos.length}
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            En Uso
          </p>
          <h2 className="mt-1 text-2xl font-black text-green-600">
            {new Set(permisos.map((p) => p.nombre.split("_")[0])).size} mÃ³dulos
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        ) : permisos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">
            No hay permisos configurados
          </div>
        ) : (
          permisos.map((permiso) => (
            <div
              key={permiso.id_permiso}
              className="group rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${getPermisoIcon(permiso.nombre)}`}
                >
                  <Key size={20} />
                </div>
                <button
                  onClick={() => handleDelete(permiso.id_permiso)}
                  className="rounded-lg p-2 text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-800">
                {permiso.nombre}
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                ID: #{permiso.id_permiso}
              </p>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h3 className="text-lg font-bold text-slate-800">
                Nuevo Permiso
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
                  Nombre del Permiso
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ nombre: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Ej: crear_producto, ver_inventario"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">
                  Usa el formato: acciÃ³n_objeto (ej: gestionar_usuarios)
                </p>
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
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
