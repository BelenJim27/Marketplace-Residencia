"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "next-auth/react";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  MapPin,
  CreditCard,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

interface Region {
  id_region: number;
  nombre: string;
  estado_prov?: string;
}

export default function PerfilProductorPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, isProductor } = useAuth();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [regiones, setRegiones] = useState<Region[]>([]);

  const [formData, setFormData] = useState({
    rfc: "",
    razon_social: "",
    datos_bancarios: "",
    id_region: null as number | null,
    direccion_calle: "",
    direccion_cp: "",
    direccion_ciudad: "",
    direccion_estado: "",
    produccion_calle: "",
    produccion_cp: "",
    produccion_ciudad: "",
    produccion_estado: "",
    produccion_referencia: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }

    const init = async () => {
      try {
        const [regionesData] = await Promise.all([
          api.productores.getRegiones(),
        ]);
        setRegiones(regionesData as Region[]);

        let token = (session as any)?.accessToken || getCookie("token");
        if (!token) {
          await new Promise(resolve => setTimeout(resolve, 300));
          token = getCookie("token");
        }

        if (token) {
          const solicitud = await api.productores.getMiSolicitud(token) as any;
          if (solicitud) {
            const df = solicitud.direccion_fiscal;
            const dp = solicitud.direccion_produccion;
            setFormData({
              rfc: solicitud.rfc ?? "",
              razon_social: solicitud.razon_social ?? "",
              datos_bancarios: solicitud.datos_bancarios ?? "",
              id_region: solicitud.id_region ?? null,
              direccion_calle: df?.linea_1 ?? "",
              direccion_cp: df?.codigo_postal ?? "",
              direccion_ciudad: df?.ciudad ?? "",
              direccion_estado: df?.estado ?? "",
              produccion_calle: dp?.linea_1 ?? "",
              produccion_cp: dp?.codigo_postal ?? "",
              produccion_ciudad: dp?.ciudad ?? "",
              produccion_estado: dp?.estado ?? "",
              produccion_referencia: dp?.referencia ?? "",
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated, authLoading, router, session]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = (session as any)?.accessToken || getCookie("token");
      if (!token) {
        setError("No se detectó sesión. Por favor inicia sesión.");
        return;
      }

      await api.productores.actualizarMiPerfil(token, {
        rfc: formData.rfc || undefined,
        razon_social: formData.razon_social || undefined,
        datos_bancarios: formData.datos_bancarios || undefined,
        id_region: formData.id_region ?? undefined,
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
      });

      setSuccessMsg("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el perfil");
    } finally {
      setIsSubmitting(false);
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
      <Breadcrumb pageName="Mi Perfil de Productor" />

      <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Mi Perfil de Productor
          </h1>
          <p className="mt-1 text-gray-500">
            Completa tu información fiscal, bancaria y de producción.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/20">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Fiscales */}
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

          {/* Región */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Región
            </label>
            <select
              name="id_region"
              value={formData.id_region ?? ""}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, id_region: e.target.value ? Number(e.target.value) : null }))
              }
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

          {/* Dirección Fiscal */}
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

          {/* Lugar de Producción */}
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
                  placeholder="Cerca del río, zona de ley seca"
                />
              </div>
            </div>
          </div>

          {/* Datos Bancarios */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dark dark:text-white">
              <CreditCard className="h-5 w-5" />
              Datos Bancarios
            </h3>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Cuenta bancaria (número de cuenta o CLABE)
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
                Estos datos se encriptan y solo se usan para procesar tus pagos.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard/productor")}
              className="flex items-center justify-center rounded-lg border border-gray-4 px-6 py-3 font-medium text-dark hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
