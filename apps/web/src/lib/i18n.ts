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
// Tasas aproximadas de respaldo (1 MXN → X moneda) actualizadas manualmente
const FALLBACK_RATES: Record<string, number> = {
  MXN: 1,
  USD: 0.050,
  EUR: 0.046,
  BRL: 0.27,
  CNY: 0.36,
  JPY: 7.8,
};

let ratesCache: { data: Record<string, number>; ts: number } | null = null;

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  // caché de 10 minutos
  if (ratesCache && now - ratesCache.ts < 600_000) return ratesCache.data;

  try {
    const KEY = process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY;
    if (!KEY) {
      ratesCache = { data: FALLBACK_RATES, ts: now };
      return FALLBACK_RATES;
    }
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${KEY}/latest/MXN`);
    const data = await res.json();
    const rates = data.conversion_rates || FALLBACK_RATES;
    ratesCache = { data: rates, ts: now };
    return ratesCache.data;
  } catch {
    return FALLBACK_RATES;
  }
}

export function formatPrice(amount: number, currency: string, numberLocale: string): string {
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    currencyDisplay: currency === "MXN" ? "symbol" : "code",
    maximumFractionDigits: 2,
  }).format(amount);
}