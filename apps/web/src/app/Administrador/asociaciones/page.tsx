"use client";

import { Plus, Trash2, Edit2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";
import { getCookie } from "../../../lib/cookies";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { useSuccessToast } from "@/hooks/useSuccessToast";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";
import { SuccessToast } from "@/components/ui/SuccessToast";

type Notice = { type: "error"; message: string };

export default function AsociacionesPage() {
  const { user } = useAuth();
  const [asociaciones, setAsociaciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue]   = useState("");

  const deleteAlert  = useDeleteAlert("asociacion");
  const successToast = useSuccessToast("asociacion");

  useEffect(() => {
    api.configuracion
      .getAsociaciones()
      .then(setAsociaciones)
      .catch(() => setAsociaciones([]))
      .finally(() => setLoading(false));
  }, []);

  async function save(lista: string[]): Promise<boolean> {
    setSaving(true);
    setNotice(null);
    try {
      const token = getCookie("token");
      if (!token) throw new Error("No autorizado");
      await api.configuracion.setAsociaciones(token, lista);
      setAsociaciones(lista);
      return true;
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "No fue posible guardar." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (asociaciones.includes(trimmed)) {
      setNotice({ type: "error", message: "Esa asociación ya existe." });
      return;
    }
    setNewName("");
    const ok = await save([...asociaciones, trimmed]);
    if (ok) successToast.mostrarRegistrado();
  }

  function handleDelete(idx: number) {
    const nombre = asociaciones[idx];
    deleteAlert.abrir(nombre, async () => {
      const next = asociaciones.filter((_, i) => i !== idx);
      const ok = await save(next);
      if (ok) successToast.mostrar("Asociación eliminada correctamente.");
    });
  }

  function openEdit(idx: number) {
    setEditingIdx(idx);
    setEditValue(asociaciones[idx]);
  }

  async function handleEditSave() {
    if (editingIdx === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (trimmed !== asociaciones[editingIdx] && asociaciones.includes(trimmed)) {
      setNotice({ type: "error", message: "Esa asociación ya existe." });
      return;
    }
    const next = asociaciones.map((a, i) => (i === editingIdx ? trimmed : a));
    const ok = await save(next);
    if (ok) {
      setEditingIdx(null);
      successToast.mostrarActualizado();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">Asociaciones de Productores</h1>
        <p className="mt-0.5 text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/70">
          Gestiona la lista de asociaciones disponibles en el formulario de solicitud.
        </p>
      </div>

      {notice && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {notice.message}
        </div>
      )}

      {/* Add new */}
      <div className="rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1F3A2E]/30 p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <p className="mb-3 text-sm font-semibold text-[#1F3A2E] dark:text-[#E8E3D5]">Agregar nueva asociación</p>
        <div className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nombre de la asociación..."
            className="flex-1 rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/40 outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 dark:bg-[#0f1a10] dark:border-[#3D6B3F]/40 dark:text-[#E8E3D5] dark:placeholder-[#A8C26B]/30"
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
      <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#1a2a1f] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        {loading ? (
          <p className="p-10 text-center text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/50">Cargando asociaciones...</p>
        ) : asociaciones.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#3D6B3F]/70 dark:text-[#A8C26B]/50">No hay asociaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-[#C5CFB0]/50 dark:divide-[#3D6B3F]/20">
            {asociaciones.map((a, idx) => (
              <li key={a} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5]">{a}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(idx)}
                    disabled={saving}
                    className="rounded-lg p-2 text-[#3D6B3F]/40 transition-colors hover:bg-[#A8C26B]/20 hover:text-[#3D6B3F] disabled:opacity-50"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    disabled={saving}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />
      <SuccessToast toast={successToast.estado} onClose={successToast.cerrar} />

      {/* Modal editar */}
      {editingIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setEditingIdx(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 bg-[#F4F0E3] dark:bg-[#0f1a10] shadow-[0_24px_48px_rgba(31,58,46,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Franja superior */}
            <div className="h-1 bg-gradient-to-r from-[#3D6B3F] to-[#A8C26B]" />

            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1F3A2E] dark:text-[#E8E3D5] [font-family:'Playfair_Display',serif]">
                Editar asociación
              </h2>
              <button
                type="button"
                onClick={() => setEditingIdx(null)}
                className="rounded-lg p-1 text-[#3D6B3F]/50 hover:bg-[#C5CFB0]/30 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1F3A2E] dark:text-[#A8C26B]/80 mb-1">Nombre de la asociación</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                  autoFocus
                  className="w-full rounded-xl border border-[#C5CFB0] bg-white px-4 py-3 text-sm text-[#1F3A2E] placeholder-[#3D6B3F]/40 outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 dark:bg-[#0f1a10] dark:border-[#3D6B3F]/40 dark:text-[#E8E3D5] dark:placeholder-[#A8C26B]/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIdx(null)}
                  className="rounded-xl border border-[#C5CFB0] dark:border-[#3D6B3F]/40 px-4 py-2 text-sm font-medium text-[#1F3A2E] dark:text-[#E8E3D5] hover:bg-[#C5CFB0]/30 dark:hover:bg-[#1F3A2E]/60 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={saving || !editValue.trim()}
                  className="rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F3A2E] disabled:opacity-60 transition-all duration-200"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
