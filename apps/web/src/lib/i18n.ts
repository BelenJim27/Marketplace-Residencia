// Configuración de idiomas → moneda (solo MXN y USD)
export const LOCALE_CONFIG: Record<string, {
  label: string;
  flag: string;
  currency: string;
  numberLocale: string;
  langCode: string;
}> = {
  es: { label: "Español", flag: "🇲🇽", currency: "MXN", numberLocale: "es-MX", langCode: "es" },
  en: { label: "English", flag: "🇺🇸", currency: "USD", numberLocale: "en-US", langCode: "en" },
};

// Traducciones estáticas se importan desde ui-strings.ts
// No hay más llamadas a MyMemory — se usan lookup directo desde LocaleContext

// ─── Moneda con ExchangeRate-API ───────────────────────────────────────────
// Tasas estáticas de último recurso — solo se usan si NUNCA se ha podido
// contactar al backend. En producción el cron actualiza las tasas en BD cada hora.
const LAST_RESORT_RATES: Record<string, number> = {
  MXN: 1,
  USD: 1 / 17, // ~0.0588 MXN→USD (actualizar si el cron no responde)
};

let ratesCache: { data: Record<string, number>; ts: number } | null = null;
// Se mantiene la última tasa exitosa del backend para usar como stale fallback
let lastGoodRates: Record<string, number> | null = null;

/** Indica si la última respuesta usó tasas de respaldo (UI puede mostrar aviso) */
export let ratesAreFallback = false;

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  // caché de 10 minutos
  if (ratesCache && now - ratesCache.ts < 600_000) return ratesCache.data;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/tasas-cambio/actuales`);
    if (!res.ok) throw new Error('backend no disponible');
    const data = await res.json(); // { MXN: { USD } }
    const fromMXN = data?.MXN ?? {};
    const rates: Record<string, number> = { MXN: 1 };
    rates['USD'] = fromMXN['USD'] ?? LAST_RESORT_RATES['USD'];
    ratesCache = { data: rates, ts: now };
    lastGoodRates = rates;
    ratesAreFallback = false;
    return rates;
  } catch {
    ratesAreFallback = true;
    // Preferir la última tasa válida del backend sobre las hardcodeadas
    return lastGoodRates ?? LAST_RESORT_RATES;
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