"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import { LOCALE_CONFIG } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale, loadingRates } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LOCALE_CONFIG[locale];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-2 transition-colors"
      >
        <Globe className={`h-4 w-4 ${loadingRates ? "animate-spin text-primary" : ""}`} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline font-medium text-dark dark:text-white">
          {current.label}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-dark-3 dark:bg-dark overflow-hidden">
          {Object.entries(LOCALE_CONFIG).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setLocale(key); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-dark-2
                ${locale === key
                  ? "bg-gray-50 text-primary font-semibold dark:bg-dark-2"
                  : "text-dark dark:text-white"
                }`}
            >
              <span className="text-base">{val.flag}</span>
              <span>{val.label}</span>
              <span className="ml-auto text-xs text-gray-400">{val.currency}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}