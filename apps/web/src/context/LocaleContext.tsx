"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { LOCALE_CONFIG, getExchangeRates, formatPrice } from "@/lib/i18n";
import { UI_TRANSLATIONS } from "@/i18n/ui-strings";
import commonES from "@/i18n/locales/es/common.json";
import commonEN from "@/i18n/locales/en/common.json";
import catalogES from "@/i18n/locales/es/catalog.json";
import catalogEN from "@/i18n/locales/en/catalog.json";
import checkoutES from "@/i18n/locales/es/checkout.json";
import checkoutEN from "@/i18n/locales/en/checkout.json";
import legalES from "@/i18n/locales/es/legal.json";
import legalEN from "@/i18n/locales/en/legal.json";

export type Currency = "MXN" | "USD" | "EUR" | "BRL" | "CNY" | "JPY";

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

const translations: Record<string, Record<string, string>> = {
  es: {
    ...commonES,
    ...catalogES,
    ...checkoutES,
    ...legalES,
  },
  en: {
    ...commonEN,
    ...catalogEN,
    ...checkoutEN,
    ...legalEN,
  },
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState("es");
  const [rates, setRates] = useState<Record<string, number>>({ MXN: 1 });
  const [loadingRates, setLoadingRates] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>("MXN");

  const config = LOCALE_CONFIG[locale] ?? LOCALE_CONFIG["es"];

  // Determinar moneda por geolocalización usando header Vercel o Accept-Language
  useEffect(() => {
    const detectarMoneda = async () => {
      const saved = localStorage.getItem("currency") as Currency;
      const VALID: Currency[] = ["MXN", "USD", "EUR", "BRL", "CNY", "JPY"];
      if (VALID.includes(saved)) {
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
      .then(r => setRates(r || { MXN: 1 }))
      .finally(() => setLoadingRates(false));
  }, [locale]);

  // Restaurar idioma guardado en localStorage
  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved && LOCALE_CONFIG[saved]) setLocaleState(saved);
  }, []);

  // t() — busca traducción en los JSONs por namespaces (catalog, checkout, legal) + UI_TRANSLATIONS fallback
  const t = useCallback((text: string): string => {
    if (locale === "es") return text;
    // Prioridad: JSONs por namespace > UI_TRANSLATIONS (legacy)
    return translations[locale]?.[text] ?? UI_TRANSLATIONS[locale]?.[text] ?? text;
  }, [locale]);

  // translateAsync — devuelve lo mismo que t() (no es async, pero mantiene la firma)
  const translateAsync = useCallback(async (text: string): Promise<string> => {
    if (locale === "es") return text;
    return translations[locale]?.[text] ?? UI_TRANSLATIONS[locale]?.[text] ?? text;
  }, [locale]);

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