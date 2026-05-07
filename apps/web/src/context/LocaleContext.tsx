"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LOCALE_CONFIG, translateText, getExchangeRates, formatPrice } from "@/lib/i18n";

export type Currency = "MXN" | "USD";

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (text: string) => string;
  translateAsync: (text: string) => Promise<string>;
  convertPrice: (mxn: number) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  loadingRates: boolean;
  rates: Record<string, number>;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState("es");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, number>>({ MXN: 1 });
  const [loadingRates, setLoadingRates] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>("MXN");

  const config = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG["es"];

  // Determinar moneda por geolocalización usando header Vercel o Accept-Language
  useEffect(() => {
    const detectarMoneda = async () => {
      const saved = localStorage.getItem("currency") as Currency;
      if (saved === "MXN" || saved === "USD") {
        setCurrencyState(saved);
        return;
      }

      let paisISO = "";
      try {
        const res = await fetch("/api/geolocate", { method: "HEAD" });
        paisISO = (res.headers.get("x-vercel-ip-country") || "").toUpperCase();
      } catch {}

      // Por defecto MXN, solo cambiar a USD para países anglosajones
      const paisesUSD = ["US", "CA", "GB"];
      const predeterminada: Currency = paisesUSD.includes(paisISO) ? "USD" : "MXN";
      setCurrencyState(predeterminada);
    };

    detectarMoneda();
  }, []);

  // Cargar tasas al cambiar idioma
  useEffect(() => {
    setLoadingRates(true);
    getExchangeRates()
      .then(setRates)
      .finally(() => setLoadingRates(false));
  }, [locale]);

  // Restaurar idioma guardado en localStorage
  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved && LOCALE_CONFIG[saved]) setLocaleState(saved);
  }, []);

  // t() — traduce y cachea en el estado local
  const t = useCallback((text: string): string => {
    if (locale === "es") return text;
    const key = `${locale}:${text}`;
    if (translations[key]) return translations[key];

    // Traducir en segundo plano y actualizar estado
    translateText(text, config.langCode).then(translated => {
      setTranslations(prev => ({ ...prev, [key]: translated }));
    });

    return text; // muestra original mientras traduce
  }, [locale, translations, config.langCode]);

  // translateAsync — para cuando necesitas esperar la traducción
  const translateAsync = useCallback(async (text: string): Promise<string> => {
    if (locale === "es") return text;
    return translateText(text, config.langCode);
  }, [locale, config.langCode]);

  // convertPrice — convierte desde MXN
  const convertPrice = useCallback((mxn: number): string => {
    const rate = rates[currency] ?? 1;
    return formatPrice(mxn * rate, currency, config.numberLocale);
  }, [rates, currency, config]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("currency", newCurrency);
  };

  const setLocale = (newLocale: string) => {
    setTranslations({}); // limpiar caché al cambiar idioma
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <LocaleContext.Provider value={{
      locale,
      setLocale,
      t,
      translateAsync,
      convertPrice,
      currency,
      setCurrency,
      loadingRates,
      rates,
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de LocaleProvider");
  return ctx;
};