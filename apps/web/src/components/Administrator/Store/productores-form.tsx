"use client";

import { Loader2, Save, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { getCookie } from "../../../lib/cookies";
import { AlertService } from "../../../shared/alerts/alert.service";

export type ProductorAdmin = {
  id: number;
  id_usuario?: string;
  id_region?: number | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  region: string;
  total_productos?: number;
  status: "ACTIVO" | "INACTIVO" | "PAUSADO";
  biografia?: string;
  otras_caracteristicas?: string;
  foto_url?: string;
  tienda?: string | null;
  asociacion?: string | null;
  marca?: string | null;
};

type ProductorFormProps = {
  mode: "create" | "edit" | "view";
  open: boolean;
  productor: ProductorAdmin | null;
  onClose: () => void;
  onSaved: (productor: ProductorAdmin, message: string) => void;
  onError: (message: string) => void;
};

type FormState = {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  id_region: string;
  status: ProductorAdmin["status"];
  biografia: string;
  otras_caracteristicas: string;
  foto: File | null;
};

type Region = { id_region: number; nombre: string };

// Mapa entre el status mostrado en el panel y el status real de la tienda.
const STATUS_TO_TIENDA: Record<ProductorAdmin["status"], string> = {
  ACTIVO: "activa",
  PAUSADO: "pausada",
  INACTIVO: "inactiva",
};

const INITIAL_STATE: FormState = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  id_region: "",
  status: "ACTIVO",
  biografia: "",
  otras_caracteristicas: "",
  foto: null,
};

export function ProductoresForm({
  mode,
  open,
  productor,
  onClose,
  onSaved,
  onError,
}: ProductorFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    api.productores
      .getRegiones()
      .then((data) => setRegiones(Array.isArray(data) ? (data as Region[]) : []))
      .catch(() => setRegiones([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (productor) {
      setForm({
        nombre: productor.nombre,
        apellido_paterno: productor.apellido_paterno || "",
        apellido_materno: productor.apellido_materno || "",
        id_region: productor.id_region != null ? String(productor.id_region) : "",
        status: productor.status,
        biografia: productor.biografia || "",
        otras_caracteristicas: productor.otras_caracteristicas || "",
        foto: null,
      });
      setErrors({});
      return;
    }

    setForm(INITIAL_STATE);
    setErrors({});
  }, [open, productor]);

  if (!open) return null;

  const isReadOnly = mode === "view";

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) nextErrors.nombre = "El nombre es obligatorio.";
    if (!form.apellido_paterno.trim()) nextErrors.apellido_paterno = "El apellido paterno es obligatorio.";
    if (!form.id_region) nextErrors.id_region = "La región es obligatoria.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReadOnly || !validate()) return;

    setSubmitting(true);

    try {
      const token = getCookie("token");
      if (!token) throw new Error("No autorizado");

      const payload = new FormData();
      payload.append("nombre", form.nombre.trim());
      payload.append("apellido_paterno", form.apellido_paterno.trim());
      payload.append("apellido_materno", form.apellido_materno.trim());
      payload.append("id_region", form.id_region);
      payload.append("status", STATUS_TO_TIENDA[form.status]);
      payload.append("biografia", form.biografia.trim());
      payload.append("otras_caracteristicas", form.otras_caracteristicas.trim());
      if (form.foto) payload.append("foto", form.foto);

      const result = await api.productores.adminUpdate(token, productor!.id, payload);

      onSaved(
        result as ProductorAdmin,
        "Productor actualizado correctamente.",
      );
      onClose();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el productor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-[#F4F0E3] shadow-[0_24px_48px_rgba(31,58,46,0.25)] sm:max-w-2xl border border-[#C5CFB0]">
        <div className="sticky top-0 flex items-center justify-between bg-[#1F3A2E] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg sm:text-xl font-bold text-white [font-family:'Playfair_Display',serif]">
              {mode === "create"
                ? "Nuevo productor"
                : mode === "edit"
                  ? "Editar productor"
                  : "Detalle del productor"}
            </h2>
            <p className="truncate text-xs text-white/60">
              {productor
                ? `ID: #PR-${String(productor.id).padStart(4, "0")}`
                : "Completa la información requerida"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-2 flex-shrink-0 rounded-full p-2 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:space-y-5 sm:p-6">

          {/* Fila 1: Nombre solo */}
          <Field label="Nombre" error={errors.nombre}>
            <input
              value={form.nombre}
              onChange={(event) => handleChange("nombre", event.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70"
              placeholder="Nombre del productor"
            />
          </Field>

          {/* Fila 2: Apellido Paterno y Materno */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            <Field label="Apellido Paterno" error={errors.apellido_paterno}>
              <input
                value={form.apellido_paterno}
                onChange={(event) => handleChange("apellido_paterno", event.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Apellido paterno"
              />
            </Field>

            <Field label="Apellido Materno" error={errors.apellido_materno}>
              <input
                value={form.apellido_materno}
                onChange={(event) => handleChange("apellido_materno", event.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Apellido materno"
              />
            </Field>
          </div>

          {/* Fila 3: Región sola */}
          <Field label="Región" error={errors.id_region}>
            <select
              value={form.id_region}
              onChange={(event) => handleChange("id_region", event.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="">— Selecciona una región —</option>
              {regiones.map((r) => (
                <option key={r.id_region} value={String(r.id_region)}>{r.nombre}</option>
              ))}
            </select>
          </Field>

          {/* Status */}
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                handleChange("status", event.target.value as ProductorAdmin["status"])
              }
              disabled={isReadOnly}
              className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="PAUSADO">PAUSADO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </Field>

          {/* Biografía */}
          <Field label="Biografía">
            <textarea
              value={form.biografia}
              onChange={(event) => handleChange("biografia", event.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70 resize-none"
              placeholder="Cuéntanos sobre el productor, su historia y experiencia..."
              rows={2}
            />
          </Field>

          {/* Otras características */}
          <Field label="Otras características">
            <textarea
              value={form.otras_caracteristicas}
              onChange={(event) => handleChange("otras_caracteristicas", event.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 sm:px-4 sm:py-3 text-sm text-[#1F3A2E] outline-none transition-all focus:border-[#3D6B3F] focus:ring-2 focus:ring-[#3D6B3F]/20 disabled:cursor-not-allowed disabled:opacity-70 resize-none"
              placeholder="Ej. Certificaciones, especializaciones, métodos tradicionales..."
              rows={2}
            />
          </Field>

          {/* Foto */}
          <Field label="Foto del productor">
            <div className="space-y-2 sm:space-y-3">
              {!isReadOnly && (
                <>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500 * 1024) {
                        AlertService.showWarning("La imagen debe pesar menos de 500 KB.");
                        event.target.value = "";
                        return;
                      }
                      handleChange("foto", file);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="rounded-lg sm:rounded-xl border border-[#C5CFB0] bg-[#A8C26B]/20 px-3 py-2 text-xs sm:text-sm font-semibold text-[#3D6B3F] hover:bg-[#A8C26B]/30 transition-colors"
                  >
                    Seleccionar imagen
                  </button>
                </>
              )}
              {form.foto && (
                <div className="rounded-lg border border-[#C5CFB0] p-2 sm:p-3 bg-[#F4F0E3]">
                  <p className="text-xs font-medium text-[#3D6B3F]">Archivo seleccionado:</p>
                  <p className="truncate text-xs sm:text-sm text-[#1F3A2E]">{form.foto.name}</p>
                </div>
              )}
              {productor?.foto_url && !form.foto && (
                <div className="overflow-hidden rounded-lg border border-[#C5CFB0]">
                  <img src={productor.foto_url} alt="Foto actual" className="h-24 sm:h-32 w-full object-cover" />
                  <p className="bg-[#F4F0E3] px-2 py-1 sm:px-3 sm:py-2 text-xs text-[#3D6B3F]/70">Foto actual del productor</p>
                </div>
              )}
            </div>
          </Field>

          <div className="flex flex-col-reverse gap-2 sm:gap-3 border-t border-[#C5CFB0] pt-4 sm:pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#C5CFB0] px-4 py-2 text-sm font-medium text-[#1F3A2E] hover:bg-[#C5CFB0]/20 transition-all duration-200"
            >
              {isReadOnly ? "Cerrar" : "Cancelar"}
            </button>

            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F3A2E] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="truncate">
                  {submitting
                    ? "Guardando..."
                    : mode === "create"
                      ? "Crear productor"
                      : "Guardar cambios"}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1F3A2E] mb-1">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
