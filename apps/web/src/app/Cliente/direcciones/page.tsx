"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { usePaises } from "@/hooks/usePaises";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Trash2, Edit2, Plus } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Direccion {
  id_direccion?: number;
  nombre_destinatario?: string;
  telefono?: string;
  nombre_etiqueta?: string;
  es_predeterminada?: boolean;
  es_internacional?: boolean;
  
  // Campos para direcciones nacionales (México)
  calle?: string;
  numero?: string;
  colonia?: string;
  
  // Campos para direcciones internacionales
  linea_1?: string;
  linea_2?: string;
  
  // Campos comunes
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  pais_iso2?: string;
  referencia?: string;
  tipo?: string;
  ubicacion?: Record<string, unknown>;
}

export default function DireccionesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { paises, loading: paisesLoading } = usePaises("envio");

  const [formData, setFormData] = useState<Direccion>({
    nombre_destinatario: "",
    telefono: "",
    nombre_etiqueta: "",
    es_predeterminada: false,
    es_internacional: false,
    calle: "",
    numero: "",
    colonia: "",
    linea_1: "",
    linea_2: "",
    ciudad: "",
    estado: "",
    codigo_postal: "",
    pais_iso2: "MX",
    referencia: "",
    tipo: "hogar",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.id_usuario) {
      router.push("/auth/sign-in");
      return;
    }
    cargarDirecciones();
  }, [isAuthenticated, authLoading, user?.id_usuario, router]);

  const cargarDirecciones = async () => {
    if (!user?.id_usuario) return;
    try {
      setLoading(true);
      const token = getCookie("token") || "";
      const data = await api.direcciones.getByUsuario(user.id_usuario, token);
      const lista = Array.isArray(data) ? data : [];
      // Filtrar para no mostrar dirección fiscal ni de producción
      const filtradas = lista.filter((d) => !["facturacion", "produccion"].includes(d.tipo || ""));
      setDirecciones(filtradas);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar direcciones");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre_destinatario: user?.nombre || "",
      telefono: user?.telefono || "",
      nombre_etiqueta: "",
      es_predeterminada: false,
      es_internacional: false,
      calle: "",
      numero: "",
      colonia: "",
      linea_1: "",
      linea_2: "",
      ciudad: "",
      estado: "",
      codigo_postal: "",
      pais_iso2: "MX",
      referencia: "",
      tipo: "hogar",
    });
    setEditandoId(null);
  };

  const abrirFormulario = (direccion?: Direccion) => {
    if (direccion) {
      setFormData(direccion);
      setEditandoId(direccion.id_direccion || null);
    } else {
      resetForm();
      setEditandoId(null);
    }
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    resetForm();
  };

  const obtenerUbicacionGPS = async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocalización no disponible en este navegador.");
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { "Accept-Language": "es", "User-Agent": "Marketplace-Mezcal/1.0" } }
            );
            const data = await res.json();
            const a = data.address ?? {};
            setFormData((prev) => ({
              ...prev,
              ciudad: a.city ?? a.town ?? a.village ?? a.municipality ?? prev.ciudad ?? "",
              estado: a.state ?? prev.estado ?? "",
              codigo_postal: a.postcode ?? prev.codigo_postal ?? "",
              pais_iso2: (a.country_code ?? "MX").toUpperCase(),
              es_internacional: (a.country_code ?? "mx").toUpperCase() !== "MX",
              ubicacion: { lat, lng, source: "gps" },
            }));
          } catch {
            setError("No se pudo obtener la dirección desde las coordenadas.");
          }
        },
        (err) => setError(err.message),
        { timeout: 10000 }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener ubicación");
    }
  };

  const guardarDireccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id_usuario) return;

    try {
      setEnviando(true);
      setError(null);
      const token = getCookie("token") || "";

      if (editandoId) {
        await api.direcciones.update(token, editandoId.toString(), formData);
      } else {
        await api.direcciones.create(token, { ...formData, id_usuario: user.id_usuario });
      }

      cerrarFormulario();
      await cargarDirecciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar dirección");
    } finally {
      setEnviando(false);
    }
  };

  const marcarPredeterminada = async (id: number) => {
    try {
      const token = getCookie("token") || "";
      await api.direcciones.update(token, id.toString(), { es_predeterminada: true, id_usuario: user?.id_usuario });
      await cargarDirecciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar dirección");
    }
  };

  const eliminarDireccion = async (id: number) => {
    try {
      setEliminando(id);
      const token = getCookie("token") || "";
      await api.direcciones.delete(token, id.toString());
      setConfirmDelete(null);
      await cargarDirecciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar dirección");
    } finally {
      setEliminando(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Breadcrumb pageName="Mis Direcciones de Envío" />

      <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              Mis Direcciones de Envío
            </h1>
            <p className="mt-1 text-gray-500">
              Gestiona tus direcciones de entrega para pedidos más rápidos
            </p>
          </div>
          <button
            onClick={() => abrirFormulario()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90"
          >
            <Plus className="h-5 w-5" />
            Agregar
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mostrarForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              {editandoId ? "Editar dirección" : "Nueva dirección"}
            </h3>

            <form onSubmit={guardarDireccion} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Nombre de contacto
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_destinatario || ""}
                    onChange={(e) => setFormData({ ...formData, nombre_destinatario: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono || ""}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="+52 1234567890"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                    <input
                      type="checkbox"
                      checked={formData.es_internacional || false}
                      onChange={(e) => setFormData({ ...formData, es_internacional: e.target.checked })}
                      className="rounded border-gray-4"
                    />
                    Dirección internacional
                  </label>
                </div>

                {formData.es_internacional ? (
                  <>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Línea 1 (Dirección) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.linea_1 || ""}
                        onChange={(e) => setFormData({ ...formData, linea_1: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Línea 2 (Opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.linea_2 || ""}
                        onChange={(e) => setFormData({ ...formData, linea_2: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="Apt 4B"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Calle *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.calle || ""}
                        onChange={(e) => setFormData({ ...formData, calle: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="Avenida Paseo"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Número *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.numero || ""}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="123 / 123-A"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Colonia / Barrio *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.colonia || ""}
                        onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="Centro"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ciudad || ""}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="Ciudad de México"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Estado *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.estado || ""}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="CDMX"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.codigo_postal || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    País
                  </label>
                  <select
                    value={formData.pais_iso2 || "MX"}
                    onChange={(e) => setFormData({ ...formData, pais_iso2: e.target.value })}
                    disabled={paisesLoading}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white disabled:opacity-60"
                  >
                    {paisesLoading && <option value="MX">Cargando...</option>}
                    {!paisesLoading && paises.length === 0 && <option value="MX">México</option>}
                    {paises.map((p) => (
                      <option key={p.iso2} value={p.iso2}>
                        {p.nombre_local || p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Referencia (ej: "cerca de la tienda") (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.referencia || ""}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="Punto de referencia o indicaciones"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Etiqueta (ej: "Casa", "Oficina")
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_etiqueta || ""}
                    onChange={(e) => setFormData({ ...formData, nombre_etiqueta: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                    placeholder="Casa"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Tipo de dirección
                  </label>
                  <select
                    value={formData.tipo || "hogar"}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  >
                    <option value="hogar">Hogar</option>
                    <option value="trabajo">Trabajo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="predeterminada"
                    checked={formData.es_predeterminada || false}
                    onChange={(e) => setFormData({ ...formData, es_predeterminada: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="predeterminada" className="text-sm font-medium text-dark dark:text-white">
                    Usar como dirección predeterminada
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={obtenerUbicacionGPS}
                  className="flex items-center gap-2 rounded-lg border border-gray-4 px-4 py-3 font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                >
                  <MapPin className="h-5 w-5" />
                  Detectar ubicación
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {enviando ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  className="flex-1 rounded-lg border border-gray-4 px-4 py-3 font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {direcciones.length === 0 && !mostrarForm && (
          <div className="rounded-lg border border-dashed border-gray-4 p-12 text-center dark:border-dark-3">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">
              No tienes direcciones guardadas. Agrega una para agilizar tus pedidos.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {direcciones.map((dir) => (
            <div
              key={dir.id_direccion}
              className="rounded-lg border border-gray-200 p-4 dark:border-dark-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-dark dark:text-white">
                      {dir.nombre_etiqueta || dir.tipo || "Dirección"}
                    </h3>
                    {dir.es_predeterminada && (
                      <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {dir.nombre_destinatario}
                    {dir.telefono && <span> • {dir.telefono}</span>}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {dir.es_internacional ? (
                      <>
                        {dir.linea_1}
                        {dir.linea_2 && <span>, {dir.linea_2}</span>}
                      </>
                    ) : (
                      <>
                        {dir.calle} {dir.numero}
                        {dir.colonia && <span>, {dir.colonia}</span>}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dir.ciudad}, {dir.estado} {dir.codigo_postal}
                  </p>
                  {dir.referencia && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                      Ref: {dir.referencia}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {!dir.es_predeterminada && (
                    <button
                      onClick={() => marcarPredeterminada(dir.id_direccion || 0)}
                      className="rounded px-3 py-2 text-xs font-medium text-primary hover:bg-gray-1 dark:hover:bg-dark-2"
                    >
                      Usar como predeterminada
                    </button>
                  )}
                  <button
                    onClick={() => abrirFormulario(dir)}
                    className="rounded p-2 text-gray-600 hover:bg-gray-1 dark:hover:bg-dark-2"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  {confirmDelete === dir.id_direccion ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => eliminarDireccion(dir.id_direccion || 0)}
                        disabled={eliminando === dir.id_direccion}
                        className="rounded bg-red-100 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-200"
                      >
                        {eliminando === dir.id_direccion ? "..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(dir.id_direccion || null)}
                      className="rounded p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
