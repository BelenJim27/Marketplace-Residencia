"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Edit2, X, Loader2, AlertCircle, CheckCircle2, Search } from "lucide-react";
import { api, type Comision, type ComisionInput } from "@/lib/api";
import { getCookie } from "@/lib/cookies";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

type Notice = { type: "success" | "error"; message: string };
type Resultado = { id_comision: number; porcentaje: number; monto_fijo: number | null; alcance: string };

const ALCANCES: ComisionInput["alcance"][] = ["global", "pais", "categoria", "productor"];

export default function ComisionesAdminPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [filtroAlcance, setFiltroAlcance] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Comision | null>(null);
  const [form, setForm] = useState<ComisionInput>({ alcance: "global", porcentaje: "0.1500", prioridad: 1000, activo: true });
  const [submitting, setSubmitting] = useState(false);

  const [showResolver, setShowResolver] = useState(false);
  const [resolverInput, setResolverInput] = useState({ id_productor: "", id_categoria: "", pais_iso2: "" });
  const [resolverResult, setResolverResult] = useState<Resultado | null>(null);
  const [resolverError, setResolverError] = useState<string | null>(null);

  const token = getCookie("token") ?? "";

  async function load() {
    setLoading(true);
    try {
      const data = await api.comisiones.list(token);
      setComisiones(data);
    } catch (e) {
      setNotice({ type: "error", message: e instanceof Error ? e.message : "Error cargando comisiones" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return comisiones.filter((c) => {
      if (filtroAlcance && c.alcance !== filtroAlcance) return false;
      if (!q) return true;
      const haystack = `${c.alcance} ${c.pais_iso2 ?? ""} ${c.id_categoria ?? ""} ${c.id_productor ?? ""} ${c.porcentaje}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [comisiones, search, filtroAlcance]);

  function openCreate() {
    setEditing(null);
    setForm({ alcance: "global", porcentaje: "0.1500", prioridad: 1000, activo: true });
    setShowForm(true);
  }

  function openEdit(c: Comision) {
    setEditing(c);
    setForm({
      alcance: c.alcance,
      pais_iso2: c.pais_iso2 ?? undefined,
      id_categoria: c.id_categoria ?? undefined,
      id_productor: c.id_productor ?? undefined,
      porcentaje: c.porcentaje,
      monto_fijo: c.monto_fijo ?? undefined,
      moneda_monto_fijo: c.moneda_monto_fijo ?? undefined,
      prioridad: c.prioridad,
      activo: c.activo,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.comisiones.update(token, editing.id_comision, form);
        setNotice({ type: "success", message: "Regla actualizada" });
      } else {
        await api.comisiones.create(token, form);
        setNotice({ type: "success", message: "Regla creada" });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Error guardando" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(c: Comision) {
    if (!confirm(`¿Desactivar esta regla de comisión (${c.alcance} ${c.porcentaje})?`)) return;
    try {
      await api.comisiones.remove(token, c.id_comision);
      setNotice({ type: "success", message: "Regla desactivada" });
      await load();
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Error desactivando" });
    }
  }

  async function handleResolver() {
    setResolverError(null);
    setResolverResult(null);
    try {
      const q: { id_productor?: number; id_categoria?: number; pais_iso2?: string } = {};
      if (resolverInput.id_productor) q.id_productor = Number(resolverInput.id_productor);
      if (resolverInput.id_categoria) q.id_categoria = Number(resolverInput.id_categoria);
      if (resolverInput.pais_iso2) q.pais_iso2 = resolverInput.pais_iso2.toUpperCase();
      const result = await api.comisiones.resolver(token, q);
      setResolverResult(result);
    } catch (err) {
      setResolverError(err instanceof Error ? err.message : "Error resolviendo");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb pageName="Comisiones" />

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${
            notice.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notice.message}</span>
          <button className="ml-auto" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <select
          value={filtroAlcance}
          onChange={(e) => setFiltroAlcance(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">Todos los alcances</option>
          {ALCANCES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowResolver((v) => !v)}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
        >
          Probar resolver
        </button>
        <button
          onClick={openCreate}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90"
        >
          <Plus size={16} /> Nueva regla
        </button>
      </div>

      {showResolver && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-3 font-medium text-blue-900">Probar resolución de comisión</h3>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              placeholder="id_productor (opcional)"
              value={resolverInput.id_productor}
              onChange={(e) => setResolverInput((p) => ({ ...p, id_productor: e.target.value }))}
              className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="id_categoria (opcional)"
              value={resolverInput.id_categoria}
              onChange={(e) => setResolverInput((p) => ({ ...p, id_categoria: e.target.value }))}
              className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
            />
            <input
              placeholder="pais_iso2 (ej. US, MX)"
              value={resolverInput.pais_iso2}
              maxLength={2}
              onChange={(e) => setResolverInput((p) => ({ ...p, pais_iso2: e.target.value.toUpperCase() }))}
              className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleResolver}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Resolver
          </button>
          {resolverError && <p className="mt-3 text-sm text-red-700">{resolverError}</p>}
          {resolverResult && (
            <div className="mt-3 rounded-md bg-white p-3 text-sm">
              <div>
                <strong>id_comision:</strong> {resolverResult.id_comision}
              </div>
              <div>
                <strong>alcance:</strong> {resolverResult.alcance}
              </div>
              <div>
                <strong>porcentaje:</strong> {(resolverResult.porcentaje * 100).toFixed(2)}%
              </div>
              {resolverResult.monto_fijo !== null && (
                <div>
                  <strong>monto fijo:</strong> {resolverResult.monto_fijo}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Alcance</th>
              <th className="px-3 py-2 text-left">Contexto</th>
              <th className="px-3 py-2 text-right">%</th>
              <th className="px-3 py-2 text-right">Monto fijo</th>
              <th className="px-3 py-2 text-right">Prioridad</th>
              <th className="px-3 py-2 text-left">Activo</th>
              <th className="px-3 py-2 text-left">Vigente desde</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                  Sin resultados
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((c) => (
                <tr key={c.id_comision}>
                  <td className="px-3 py-2">{c.id_comision}</td>
                  <td className="px-3 py-2">{c.alcance}</td>
                  <td className="px-3 py-2">
                    {c.alcance === "pais" && c.pais_iso2}
                    {c.alcance === "categoria" && `cat #${c.id_categoria}`}
                    {c.alcance === "productor" && `productor #${c.id_productor}`}
                    {c.alcance === "global" && "—"}
                  </td>
                  <td className="px-3 py-2 text-right">{(Number(c.porcentaje) * 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">
                    {c.monto_fijo ? `${c.monto_fijo} ${c.moneda_monto_fijo ?? ""}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">{c.prioridad}</td>
                  <td className="px-3 py-2">
                    {c.activo ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">activo</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">inactivo</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{new Date(c.vigente_desde).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => openEdit(c)}
                      className="mr-2 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={12} /> Desactivar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{editing ? "Editar regla" : "Nueva regla"}</h2>
              <button onClick={() => setShowForm(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">Alcance</label>
                <select
                  value={form.alcance}
                  onChange={(e) => setForm((p) => ({ ...p, alcance: e.target.value as ComisionInput["alcance"] }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {ALCANCES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              {form.alcance === "pais" && (
                <div>
                  <label className="mb-1 block text-sm">País (ISO2)</label>
                  <input
                    required
                    maxLength={2}
                    value={form.pais_iso2 ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, pais_iso2: e.target.value.toUpperCase() }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase dark:border-gray-600 dark:bg-gray-800"
                    placeholder="US"
                  />
                </div>
              )}
              {form.alcance === "categoria" && (
                <div>
                  <label className="mb-1 block text-sm">id_categoria</label>
                  <input
                    type="number"
                    required
                    value={form.id_categoria ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, id_categoria: Number(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
              )}
              {form.alcance === "productor" && (
                <div>
                  <label className="mb-1 block text-sm">id_productor</label>
                  <input
                    type="number"
                    required
                    value={form.id_productor ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, id_productor: Number(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm">Porcentaje (decimal, ej. 0.15 = 15%)</label>
                <input
                  required
                  value={form.porcentaje}
                  onChange={(e) => setForm((p) => ({ ...p, porcentaje: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  placeholder="0.1500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Prioridad (menor = más específica)</label>
                <input
                  type="number"
                  value={form.prioridad ?? 100}
                  onChange={(e) => setForm((p) => ({ ...p, prioridad: Number(e.target.value) }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="activo"
                  type="checkbox"
                  checked={form.activo ?? true}
                  onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                />
                <label htmlFor="activo" className="text-sm">
                  Activo
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editing ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
