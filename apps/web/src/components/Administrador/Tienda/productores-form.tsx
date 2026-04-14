"use client";

import { Loader2, Save, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

export type ProductorAdmin = {
  id: number;
  nombre: string;
  region: string;
  stock: number;
  total_productos?: number;
  status: "ACTIVO" | "INACTIVO" | "PAUSADO";
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
  region: string;
  stock: string;
  status: ProductorAdmin["status"];
};

const INITIAL_STATE: FormState = {
  nombre: "",
  region: "",
  stock: "0",
  status: "ACTIVO",
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
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (productor) {
      setForm({
        nombre: productor.nombre,
        region: productor.region,
        stock: String(productor.stock),
        status: productor.status,
      });
      setErrors({});
      return;
    }

    setForm(INITIAL_STATE);
    setErrors({});
  }, [open, productor]);

  if (!open) return null;

  const isReadOnly = mode === "view";

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.nombre.trim()) nextErrors.nombre = "El nombre es obligatorio.";
    if (!form.region.trim()) nextErrors.region = "La región es obligatoria.";

    const stock = Number(form.stock);
    if (!form.stock.trim()) {
      nextErrors.stock = "El stock es obligatorio.";
    } else if (!Number.isFinite(stock) || stock < 0) {
      nextErrors.stock = "El stock debe ser 0 o mayor.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReadOnly || !validate()) return;

    setSubmitting(true);

    try {
      const endpoint =
        mode === "create"
          ? "/api/productores"
          : `/api/productores/${productor?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          region: form.region.trim(),
          stock: Number(form.stock),
          status: form.status,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message || "No fue posible guardar el productor.",
        );
      }

      onSaved(
        data as ProductorAdmin,
        mode === "create"
          ? "Productor creado correctamente."
          : "Productor actualizado correctamente.",
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {mode === "create"
                ? "Nuevo productor"
                : mode === "edit"
                  ? "Editar productor"
                  : "Detalle del productor"}
            </h2>
            <p className="text-xs text-gray-400">
              {productor
                ? `ID: #PR-${String(productor.id).padStart(4, "0")}`
                : "Completa la información requerida"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre" error={errors.nombre}>
              <input
                value={form.nombre}
                onChange={(event) => handleChange("nombre", event.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Nombre del productor"
              />
            </Field>

            <Field label="Región" error={errors.region}>
              <input
                value={form.region}
                onChange={(event) => handleChange("region", event.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Ej. Sierra Sur"
              />
            </Field>

            <Field label="Stock" error={errors.stock}>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => handleChange("stock", event.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                handleChange(
                  "status",
                  event.target.value as ProductorAdmin["status"],
                )
              }
              disabled={isReadOnly}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="PAUSADO">PAUSADO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </Field>

          <div className="flex gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              {isReadOnly ? "Cerrar" : "Cancelar"}
            </button>

            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submitting
                  ? "Guardando..."
                  : mode === "create"
                    ? "Crear productor"
                    : "Guardar cambios"}
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
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
