"use client";

import { useEffect, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getCookie } from "@/lib/cookies";
import { api } from "@/lib/api";
import { useConfig } from "@/context/ConfigContext";

interface ConfigItem {
  id_config: number;
  clave: string;
  valor: string | null;
  tipo: string;
  descripcion: string | null;
}

const CONFIG_KEYS = {
  COLOR_PRIMARIO: "color_primario",
  COLOR_SECUNDARIO: "color_secundario",
  COLOR_ACENTO: "color_acento",
  LOGO_PRINCIPAL: "logo_principal",
  LOGO_ADMIN: "logo_admin",
  FAVICON: "favicon",
  BANNER_HOME: "banner_home",
  IDIOMA_DEFAULT: "idioma_default",
  NOMBRE_APP: "nombre_app",
};

export default function Configuracion() {
  const [token, setToken] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"colores" | "idioma" | "imagenes">("colores");
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const { refreshAndUpdate } = useConfig();

  const getConfig = (clave: string) => configs.find(c => c.clave === clave)?.valor || "";

  useEffect(() => {
    const tokenCookie = getCookie("token");
    setToken(tokenCookie);
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const data = await api.configuracion.getSistema() as ConfigItem[];
      setConfigs(data);
    } catch (error) {
      console.error("Error cargando config:", error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarConfig = async (clave: string, valor: string, tipo: string = "texto") => {
    const config = configs.find(c => c.clave === clave);
    if (!config) {
      if (token) {
        await api.configuracion.createSistema(token, { clave, valor, tipo, descripcion: null });
      }
    } else {
      if (token) {
        await api.configuracion.updateSistema(token, config.id_config, { valor });
      }
    }
  };

  const handleGuardar = async () => {
    if (!token) return;
    setSaving(true);
    setMensaje(null);
    try {
      const allConfigs = [
        { clave: CONFIG_KEYS.COLOR_PRIMARIO, valor: (document.getElementById("colorPrimario") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.COLOR_SECUNDARIO, valor: (document.getElementById("colorSecundario") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.COLOR_ACENTO, valor: (document.getElementById("colorAcento") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.IDIOMA_DEFAULT, valor: (document.getElementById("idiomaDefault") as HTMLSelectElement)?.value || "es" },
        { clave: CONFIG_KEYS.NOMBRE_APP, valor: (document.getElementById("nombreApp") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.LOGO_PRINCIPAL, valor: (document.getElementById("logoPrincipal") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.LOGO_ADMIN, valor: (document.getElementById("logoAdmin") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.FAVICON, valor: (document.getElementById("favicon") as HTMLInputElement)?.value || "" },
        { clave: CONFIG_KEYS.BANNER_HOME, valor: (document.getElementById("bannerHome") as HTMLInputElement)?.value || "" },
      ];

      for (const config of allConfigs) {
        await actualizarConfig(config.clave, config.valor);
      }

      await cargarConfiguracion();
      await refreshAndUpdate();
      setMensaje({ tipo: "success", texto: "Configuración guardada correctamente" });
    } catch (error) {
      setMensaje({ tipo: "error", texto: "Error al guardar configuración" });
    } finally {
      setSaving(false);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  if (loading) {
    return (
      <>
        <Breadcrumb pageName="Configuración" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Configuración del Sistema" />

      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${mensaje.tipo === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <div className="mb-6">
          <h2 className="text-title-md2 font-bold text-black dark:text-white mb-2">
            Configuración del Sistema
          </h2>
          <p className="text-body text-bodydark">
            Personaliza colores, idioma e imágenes de la plataforma
          </p>
        </div>

        <div className="mb-6">
          <div className="flex border-b border-gray-200 dark:border-dark-3">
            <button
              onClick={() => setActiveTab("colores")}
              className={`px-4 py-2 font-medium transition ${
                activeTab === "colores"
                  ? "border-b-2 border-primary text-primary"
                  : "text-bodydark hover:text-black dark:hover:text-white"
              }`}
            >
              Colores
            </button>
            <button
              onClick={() => setActiveTab("idioma")}
              className={`px-4 py-2 font-medium transition ${
                activeTab === "idioma"
                  ? "border-b-2 border-primary text-primary"
                  : "text-bodydark hover:text-black dark:hover:text-white"
              }`}
            >
              Idioma
            </button>
            <button
              onClick={() => setActiveTab("imagenes")}
              className={`px-4 py-2 font-medium transition ${
                activeTab === "imagenes"
                  ? "border-b-2 border-primary text-primary"
                  : "text-bodydark hover:text-black dark:hover:text-white"
              }`}
            >
              Imágenes
            </button>
          </div>
        </div>

        {activeTab === "colores" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Color Primario
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="colorPrimario"
                    type="color"
                    defaultValue={getConfig(CONFIG_KEYS.COLOR_PRIMARIO) || "#3b82f6"}
                    className="h-12 w-20 cursor-pointer rounded border border-stroke"
                  />
                  <input
                    type="text"
                    defaultValue={getConfig(CONFIG_KEYS.COLOR_PRIMARIO) || "#3b82f6"}
                    className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 outline-none"
                    placeholder="#3b82f6"
                  />
                </div>
                <p className="mt-1 text-sm text-bodydark">Color principal de la marca</p>
              </div>

              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Color Secundario
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="colorSecundario"
                    type="color"
                    defaultValue={getConfig(CONFIG_KEYS.COLOR_SECUNDARIO) || "#8b5cf6"}
                    className="h-12 w-20 cursor-pointer rounded border border-stroke"
                  />
                  <input
                    type="text"
                    defaultValue={getConfig(CONFIG_KEYS.COLOR_SECUNDARIO) || "#8b5cf6"}
                    className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 outline-none"
                    placeholder="#8b5cf6"
                  />
                </div>
                <p className="mt-1 text-sm text-bodydark">Color secundario para acentos</p>
              </div>

              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Color de Acento
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="colorAcento"
                    type="color"
                    defaultValue={getConfig(CONFIG_KEYS.COLOR_ACENTO) || "#10b981"}
                    className="h-12 w-20 cursor-pointer rounded border border-stroke"
                  />
                  <input
                    type="text"
                    defaultValue={getConfig(CONFIG_KEYS.COLOR_ACENTO) || "#10b981"}
                    className="flex-1 rounded border border-stroke bg-transparent px-3 py-2 outline-none"
                    placeholder="#10b981"
                  />
                </div>
                <p className="mt-1 text-sm text-bodydark">Color para botones y highlights</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-dark-2 rounded-lg">
              <h4 className="font-medium text-black dark:text-white mb-2">Vista Previa</h4>
              <div className="flex gap-4">
                <button
                  className="px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: getConfig(CONFIG_KEYS.COLOR_PRIMARIO) || "#3b82f6" }}
                >
                  Botón Primario
                </button>
                <button
                  className="px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: getConfig(CONFIG_KEYS.COLOR_SECUNDARIO) || "#8b5cf6" }}
                >
                  Botón Secundario
                </button>
                <button
                  className="px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: getConfig(CONFIG_KEYS.COLOR_ACENTO) || "#10b981" }}
                >
                  Botón Acento
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "idioma" && (
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Nombre de la Aplicación
              </label>
              <input
                id="nombreApp"
                type="text"
                defaultValue={getConfig(CONFIG_KEYS.NOMBRE_APP) || "Marketplace Residencia"}
                className="w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary"
                placeholder="Nombre de tu aplicación"
              />
            </div>

            <div>
              <label className="mb-3 block text-body font-medium text-black dark:text-white">
                Idioma Principal
              </label>
              <select
                id="idiomaDefault"
                defaultValue={getConfig(CONFIG_KEYS.IDIOMA_DEFAULT) || "es"}
                className="w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="pt">Português</option>
              </select>
              <p className="mt-2 text-sm text-bodydark">
                Este será el idioma predeterminado para nuevos usuarios
              </p>
            </div>
          </div>
        )}

        {activeTab === "imagenes" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Logo Principal (URL)
                </label>
                <input
                  id="logoPrincipal"
                  type="text"
                  defaultValue={getConfig(CONFIG_KEYS.LOGO_PRINCIPAL) || ""}
                  className="w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary"
                  placeholder="https://ejemplo.com/logo.png"
                />
                <p className="mt-2 text-sm text-bodydark">Logo mostrado en el header público</p>
              </div>

              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Logo Admin (URL)
                </label>
                <input
                  id="logoAdmin"
                  type="text"
                  defaultValue={getConfig(CONFIG_KEYS.LOGO_ADMIN) || ""}
                  className="w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary"
                  placeholder="https://ejemplo.com/logo-admin.png"
                />
                <p className="mt-2 text-sm text-bodydark">Logo mostrado en el panel de administración</p>
              </div>

              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Favicon (URL)
                </label>
                <input
                  id="favicon"
                  type="text"
                  defaultValue={getConfig(CONFIG_KEYS.FAVICON) || ""}
                  className="w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary"
                  placeholder="https://ejemplo.com/favicon.ico"
                />
                <p className="mt-2 text-sm text-bodydark">Icono mostrado en la pestaña del navegador</p>
              </div>

              <div>
                <label className="mb-3 block text-body font-medium text-black dark:text-white">
                  Banner Home (URL)
                </label>
                <input
                  id="bannerHome"
                  type="text"
                  defaultValue={getConfig(CONFIG_KEYS.BANNER_HOME) || ""}
                  className="w-full rounded border border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary"
                  placeholder="https://ejemplo.com/banner.jpg"
                />
                <p className="mt-2 text-sm text-bodydark">Banner principal en la página de inicio</p>
              </div>
            </div>

            {(getConfig(CONFIG_KEYS.LOGO_PRINCIPAL) || getConfig(CONFIG_KEYS.BANNER_HOME)) && (
              <div className="p-4 bg-gray-50 dark:bg-dark-2 rounded-lg">
                <h4 className="font-medium text-black dark:text-white mb-3">Vista Previa</h4>
                <div className="flex flex-wrap gap-4">
                  {getConfig(CONFIG_KEYS.LOGO_PRINCIPAL) && (
                    <div className="text-center">
                      <p className="text-sm text-bodydark mb-1">Logo Principal</p>
                      <img src={getConfig(CONFIG_KEYS.LOGO_PRINCIPAL)} alt="Logo" className="h-16 object-contain" />
                    </div>
                  )}
                  {getConfig(CONFIG_KEYS.BANNER_HOME) && (
                    <div className="text-center">
                      <p className="text-sm text-bodydark mb-1">Banner Home</p>
                      <img src={getConfig(CONFIG_KEYS.BANNER_HOME)} alt="Banner" className="h-24 object-cover rounded" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-8 mt-6 border-t border-gray-200 dark:border-dark-3">
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="inline-flex rounded bg-primary px-8 py-2.5 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
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