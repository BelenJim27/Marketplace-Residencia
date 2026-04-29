"use client";

import { useEffect, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface ConfigState {
  nombre_aplicacion: string;
  email_soporte: string;
  telefono_soporte: string;
  autenticacion_2fa: boolean;
  notificaciones_email: boolean;
  mantener_sesion: boolean;
}

export default function Configuracion() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<ConfigState>({
    nombre_aplicacion: "Sistema de Gestión",
    email_soporte: "soporte@miapp.com",
    telefono_soporte: "+1 800 123 4567",
    autenticacion_2fa: true,
    notificaciones_email: true,
    mantener_sesion: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push("/auth/sign-in");
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/configuracion/sistema`);
        if (!response.ok) throw new Error("Error al cargar configuración");

        const data = await response.json();
        const configMap: Record<string, any> = {};

        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            configMap[item.clave] = item.valor;
          });
        }

        setConfig({
          nombre_aplicacion: configMap["nombre_aplicacion"] || "Sistema de Gestión",
          email_soporte: configMap["email_soporte"] || "soporte@miapp.com",
          telefono_soporte: configMap["telefono_soporte"] || "+1 800 123 4567",
          autenticacion_2fa: configMap["autenticacion_2fa"] === "true" || true,
          notificaciones_email: configMap["notificaciones_email"] === "true" || true,
          mantener_sesion: configMap["mantener_sesion"] === "true" || false,
        });
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setLoadingConfig(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      loadConfig();
    }
  }, [isAuthenticated, isAdmin]);

  const handleInputChange = (field: keyof ConfigState, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const configsToSave = [
        { clave: "nombre_aplicacion", valor: config.nombre_aplicacion },
        { clave: "email_soporte", valor: config.email_soporte },
        { clave: "telefono_soporte", valor: config.telefono_soporte },
        { clave: "autenticacion_2fa", valor: String(config.autenticacion_2fa) },
        { clave: "notificaciones_email", valor: String(config.notificaciones_email) },
        { clave: "mantener_sesion", valor: String(config.mantener_sesion) },
      ];

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/configuracion/sistema/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(configsToSave),
        }
      );

      if (!response.ok) {
        throw new Error("Error al guardar configuración");
      }

      setMessage({ type: "success", text: "Configuración guardada exitosamente" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al guardar",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingConfig) {
    return <div className="p-7.5">Cargando...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <>
      <Breadcrumb pageName="Configuración" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-4">
            Configuración del Sistema
          </h2>
          <p className="text-body text-bodydark mb-4">
            Administra la configuración general de la aplicación
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-[10px] p-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Configuración General */}
        <div className="mb-7.5">
          <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
            Configuración General
          </h3>

          <div className="space-y-5">
            {/* Nombre de la Aplicación */}
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Nombre de la Aplicación
              </label>
              <input
                type="text"
                placeholder="Mi Aplicación"
                className="relative z-20 inline-flex w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
                value={config.nombre_aplicacion}
                onChange={(e) => handleInputChange("nombre_aplicacion", e.target.value)}
              />
            </div>

            {/* Email del Soporte */}
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Email de Soporte
              </label>
              <input
                type="email"
                placeholder="soporte@ejemplo.com"
                className="relative z-20 inline-flex w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
                value={config.email_soporte}
                onChange={(e) => handleInputChange("email_soporte", e.target.value)}
              />
            </div>

            {/* Teléfono de Soporte */}
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Teléfono de Soporte
              </label>
              <input
                type="tel"
                placeholder="+1 234 567 890"
                className="relative z-20 inline-flex w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
                value={config.telefono_soporte}
                onChange={(e) => handleInputChange("telefono_soporte", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Configuración de Seguridad */}
        <div className="mb-7.5">
          <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
            Seguridad
          </h3>

          <div className="space-y-4">
            {/* Autenticación de Dos Factores */}
            <div className="flex items-center justify-between rounded border border-gray-3 p-4 dark:border-dark-3">
              <div>
                <h4 className="font-medium text-black dark:text-white">
                  Autenticación de Dos Factores (2FA)
                </h4>
                <p className="text-sm text-bodydark">
                  Requerir código de verificación en el acceso
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={config.autenticacion_2fa}
                onChange={(e) => handleInputChange("autenticacion_2fa", e.target.checked)}
              />
            </div>

            {/* Notificaciones por Email */}
            <div className="flex items-center justify-between rounded border border-gray-3 p-4 dark:border-dark-3">
              <div>
                <h4 className="font-medium text-black dark:text-white">
                  Notificaciones por Email
                </h4>
                <p className="text-sm text-bodydark">
                  Enviar alertas de seguridad al correo registrado
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={config.notificaciones_email}
                onChange={(e) => handleInputChange("notificaciones_email", e.target.checked)}
              />
            </div>

            {/* Mantener Sesión Activa */}
            <div className="flex items-center justify-between rounded border border-gray-3 p-4 dark:border-dark-3">
              <div>
                <h4 className="font-medium text-black dark:text-white">
                  Mantener Sesión Activa
                </h4>
                <p className="text-sm text-bodydark">
                  No cerrar sesión automáticamente
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5"
                checked={config.mantener_sesion}
                onChange={(e) => handleInputChange("mantener_sesion", e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex rounded bg-primary px-8 py-2.5 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex rounded border border-gray-3 px-8 py-2.5 font-medium text-black hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
