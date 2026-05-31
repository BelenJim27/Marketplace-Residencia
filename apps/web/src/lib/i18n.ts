// Configuración de idiomas → moneda
export const LOCALE_CONFIG: Record<string, {
  label: string;
  flag: string;
  currency: string;
  numberLocale: string;
  langCode: string;
}> = {
  es: { label: "Español",  flag: "🇲🇽", currency: "MXN", numberLocale: "es-MX", langCode: "es" },
  en: { label: "English",  flag: "🇺🇸", currency: "USD", numberLocale: "en-US", langCode: "en" },
  fr: { label: "Français", flag: "🇫🇷", currency: "EUR", numberLocale: "fr-FR", langCode: "fr" },
  pt: { label: "Português",flag: "🇧🇷", currency: "BRL", numberLocale: "pt-BR", langCode: "pt" },
  zh: { label: "中文",      flag: "🇨🇳", currency: "CNY", numberLocale: "zh-CN", langCode: "zh" },
  ja: { label: "日本語",    flag: "🇯🇵", currency: "JPY", numberLocale: "ja-JP", langCode: "ja" },
};

// Traducciones estáticas se importan desde ui-strings.ts
// No hay más llamadas a MyMemory — se usan lookup directo desde LocaleContext

// ─── Moneda con ExchangeRate-API ───────────────────────────────────────────
let ratesCache: { data: Record<string, number>; ts: number } | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  // caché de 10 minutos
  if (ratesCache && now - ratesCache.ts < 600_000) return ratesCache.data;

  try {
    const KEY = process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY;
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${KEY}/latest/MXN`);
    const data = await res.json();
    const rates = data.conversion_rates || { MXN: 1 };
    ratesCache = { data: rates, ts: now };
    return ratesCache.data;
  } catch {
    return { MXN: 1 }; // si falla, sin conversión
  }
}

export function formatPrice(amount: number, currency: string, numberLocale: string): string {
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}