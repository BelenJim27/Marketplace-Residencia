"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "next-auth/react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle2, Loader2, UploadIcon, Building2, MapPin, CreditCard } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Region {
  id_region: number;
  nombre: string;
  estado_prov?: string;
}

interface Solicitud {
  id_productor: number;
  estado: string;
  motivo_rechazo?: string;
  rfc?: string;
  razon_social?: string;
}

export default function SolicitarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user: contextUser } = useAuth();
  const { data: session } = useSession();
  const user = session?.user || contextUser;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingSolicitud, setLoadingSolicitud] = useState(true);
  const [solicitudActual, setSolicitudActual] = useState<Solicitud | null>(null);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [certificadoUrl, setCertificadoUrl] = useState("");
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    rfc: "",
    razon_social: "",
    direccion_calle: "",
    direccion_cp: "",
    direccion_ciudad: "",
    direccion_estado: "",
    datos_bancarios: "",
    id_region: null as number | null,
    produccion_calle: "",
    produccion_ciudad: "",
    produccion_estado: "",
    produccion_cp: "",
    produccion_referencia: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }

    const initializePage = async () => {
      try {
        // Obtener regiones
        const regionesData = await api.productores.getRegiones();
        setRegiones(regionesData as Region[]);

        // Obtener token (con retry si es necesario)
        let token = (session as any)?.accessToken || getCookie("token");

        // Si no hay token inmediatamente, esperar un poco (race condition al guardar cookies)
        if (!token) {
          await new Promise(resolve => setTimeout(resolve, 300));
          token = getCookie("token");
        }

        // Obtener solicitud actual si hay token
        if (token) {
          try {
            const solicitud = await api.productores.getMiSolicitud(token);
            if (solicitud) {
              setSolicitudActual(solicitud as Solicitud);
            }
          } catch (err) {
            console.error("Error al obtener solicitud:", err);
          }
        }
      } catch (err) {
        console.error("Error al inicializar página:", err);
      } finally {
        setLoadingSolicitud(false);
      }
    };

    initializePage();
  }, [isAuthenticated, authLoading, router, session]);

  if (authLoading || loadingSolicitud) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (solicitudActual) {
    if (solicitudActual.estado === "pendiente") {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Breadcrumb pageName="Solicitud Pendiente" />
          <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                Solicitud en Revisión
              </h2>
              <p className="mb-6 text-gray-500">
                Tu solicitud para convertirte en productor está siendo revisada por un administrador.
                Te notificaremos cuando sea aprobada.
              </p>
              <button
                onClick={() => router.push("/producto")}
                className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
              >
                Volver a la tienda
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (solicitudActual.estado === "aprobado") {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Breadcrumb pageName="Ya eres Productor" />
          <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                ¡Ya eres Productor!
              </h2>
              <p className="mb-6 text-gray-500">
                Tu solicitud fue aprobada. Ahora puedes publicar y vender tus productos.
              </p>
              <button
                onClick={() => router.push("/dashboard/productor")}
                className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
              >
                Ir a mi dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (solicitudActual.estado === "rechazado") {
      return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <Breadcrumb pageName="Solicitud Rechazada" />
          <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
                Solicitud Rechazada
              </h2>
              <p className="mb-2 text-gray-500">
                Tu solicitud fue rechazada.
              </p>
              <p className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
                <strong>Motivo:</strong> {solicitudActual.motivo_rechazo || "No especificado"}
              </p>
              <button
                onClick={() => {
                  setSolicitudActual(null);
                  setFormData({
                    rfc: "",
                    razon_social: "",
                    direccion_calle: "",
                    direccion_cp: "",
                    direccion_ciudad: "",
                    direccion_estado: "",
                    datos_bancarios: "",
                    id_region: null,
                  });
                }}
                className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertificadoFile(file);
    setUploading(true);
    setError("");

    try {
      const token = (session as any)?.accessToken || getCookie("token");

      if (!token) {
        setError("Error: No se detectó sesión. Por favor inicia sesión.");
        return;
      }

      const formDataUpload = new FormData();
      formDataUpload.append("archivo", file);
      formDataUpload.append("entidad_tipo", "productor_certificado");
      formDataUpload.append("tipo", "certificado");

      const result = await api.archivos.upload(token, formDataUpload);
      setCertificadoUrl((result as any).url || `/${(result as any).id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al subir el certificado";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) {
        setError("Error: No se detectó sesión. Por favor inicia sesión.");
        return;
      }

      if (!certificadoUrl) {
        throw new Error("Sube el certificado primero");
      }

      await api.productores.solicitar(token, {
        rfc: formData.rfc || undefined,
        razon_social: formData.razon_social || undefined,
        datos_bancarios: formData.datos_bancarios || undefined,
        direccion_fiscal: formData.direccion_calle || formData.direccion_ciudad ? {
          linea_1: formData.direccion_calle || undefined,
          ciudad: formData.direccion_ciudad || undefined,
          estado: formData.direccion_estado || undefined,
          codigo_postal: formData.direccion_cp || undefined,
          pais_iso2: "MX",
        } : undefined,
        direccion_produccion: formData.produccion_calle || formData.produccion_ciudad ? {
          linea_1: formData.produccion_calle || undefined,
          ciudad: formData.produccion_ciudad || undefined,
          estado: formData.produccion_estado || undefined,
          codigo_postal: formData.produccion_cp || undefined,
          referencia: formData.produccion_referencia || undefined,
          pais_iso2: "MX",
        } : undefined,
        id_region: formData.id_region ?? undefined,
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <Breadcrumb pageName="Solicitud Enviada" />
        <div className="mt-6 rounded-xl bg-white p-8 shadow-1 dark:bg-gray-dark">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white">
              Solicitud Enviada
            </h2>
            <p className="mb-6 text-gray-500">
              Tu solicitud para convertirte en productor ha sido enviada exitosamente.
              Un administrador la revisará y te notificará cuando sea aprobada.
            </p>
            <button
              onClick={() => router.push("/producto")}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Breadcrumb pageName="Solicitar ser Productor" />

      <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Solicitar ser Productor
          </h1>
          <p className="mt-1 text-gray-500">
            Completa el formulario para convertirte en productor en nuestra plataforma.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <Building2 className="h-5 w-5" />
              Datos Fiscales
            </h3>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Razón Social
                </label>
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Mi Empresa S.A. de C.V."
                />
              </div>

              <div className="w-44">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  RFC
                </label>
                <input
                  type="text"
                  name="rfc"
                  value={formData.rfc}
                  onChange={handleInputChange}
                  maxLength={13}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark uppercase focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="XAXX010101000"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <MapPin className="h-5 w-5" />
              Dirección Fiscal
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Calle y Número
                </label>
                <input
                  type="text"
                  name="direccion_calle"
                  value={formData.direccion_calle}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Av. Principal #123"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Código Postal
                </label>
                <input
                  type="text"
                  name="direccion_cp"
                  value={formData.direccion_cp}
                  onChange={handleInputChange}
                  maxLength={5}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="12345"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="direccion_ciudad"
                  value={formData.direccion_ciudad}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Ciudad de México"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Estado
                </label>
                <input
                  type="text"
                  name="direccion_estado"
                  value={formData.direccion_estado}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="CDMX"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <MapPin className="h-5 w-5" />
              Lugar de Producción
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Calle y Número
                </label>
                <input
                  type="text"
                  name="produccion_calle"
                  value={formData.produccion_calle}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Av. Producción #456"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Código Postal
                </label>
                <input
                  type="text"
                  name="produccion_cp"
                  value={formData.produccion_cp}
                  onChange={handleInputChange}
                  maxLength={5}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="12345"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="produccion_ciudad"
                  value={formData.produccion_ciudad}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Oaxaca"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Estado
                </label>
                <input
                  type="text"
                  name="produccion_estado"
                  value={formData.produccion_estado}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Oaxaca"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  name="produccion_referencia"
                  value={formData.produccion_referencia}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                  placeholder="Ej: Cerca del río, zona de ley seca"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <CreditCard className="h-5 w-5" />
              Datos Bancarios (para pagos)
            </h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Datos de cuenta bancaria (número de cuenta o CLABE)
              </label>
              <input
                type="text"
                name="datos_bancarios"
                value={formData.datos_bancarios}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                placeholder="123456789012345678"
              />
              <p className="mt-1 text-xs text-gray-400">
                Estos datos se encriptan y solo se usan para procesar tus pagos
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Región *
            </label>
            <select
              name="id_region"
              value={formData.id_region ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, id_region: e.target.value ? Number(e.target.value) : null }))}
              required
              className="w-full rounded-lg border border-gray-4 bg-gray-1 px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            >
              <option value="">Selecciona una región</option>
              {regiones.map((r) => (
                <option key={r.id_region} value={r.id_region}>
                  {r.nombre} {r.estado_prov ? `(${r.estado_prov})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Certificado de Origen (PDF o imagen) *
            </label>
            {certificadoUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-green-5 bg-green-1 p-4 dark:bg-green-9/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-dark dark:text-white">
                    Certificado subido
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setCertificadoUrl(""); setCertificadoFile(null); }}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <div className="relative block w-full rounded-xl border border-dashed border-gray-4 bg-gray-2 hover:border-primary dark:border-dark-3 dark:bg-dark-2">
                <input
                  type="file"
                  id="certificado"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <label
                  htmlFor="certificado"
                  className="flex cursor-pointer flex-col items-center justify-center p-6"
                >
                  <UploadIcon className="mb-2 h-8 w-8 text-gray-4" />
                  <p className="text-body-sm font-medium text-gray-500">
                    <span className="text-primary">Click para subir</span> o arrastra
                  </p>
                  <p className="mt-1 text-body-xs text-gray-400">
                    PDF, JPG, PNG (máx. 10MB)
                  </p>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center rounded-lg border border-gray-4 px-6 py-3 font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !certificadoUrl}
              className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Enviar Solicitud"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}