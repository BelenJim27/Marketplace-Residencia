"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Trash2, Edit2, Plus } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useFeedback } from "@/hooks/useFeedback";
import { useDeleteAlert } from "@/hooks/useDeleteAlert";
import { DeleteAlertModal } from "@/components/ui/DeleteAlertModal";

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
  const [formErrors, setFormErrors] = useState<{ telefono?: string; cp?: string }>({});
  const fb = useFeedback("direccion");
  const deleteAlert = useDeleteAlert("direccion");

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
            fb.error("No se pudo obtener la dirección desde las coordenadas.");
          }
        },
        (err) => fb.error(err.message),
        { timeout: 10000 }
      );
    } catch (err) {
      fb.error(err, "Error al obtener ubicación");
    }
  };

  const guardarDireccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id_usuario) return;

    const errors: { telefono?: string; cp?: string } = {};
    const tel = formData.telefono?.replace(/\D/g, "") ?? "";
    if (tel && tel.length !== 10) errors.telefono = "El teléfono debe tener 10 dígitos";
    const cp = formData.codigo_postal ?? "";
    if (formData.pais_iso2 === "MX" && cp && !/^\d{5}$/.test(cp)) errors.cp = "El código postal debe tener 5 dígitos";
    if (formData.pais_iso2 === "US" && cp && !/^\d{5}(-\d{4})?$/.test(cp)) errors.cp = "El ZIP code debe tener 5 dígitos (ej. 90210)";
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});

    try {
      setEnviando(true);
      setError(null);
      const token = getCookie("token") || "";

      const fueEdicion = !!editandoId;
      if (editandoId) {
        await api.direcciones.update(token, editandoId.toString(), formData);
      } else {
        await api.direcciones.create(token, { ...formData, id_usuario: user.id_usuario });
      }

      cerrarFormulario();
      await cargarDirecciones();
      if (fueEdicion) fb.actualizado();
      else fb.creado();
    } catch (err) {
      fb.error(err, "Error al guardar dirección");
    } finally {
      setEnviando(false);
    }
  };

  const marcarPredeterminada = async (id: number) => {
    try {
      const token = getCookie("token") || "";
      await api.direcciones.update(token, id.toString(), { es_predeterminada: true, id_usuario: user?.id_usuario });
      await cargarDirecciones();
      fb.success("Dirección predeterminada actualizada.");
    } catch (err) {
      fb.error(err, "Error al actualizar dirección");
    }
  };

  const solicitarEliminar = (dir: Direccion) => {
    const etiqueta = dir.nombre_etiqueta || dir.tipo || "Dirección";
    deleteAlert.abrir(etiqueta, async () => {
      try {
        const token = getCookie("token") || "";
        await api.direcciones.delete(token, String(dir.id_direccion ?? ""));
        await cargarDirecciones();
        fb.eliminado();
      } catch (err) {
        fb.error(err, "Error al eliminar dirección");
      }
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Cargando direcciones" role="status" />
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
          <div role="alert" aria-live="polite" className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
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
                {/* País selector — primer campo */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    País *
                  </label>
                  <select
                    value={formData.pais_iso2 || "MX"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pais_iso2: e.target.value,
                        es_internacional: e.target.value !== "MX",
                      })
                    }
                    className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  >
                    <option value="MX">🇲🇽 México</option>
                    <option value="US">🇺🇸 Estados Unidos</option>
                  </select>
                </div>

                {/* Formulario dinámico por país */}
                {formData.pais_iso2 === "US" ? (
                  <>
                    {/* USA: Nombre, Teléfono, Línea 1, Línea 2, Ciudad, Estado, ZIP, Predeterminada */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombre_destinatario || ""}
                        onChange={(e) => setFormData({ ...formData, nombre_destinatario: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        aria-describedby={formErrors.telefono ? "telefono-error-us" : undefined}
                        aria-invalid={!!formErrors.telefono}
                        value={formData.telefono || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setFormData({ ...formData, telefono: val });
                          setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                        }}
                        className={`w-full rounded-lg border bg-white px-4 py-3 text-dark focus:outline-none dark:bg-dark dark:text-white ${formErrors.telefono ? "border-red-400 focus:border-red-400" : "border-gray-4 focus:border-primary dark:border-dark-3"}`}
                        placeholder="10 dígitos"
                        maxLength={10}
                      />
                      {formErrors.telefono && <p id="telefono-error-us" className="mt-1 text-xs text-red-500" role="status">{formErrors.telefono}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Dirección - Línea 1 *
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
                        Dirección - Línea 2
                      </label>
                      <input
                        type="text"
                        value={formData.linea_2 || ""}
                        onChange={(e) => setFormData({ ...formData, linea_2: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="Apt 4B (opcional)"
                      />
                    </div>

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
                        placeholder="New York"
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
                        placeholder="NY"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        required
                        aria-describedby={formErrors.cp ? "cp-error-us" : undefined}
                        aria-invalid={!!formErrors.cp}
                        value={formData.codigo_postal || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, codigo_postal: val });
                          setFormErrors((prev) => ({ ...prev, cp: undefined }));
                        }}
                        maxLength={10}
                        className={`w-full rounded-lg border bg-white px-4 py-3 text-dark focus:outline-none dark:bg-dark dark:text-white ${formErrors.cp ? "border-red-400 focus:border-red-400" : "border-gray-4 focus:border-primary dark:border-dark-3"}`}
                        placeholder="90210 o 90210-1234"
                      />
                      {formErrors.cp && <p id="cp-error-us" className="mt-1 text-xs text-red-500" role="status">{formErrors.cp}</p>}
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
                  </>
                ) : (
                  <>
                    {/* México: Nombre, Calle, Número, Colonia, Ciudad, Estado, CP, Teléfono, Referencias, Predeterminada */}
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={formData.nombre_destinatario || ""}
                        onChange={(e) => setFormData({ ...formData, nombre_destinatario: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder={user?.nombre || "Juan Pérez"}
                      />
                    </div>

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
                        placeholder="Oaxaca de Juárez"
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
                        placeholder="Oaxaca"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Código Postal *
                      </label>
                      <input
                        type="text"
                        required
                        aria-describedby={formErrors.cp ? "cp-error-mx" : undefined}
                        aria-invalid={!!formErrors.cp}
                        value={formData.codigo_postal || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setFormData({ ...formData, codigo_postal: val });
                          setFormErrors((prev) => ({ ...prev, cp: undefined }));
                        }}
                        maxLength={5}
                        className={`w-full rounded-lg border bg-white px-4 py-3 text-dark focus:outline-none dark:bg-dark dark:text-white ${formErrors.cp ? "border-red-400 focus:border-red-400" : "border-gray-4 focus:border-primary dark:border-dark-3"}`}
                        placeholder="68000"
                      />
                      {formErrors.cp && <p id="cp-error-mx" className="mt-1 text-xs text-red-500" role="status">{formErrors.cp}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        aria-describedby={formErrors.telefono ? "telefono-error-mx" : undefined}
                        aria-invalid={!!formErrors.telefono}
                        value={formData.telefono || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setFormData({ ...formData, telefono: val });
                          setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                        }}
                        className={`w-full rounded-lg border bg-white px-4 py-3 text-dark focus:outline-none dark:bg-dark dark:text-white ${formErrors.telefono ? "border-red-400 focus:border-red-400" : "border-gray-4 focus:border-primary dark:border-dark-3"}`}
                        placeholder="10 dígitos, ej. 9511234567"
                        maxLength={10}
                      />
                      {formErrors.telefono && <p id="telefono-error-mx" className="mt-1 text-xs text-red-500" role="status">{formErrors.telefono}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Referencias (opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.referencia || ""}
                        onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                        className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                        placeholder="Casa color azul, frente al parque"
                      />
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
                  </>
                )}
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
                  aria-busy={enviando}
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
                    <h3 className="truncate font-semibold text-dark dark:text-white">
                      {dir.nombre_etiqueta || dir.tipo || "Dirección"}
                    </h3>
                    {dir.es_predeterminada && (
                      <span className="inline-block shrink-0 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-400">
                    {dir.nombre_destinatario}
                    {dir.telefono && <span> • {dir.telefono}</span>}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {dir.es_internacional ? (
                      <>
                        <span className="line-clamp-2">
                          {dir.linea_1}
                          {dir.linea_2 && <span>, {dir.linea_2}</span>}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="line-clamp-2">
                          {dir.calle} {dir.numero}
                          {dir.colonia && <span>, {dir.colonia}</span>}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                    {dir.ciudad}, {dir.estado} {dir.codigo_postal}
                  </p>
                  {dir.referencia && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-500">
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
                    aria-label={`Editar dirección ${dir.nombre_etiqueta || dir.tipo || "dirección"}`}
                    className="rounded p-3 text-gray-600 hover:bg-gray-1 dark:hover:bg-dark-2"
                  >
                    <Edit2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => solicitarEliminar(dir)}
                    aria-label={`Eliminar dirección ${dir.nombre_etiqueta || dir.tipo || "dirección"}`}
                    className="rounded p-3 text-red-600 hover:bg-red-50 dark:hover:bg-dark-2"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DeleteAlertModal estado={deleteAlert.estado} onClose={deleteAlert.cerrar} />
    </div>
  );
}
