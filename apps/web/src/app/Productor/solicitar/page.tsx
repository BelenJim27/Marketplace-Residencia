"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle2, Loader2, UploadIcon } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Region {
  id_region: number;
  nombre: string;
  estado_prov?: string;
}

export default function SolicitarPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [certificadoUrl, setCertificadoUrl] = useState("");
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nombre_tienda: "",
    descripcion: "",
    id_region: null as number | null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }
    api.productores.getRegiones().then((data) => setRegiones(data as Region[])).catch(console.error);
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
      const token = getCookie("token");
      if (!token) {
        router.push("/auth/sign-in");
        return;
      }
      
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("entidad_tipo", "productor_certificado");
      formDataUpload.append("tipo", "certificado");

      const result = await api.archivos.upload(token, formDataUpload);
      setCertificadoUrl((result as any).url || `/${(result as any).id}`);
    } catch (err) {
      console.error("Error uploading:", err);
      setError("Error al subir el certificado");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const token = getCookie("token");
      if (!token) {
        router.push("/auth/sign-in");
        return;
      }

      if (!certificadoUrl) {
        throw new Error("Sube el certificado primero");
      }

      await api.productores.solicitar(token, {
        id_region: formData.id_region ?? undefined,
        biografia: formData.descripcion,
        certificado_url: certificadoUrl,
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
              Nuestro equipo revisará tu información y te notificará cuando tu cuenta haya sido aprobada.
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
            Completa el siguiente formulario para solicitar convertirte en productor en nuestra plataforma.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Nombre de la Tienda *
            </label>
            <input
              type="text"
              name="nombre_tienda"
              value={formData.nombre_tienda}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-gray-4 bg-gray-1 px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              placeholder="Mi Tienda de Productos"
            />
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
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded-lg border border-gray-4 bg-gray-1 px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              placeholder="Describe tu tienda y los productos que venderás..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Certificado de Origen *
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
              <div className="flex items-center justify-center rounded-xl border border-gray-4 bg-gray-2 p-6 dark:border-dark-3 dark:bg-dark-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Subiendo certificado...</span>
                </div>
              </div>
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