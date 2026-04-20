"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import { useAuth } from "@/context/AuthContext";

const COUNTRY_OPTIONS = ["MX", "US", "CA", "ES"];
const STATUS_OPTIONS = ["activo", "inactivo"];

function ModalShell({ isOpen, onClose, title, subtitle, maxWidth = "max-w-lg", children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${maxWidth} overflow-hidden rounded-xl bg-white shadow-1 transition-opacity duration-200 dark:bg-gray-dark`}>
        <div className="flex items-start justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
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

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="ml-1 text-xs font-bold uppercase tracking-[0.1em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className={`w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 ${props.className || ""}`} />;
}

function Textarea(props) {
  return <textarea {...props} className={`w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 ${props.className || ""}`} />;
}

function Select(props) {
  return <select {...props} className={`w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 ${props.className || ""}`} />;
}

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function normalizeStatus(status) {
  const value = String(status || "activo").toLowerCase();
  return value === "activa" ? "activo" : value;
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const classes = normalized === "activo" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${classes}`}>{normalized}</span>;
}

export function ModalAgregar({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const token = getCookie("token") ?? "";
  const [form, setForm] = useState({ nombre: "", descripcion: "", pais_operacion: "MX", status: "activo" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ nombre: "", descripcion: "", pais_operacion: "MX", status: "activo" });
    setError("");
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id_productor) {
      setError("No se pudo identificar el productor de la sesión.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        id_productor: user.id_productor,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        pais_operacion: form.pais_operacion,
        status: form.status,
        fecha_creacion: new Date().toISOString().split("T")[0],
      };

      const created = await api.tiendas.create(token, payload);
      await onSuccess?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la tienda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Nueva Tienda" subtitle="Registra una nueva tienda para tu productor." maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <Field label="Nombre">
            <Input name="nombre" value={form.nombre} maxLength={150} required onChange={(e) => setForm((current) => ({ ...current, nombre: e.target.value }))} />
          </Field>

          <Field label="Descripción">
            <Textarea name="descripcion" rows={4} required value={form.descripcion} onChange={(e) => setForm((current) => ({ ...current, descripcion: e.target.value }))} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="País de operación">
              <Select name="pais_operacion" value={form.pais_operacion} onChange={(e) => setForm((current) => ({ ...current, pais_operacion: e.target.value }))}>
                {COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
              </Select>
            </Field>

            <Field label="Status">
              <Select name="status" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </Field>
          </div>

          {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-stroke pt-4 dark:border-dark-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Spinner /> : null}
            Guardar
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalVer({ isOpen, onClose, tienda }) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Detalle de Tienda" subtitle={tienda?.nombre || ""} maxWidth="max-w-sm">
      <div className="p-6">
        {tienda ? (
          <div className="space-y-4 text-sm">
            <Row label="Nombre" value={tienda.nombre} />
            <Row label="Descripción" value={tienda.descripcion || "-"} multiline />
            <Row label="País de operación" value={tienda.pais_operacion || "-"} />
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Status</span>
              <StatusBadge status={tienda.status} />
            </div>
            <Row label="Fecha de creación" value={formatDate(tienda.fecha_creacion)} />
            <Row label="Última actualización" value={formatDateTime(tienda.actualizado_en)} />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end border-t border-stroke pt-4 dark:border-dark-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ModalEditar({ isOpen, onClose, tienda, onSuccess }) {
  const token = getCookie("token") ?? "";
  const [form, setForm] = useState({ nombre: "", descripcion: "", pais_operacion: "MX", status: "activo" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !tienda) return;
    setForm({
      nombre: tienda.nombre || "",
      descripcion: tienda.descripcion || "",
      pais_operacion: tienda.pais_operacion || "MX",
      status: normalizeStatus(tienda.status),
    });
    setError("");
  }, [isOpen, tienda]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!tienda) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        pais_operacion: form.pais_operacion,
        status: form.status,
        actualizado_en: new Date().toISOString(),
      };

      const updated = await api.tiendas.update(token, Number(tienda.id_tienda), payload);
      await onSuccess?.(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la tienda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Editar Tienda" subtitle={tienda?.nombre || ""} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <Field label="Nombre">
            <Input name="nombre" value={form.nombre} maxLength={150} required onChange={(e) => setForm((current) => ({ ...current, nombre: e.target.value }))} />
          </Field>

          <Field label="Descripción">
            <Textarea name="descripcion" rows={4} required value={form.descripcion} onChange={(e) => setForm((current) => ({ ...current, descripcion: e.target.value }))} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="País de operación">
              <Select name="pais_operacion" value={form.pais_operacion} onChange={(e) => setForm((current) => ({ ...current, pais_operacion: e.target.value }))}>
                {COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
              </Select>
            </Field>

            <Field label="Status">
              <Select name="status" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </Select>
            </Field>
          </div>

          {error ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-stroke pt-4 dark:border-dark-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Spinner /> : null}
            Guardar cambios
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ModalEliminar({ isOpen, onClose, tienda, onSuccess }) {
  const token = getCookie("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!tienda) return;

    setLoading(true);
    setError("");

    try {
      await api.tiendas.delete(token, Number(tienda.id_tienda));
      await onSuccess?.(tienda);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar la tienda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Eliminar Tienda" subtitle={tienda?.nombre || ""} maxWidth="max-w-sm">
      <div className="p-6">
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-3">
          ¿Estás seguro que deseas eliminar "{tienda?.nombre || "esta tienda"}"? Esta acción no se puede deshacer.
        </p>

        {error ? <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-stroke pt-4 dark:border-dark-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            Cancelar
          </button>
          <button type="button" onClick={handleDelete} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Spinner /> : null}
            Eliminar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Row({ label, value, multiline = false }) {
  return (
    <div className="space-y-1">
      <p className="text-gray-500">{label}</p>
      <p className={`text-dark dark:text-white ${multiline ? "whitespace-pre-wrap leading-6" : "font-medium"}`}>{value}</p>
    </div>
  );
}
