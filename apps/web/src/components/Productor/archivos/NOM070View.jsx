"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
const ENTITY_TYPE = "productor_nom070";

function getArchivoUrl(path) {
  if (!path) return "";
  if (/^(https?:\/\/|blob:)/i.test(path)) return path;
  return `${API_BASE}${path}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Tamano no disponible";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusClasses(status) {
  const normalized = String(status || "pendiente").toLowerCase();
  if (normalized === "validado") return "bg-green-100 text-green-700";
  if (normalized === "rechazado") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function NOM070View() {
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";
  const inputRef = useRef(null);
  const replaceInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [replacementFile, setReplacementFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const producerId = user?.id_productor;

  const latestFile = files[0] || null;
  const currentStatus = latestFile?.estado || "pendiente";

  const infoMessage = useMemo(() => {
    if (!files.length) {
      return "Sube tu certificacion NOM-070 en PDF o imagen para iniciar su revision.";
    }

    if (String(currentStatus).toLowerCase() === "validado") {
      return "Tu certificacion ya fue validada. Puedes verla, actualizarla o reemplazarla cuando sea necesario.";
    }

    if (String(currentStatus).toLowerCase() === "rechazado") {
      return "Tu certificacion fue rechazada. Editala o sube una nueva version para reenviarla a revision.";
    }

    return "Tu certificacion fue enviada exitosamente y se encuentra pendiente de revision administrativa.";
  }, [currentStatus, files.length]);

  useEffect(() => {
    if (authLoading) return;

    if (!producerId || !token) {
      setLoading(false);
      setFiles([]);
      setError("No se pudo identificar el productor autenticado.");
      return;
    }

    let cancelled = false;

    const loadFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.archivos.getAll({ entidad_tipo: ENTITY_TYPE, entidad_id: producerId });
        if (!cancelled) {
          setFiles(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (!cancelled) {
          setFiles([]);
          setError(err instanceof Error ? err.message : "No fue posible cargar las certificaciones.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFiles();

    return () => {
      cancelled = true;
    };
  }, [authLoading, producerId, token]);

  const resetSelection = () => {
    setSelectedFile(null);
    setSelectedFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const resetEdit = () => {
    setEditingItem(null);
    setEditName("");
    setReplacementFile(null);
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  const reloadFiles = async () => {
    if (!producerId) return;
    const response = await api.archivos.getAll({ entidad_tipo: ENTITY_TYPE, entidad_id: producerId });
    setFiles(Array.isArray(response) ? response : []);
  };

  const handleSave = async () => {
    if (!producerId || !token) {
      setError("No se pudo identificar el productor autenticado.");
      return;
    }

    if (!selectedFile) {
      setError("Selecciona un archivo antes de guardar.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("archivo", selectedFile);
      formData.append("entidad_tipo", ENTITY_TYPE);
      formData.append("entidad_id", String(producerId));
      formData.append("tipo", selectedFile.type || "PDF");
      formData.append("estado", "pendiente");

      await api.archivos.upload(token, formData);
      await reloadFiles();
      resetSelection();
      setSuccess("Archivo guardado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el archivo.");
    } finally {
      setSaving(false);
    }
  };

  const handleView = (item) => {
    window.open(getArchivoUrl(item.url), "_blank", "noopener,noreferrer");
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setEditName(item.nombre?.replace(/\.[^.]+$/, "") || "");
    setReplacementFile(null);
    setSuccess(null);
    setError(null);
  };

  const handleEditSave = async () => {
    if (!editingItem || !token) return;

    const trimmedName = editName.trim();
    if (!trimmedName && !replacementFile) {
      setError("Ingresa un nombre o selecciona un archivo de reemplazo.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (replacementFile) {
        const formData = new FormData();
        formData.append("archivo", replacementFile);
        if (trimmedName) formData.append("nombre", trimmedName);
        formData.append("estado", "pendiente");
        await api.archivos.replace(token, String(editingItem.id_archivo), formData);
      } else {
        await api.archivos.update(token, String(editingItem.id_archivo), { nombre: trimmedName });
      }

      await reloadFiles();
      resetEdit();
      setSuccess("Archivo actualizado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el archivo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!token) return;
    if (!window.confirm(`¿Eliminar ${item.nombre}?`)) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await api.archivos.delete(token, String(item.id_archivo));
      await reloadFiles();
      if (editingItem?.id_archivo === item.id_archivo) {
        resetEdit();
      }
      setSuccess("Archivo eliminado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el archivo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div> : null}
      {success ? <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="rounded-xl border-2 border-dashed border-green-200 bg-green-50/60 p-8 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl text-green-500 shadow-sm dark:bg-gray-700">
            ☁
          </div>
          <p className="mt-4 text-base font-semibold text-gray-800 dark:text-gray-100">Arrastra tu archivo aqui o selecciona uno manualmente</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">PDF o imagen, maximo 10MB</p>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setSelectedFile(nextFile);
              setSelectedFileName(nextFile?.name || "");
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Seleccionar archivo
          </button>

          {selectedFileName ? <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Archivo seleccionado: {selectedFileName}</p> : null}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Archivos cargados</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{files.length} archivo(s)</span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Cargando archivos...</div>
        ) : files.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            No hay certificaciones cargadas.
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((item) => (
              <div key={item.id_archivo} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
                <div className="rounded-lg bg-red-100 px-3 py-2 text-red-600">{String(item.tipo || "DOC").slice(0, 4).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800 dark:text-gray-100">{item.nombre}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.creado_en)} · Estado: {String(item.estado || "pendiente").toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <button type="button" title="Ver" onClick={() => handleView(item)} className="hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button type="button" title="Editar" onClick={() => openEdit(item)} className="hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" title="Eliminar" onClick={() => handleDelete(item)} className="hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="mb-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(currentStatus)}`}>
              {String(currentStatus || "pendiente").toUpperCase()}
            </span>
          </div>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{infoMessage}</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-green-600">INFORMACION</h3>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            La NOM-070-SCFI-2016 establece las especificaciones de denominacion, empaque, etiquetado, produccion y comercializacion del mezcal en Mexico.
          </p>
          <a href="https://www.dof.gob.mx/nota_detalle.php?codigo=5455069&fecha=23/02/2017" target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-green-600 hover:text-green-700">
            Ver requisitos legales
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {selectedFile ? `${selectedFile.name} · ${formatBytes(selectedFile.size)}` : "Selecciona un archivo y guarda los cambios para subirlo."}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={resetSelection} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            Cancelar
          </button>
          <button type="button" disabled={saving || !selectedFile} onClick={handleSave} className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={resetEdit}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Editar archivo</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cambia el nombre visible o reemplaza el archivo actual.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Nombre del archivo</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Reemplazar archivo</span>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => setReplacementFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
                />
                {replacementFile ? <p className="mt-2 text-xs text-gray-500">Nuevo archivo: {replacementFile.name}</p> : null}
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={resetEdit} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button type="button" disabled={saving} onClick={handleEditSave} className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
