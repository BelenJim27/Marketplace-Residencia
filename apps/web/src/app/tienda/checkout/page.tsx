"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media";
import Link from "next/link";
import { CheckCircle, ChevronRight, Truck, CreditCard, ShoppingBag, ArrowLeft, X, Lock, MapPin, Loader2 } from "lucide-react";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCheckout, CheckoutStep, OpcionAgregada } from "@/hooks/useCheckout";
import { getCookie } from "@/lib/cookies";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useLocale } from "@/context/LocaleContext";
import { formatPrice } from "@/lib/format-number";
import { usePaises } from "@/hooks/usePaises";
import { getStripe, isTestMode, isStripeConfigured } from "@/lib/stripe";
import { isPaypalConfigured, getPaypalClientId } from "@/lib/paypal";
import PaypalCheckoutButton from "@/components/PaypalCheckoutButton";

// Paleta de colores similar a productor/solicitar
const LIGHT_PALETTE = {
  green:  "#2E4A33",
  btnGreen: "#2E4A33",
  copper: "#C97A3E",
  amber:  "#C89B4A",
  cream:  "#F4F0E3",
  white:  "#FFFFFF",
  text:   "#2A2622",
  muted:  "#9A9590",
  border: "rgba(46,74,51,0.12)",
};

function usePalette() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  if (!isDark) return LIGHT_PALETTE;
  return {
    ...LIGHT_PALETTE,
    green:    "#7ec885",
    btnGreen: "#4a9e52",
    white:    "#1c2422",
    text:     "#e5e7eb",
    muted:    "#9ca3af",
    border:   "rgba(255,255,255,0.10)",
    cream:    "#1a2820",
  };
}

const PASO_INDEX: Record<CheckoutStep, number> = {
  direccion: 0,
  envio: 1,
  pago: 2,
  resumen: 3,
};

// ─── Estados USA ────────────────────────────────────────────────────────────

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "Washington D.C." },
];

// Estados de EE.UU. que prohíben o bloquean en la práctica el envío DTC de spirits
// importados (mezcal). Criterio: prohíbe DTC, es control state, o requiere licencia
// estatal que un exportador mexicano no puede obtener.
const ALCOHOL_RESTRICTED_STATES = new Set([
  "AL", "AR", "DE", "GA", "ID", "IA", "IN", "KS", "KY", "MA",
  "MI", "MN", "MS", "MT", "NC", "ND", "NH", "OH", "OK", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VA", "WA", "WV", "WY",
]);

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, isCliente } = useAuth();
  const { items } = useCarrito();
  const { paises, loading: paisesLoading } = usePaises("envio");

  const {
    paso,
    direcciones,
    direccionSeleccionada,
    setDireccionSeleccionada,
    mostrarFormDireccion,
    setMostrarFormDireccion,
    nuevaDireccion,
    setNuevaDireccion,
    guardarNuevaDireccion,
    gruposEnvio,
    opcionesAgregadas,
    nivelKey,
    setNivel,
    seleccionados,
    cotizandoLoading,
    cotizandoError,
    tieneAlcohol,
    totalEnvioMXN,
    avanzarPaso,
    retrocederPaso,
    prepararPago,
    errorMensaje,
    setErrorMensaje,
    totalConEnvio,
    taxAmount,
    taxBreakdown,
    obtenerUbicacionGPS,
    clientSecret,
    pedidoIdCreado,
    numeroOrdenCreado,
    metodoPago,
    setMetodoPago,
    paypalOrderId,
    capturePaypalOrder,
    cargando,
    solicitarProteccion,
    setSolicitarProteccion,
    costoProteccionEstimadoMXN,
  } = useCheckout();

  const { t, locale, rates } = useLocale();
  const COLOR_PALETTE = usePalette();

  // USD si locale='en' o país destino ≠ MX; de lo contrario MXN
  const pais_destino = direccionSeleccionada?.pais_iso2 ?? "MX";
  const displayCurrency: 'MXN' | 'USD' = (locale === 'en' || pais_destino !== 'MX') ? 'USD' : 'MXN';
  // Moneda de COBRO real (la que usa el backend para Stripe/PayPal): por PAÍS destino.
  // El backend cobra USD a destinos != MX (C-4); la moneda de la orden de PayPal debe
  // coincidir con la del SDK para que el botón renderice y capture correctamente.
  const chargeCurrency: 'MXN' | 'USD' = pais_destino !== 'MX' ? 'USD' : 'MXN';

  const PASOS = [
    { key: "direccion" as CheckoutStep, label: t('checkout_step_address'), icon: <Truck size={16} />, hint: t('checkout_step_destination') },
    { key: "envio"     as CheckoutStep, label: t('checkout_step_shipping'), icon: <Truck size={16} />, hint: t('checkout_step_delivery') },
    { key: "pago"      as CheckoutStep, label: t('checkout_step_payment'), icon: <CreditCard size={16} />, hint: t('checkout_step_method') },
    { key: "resumen"   as CheckoutStep, label: t('checkout_step_confirm'), icon: <CheckCircle size={16} />, hint: t('checkout_step_summary') },
  ];

  // Convierte un monto desde MXN a la moneda de visualización.
  // Si la tasa no está disponible se usa el fallback de LocaleContext (nunca 1:1).
  const convertFromMXN = (mxn: number): number => {
    const rate = rates[displayCurrency];
    if (!rate || rate <= 0) return mxn; // MXN: rate=1 siempre presente; USD: fallback 0.05
    return Math.round(mxn * rate * 100) / 100;
  };

  // Convierte un precio de cotización (en cualquier moneda) a displayCurrency.
  // Para moneda extranjera usa rates (MXN-base) para ir a MXN primero y luego a displayCurrency.
  const convertQuoteToDisplay = (precioTotal: number, moneda: string): number => {
    const mon = (moneda ?? 'MXN').toUpperCase();
    if (mon === 'MXN') return convertFromMXN(precioTotal);
    if (mon === displayCurrency) return Math.round(precioTotal * 100) / 100;
    // rates[mon] = cuántos MON por 1 MXN (ej. rates['USD']=0.0588 → 1 MXN = 0.0588 USD)
    const rateToMXN = rates[mon];
    if (rateToMXN && rateToMXN > 0) return convertFromMXN(precioTotal / rateToMXN);
    return convertFromMXN(precioTotal); // fallback: asumir MXN
  };

  // Returns the total shipping amount in display currency (sum of all producer groups)
  const getShippingDisplayAmount = (): number | null => {
    if (Object.keys(seleccionados).length === 0) return null;
    return convertFromMXN(totalEnvioMXN);
  };

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Ref para evitar que cambios de referencia en prepararPago (causados por ratesMXN async)
  // redisparen el efecto de pago y creen pedidos duplicados.
  const prepararPagoRef = useRef(prepararPago);
  useEffect(() => { prepararPagoRef.current = prepararPago; });

  const stripeConfigured = isStripeConfigured();
  const stripePromise = stripeConfigured ? getStripe() : null;

  const handleUsarGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const campos = await obtenerUbicacionGPS();
      setNuevaDireccion((prev) => ({ ...prev, ...campos }));
    } catch (err: any) {
      setGpsError(err.message ?? "No se pudo obtener la ubicación.");
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || isAuthenticated) return;
    router.push("/auth/sign-in?redirect=/tienda/checkout");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && items.length === 0) {
      router.push("/tienda/carrito");
    }
  }, [items.length, isAuthenticated, authLoading, router]);

  // Crear el PaymentIntent/PayPal Order al entrar al paso "pago" (idempotente).
  // prepararPago se accede vía ref para que cambios de referencia (p.ej. cuando ratesMXN
  // se carga de forma asíncrona) no disparen este efecto y creen pedidos duplicados.
  useEffect(() => {
    if (paso === "pago" && Object.keys(seleccionados).length > 0 && direccionSeleccionada) {
      if (metodoPago === 'stripe' && !clientSecret) {
        prepararPagoRef.current().catch(() => {});
      } else if (metodoPago === 'paypal' && !paypalOrderId) {
        prepararPagoRef.current().catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, clientSecret, paypalOrderId, metodoPago, seleccionados, direccionSeleccionada]);

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin text-green-600" aria-label="Cargando" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('checkout_loading')}</p>
        </div>
      </div>
    );
  }

  const pasoActualIndex = PASO_INDEX[paso];

  const enElements = paso === "pago" || paso === "resumen";

  const btnDisabled =
    !isCliente ||
    cargando ||
    (paso === "pago" && (
      (metodoPago === 'stripe' && !clientSecret) ||
      (metodoPago === 'paypal' && !paypalOrderId)
    ));

  const mainContent = (
    <div style={{ position: "relative" }}>

      {/* ── Agavenuevo lado izquierdo ────────────────────────────── */}
      {["5%","18%","31%","44%","57%","70%","83%"].map((top, i) => (
        <div key={`al-${i}`} aria-hidden className="hidden md:block" style={{ position: "absolute", top, left: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
          <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

      {/* ── Agavenuevo lado derecho ──────────────────────────────── */}
      {["5%","18%","31%","44%","57%","70%","83%"].map((top, i) => (
        <div key={`ar-${i}`} aria-hidden className="hidden md:block" style={{ position: "absolute", top, right: 0, width: 110, height: 110, zIndex: 2, pointerEvents: "none" }}>
          <Image src="/fotos/agavenuevo.png" alt="" width={110} height={110} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

    <main style={{ position: "relative", zIndex: 1, maxWidth: "1000px", margin: "0 auto", padding: "48px 16px 40px", fontFamily: "'Manrope', 'DM Sans', sans-serif" }}>
      {/* Gold stripe top */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${COLOR_PALETTE.copper}, ${COLOR_PALETTE.amber}, ${COLOR_PALETTE.copper})`, borderRadius: "2px 2px 0 0", marginBottom: "0" }} />

      {/* Header */}
      <div style={{ background: "#2E4A33", borderRadius: "0 0 16px 16px", padding: "clamp(20px, 3vw, 32px)", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
        <p style={{ fontFamily: "ui-monospace", color: COLOR_PALETTE.copper, fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 8px" }}>
          {t('checkout_title')}
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: COLOR_PALETTE.cream, fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 400, margin: "0 0 6px", lineHeight: 1.2 }}>
          {t('checkout_your_order')}
        </h1>
        <p style={{ fontFamily: "'Manrope', 'DM Sans', sans-serif", color: "rgba(244,240,227,0.70)", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
          {t('checkout_complete_steps')}
        </p>
      </div>

      {isAuthenticated && !isCliente && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <p style={{ color: "#DC2626", fontSize: "14px", margin: 0, fontWeight: 600 }}>
            Solo los clientes pueden realizar compras.
          </p>
        </div>
      )}

      <div data-tour="checkout-stepper" className="mb-8">
        {/* Stepper — Premium con colores biocultural */}
        <div className="space-y-4">
          <div className="flex items-stretch justify-between gap-2 relative">
            {/* Línea conectora de fondo */}
            <div style={{ position: "absolute", top: "20px", left: "0", right: "0", height: "2px", background: COLOR_PALETTE.border, zIndex: 0 }} />

            {PASOS.map((p, idx) => (
              <div key={p.key} className="flex flex-1 flex-col items-center gap-3 relative" style={{ zIndex: 1 }}>
                {/* Círculo del paso */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    transition: "all 200ms ease",
                    background:
                      idx < pasoActualIndex
                        ? COLOR_PALETTE.green
                        : idx === pasoActualIndex
                        ? COLOR_PALETTE.white
                        : "#E5E7EB",
                    color:
                      idx < pasoActualIndex
                        ? "#ffffff"
                        : idx === pasoActualIndex
                        ? COLOR_PALETTE.copper
                        : "#9CA3AF",
                    border:
                      idx === pasoActualIndex
                        ? `2px solid ${COLOR_PALETTE.copper}`
                        : "2px solid transparent",
                    boxShadow: idx === pasoActualIndex ? `0 0 0 3px ${COLOR_PALETTE.amber}20` : "none",
                  }}
                >
                  {idx < pasoActualIndex ? (
                    <CheckCircle size={20} color="#ffffff" />
                  ) : (
                    <span style={{ fontSize: "14px" }}>{idx + 1}</span>
                  )}
                </div>

                {/* Etiquetas */}
                <div className="text-center">
                  <p style={{ fontFamily: "'Manrope', 'DM Sans', sans-serif", fontSize: "12px", fontWeight: 700, color: COLOR_PALETTE.copper, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0", lineHeight: 1 }}>
                    {p.hint}
                  </p>
                  <p style={{ fontFamily: "'Manrope', 'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: COLOR_PALETTE.green, margin: "2px 0 0", lineHeight: 1 }} className="hidden sm:block">
                    {p.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Indicador de progreso: Texto y barra */}
          <div className="flex items-center justify-between pt-2">
            <p style={{ fontFamily: "'Manrope', 'DM Sans', sans-serif", fontSize: "12px", color: COLOR_PALETTE.green, fontWeight: 600 }}>
              {locale === 'en' ? `Step ${pasoActualIndex + 1} of ${PASOS.length}` : `Paso ${pasoActualIndex + 1} de ${PASOS.length}`}
            </p>
            <p style={{ fontFamily: "'Manrope', 'DM Sans', sans-serif", fontSize: "12px", color: COLOR_PALETTE.copper, fontWeight: 600 }}>
              {Math.round(((pasoActualIndex + 1) / PASOS.length) * 100)}%
            </p>
          </div>
          <div style={{ height: "3px", background: COLOR_PALETTE.border, borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${COLOR_PALETTE.green}, ${COLOR_PALETTE.copper}, ${COLOR_PALETTE.amber})`,
                transition: "width 300ms ease-out",
                width: `${((pasoActualIndex + 1) / PASOS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Panel principal — 7 cols en desktop, full en mobile */}
        <div className="lg:col-span-7">
          <div style={{ borderRadius: "12px", background: `linear-gradient(135deg, ${COLOR_PALETTE.white} 0%, ${COLOR_PALETTE.cream}08 100%)`, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${COLOR_PALETTE.border}` }}>

            {/* PASO 1: Dirección */}
            {paso === "direccion" && (
              <div data-tour="checkout-address">
                <DireccionStep
                  direcciones={direcciones}
                  direccionSeleccionada={direccionSeleccionada}
                  setDireccionSeleccionada={setDireccionSeleccionada}
                  mostrarFormDireccion={mostrarFormDireccion}
                  setMostrarFormDireccion={setMostrarFormDireccion}
                  nuevaDireccion={nuevaDireccion}
                  setNuevaDireccion={setNuevaDireccion}
                  guardarNuevaDireccion={guardarNuevaDireccion}
                  paises={paises}
                  paisesLoading={paisesLoading}
                  handleUsarGPS={handleUsarGPS}
                  gpsLoading={gpsLoading}
                  gpsError={gpsError}
                  tieneAlcohol={tieneAlcohol}
                />
              </div>
            )}

            {/* PASO 2: Envío */}
            {paso === "envio" && (
              <div data-tour="checkout-shipping">
                <EnvioStep
                  grupos={gruposEnvio}
                  opciones={opcionesAgregadas}
                  nivelKey={nivelKey}
                  setNivel={setNivel}
                  cotizandoLoading={cotizandoLoading}
                  cotizandoError={cotizandoError}
                  tieneAlcohol={tieneAlcohol}
                  convertQuotePrice={convertQuoteToDisplay}
                  displayCurrency={displayCurrency}
                  solicitarProteccion={solicitarProteccion}
                  setSolicitarProteccion={setSolicitarProteccion}
                  costoProteccionEstimado={convertFromMXN(costoProteccionEstimadoMXN)}
                />
              </div>
            )}

            {/* PASOS 3 & 4: Pago y Resumen */}
            {enElements && (
              <>
                {/* Selector de método de pago (solo en paso "pago") */}
                {paso === "pago" && (isStripeConfigured() || isPaypalConfigured()) && (
                  <div data-tour="checkout-payment" className="mb-8">
                    <div className="flex items-center gap-2.5 mb-6">
                      <div style={{ width: "4px", height: "24px", background: `linear-gradient(180deg, ${COLOR_PALETTE.green}, ${COLOR_PALETTE.copper})`, borderRadius: "2px" }} />
                      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 400, color: COLOR_PALETTE.green, margin: 0 }}>{t('checkout_payment_method_title')}</h3>
                    </div>
                    <div className={`grid gap-4 ${isStripeConfigured() && isPaypalConfigured() ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {isStripeConfigured() && (
                        <button
                          onClick={() => {
                            setMetodoPago('stripe');
                            setErrorMensaje(null);
                          }}
                          aria-pressed={metodoPago === 'stripe'}
                          aria-label="Seleccionar pago con tarjeta de crédito o débito (Visa, Mastercard, American Express)"
                          style={{
                            border: `2px solid ${metodoPago === 'stripe' ? COLOR_PALETTE.green : '#E5E7EB'}`,
                            background: metodoPago === 'stripe' ? `${COLOR_PALETTE.green}10` : 'transparent',
                            borderRadius: "12px",
                            padding: "16px",
                            textAlign: "left",
                            transition: "all 150ms ease",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            if (metodoPago !== 'stripe') {
                              e.currentTarget.style.borderColor = '#D1D5DB';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (metodoPago !== 'stripe') {
                              e.currentTarget.style.borderColor = '#E5E7EB';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "4px",
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  border: `2px solid ${metodoPago === 'stripe' ? COLOR_PALETTE.green : '#D1D5DB'}`,
                                  background: metodoPago === 'stripe' ? COLOR_PALETTE.green : 'transparent',
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  transition: "all 200ms ease",
                                }}
                              >
                                {metodoPago === 'stripe' && <CheckCircle size={12} color="#ffffff" fill="#ffffff" />}
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 600, color: COLOR_PALETTE.green, margin: 0 }}>{t('checkout_payment_credit_card')}</h4>
                                <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0", lineHeight: 1.4 }}>{t('checkout_payment_credit_card_types')}</p>
                              </div>
                            </div>
                            <Lock size={16} color={COLOR_PALETTE.green} style={{ flexShrink: 0 }} />
                          </div>
                        </button>
                      )}

                      {isPaypalConfigured() && (
                        <button
                          onClick={() => {
                            setMetodoPago('paypal');
                            setErrorMensaje(null);
                          }}
                          aria-pressed={metodoPago === 'paypal'}
                          aria-label="Seleccionar pago con PayPal - Rápido y seguro con tu cuenta PayPal"
                          style={{
                            border: `2px solid ${metodoPago === 'paypal' ? COLOR_PALETTE.copper : '#E5E7EB'}`,
                            background: metodoPago === 'paypal' ? `${COLOR_PALETTE.amber}15` : 'transparent',
                            borderRadius: "12px",
                            padding: "16px",
                            textAlign: "left",
                            transition: "all 150ms ease",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            if (metodoPago !== 'paypal') {
                              e.currentTarget.style.borderColor = '#D1D5DB';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (metodoPago !== 'paypal') {
                              e.currentTarget.style.borderColor = '#E5E7EB';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                style={{
                                  marginTop: "4px",
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  border: `2px solid ${metodoPago === 'paypal' ? COLOR_PALETTE.copper : '#D1D5DB'}`,
                                  background: metodoPago === 'paypal' ? COLOR_PALETTE.copper : 'transparent',
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  transition: "all 200ms ease",
                                }}
                              >
                                {metodoPago === 'paypal' && <CheckCircle size={12} color="#ffffff" fill="#ffffff" />}
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 600, color: COLOR_PALETTE.green, margin: 0 }}>PayPal</h4>
                                <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0", lineHeight: 1.4 }}>{t('checkout_payment_paypal_secure')}</p>
                              </div>
                            </div>
                            <Lock size={16} color={COLOR_PALETTE.copper} style={{ flexShrink: 0 }} />
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Información de beneficios — Compacta */}
                    {metodoPago === 'stripe' && isStripeConfigured() && (
                      <div style={{ marginTop: "12px", borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.green}33`, background: `${COLOR_PALETTE.green}08`, padding: "12px", fontSize: "12px", color: COLOR_PALETTE.green }}>
                        <div className="flex gap-2">
                          <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: COLOR_PALETTE.green }} />
                          <span>{t('security_stripe_message')}</span>
                        </div>
                      </div>
                    )}

                    {metodoPago === 'paypal' && isPaypalConfigured() && (
                      <div style={{ marginTop: "12px", borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.copper}33`, background: `${COLOR_PALETTE.copper}08`, padding: "12px", fontSize: "12px", color: COLOR_PALETTE.copper }}>
                        <div className="flex gap-2">
                          <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: COLOR_PALETTE.copper }} />
                          <span>{t('security_paypal_message')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Flujo Stripe */}
                {metodoPago === 'stripe' && (
                  <>
                    {!stripeConfigured && (
                      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        Stripe no está configurado. Define <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
                      </p>
                    )}
                    {stripeConfigured && !clientSecret && (
                      <div className="space-y-4">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.green}33`, background: `${COLOR_PALETTE.green}08`, padding: "24px", fontSize: "14px", color: COLOR_PALETTE.green }} role="status" aria-live="polite">
                          <Loader2 size={16} className="animate-spin" aria-label="Cargando" />
                          {t("Preparando el formulario de pago con Stripe…")}
                        </div>
                        <div style={{ borderRadius: "8px", background: `${COLOR_PALETTE.green}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.green, border: `1px solid ${COLOR_PALETTE.green}33` }}>
                          <div className="flex gap-2">
                            <Lock size={16} className="shrink-0" aria-hidden="true" style={{ color: COLOR_PALETTE.green }} />
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>{t("Pago protegido por Stripe")}</p>
                              <p style={{ marginTop: "4px", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0" }}>{t("Tu tarjeta nunca se almacena en nuestros servidores. Stripe maneja la encriptación de extremo a extremo.")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {stripeConfigured && clientSecret && stripePromise && (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          locale: (locale === "en" ? "en" : "es") as any,
                          appearance: { theme: "stripe", variables: { colorPrimary: "#16a34a" } },
                          fonts: [{
                            family: "text-security-disc",
                            src: "url(https://cdn.jsdelivr.net/npm/text-security@1.1.0/dist/text-security-disc.woff2)",
                            weight: "400",
                          }],
                        }}
                      >
                        <PagoYResumen
                          paso={paso}
                          items={items}
                          direccionSeleccionada={direccionSeleccionada}
                          gruposEnvio={gruposEnvio}
                          seleccionados={seleccionados}
                          pedidoId={pedidoIdCreado}
                          clientSecret={clientSecret!}
                          onError={setErrorMensaje}
                          convertToDisplay={convertFromMXN}
                          convertQuotePrice={convertQuoteToDisplay}
                          displayCurrency={displayCurrency}
                          shippingDisplayAmount={getShippingDisplayAmount()}
                          locale={locale}
                          token={getCookie("token")}
                          numeroOrden={numeroOrdenCreado}
                          solicitarProteccion={solicitarProteccion}
                          proteccionMontoDisplay={convertFromMXN(costoProteccionEstimadoMXN)}
                        />
                      </Elements>
                    )}
                  </>
                )}

                {/* Flujo PayPal */}
                {metodoPago === 'paypal' && (
                  <>
                    {!isPaypalConfigured() && (
                      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        PayPal no está configurado. Define <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>.
                      </p>
                    )}
                    {isPaypalConfigured() && !paypalOrderId && (
                      <div className="space-y-4">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.copper}33`, background: `${COLOR_PALETTE.copper}08`, padding: "24px", fontSize: "14px", color: COLOR_PALETTE.copper }} role="status" aria-live="polite">
                          <Loader2 size={16} className="animate-spin" aria-label="Cargando" />
                          {t("Iniciando sesión con PayPal…")}
                        </div>
                        <div style={{ borderRadius: "8px", background: `${COLOR_PALETTE.copper}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.copper, border: `1px solid ${COLOR_PALETTE.copper}33` }}>
                          <div className="flex gap-2">
                            <Lock size={16} className="shrink-0" aria-hidden="true" style={{ color: COLOR_PALETTE.copper }} />
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>{t("PayPal maneja tu información bancaria")}</p>
                              <p style={{ marginTop: "4px", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0" }}>{t("Te redirigiremos a PayPal. Nunca vemos tu número de tarjeta ni datos bancarios.")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isPaypalConfigured() && paypalOrderId && paso === "pago" && (
                      <div className="space-y-4">
                        <div style={{ borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.copper}33`, background: `${COLOR_PALETTE.copper}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.copper }}>
                          <p style={{ marginBottom: "8px", fontWeight: 600, margin: 0 }}>{t("Completa tu pago en PayPal")}</p>
                          <p style={{ fontSize: "12px", marginTop: "4px", lineHeight: 1.4 }}>{t("Haz clic en el botón abajo. Te redirigiremos a PayPal de forma segura para que confirmes tu pago.")}</p>
                        </div>
                        <PaypalCheckoutButton
                          orderId={paypalOrderId}
                          onCapture={capturePaypalOrder}
                          onError={setErrorMensaje}
                          disabled={cargando}
                        />
                      </div>
                    )}
                    {isPaypalConfigured() && paypalOrderId && paso === "resumen" && (
                      <div className="space-y-4">
                        <PagoYResumenPaypal
                          items={items}
                          direccionSeleccionada={direccionSeleccionada}
                          gruposEnvio={gruposEnvio}
                          seleccionados={seleccionados}
                          pedidoId={pedidoIdCreado}
                          convertToDisplay={convertFromMXN}
                          convertQuotePrice={convertQuoteToDisplay}
                          displayCurrency={displayCurrency}
                          shippingDisplayAmount={getShippingDisplayAmount()}
                          locale={locale}
                          solicitarProteccion={solicitarProteccion}
                          proteccionMontoDisplay={convertFromMXN(costoProteccionEstimadoMXN)}
                        />
                        <div className="space-y-4">
                          <div style={{ borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.copper}33`, background: `${COLOR_PALETTE.copper}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.copper }}>
                            <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{t("Completa tu pago en PayPal")}</p>
                            <p style={{ fontSize: "12px", margin: 0, lineHeight: 1.4 }}>{t("Haz clic en el botón de abajo para confirmar tu pago de forma segura.")}</p>
                          </div>
                          <PaypalCheckoutButton
                            orderId={paypalOrderId}
                            onCapture={capturePaypalOrder}
                            onError={setErrorMensaje}
                            disabled={cargando}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Error */}
            {errorMensaje && (
              <div aria-live="polite" role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ whiteSpace: "pre-line" }}>{errorMensaje}</span>
                <button
                  onClick={() => setErrorMensaje(null)}
                  style={{ flexShrink: 0, fontSize: "11px", fontWeight: "700", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
                >
                  Intentar de nuevo
                </button>
              </div>
            )}

            {/* Botones de navegación mejorados */}
            <div style={{ marginTop: "32px", display: "flex", gap: "12px", justifyContent: "space-between" }}>
              {paso !== "direccion" ? (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    onClick={retrocederPaso}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "12px",
                      paddingLeft: "20px",
                      paddingRight: "20px",
                      paddingTop: "12px",
                      paddingBottom: "12px",
                      fontSize: "14px",
                      fontWeight: 500,
                      border: `1px solid ${COLOR_PALETTE.border}`,
                      color: COLOR_PALETTE.green,
                      background: "transparent",
                      cursor: "pointer",
                      transition: "all 200ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = COLOR_PALETTE.green;
                      e.currentTarget.style.background = `${COLOR_PALETTE.green}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = COLOR_PALETTE.border;
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <ArrowLeft size={16} />
                    {t('checkout_button_back')}
                  </button>
                  {(!clientSecret && !paypalOrderId) && (
                    <button
                      onClick={() => router.push('/tienda/carrito')}
                      style={{ fontSize: "13px", color: COLOR_PALETTE.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "4px 8px" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = COLOR_PALETTE.muted; }}
                    >
                      {t('checkout_button_cancel')}
                    </button>
                  )}
                </div>
              ) : (!clientSecret && !paypalOrderId) ? (
                <button
                  onClick={() => router.push('/tienda/carrito')}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "12px",
                    paddingLeft: "20px",
                    paddingRight: "20px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "14px",
                    fontWeight: 500,
                    border: `1px solid ${COLOR_PALETTE.border}`,
                    color: COLOR_PALETTE.muted,
                    background: "transparent",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#ef4444";
                    e.currentTarget.style.color = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLOR_PALETTE.border;
                    e.currentTarget.style.color = COLOR_PALETTE.muted;
                  }}
                >
                  <X size={16} />
                  {t('checkout_button_cancel')}
                </button>
              ) : <div />}

              {paso !== "resumen" && (
                <button
                  onClick={avanzarPaso}
                  disabled={btnDisabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "12px",
                    paddingLeft: "32px",
                    paddingRight: "32px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    transition: "all 200ms ease",
                    border: "none",
                    cursor: btnDisabled ? "not-allowed" : "pointer",
                    background: btnDisabled ? "#D1D5DB" : COLOR_PALETTE.btnGreen,
                    color: btnDisabled ? "#6B7280" : "#ffffff",
                    boxShadow: btnDisabled ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    if (!btnDisabled) {
                      e.currentTarget.style.background = COLOR_PALETTE.green;
                      e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                      e.currentTarget.style.opacity = "0.9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!btnDisabled) {
                      e.currentTarget.style.background = COLOR_PALETTE.green;
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                      e.currentTarget.style.opacity = "1";
                    }
                  }}
                >
                  {cargando ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={18} />}
                  {cargando ? t('checkout_processing') : t('checkout_button_continue')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resumen lateral — Sticky en desktop, scroll en mobile */}
        <div className="lg:col-span-5">
          <div style={{ position: "relative" }} className="lg:sticky lg:top-8">
            <div style={{ borderRadius: "12px", background: `linear-gradient(135deg, ${COLOR_PALETTE.white} 0%, ${COLOR_PALETTE.amber}04 100%)`, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: `1px solid ${COLOR_PALETTE.border}`, backdropFilter: "blur(4px)" }}>
              <div className="flex items-center gap-2.5 mb-6">
                <div style={{ width: "4px", height: "24px", background: `linear-gradient(180deg, ${COLOR_PALETTE.copper}, ${COLOR_PALETTE.amber})`, borderRadius: "2px" }} />
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 400, color: COLOR_PALETTE.green, margin: 0 }}>{t('checkout_summary_section')}</h3>
              </div>
            <div style={{ display: "space-y-2", borderBottom: `1px solid ${COLOR_PALETTE.border}`, paddingBottom: "16px", fontSize: "14px" }}>
              {items.slice(0, 3).map((item) => {
                const itemTotal = Number(item.precio_base) * item.cantidad;
                const displayAmount = convertFromMXN(itemTotal);
                return (
                  <div key={item.id_producto} style={{ display: "flex", justifyContent: "space-between", color: COLOR_PALETTE.green, marginBottom: "8px", fontSize: "13px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>{item.nombre} x{item.cantidad}</span>
                    <span style={{ fontWeight: 500 }}>${formatPrice(displayAmount, { showCurrency: false })}</span>
                  </div>
                );
              })}
              {items.length > 3 && (
                <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "8px" }}>+{items.length - 3} {locale === 'en' ? 'more item(s)' : 'producto(s) más'}</p>
              )}
            </div>
            <div style={{ display: "space-y-2", paddingTop: "12px", paddingBottom: "12px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR_PALETTE.green, marginBottom: "8px" }}>
                <span>{t('checkout_summary_subtotal')}</span>
                <span style={{ fontWeight: 500 }}>
                  ${formatPrice(convertFromMXN(Number(items.reduce((a, i) => a + Number(i.precio_base) * i.cantidad, 0))), { showCurrency: false })}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: COLOR_PALETTE.green, marginBottom: "8px" }}>
                <span>{t('checkout_summary_shipping')}</span>
                <span style={{ fontWeight: 500 }}>
                  {nivelKey ? `$${formatPrice(getShippingDisplayAmount() ?? 0, { showCurrency: false })} ${displayCurrency}` : '—'}
                </span>
              </div>
              {solicitarProteccion && costoProteccionEstimadoMXN > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: COLOR_PALETTE.green, marginBottom: "8px" }}>
                  <span>{t('checkout_summary_insurance')}</span>
                  <span style={{ fontWeight: 500 }}>
                    ~${formatPrice(convertFromMXN(costoProteccionEstimadoMXN), { showCurrency: false })} {displayCurrency}
                  </span>
                </div>
              )}
              {/* Impuestos: solo para MX (IVA aplica). Para international los impuestos
                  se liquidan en aduana; nunca mostrar breakdown fiscal de otro intent. */}
              {pais_destino === "MX" && taxBreakdown.length > 0 &&
                taxBreakdown.map((line, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", color: COLOR_PALETTE.green, marginBottom: "8px" }}>
                    <span>{line.nombre} ({(line.tasa * 100).toFixed(0)}%)</span>
                    <span style={{ fontWeight: 500 }}>
                      ${formatPrice(convertFromMXN(line.monto), { showCurrency: false })} {displayCurrency}
                    </span>
                  </div>
                ))}
              {/* Nota fiscal */}
              {pais_destino === "MX" ? (
                <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "4px 0 8px 0" }}>
                  {t("checkout_tax_included_note")}
                </p>
              ) : pais_destino === "US" ? (
                <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "4px 0 8px 0" }}>
                  {t("checkout_customs_note")}
                </p>
              ) : null}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${COLOR_PALETTE.border}`, paddingTop: "12px" }}>
              <span style={{ fontWeight: 600, color: COLOR_PALETTE.green }}>{t('checkout_summary_total')}</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: COLOR_PALETTE.copper }}>
                {`$${formatPrice(convertFromMXN(totalConEnvio + taxAmount), { showCurrency: false })} ${displayCurrency}`}
              </span>
            </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    </div>
  );

  // Wrap with PayPal provider if configured
  if (isPaypalConfigured()) {
    return (
      <PayPalScriptProvider
        options={{
          clientId: getPaypalClientId(),
          // La moneda de la orden la decide el backend por país destino (C-4): USD para
          // destinos != MX, MXN para México. El SDK debe usar la misma para renderizar/capturar.
          currency: chargeCurrency,
          intent: 'capture',
        }}
      >
        {mainContent}
      </PayPalScriptProvider>
    );
  }

  return mainContent;
}

/* ---------- Sub-componentes ---------- */

function DireccionStep({
  direcciones,
  direccionSeleccionada,
  setDireccionSeleccionada,
  mostrarFormDireccion,
  setMostrarFormDireccion,
  nuevaDireccion,
  setNuevaDireccion,
  guardarNuevaDireccion,
  paises,
  paisesLoading,
  handleUsarGPS,
  gpsLoading,
  gpsError,
  tieneAlcohol,
}: any) {
  const { t } = useLocale();
  const COLOR_PALETTE = usePalette();
  const [formErrors, setFormErrors] = useState<{
    nombre_destinatario?: string;
    telefono?: string;
    cp?: string;
    linea_1?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    ciudad?: string;
    estado?: string;
  }>({});
  const NOMBRE_REGEX_CHECKOUT = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'\-]/g;

  const handleGuardar = () => {
    const errors: typeof formErrors = {};
    const req = t("address_validation_required");

    // Format validations
    const nombre = (nuevaDireccion.nombre_destinatario ?? "").trim();
    if (nombre.length > 0 && nombre.length < 2)
      errors.nombre_destinatario = t("address_validation_name");
    const tel = (nuevaDireccion.telefono ?? "").replace(/\D/g, "");
    if (tel.length > 0 && tel.length !== 10) errors.telefono = t("address_validation_phone");
    const cp = nuevaDireccion.codigo_postal ?? "";
    if (nuevaDireccion.pais_iso2 === "MX" && cp && !/^\d{5}$/.test(cp)) errors.cp = t("address_validation_postal_mx");
    if (nuevaDireccion.pais_iso2 === "US" && cp && !/^\d{5}(-\d{4})?$/.test(cp)) errors.cp = t("address_validation_postal_us");

    // Required field validations
    if (nuevaDireccion.pais_iso2 === "US") {
      if (!nuevaDireccion.linea_1?.trim()) errors.linea_1 = req;
    } else {
      if (!nuevaDireccion.calle?.trim()) errors.calle = req;
      if (!nuevaDireccion.numero?.trim()) errors.numero = req;
      if (!nuevaDireccion.colonia?.trim()) errors.colonia = req;
    }
    if (!nuevaDireccion.ciudad?.trim()) errors.ciudad = req;
    if (!nuevaDireccion.estado?.trim()) errors.estado = req;
    if (!nuevaDireccion.codigo_postal?.trim() && !errors.cp) errors.cp = req;

    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    guardarNuevaDireccion();
  };

  const inputCls = (err?: string) =>
    `w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none transition-all dark:bg-gray-800 dark:text-white ${err ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-gray-300 focus:border-green-500 focus:ring-green-500/20 dark:border-gray-600"}`;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("address_form_title")}</h2>

      {direcciones.length > 0 && !mostrarFormDireccion && (
        <div className="mb-6 space-y-3">
          {direcciones.map((dir: any, idx: number) => (
            <label
              key={idx}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-5 transition-all duration-200
                ${direccionSeleccionada === dir ? "border-green-600 bg-green-50 shadow-md dark:bg-green-900/20" : "border-gray-200 hover:border-green-300 hover:shadow-sm dark:border-gray-700"}`}
            >
              <input
                type="radio"
                name="direccion"
                className="mt-1 accent-green-600"
                checked={direccionSeleccionada === dir}
                onChange={() => setDireccionSeleccionada(dir)}
              />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium capitalize">{dir.tipo || t("Dirección")}</p>
                {dir.nombre_destinatario && <p className="text-xs text-gray-500">{t("Para")}: {dir.nombre_destinatario}</p>}
                <p>
                  {dir.es_internacional ? (
                    <>
                      {dir.linea_1}
                      {dir.linea_2 && <span>, {dir.linea_2}</span>}
                    </>
                  ) : (
                    <>
                      {dir.calle} {dir.numero}
                      {dir.colonia && <span>, {dir.colonia}</span>}
                    </>
                  )}
                </p>
                <p className="text-gray-500">
                  {[dir.ciudad, dir.estado, dir.codigo_postal, dir.pais_iso2].filter(Boolean).join(", ")}
                </p>
                {dir.es_internacional && <span className="text-xs text-blue-600 dark:text-blue-400">{t("Internacional")}</span>}
              </div>
            </label>
          ))}
          <button
            onClick={() => setMostrarFormDireccion(true)}
            className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors dark:text-green-400 dark:hover:text-green-300"
          >
            {t("address_form_add_another")}
          </button>
        </div>
      )}

      {mostrarFormDireccion && (
        <div className="space-y-4">
          {/* País */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("address_form_country")}</label>
            <select
              value={nuevaDireccion.pais_iso2 || "MX"}
              onChange={(e) => {
                setFormErrors({});
                setNuevaDireccion((p: any) => ({
                  ...p,
                  pais_iso2: e.target.value,
                  es_internacional: e.target.value !== "MX",
                }));
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="MX">🇲🇽 {t("México")}</option>
              <option value="US">🇺🇸 {t("Estados Unidos")}</option>
            </select>
          </div>

          {/* Formulario US — 2 columnas */}
          {nuevaDireccion.pais_iso2 === "US" ? (
            <>
              {/* Fila 1: Nombre | Teléfono */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_fullname")}</label>
                  <input
                    type="text"
                    value={nuevaDireccion.nombre_destinatario || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(NOMBRE_REGEX_CHECKOUT, "");
                      setNuevaDireccion((p: any) => ({ ...p, nombre_destinatario: val }));
                      setFormErrors((prev) => ({ ...prev, nombre_destinatario: undefined }));
                    }}
                    placeholder="John Doe"
                    className={inputCls(formErrors.nombre_destinatario)}
                  />
                  {formErrors.nombre_destinatario && <p aria-live="polite" className="mt-1 text-xs text-red-500">{formErrors.nombre_destinatario}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_phone")}</label>
                  <input
                    type="tel"
                    value={nuevaDireccion.telefono || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setNuevaDireccion((p: any) => ({ ...p, telefono: val }));
                      setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                    }}
                    placeholder="10 digits"
                    maxLength={10}
                    className={inputCls(formErrors.telefono)}
                  />
                  {formErrors.telefono && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.telefono}</p>}
                </div>
              </div>

              {/* Fila 2: Línea 1 (full width) */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_line1")}</label>
                <input
                  type="text"
                  required
                  value={nuevaDireccion.linea_1 || ""}
                  onChange={(e) => {
                    setNuevaDireccion((p: any) => ({ ...p, linea_1: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, linea_1: undefined }));
                  }}
                  placeholder="123 Main Street"
                  className={inputCls(formErrors.linea_1)}
                />
                {formErrors.linea_1 && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.linea_1}</p>}
              </div>

              {/* Fila 3: Línea 2 (full width) */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_line2")}</label>
                <input
                  type="text"
                  value={nuevaDireccion.linea_2 || ""}
                  onChange={(e) => setNuevaDireccion((p: any) => ({ ...p, linea_2: e.target.value }))}
                  placeholder="Apt 4B"
                  className={inputCls()}
                />
              </div>

              {/* Fila 4: Ciudad | Estado */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_city")}</label>
                  <input
                    type="text"
                    value={nuevaDireccion.ciudad || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, ciudad: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, ciudad: undefined }));
                    }}
                    placeholder="New York"
                    className={inputCls(formErrors.ciudad)}
                  />
                  {formErrors.ciudad && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.ciudad}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_state")}</label>
                  <select
                    value={nuevaDireccion.estado || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, estado: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, estado: undefined }));
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none transition-all dark:bg-gray-800 dark:text-white ${formErrors.estado ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-gray-300 focus:border-green-500 focus:ring-green-500/20 dark:border-gray-600"}`}
                  >
                    <option value="">{t("address_form_state_select")}</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                  {formErrors.estado && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.estado}</p>}
                  {nuevaDireccion.estado && ALCOHOL_RESTRICTED_STATES.has(nuevaDireccion.estado) && tieneAlcohol && (
                    <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                      🚫 No podemos enviar bebidas alcohólicas a {nuevaDireccion.estado} por restricciones legales de ese estado. Por favor selecciona otro estado de destino.
                    </p>
                  )}
                </div>
              </div>

              {/* Fila 5: ZIP | Checkbox predeterminada */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_zip")}</label>
                  <input
                    type="text"
                    required
                    value={nuevaDireccion.codigo_postal || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, codigo_postal: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, cp: undefined }));
                    }}
                    maxLength={10}
                    placeholder="90210"
                    className={inputCls(formErrors.cp)}
                  />
                  {formErrors.cp && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.cp}</p>}
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevaDireccion.es_predeterminada ?? false}
                      onChange={(e) => setNuevaDireccion((p: any) => ({ ...p, es_predeterminada: e.target.checked }))}
                      className="accent-green-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t("address_form_save_default")}</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Formulario MX — 2 columnas */}

              {/* Fila 1: Nombre (full width) */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_fullname")}</label>
                <input
                  type="text"
                  value={nuevaDireccion.nombre_destinatario || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(NOMBRE_REGEX_CHECKOUT, "");
                    setNuevaDireccion((p: any) => ({ ...p, nombre_destinatario: val }));
                    setFormErrors((prev) => ({ ...prev, nombre_destinatario: undefined }));
                  }}
                  placeholder="Juan Pérez"
                  className={inputCls(formErrors.nombre_destinatario)}
                />
                {formErrors.nombre_destinatario && <p aria-live="polite" className="mt-1 text-xs text-red-500">{formErrors.nombre_destinatario}</p>}
              </div>

              {/* Fila 2: Calle | Número */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_street")}</label>
                  <input
                    type="text"
                    value={nuevaDireccion.calle || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, calle: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, calle: undefined }));
                    }}
                    placeholder="Avenida Reforma"
                    className={inputCls(formErrors.calle)}
                  />
                  {formErrors.calle && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.calle}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_number")}</label>
                  <input
                    type="text"
                    value={nuevaDireccion.numero || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, numero: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, numero: undefined }));
                    }}
                    placeholder="123 / 123-A"
                    className={inputCls(formErrors.numero)}
                  />
                  {formErrors.numero && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.numero}</p>}
                </div>
              </div>

              {/* Fila 3: Colonia (full width) */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_neighborhood")}</label>
                <input
                  type="text"
                  value={nuevaDireccion.colonia || ""}
                  onChange={(e) => {
                    setNuevaDireccion((p: any) => ({ ...p, colonia: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, colonia: undefined }));
                  }}
                  placeholder="Centro"
                  className={inputCls(formErrors.colonia)}
                />
                {formErrors.colonia && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.colonia}</p>}
              </div>

              {/* Fila 4: Ciudad | Estado */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_city")}</label>
                  <input
                    type="text"
                    value={nuevaDireccion.ciudad || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, ciudad: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, ciudad: undefined }));
                    }}
                    placeholder="Oaxaca de Juárez"
                    className={inputCls(formErrors.ciudad)}
                  />
                  {formErrors.ciudad && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.ciudad}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_state")}</label>
                  <input
                    type="text"
                    value={nuevaDireccion.estado || ""}
                    onChange={(e) => {
                      setNuevaDireccion((p: any) => ({ ...p, estado: e.target.value }));
                      setFormErrors((prev) => ({ ...prev, estado: undefined }));
                    }}
                    placeholder="Oaxaca"
                    className={inputCls(formErrors.estado)}
                  />
                  {formErrors.estado && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.estado}</p>}
                </div>
              </div>

              {/* Fila 5: Código Postal | Teléfono */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_postal")}</label>
                  <input
                    type="text"
                    required
                    value={nuevaDireccion.codigo_postal || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setNuevaDireccion((p: any) => ({ ...p, codigo_postal: val }));
                      setFormErrors((prev) => ({ ...prev, cp: undefined }));
                    }}
                    placeholder="68000"
                    maxLength={5}
                    className={inputCls(formErrors.cp)}
                  />
                  {formErrors.cp && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.cp}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_phone")}</label>
                  <input
                    type="tel"
                    value={nuevaDireccion.telefono || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setNuevaDireccion((p: any) => ({ ...p, telefono: val }));
                      setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                    }}
                    placeholder="9511234567"
                    maxLength={10}
                    className={inputCls(formErrors.telefono)}
                  />
                  {formErrors.telefono && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.telefono}</p>}
                </div>
              </div>

              {/* Fila 6: Referencias (full width) */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{t("address_form_references")}</label>
                <input
                  type="text"
                  value={nuevaDireccion.referencia || ""}
                  onChange={(e) => setNuevaDireccion((p: any) => ({ ...p, referencia: e.target.value }))}
                  placeholder="Casa color azul, frente al parque"
                  className={inputCls()}
                />
              </div>

              {/* Fila 7: Checkbox predeterminada */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevaDireccion.es_predeterminada ?? false}
                  onChange={(e) => setNuevaDireccion((p: any) => ({ ...p, es_predeterminada: e.target.checked }))}
                  className="accent-green-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t("address_form_save_default")}</span>
              </label>
            </>
          )}

          {/* GPS + botones */}
          <div>
            <button
              type="button"
              onClick={handleUsarGPS}
              disabled={gpsLoading}
              className="flex items-center gap-2 rounded-lg border border-green-500 px-4 py-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              {gpsLoading ? <Loader2 size={15} className="animate-spin" aria-label="Obteniendo ubicación" /> : <MapPin size={15} />}
              {gpsLoading ? t("address_form_getting_location") : t("address_form_use_location")}
            </button>
            {gpsError && <p className="mt-1 text-xs text-red-500">{gpsError}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleGuardar}
              disabled={!!(nuevaDireccion.pais_iso2 === "US" && tieneAlcohol && nuevaDireccion.estado && ALCOHOL_RESTRICTED_STATES.has(nuevaDireccion.estado))}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("address_form_save_button")}
            </button>
            {direcciones.length > 0 && (
              <button
                onClick={() => { setMostrarFormDireccion(false); setFormErrors({}); }}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800/50"
              >
                {t("address_form_use_another")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PROVIDER_COLORS: Record<string, string> = {
  fedex:         'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  dhl:           'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  ups:           'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
  estafeta:      'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
  paquetexpress: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
  redpack:       'bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-300',
};

function carrierLabel(cot: any): string {
  return cot.providerName ?? (cot.carrier === 'skydropx' ? 'SkydropX' : (cot.carrier ?? '').toUpperCase());
}

function carrierColor(cot: any): string {
  const label = carrierLabel(cot).toLowerCase().replace(/\s+/g, '');
  return PROVIDER_COLORS[label] ?? PROVIDER_COLORS[cot.carrier] ?? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300';
}

function EnvioStep({ grupos, opciones, nivelKey, setNivel, cotizandoLoading, cotizandoError, tieneAlcohol, convertQuotePrice, displayCurrency, solicitarProteccion, setSolicitarProteccion, costoProteccionEstimado }: {
  grupos: any[];
  opciones: OpcionAgregada[];
  nivelKey: string | null;
  setNivel: (key: string) => void;
  cotizandoLoading: boolean;
  cotizandoError: string | null;
  tieneAlcohol?: boolean;
  convertQuotePrice?: (price: number, currency: string) => number;
  displayCurrency?: string;
  solicitarProteccion: boolean;
  setSolicitarProteccion: (v: boolean) => void;
  costoProteccionEstimado?: number;
}) {
  const { t } = useLocale();
  const COLOR_PALETTE = usePalette();
  const hayOpciones = opciones && opciones.length > 0;
  const numProductores = grupos?.length ?? 0;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("Método de envío")}</h2>

      {tieneAlcohol && !cotizandoLoading && (
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/20">
          <span className="mt-0.5 flex-shrink-0 text-amber-500">⚠️</span>
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">{t("Tu pedido contiene bebidas alcohólicas")}</p>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
              {t("Solo se muestran paqueterías autorizadas para envío de alcohol (DHL, FedEx, Estafeta). Se requerirá")} <strong>{t("firma de adulto")}</strong> {t("al momento de la entrega.")}
            </p>
          </div>
        </div>
      )}

      {cotizandoLoading && (
        <div className="flex items-center justify-center rounded-lg border-2 border-gray-200 p-8">
          <div className="text-center text-gray-500">{t("Obteniendo cotizaciones de envío...")}</div>
        </div>
      )}

      {cotizandoError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {cotizandoError}
        </div>
      )}

      {!cotizandoLoading && !hayOpciones && !cotizandoError && (
        <div className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
          {t("No hay opciones de envío a esta dirección. Revisa el código postal o selecciona otra dirección.")}
        </div>
      )}

      {hayOpciones && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {numProductores > 1 && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <Truck size={14} className="text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("{n} paquetes desde {n} vendedores").replace(/\{n\}/g, String(numProductores))}
              </span>
            </div>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {opciones.map((op) => {
              const isSelected = nivelKey === op.key;
              return (
                <label
                  key={op.key}
                  className={`flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors
                    ${isSelected ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                >
                  <input
                    type="radio"
                    name="envio-nivel"
                    className="accent-green-600 flex-shrink-0"
                    checked={isSelected}
                    onChange={() => setNivel(op.key)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PROVIDER_COLORS[op.providerName.toLowerCase().replace(/\s+/g, '')] ?? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'}`}>
                        {op.providerName}
                      </span>
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{op.productName}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {op.diasMax} {t("días hábiles")}
                      {op.tipo === "internacional" && <span className="ml-1.5 text-blue-600 dark:text-blue-400">· {t("Internacional")}</span>}
                    </p>
                  </div>
                  <p className="font-bold text-green-600 text-sm flex-shrink-0">
                    ${formatPrice(convertQuotePrice ? convertQuotePrice(op.precioTotal, op.moneda) : op.precioTotal, { showCurrency: false })} {displayCurrency ?? op.moneda}
                  </p>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {hayOpciones && nivelKey && (
        <label
          className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors
            ${solicitarProteccion
              ? "border-green-300 bg-green-50 dark:border-green-700/50 dark:bg-green-900/20"
              : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:bg-gray-800/60"}`}
        >
          <input
            type="checkbox"
            className="mt-0.5 accent-green-600 flex-shrink-0"
            checked={solicitarProteccion}
            onChange={(e) => setSolicitarProteccion(e.target.checked)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("Protección del envío")} · SkydropX
              </p>
              {costoProteccionEstimado != null && costoProteccionEstimado > 0 && (
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
                  ~${formatPrice(costoProteccionEstimado, { showCurrency: false })} {displayCurrency}
                </p>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("Cubre pérdida o daño hasta el valor declarado del pedido.")}{" "}
              <span className="italic">{t("Precio estimado, se confirma al generar la guía.")}</span>
            </p>
          </div>
        </label>
      )}
    </div>
  );
}

function PagoYResumen({
  paso,
  items,
  direccionSeleccionada,
  gruposEnvio,
  seleccionados,
  pedidoId,
  clientSecret,
  onError,
  convertToDisplay,
  convertQuotePrice,
  displayCurrency,
  shippingDisplayAmount,
  locale,
  token,
  numeroOrden,
  solicitarProteccion,
  proteccionMontoDisplay,
}: {
  paso: CheckoutStep;
  items: any[];
  direccionSeleccionada: any;
  gruposEnvio: any[];
  seleccionados: Record<number, any>;
  pedidoId: string | null;
  clientSecret: string;
  onError: (msg: string | null) => void;
  convertToDisplay: (amount: number) => number;
  convertQuotePrice: (price: number, currency: string) => number;
  displayCurrency: string;
  shippingDisplayAmount: number | null;
  locale: string;
  token: string | null;
  numeroOrden: number | null;
  solicitarProteccion?: boolean;
  proteccionMontoDisplay?: number;
}) {
  const { t } = useLocale();
  const COLOR_PALETTE = usePalette();
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ numero: "", expiracion: "", cvc: "" });

  // Stripe element base style — adapta el color al tema del proyecto
  const elementStyle = {
    style: {
      base: {
        fontSize: "15px",
        color: "#1f2937",
        fontFamily: "'Manrope', 'DM Sans', sans-serif",
        fontSmoothing: "antialiased",
        "::placeholder": { color: "#9CA3AF" },
      },
      invalid: { color: "#ef4444", iconColor: "#ef4444" },
    },
  };

  const fieldWrapper =
    "rounded-xl border border-gray-200 px-4 py-3.5 transition-all focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 dark:border-gray-600 dark:bg-gray-800";
  const labelCls = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

  const handleConfirm = async () => {
    if (!stripe || !elements) {
      onError(t("Stripe aún se está cargando. Inténtalo de nuevo."));
      return;
    }
    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      onError(t("No se pudo acceder a los datos de la tarjeta."));
      return;
    }
    setConfirming(true);
    onError(null);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const numParam = numeroOrden ? `&num=${numeroOrden}` : "";
    const returnUrl = `${origin}/tienda/checkout/pago-exitoso${pedidoId ? `?pedido=${pedidoId}${numParam}` : ""}`;

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
      return_url: returnUrl,
    });

    if (error) {
      onError(error.message ?? t("El pago no se pudo procesar."));
      setConfirming(false);
    } else {
      // Pago confirmado (sin 3DS). Confirmar en backend para marcar el pedido como pagado
      // sin depender del webhook (best-effort; el webhook queda de respaldo).
      if (pedidoId && token) {
        try { await api.pagos.stripe.confirm(token, String(pedidoId)); } catch { /* webhook de respaldo */ }
      }
      window.location.assign(returnUrl);
    }
  };

  return (
    <>
      {/* Formulario de tarjeta — siempre montado para conservar datos al cambiar de paso */}
      <div className={paso === "pago" ? "" : "hidden"}>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{t("Forma de pago")}</h2>
        <div className="mt-4 space-y-4">
          {/* Número de tarjeta */}
          <div>
            <label className={labelCls}>{t("Número de tarjeta")}</label>
            <div className={fieldWrapper}>
              <CardNumberElement
                options={{ ...elementStyle, showIcon: true }}
                onChange={(e) =>
                  setFieldErrors((prev) => ({ ...prev, numero: e.error?.message ?? "" }))
                }
              />
            </div>
            {fieldErrors.numero && (
              <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.numero}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Vencimiento */}
            <div>
              <label className={labelCls}>{t("Vencimiento")}</label>
              <div className={fieldWrapper}>
                <CardExpiryElement
                  options={elementStyle}
                  onChange={(e) =>
                    setFieldErrors((prev) => ({ ...prev, expiracion: e.error?.message ?? "" }))
                  }
                />
              </div>
              {fieldErrors.expiracion && (
                <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.expiracion}</p>
              )}
            </div>

            {/* Código de seguridad */}
            <div>
              <label className={labelCls}>
                {t("Código de seguridad")}
                <span
                  className="ml-1 inline-flex cursor-default items-center align-middle"
                  title={t("Los 3 o 4 dígitos al reverso de tu tarjeta.")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-gray-400">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                  </svg>
                </span>
              </label>
              <div className={fieldWrapper}>
                <CardCvcElement
                  options={{
                    style: {
                      base: {
                        fontFamily: "'text-security-disc', sans-serif",
                        fontSize: "18px",
                        color: "#1f2937",
                        letterSpacing: "0.25em",
                        "::placeholder": { color: "#9CA3AF", fontFamily: "'Manrope', sans-serif", fontSize: "15px" },
                      },
                      invalid: { color: "#ef4444" },
                    },
                  }}
                  onChange={(e) =>
                    setFieldErrors((prev) => ({ ...prev, cvc: e.error?.message ?? "" }))
                  }
                />
              </div>
              {fieldErrors.cvc ? (
                <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.cvc}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">{t("3 o 4 dígitos al reverso")}</p>
              )}
            </div>
          </div>

          {/* Nota de seguridad */}
          <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
            <Lock size={12} className="shrink-0" aria-hidden="true" />
            <span>{t("Pago cifrado — los datos de tu tarjeta nunca se almacenan en nuestros servidores")}</span>
          </div>
        </div>
      </div>

      {/* Paso resumen — revisión del pedido + botón confirmar */}
      <div className={paso === "resumen" ? "" : "hidden"}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("Confirmar pedido")}</h2>
        <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          {items.map((item) => (
            <div key={item.id_producto} className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {(item.imagen_principal_url || item.producto_imagenes?.[0]?.url) ? (
                  <Image
                    src={getMediaUrl(item.imagen_principal_url || item.producto_imagenes?.[0]?.url)}
                    alt={item.nombre}
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    <ShoppingBag size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-900 dark:text-white">{item.nombre}</p>
                <p className="text-gray-500">x{item.cantidad}</p>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                ${formatPrice(convertToDisplay(Number(item.precio_base) * item.cantidad), { showCurrency: false })}
              </p>
            </div>
          ))}
        </div>
        {direccionSeleccionada && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{t("Enviar a:")}</p>
            {direccionSeleccionada.nombre_destinatario && (
              <p className="font-medium text-gray-800 dark:text-gray-200">{direccionSeleccionada.nombre_destinatario}</p>
            )}
            <p className="text-gray-600 dark:text-gray-400">
              {direccionSeleccionada.es_internacional ? (
                <>
                  {direccionSeleccionada.linea_1}
                  {direccionSeleccionada.linea_2 && <span>, {direccionSeleccionada.linea_2}</span>}
                </>
              ) : (
                <>
                  {direccionSeleccionada.calle} {direccionSeleccionada.numero}
                  {direccionSeleccionada.colonia && <span>, {direccionSeleccionada.colonia}</span>}
                </>
              )}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              {[
                direccionSeleccionada.ciudad,
                direccionSeleccionada.estado,
                direccionSeleccionada.codigo_postal,
                direccionSeleccionada.pais_iso2,
              ].filter(Boolean).join(", ")}
            </p>
            {direccionSeleccionada.es_internacional && (
              <span className="mt-1 inline-block text-xs text-blue-600 dark:text-blue-400">{t("Envío internacional")}</span>
            )}
          </div>
        )}
        {shippingDisplayAmount != null && shippingDisplayAmount > 0 && (() => {
          const firstQ = Object.values(seleccionados)[0] as any;
          const numPaquetes = (gruposEnvio ?? []).length;
          return (
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                    {locale === 'en' ? 'Shipping' : 'Envío'}
                  </span>
                  {firstQ && (
                    <span className="text-xs text-gray-500">
                      {firstQ.productName}
                      {numPaquetes > 1 && ` · ${numPaquetes} ${locale === 'en' ? 'packages' : 'paquetes'}`}
                    </span>
                  )}
                </div>
                <span className="flex-shrink-0 font-semibold text-green-700 dark:text-green-400">
                  ${formatPrice(shippingDisplayAmount, { showCurrency: false })} {displayCurrency}
                </span>
              </div>
            </div>
          );
        })()}

        {solicitarProteccion && proteccionMontoDisplay != null && proteccionMontoDisplay > 0 && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                  {locale === 'en' ? 'Shipping protection' : 'Protección de envío'}
                </span>
                <span className="text-xs text-gray-500">
                  {locale === 'en' ? 'Coverage up to declared value' : 'Cubre pérdida o daño hasta el valor declarado'}
                </span>
              </div>
              <span className="flex-shrink-0 font-semibold text-green-700 dark:text-green-400">
                ~${formatPrice(proteccionMontoDisplay, { showCurrency: false })} {displayCurrency}
              </span>
            </div>
          </div>
        )}

        <button
          data-tour="checkout-confirm"
          onClick={handleConfirm}
          disabled={confirming || !stripe || !elements}
          aria-label="Confirmar pago - transacción segura"
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors
            ${confirming || !stripe
              ? "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 dark:hover:bg-green-700"}`}
        >
          <Lock size={16} aria-hidden="true" />
          {confirming ? t("Procesando...") : t("Confirmar pago")}
        </button>
      </div>
    </>
  );
}

/* PayPal Resumen Component (sin Stripe Elements) */
function PagoYResumenPaypal({
  items,
  direccionSeleccionada,
  gruposEnvio,
  seleccionados,
  pedidoId,
  convertToDisplay,
  convertQuotePrice,
  displayCurrency,
  shippingDisplayAmount,
  locale,
  solicitarProteccion,
  proteccionMontoDisplay,
}: {
  items: any[];
  direccionSeleccionada: any;
  gruposEnvio: any[];
  seleccionados: Record<number, any>;
  pedidoId: string | null;
  convertToDisplay: (amount: number) => number;
  convertQuotePrice: (price: number, currency: string) => number;
  displayCurrency: string;
  shippingDisplayAmount: number | null;
  locale: string;
  solicitarProteccion?: boolean;
  proteccionMontoDisplay?: number;
}) {
  const COLOR_PALETTE = usePalette();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{locale === 'en' ? 'Order summary' : 'Resumen del pedido'}</h2>
      <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
        {items.map((item: any) => (
          <div key={item.id_producto} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
              {(item.imagen_principal_url || item.producto_imagenes?.[0]?.url) ? (
                <Image
                  src={item.imagen_principal_url || item.producto_imagenes?.[0]?.url!}
                  alt={item.nombre}
                  fill
                  sizes="48px"
                  loading="lazy"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                  <ShoppingBag size={16} aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{item.nombre}</p>
              <p className="text-gray-500">x{item.cantidad}</p>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              ${formatPrice(convertToDisplay(Number(item.precio_base) * item.cantidad), { showCurrency: false })}
            </p>
          </div>
        ))}
      </div>

      {direccionSeleccionada && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{locale === 'en' ? 'Ship to:' : 'Enviar a:'}</p>
          {direccionSeleccionada.nombre_destinatario && (
            <p className="font-medium text-gray-800 dark:text-gray-200">{direccionSeleccionada.nombre_destinatario}</p>
          )}
          <p className="text-gray-600 dark:text-gray-400">
            {direccionSeleccionada.es_internacional ? (
              <>
                {direccionSeleccionada.linea_1}
                {direccionSeleccionada.linea_2 && <span>, {direccionSeleccionada.linea_2}</span>}
              </>
            ) : (
              <>
                {direccionSeleccionada.calle} {direccionSeleccionada.numero}
                {direccionSeleccionada.colonia && <span>, {direccionSeleccionada.colonia}</span>}
              </>
            )}
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            {[
              direccionSeleccionada.ciudad,
              direccionSeleccionada.estado,
              direccionSeleccionada.codigo_postal,
              direccionSeleccionada.pais_iso2,
            ].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {shippingDisplayAmount != null && shippingDisplayAmount > 0 && (() => {
        const firstQ = Object.values(seleccionados)[0] as any;
        const numPaquetes = (gruposEnvio ?? []).length;
        return (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                  {locale === 'en' ? 'Shipping' : 'Envío'}
                </span>
                {firstQ && (
                  <span className="text-xs text-gray-500">
                    {firstQ.productName}
                    {numPaquetes > 1 && ` · ${numPaquetes} ${locale === 'en' ? 'packages' : 'paquetes'}`}
                  </span>
                )}
              </div>
              <span className="flex-shrink-0 font-semibold text-green-700 dark:text-green-400">
                ${formatPrice(shippingDisplayAmount, { showCurrency: false })} {displayCurrency}
              </span>
            </div>
          </div>
        );
      })()}

      {solicitarProteccion && proteccionMontoDisplay != null && proteccionMontoDisplay > 0 && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-medium text-gray-800 dark:text-gray-200 truncate block">
                {locale === 'en' ? 'Shipping protection' : 'Protección de envío'}
              </span>
              <span className="text-xs text-gray-500">
                {locale === 'en' ? 'Coverage up to declared value' : 'Cubre pérdida o daño hasta el valor declarado'}
              </span>
            </div>
            <span className="flex-shrink-0 font-semibold text-green-700 dark:text-green-400">
              ~${formatPrice(proteccionMontoDisplay, { showCurrency: false })} {displayCurrency}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
        <p className="font-medium">✓ {locale === 'en' ? 'Payment confirmed with PayPal' : 'Pago confirmado con PayPal'}</p>
        <p className="text-xs mt-1">{locale === 'en' ? 'Your order has been processed successfully.' : 'Tu pedido ha sido procesado correctamente.'}</p>
      </div>
    </div>
  );
}
