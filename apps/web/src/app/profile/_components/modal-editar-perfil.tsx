"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getCookie, setCookie } from "@/lib/cookies";

interface ModalEditarPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UserData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  idioma_preferido: string;
  moneda_preferida: string;
  foto_url: string;
}

const IDIOMA_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

const MONEDA_OPTIONS = [
  { value: "MXN", label: "MXN - Peso Mexicano" },
  { value: "USD", label: "USD - Dólar Americano" },
  { value: "EUR", label: "EUR - Euro" },
];

function ModalShell({ isOpen, onClose, title, subtitle, maxWidth = "max-w-lg", children }: { isOpen: boolean; onClose: () => void; title: string; subtitle?: string; maxWidth?: string; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-xl bg-white shadow-1 transition-opacity duration-200 dark:bg-gray-dark`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-stroke bg-white px-4 py-4 dark:border-dark-3 dark:bg-gray-dark sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-dark dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="ml-1 text-xs font-bold uppercase tracking-[0.1em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 sm:px-4 sm:py-3"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 sm:px-4 sm:py-3"
    />
  );
}

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

export function ModalEditarPerfil({ isOpen, onClose, onSuccess }: ModalEditarPerfilProps) {
  const { user: authUser, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<UserData>({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    telefono: "",
    idioma_preferido: "es",
    moneda_preferida: "MXN",
    foto_url: "",
  });

  useEffect(() => {
    if (isOpen && authUser) {
      setForm({
        nombre: authUser.nombre || "",
        apellido_paterno: authUser.apellido_paterno || "",
        apellido_materno: authUser.apellido_materno || "",
        email: authUser.email || "",
        telefono: (authUser as unknown as UserData).telefono || "",
        idioma_preferido: (authUser as unknown as UserData).idioma_preferido || "es",
        moneda_preferida: (authUser as unknown as UserData).moneda_preferida || "MXN",
        foto_url: (authUser as unknown as UserData).foto_url || "",
      });
    }
  }, [isOpen, authUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = getCookie("token");
      if (!token) {
        setError("No hay sesión activa");
        return;
      }

      await api.usuarios.update(token, authUser?.id_usuario as string, {
        nombre: form.nombre,
        apellido_paterno: form.apellido_paterno || null,
        apellido_materno: form.apellido_materno || null,
        telefono: form.telefono || null,
        idioma_preferido: form.idioma_preferido,
        moneda_preferida: form.moneda_preferida,
        foto_url: form.foto_url || null,
      });

      const usuarioStr = getCookie("usuario");
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        const updatedUsuario = {
          ...usuario,
          nombre: form.nombre,
          apellido_paterno: form.apellido_paterno || null,
          apellido_materno: form.apellido_materno || null,
          telefono: form.telefono || null,
          idioma_preferido: form.idioma_preferido,
          moneda_preferida: form.moneda_preferida,
          foto_url: form.foto_url || null,
        };
        setCookie("usuario", JSON.stringify(updatedUsuario), 7);
      }

      refreshAuth();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Error al actualizar el perfil. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Editar Perfil" subtitle="Actualiza tu información personal" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-3">
              {form.foto_url ? (
                <img src={form.foto_url} alt="Foto de perfil" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <div className="w-full">
              <Field label="URL de Foto">
                <Input
                  type="url"
                  name="foto_url"
                  value={form.foto_url}
                  onChange={handleChange}
                  placeholder="https://ejemplo.com/foto.jpg"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Field label="Nombre *">
              <Input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                placeholder="Tu nombre"
              />
            </Field>

            <Field label="Apellido Paterno">
              <Input
                type="text"
                name="apellido_paterno"
                value={form.apellido_paterno}
                onChange={handleChange}
                placeholder="Apellido paterno"
              />
            </Field>

            <Field label="Apellido Materno">
              <Input
                type="text"
                name="apellido_materno"
                value={form.apellido_materno}
                onChange={handleChange}
                placeholder="Apellido materno"
              />
            </Field>

            <Field label="Teléfono">
              <Input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="+52 123 456 7890"
              />
            </Field>

            <Field label="Idioma Preferido">
              <Select name="idioma_preferido" value={form.idioma_preferido} onChange={handleChange}>
                {IDIOMA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Moneda Preferida">
              <Select name="moneda_preferida" value={form.moneda_preferida} onChange={handleChange}>
                {MONEDA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Email">
            <Input type="email" value={form.email} disabled className="cursor-not-allowed opacity-60" />
            <p className="mt-1 text-xs text-gray-400">El email no puede ser modificado</p>
          </Field>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-stroke px-5 py-2.5 text-center font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-white/10 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-60 sm:w-auto"
          >
            {loading ? <Spinner /> : null}
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
