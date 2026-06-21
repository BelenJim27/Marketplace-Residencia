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
  Wallet,
  CreditCard,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function ConfiguracionCobroPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    paypal_email: "",
    datos_bancarios: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }

    const init = async () => {
      try {
        let token = (session as any)?.accessToken || getCookie("token");
        if (!token) {
          await new Promise(resolve => setTimeout(resolve, 300));
          token = getCookie("token");
        }
        if (token) {
          const solicitud = await api.productores.getMiSolicitud(token) as any;
          if (solicitud) {
            setFormData({
              paypal_email: solicitud.paypal_email ?? "",
              datos_bancarios: solicitud.datos_bancarios ?? "",
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar configuración de cobro:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isAuthenticated, authLoading, router, session]);

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
        paypal_email: formData.paypal_email || undefined,
        datos_bancarios: formData.datos_bancarios || undefined,
      });

      setSuccessMsg("Información de cobro actualizada correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la configuración");
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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Breadcrumb pageName="Configuración de Cobro" />

      <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Configuración de Cobro
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configura tu cuenta PayPal para recibir pagos automáticos de la plataforma.
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

          {/* Correo de PayPal */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-dark dark:text-white">
              <Wallet className="h-5 w-5 text-primary" />
              Correo de PayPal
            </h3>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Email de tu cuenta PayPal
                {formData.paypal_email && (
                  <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                    ✓ Configurado
                  </span>
                )}
              </label>
              <input
                type="email"
                value={formData.paypal_email}
                onChange={(e) => setFormData(prev => ({ ...prev, paypal_email: e.target.value }))}
                className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                placeholder="tu-email@paypal.com"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                La plataforma enviará tus pagos a esta cuenta cuando el administrador distribuya tus ingresos.
              </p>
            </div>
          </div>

          {/* Cuenta Bancaria */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-dark dark:text-white">
              <CreditCard className="h-5 w-5 text-primary" />
              Cuenta Bancaria (CLABE)
            </h3>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Número de cuenta o CLABE
              </label>
              <input
                type="text"
                value={formData.datos_bancarios}
                onChange={(e) => setFormData(prev => ({ ...prev, datos_bancarios: e.target.value }))}
                className="w-full rounded-lg border border-gray-4 bg-white px-4 py-3 text-dark focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark dark:text-white"
                placeholder="123456789012345678"
              />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-900/10">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Este dato bancario es de uso exclusivo del administrador. Solo se utiliza para realizar pagos manuales en caso de que los pagos automáticos no puedan procesarse.
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
                "Guardar configuración"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
