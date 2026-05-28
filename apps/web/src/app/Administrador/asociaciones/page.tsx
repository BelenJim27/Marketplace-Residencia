"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";
import { getCookie } from "../../../lib/cookies";

type Notice = { type: "success" | "error"; message: string };

export default function AsociacionesPage() {
  const { user } = useAuth();
  const [asociaciones, setAsociaciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  useEffect(() => {
    api.configuracion
      .getAsociaciones()
      .then(setAsociaciones)
      .catch(() => setAsociaciones([]))
      .finally(() => setLoading(false));
  }, []);

  async function save(lista: string[]) {
    setSaving(true);
    setNotice(null);
    try {
      const token = getCookie("token");
      if (!token) throw new Error("No autorizado");
      await api.configuracion.setAsociaciones(token, lista);
      setAsociaciones(lista);
      setNotice({ type: "success", message: "Asociaciones guardadas correctamente." });
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "No fue posible guardar." });
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (asociaciones.includes(trimmed)) {
      setNotice({ type: "error", message: "Esa asociación ya existe." });
      return;
    }
    setNewName("");
    save([...asociaciones, trimmed]);
  }

  function handleDelete(idx: number) {
    const next = asociaciones.filter((_, i) => i !== idx);
    setDeletingIdx(null);
    save(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Asociaciones de Productores</h1>
        <p className="mt-0.5 text-sm text-[#3D6B3F]/70">
          Gestiona la lista de asociaciones disponibles en el formulario de solicitud.
        </p>
      </div>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-[#A8C26B]/40 bg-[#A8C26B]/10 text-[#3D6B3F]"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      {/* Add new */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <p className="mb-3 text-sm font-semibold text-[#1F3A2E]">Agregar nueva asociación</p>
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nombre de la asociación..."
            className="flex-1 rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/40 outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3D6B3F] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        {loading ? (
          <p className="p-10 text-center text-sm text-[#3D6B3F]/70">Cargando asociaciones...</p>
        ) : asociaciones.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#3D6B3F]/70">No hay asociaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-[#C5CFB0]/50">
            {asociaciones.map((a, idx) => (
              <li key={a} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm font-medium text-[#1F3A2E]">{a}</span>
                <button
                  type="button"
                  onClick={() => setDeletingIdx(idx)}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm delete */}
      {deletingIdx !== null && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#F4F0E3] border border-[#C5CFB0] p-8 text-center shadow-[0_24px_48px_rgba(31,58,46,0.25)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">¿Eliminar asociación?</h3>
            <p className="mt-2 text-sm text-[#3D6B3F]/70">
              Se eliminará <span className="font-semibold text-[#1F3A2E]">"{asociaciones[deletingIdx]}"</span> de la lista.
              Los productores ya registrados conservarán su asociación.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingIdx(null)}
                className="flex-1 rounded-xl border border-[#C5CFB0] px-4 py-3 text-sm font-semibold text-[#1F3A2E] transition-all duration-200 hover:bg-[#C5CFB0]/30"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingIdx)}
                disabled={saving}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-70"
              >
                {saving ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
