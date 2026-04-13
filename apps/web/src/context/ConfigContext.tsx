"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 0, 0";
}

const defaultPrimary = "#2d7a3e";
const defaultSecondary = "#8b5cf6";
const defaultAccent = "#10b981";

interface ConfigContextType {
  config: Record<string, string>;
  loading: boolean;
  refresh: () => Promise<void>;
  get: (key: string, fallback?: string) => string;
  refreshAndUpdate: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const applyColors = () => {
    if (typeof document === "undefined") return;
    const primary = config.color_primario || defaultPrimary;
    const secondary = config.color_secundario || defaultSecondary;
    const accent = config.color_acento || defaultAccent;
    const root = document.documentElement;
    root.style.setProperty("--color-primary", primary);
    root.style.setProperty("--color-secondary", secondary);
    root.style.setProperty("--color-accent", accent);
    root.style.setProperty("--color-primary-rgb", hexToRgb(primary));
    root.style.setProperty("--color-secondary-rgb", hexToRgb(secondary));
    root.style.setProperty("--color-accent-rgb", hexToRgb(accent));
  };

  const fetchConfig = async () => {
    try {
      const data = await api.configuracion.getSistema() as { clave: string; valor: string }[];
      const map: Record<string, string> = {};
      data.forEach((item) => {
        if (item.valor) map[item.clave] = item.valor;
      });
      setConfig(map);
      applyColors();
    } catch (error) {
      console.error("Error cargando config:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAndUpdate = async () => {
    setLoading(true);
    await fetchConfig();
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--color-primary", defaultPrimary);
    root.style.setProperty("--color-secondary", defaultSecondary);
    root.style.setProperty("--color-accent", defaultAccent);
    root.style.setProperty("--color-primary-rgb", hexToRgb(defaultPrimary));
    root.style.setProperty("--color-secondary-rgb", hexToRgb(defaultSecondary));
    root.style.setProperty("--color-accent-rgb", hexToRgb(defaultAccent));
  }, []);

  useEffect(() => {
    if (!loading) {
      applyColors();
    }
  }, [config, loading]);

  const get = (key: string, fallback = ""): string => config[key] || fallback;

  return (
    <ConfigContext.Provider value={{ config, loading, refresh: fetchConfig, get, refreshAndUpdate }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}