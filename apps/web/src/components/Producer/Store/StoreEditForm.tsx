"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type StoreFormData = {
  nombre: string;
  descripcion: string;
  pais_operacion: string;
  status: string;
};

type Store = {
  id_tienda: number;
  id_productor: number;
  nombre: string;
  descripcion: string | null;
  pais_operacion: string | null;
  status: string | null;
  fecha_creacion: string;
  actualizado_en: string | null;
};

const COUNTRY_OPTIONS = [
  { value: "MX", label: "México" },
  { value: "US", label: "Estados Unidos" },
  { value: "CA", label: "Canadá" },
  { value: "ES", label: "España" },
];

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export function StoreEditForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const token = getCookie("token") ?? "";

  const [store, setStore] = useState<Store | null>(null);
  const [form, setForm] = useState<StoreFormData>({
    nombre: "",
    descripcion: "",
    pais_operacion: "MX",
    status: "activo",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadStore = async () => {
      if (authLoading || !user?.id_productor) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const stores = await api.tiendas.getByProductor(user.id_productor, token);

        if (Array.isArray(stores) && stores.length > 0) {
          const mainStore = stores[0];
          setStore(mainStore as Store);
          setForm({
            nombre: mainStore.nombre || "",
            descripcion: mainStore.descripcion || "",
            pais_operacion: mainStore.pais_operacion || "MX",
            status: normalizeStatus(mainStore.status),
          });
        } else {
          setError("No se encontró tienda asignada. Contacta al administrador.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible cargar la tienda");
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [authLoading, user?.id_productor, token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!store) {
      setError("No hay tienda cargada");
      return;
    }

    if (!form.nombre.trim()) {
      setError("El nombre de la tienda es requerido");
      return;
    }

    if (!form.descripcion.trim()) {
      setError("La descripción es requerida");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        pais_operacion: form.pais_operacion,
        status: form.status,
        actualizado_en: new Date().toISOString(),
      };

      await api.tiendas.update(token, store.id_tienda, payload);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-gray-600 dark:text-gray-4">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
        <p className="mt-3 text-sm font-medium text-red-800 dark:text-red-200">{error || "No se pudo cargar la tienda"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/dashboard/productor/tienda" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-opacity-80">
            <ArrowLeft size={16} />
            Volver
          </Link>
          <h1 className="text-3xl font-bold text-dark dark:text-white">Editar Tienda</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-4">Actualiza la información de tu tienda y cómo aparece en el marketplace</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">✓ Cambios guardados correctamente</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark">
        {/* Form Body */}
        <div className="p-8 space-y-6">
          {/* Nombre */}
          <div>
            <label className="mb-3 block text-sm font-bold uppercase tracking-[0.1em] text-gray-500">Nombre de la tienda</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              maxLength={150}
              disabled={saving}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              placeholder="Ej: Mi Tienda de Mezcal"
              required
            />
            <p className="mt-2 text-xs text-gray-500">Máximo 150 caracteres</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-3 block text-sm font-bold uppercase tracking-[0.1em] text-gray-500">Descripción de la tienda</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              rows={5}
              disabled={saving}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              placeholder="Cuéntale a tus clientes sobre tu tienda, tu historia, qué hace especial tu marca..."
              required
            />
            <p className="mt-2 text-xs text-gray-500">{form.descripcion.length} caracteres</p>
          </div>

          {/* País y Status */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* País */}
            <div>
              <label className="mb-3 block text-sm font-bold uppercase tracking-[0.1em] text-gray-500">País de operación</label>
              <select
                value={form.pais_operacion}
                onChange={(e) => setForm((prev) => ({ ...prev, pais_operacion: e.target.value }))}
                disabled={saving}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-3 block text-sm font-bold uppercase tracking-[0.1em] text-gray-500">Estado de la tienda</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                disabled={saving}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                {form.status === "activo" ? "Tu tienda es visible en el marketplace" : "Tu tienda está oculta"}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-dark-2">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-3">Información de la tienda</h3>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-4">
              <p>
                <span className="font-medium">ID de tienda:</span> {store.id_tienda}
              </p>
              <p>
                <span className="font-medium">Creada:</span> {formatDate(store.fecha_creacion)}
              </p>
              {store.actualizado_en && (
                <p>
                  <span className="font-medium">Última actualización:</span> {formatDateTime(store.actualizado_en)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="border-t border-stroke bg-gray-50 px-8 py-5 dark:border-dark-3 dark:bg-dark-2">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard/productor/tienda"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-700 dark:text-gray-4 dark:hover:text-gray-3"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short" }).format(new Date(value));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || "activo").toLowerCase();
  return value === "activa" ? "activo" : value;
}
