"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, ChevronRight, Truck, CreditCard, ShoppingBag, ArrowLeft, Lock, MapPin, Loader2 } from "lucide-react";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCheckout, CheckoutStep } from "@/hooks/useCheckout";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { formatPrice } from "@/lib/format-number";
import { usePaises } from "@/hooks/usePaises";
import { getStripe, isTestMode, isStripeConfigured } from "@/lib/stripe";
import { isPaypalConfigured, getPaypalClientId } from "@/lib/paypal";
import PaypalCheckoutButton from "@/components/PaypalCheckoutButton";

// Paleta de colores similar a productor/solicitar
const COLOR_PALETTE = {
  green: "#2E4A33",
  copper: "#C97A3E",
  amber: "#C89B4A",
  cream: "#F4F0E3",
  white: "#FFFFFF",
  border: "rgba(46,74,51,0.12)",
};

const PASO_INDEX: Record<CheckoutStep, number> = {
  direccion: 0,
  envio: 1,
  pago: 2,
  resumen: 3,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
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
    cotizaciones,
    cotizandoLoading,
    cotizandoError,
    envioSeleccionado,
    setEnvioSeleccionado,
    avanzarPaso,
    retrocederPaso,
    prepararPago,
    errorMensaje,
    setErrorMensaje,
    totalConEnvio,
    obtenerUbicacionGPS,
    clientSecret,
    pedidoIdCreado,
    metodoPago,
    setMetodoPago,
    paypalOrderId,
    capturePaypalOrder,
    dobRequired,
    submitDob,
    cargando,
  } = useCheckout();

  const { t, locale, rates } = useLocale();

  // Moneda determinada automáticamente por idioma (sin selector manual)
  const displayCurrency = locale === 'en' ? 'USD' : 'MXN';

  const PASOS = [
    { key: "direccion" as CheckoutStep, label: t('checkout_step_address'), icon: <Truck size={16} />, hint: t('checkout_step_destination') },
    { key: "envio"     as CheckoutStep, label: t('checkout_step_shipping'), icon: <Truck size={16} />, hint: t('checkout_step_delivery') },
    { key: "pago"      as CheckoutStep, label: t('checkout_step_payment'), icon: <CreditCard size={16} />, hint: t('checkout_step_method') },
    { key: "resumen"   as CheckoutStep, label: t('checkout_step_confirm'), icon: <CheckCircle size={16} />, hint: t('checkout_step_summary') },
  ];

  // Convierte un monto desde MXN a la moneda de visualización
  const convertFromMXN = (mxn: number): number => {
    const rate = rates[displayCurrency] ?? 1;
    return Math.round(mxn * rate * 100) / 100;
  };

  // Normaliza el costo de envío (puede venir en USD para rutas internacionales) a MXN, luego convierte
  const getShippingDisplayAmount = (): number | null => {
    if (!envioSeleccionado) return null;
    const sourceMoneda = (envioSeleccionado.moneda ?? 'MXN').toUpperCase();
    let amountInMXN = envioSeleccionado.precioTotal;
    if (sourceMoneda !== 'MXN') {
      const sourceRate = rates[sourceMoneda];
      if (sourceRate) amountInMXN = envioSeleccionado.precioTotal / sourceRate;
    }
    return convertFromMXN(amountInMXN);
  };

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
  useEffect(() => {
    if (paso === "pago" && envioSeleccionado && direccionSeleccionada) {
      if (metodoPago === 'stripe' && !clientSecret) {
        prepararPago();
      } else if (metodoPago === 'paypal' && !paypalOrderId) {
        prepararPago();
      }
    }
  }, [paso, clientSecret, paypalOrderId, metodoPago, envioSeleccionado, direccionSeleccionada, prepararPago]);

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

  const mainContent = (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px 40px", fontFamily: "'Manrope', 'DM Sans', sans-serif" }}>
      {/* Gold stripe top */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${COLOR_PALETTE.copper}, ${COLOR_PALETTE.amber}, ${COLOR_PALETTE.copper})`, borderRadius: "2px 2px 0 0", marginBottom: "0" }} />

      {/* Header */}
      <div style={{ background: COLOR_PALETTE.green, borderRadius: "0 0 16px 16px", padding: "clamp(20px, 3vw, 32px)", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
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

      <div className="mb-8">
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
                        ? COLOR_PALETTE.white
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
                    <CheckCircle size={20} color={COLOR_PALETTE.white} />
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
              />
            )}

            {/* PASO 2: Envío */}
            {paso === "envio" && (
              <EnvioStep
                cotizaciones={cotizaciones}
                cotizandoLoading={cotizandoLoading}
                cotizandoError={cotizandoError}
                envioSeleccionado={envioSeleccionado}
                setEnvioSeleccionado={setEnvioSeleccionado}
              />
            )}

            {/* PASOS 3 & 4: Pago y Resumen */}
            {enElements && (
              <>
                {/* Selector de método de pago (solo en paso "pago") */}
                {paso === "pago" && (isStripeConfigured() || isPaypalConfigured()) && (
                  <div className="mb-8">
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
                                {metodoPago === 'stripe' && <CheckCircle size={12} color={COLOR_PALETTE.white} fill={COLOR_PALETTE.white} />}
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
                                {metodoPago === 'paypal' && <CheckCircle size={12} color={COLOR_PALETTE.white} fill={COLOR_PALETTE.white} />}
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
                    {stripeConfigured && dobRequired && (
                      <DobCaptureForm
                        edadRequerida={dobRequired.edadRequerida}
                        message={dobRequired.message}
                        onSubmit={submitDob}
                      />
                    )}
                    {stripeConfigured && !dobRequired && !clientSecret && (
                      <div className="space-y-4">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.green}33`, background: `${COLOR_PALETTE.green}08`, padding: "24px", fontSize: "14px", color: COLOR_PALETTE.green }} role="status" aria-live="polite">
                          <Loader2 size={16} className="animate-spin" aria-label="Cargando" />
                          Preparando el formulario de pago con Stripe…
                        </div>
                        <div style={{ borderRadius: "8px", background: `${COLOR_PALETTE.green}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.green, border: `1px solid ${COLOR_PALETTE.green}33` }}>
                          <div className="flex gap-2">
                            <Lock size={16} className="shrink-0" aria-hidden="true" style={{ color: COLOR_PALETTE.green }} />
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>Pago protegido por Stripe</p>
                              <p style={{ marginTop: "4px", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0" }}>Tu tarjeta nunca se almacena en nuestros servidores. Stripe maneja la encriptación de extremo a extremo.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {stripeConfigured && !dobRequired && clientSecret && stripePromise && (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: { theme: "stripe", variables: { colorPrimary: "#16a34a" } },
                        }}
                      >
                        <PagoYResumen
                          paso={paso}
                          items={items}
                          direccionSeleccionada={direccionSeleccionada}
                          envioSeleccionado={envioSeleccionado}
                          pedidoId={pedidoIdCreado}
                          clientSecret={clientSecret!}
                          onError={setErrorMensaje}
                          convertToDisplay={convertFromMXN}
                          displayCurrency={displayCurrency}
                          shippingDisplayAmount={getShippingDisplayAmount()}
                          locale={locale}
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
                    {isPaypalConfigured() && dobRequired && (
                      <DobCaptureForm
                        edadRequerida={dobRequired.edadRequerida}
                        message={dobRequired.message}
                        onSubmit={submitDob}
                      />
                    )}
                    {isPaypalConfigured() && !dobRequired && !paypalOrderId && (
                      <div className="space-y-4">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.copper}33`, background: `${COLOR_PALETTE.copper}08`, padding: "24px", fontSize: "14px", color: COLOR_PALETTE.copper }} role="status" aria-live="polite">
                          <Loader2 size={16} className="animate-spin" aria-label="Cargando" />
                          Iniciando sesión con PayPal…
                        </div>
                        <div style={{ borderRadius: "8px", background: `${COLOR_PALETTE.copper}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.copper, border: `1px solid ${COLOR_PALETTE.copper}33` }}>
                          <div className="flex gap-2">
                            <Lock size={16} className="shrink-0" aria-hidden="true" style={{ color: COLOR_PALETTE.copper }} />
                            <div>
                              <p style={{ fontWeight: 600, margin: 0 }}>PayPal maneja tu información bancaria</p>
                              <p style={{ marginTop: "4px", fontSize: "12px", lineHeight: 1.4, margin: "4px 0 0" }}>Te redirigiremos a PayPal. Nunca vemos tu número de tarjeta ni datos bancarios.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isPaypalConfigured() && !dobRequired && paypalOrderId && paso === "pago" && (
                      <div className="space-y-4">
                        <div style={{ borderRadius: "8px", border: `1px solid ${COLOR_PALETTE.copper}33`, background: `${COLOR_PALETTE.copper}08`, padding: "16px", fontSize: "14px", color: COLOR_PALETTE.copper }}>
                          <p style={{ marginBottom: "8px", fontWeight: 600, margin: 0 }}>Completa tu pago en PayPal</p>
                          <p style={{ fontSize: "12px", marginTop: "4px", lineHeight: 1.4 }}>Haz clic en el botón abajo. Te redirigiremos a PayPal de forma segura para que confirmes tu pago.</p>
                        </div>
                        <PaypalCheckoutButton
                          orderId={paypalOrderId}
                          onCapture={capturePaypalOrder}
                          onError={setErrorMensaje}
                          disabled={cargando}
                        />
                      </div>
                    )}
                    {isPaypalConfigured() && !dobRequired && paypalOrderId && paso === "resumen" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircle size={20} className="shrink-0" />
                          <div>
                            <p className="font-medium">¡Pago con PayPal confirmado!</p>
                            <p className="text-xs">Tu pago ha sido procesado exitosamente.</p>
                          </div>
                        </div>
                        <PagoYResumenPaypal
                          items={items}
                          direccionSeleccionada={direccionSeleccionada}
                          envioSeleccionado={envioSeleccionado}
                          pedidoId={pedidoIdCreado}
                          convertToDisplay={convertFromMXN}
                          displayCurrency={displayCurrency}
                          shippingDisplayAmount={getShippingDisplayAmount()}
                          locale={locale}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Error */}
            {errorMensaje && (
              <p aria-live="polite" role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMensaje}
              </p>
            )}

            {/* Botones de navegación mejorados */}
            <div style={{ marginTop: "32px", display: "flex", gap: "12px", justifyContent: "space-between" }}>
              {paso !== "direccion" ? (
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
              ) : <div />}

              {paso !== "resumen" && (
                <button
                  onClick={avanzarPaso}
                  disabled={
                    paso === "pago" && (
                      (metodoPago === 'stripe' && !clientSecret) ||
                      (metodoPago === 'paypal' && !paypalOrderId)
                    )
                  }
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
                    cursor:
                      paso === "pago" && ((metodoPago === 'stripe' && !clientSecret) || (metodoPago === 'paypal' && !paypalOrderId))
                        ? "not-allowed"
                        : "pointer",
                    background:
                      paso === "pago" && ((metodoPago === 'stripe' && !clientSecret) || (metodoPago === 'paypal' && !paypalOrderId))
                        ? "#D1D5DB"
                        : COLOR_PALETTE.green,
                    color:
                      paso === "pago" && ((metodoPago === 'stripe' && !clientSecret) || (metodoPago === 'paypal' && !paypalOrderId))
                        ? "#6B7280"
                        : COLOR_PALETTE.white,
                    boxShadow:
                      paso === "pago" && ((metodoPago === 'stripe' && !clientSecret) || (metodoPago === 'paypal' && !paypalOrderId))
                        ? "none"
                        : "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    if (!(paso === "pago" && ((metodoPago === 'stripe' && !clientSecret) || (metodoPago === 'paypal' && !paypalOrderId)))) {
                      e.currentTarget.style.background = COLOR_PALETTE.green;
                      e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                      e.currentTarget.style.opacity = "0.9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(paso === "pago" && ((metodoPago === 'stripe' && !clientSecret) || (metodoPago === 'paypal' && !paypalOrderId)))) {
                      e.currentTarget.style.background = COLOR_PALETTE.green;
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                      e.currentTarget.style.opacity = "1";
                    }
                  }}
                >
                  {t('checkout_button_continue')}
                  <ChevronRight size={18} />
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
                    <span style={{ truncate: "true", maxWidth: "140px" }}>{item.nombre} x{item.cantidad}</span>
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
                  {envioSeleccionado ? `$${formatPrice(getShippingDisplayAmount() ?? 0, { showCurrency: false })}` : "—"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${COLOR_PALETTE.border}`, paddingTop: "12px" }}>
              <span style={{ fontWeight: 600, color: COLOR_PALETTE.green }}>{t('checkout_summary_total')}</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: COLOR_PALETTE.copper }}>
                ${formatPrice(convertFromMXN(totalConEnvio), { showCurrency: false })} {displayCurrency}
              </span>
            </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  // Wrap with PayPal provider if configured
  if (isPaypalConfigured()) {
    return (
      <PayPalScriptProvider
        options={{
          clientId: getPaypalClientId(),
          currency: displayCurrency,
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
}: any) {
  const [formErrors, setFormErrors] = useState<{ nombre_destinatario?: string; telefono?: string; cp?: string }>({});
  const NOMBRE_REGEX_CHECKOUT = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'\-]/g;

  const handleGuardar = () => {
    const errors: { nombre_destinatario?: string; telefono?: string; cp?: string } = {};
    const nombre = (nuevaDireccion.nombre_destinatario ?? "").trim();
    if (nombre.length > 0 && nombre.length < 2)
      errors.nombre_destinatario = "El nombre debe tener al menos 2 letras";
    const tel = (nuevaDireccion.telefono ?? "").replace(/\D/g, "");
    if (tel.length > 0 && tel.length !== 10) errors.telefono = "El teléfono debe tener 10 dígitos";
    const cp = nuevaDireccion.codigo_postal ?? "";
    if (nuevaDireccion.pais_iso2 === "MX" && cp && !/^\d{5}$/.test(cp)) errors.cp = "El código postal debe tener 5 dígitos";
    if (nuevaDireccion.pais_iso2 === "US" && cp && !/^\d{5}(-\d{4})?$/.test(cp)) errors.cp = "El ZIP code debe tener 5 dígitos (ej. 90210)";
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    guardarNuevaDireccion();
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Dirección de envío</h2>

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
                <p className="font-medium capitalize">{dir.nombre_etiqueta || dir.tipo || "Dirección"}</p>
                {dir.nombre_destinatario && <p className="text-xs text-gray-500">Para: {dir.nombre_destinatario}</p>}
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
                  {[dir.ciudad, dir.estado, dir.codigo_postal, dir.pais_iso2].filter(Boolean).join(", ") ||
                    [dir.ubicacion?.ciudad, dir.ubicacion?.estado, dir.ubicacion?.codigo_postal, dir.ubicacion?.pais].filter(Boolean).join(", ")}
                </p>
                {dir.es_internacional && <span className="text-xs text-blue-600 dark:text-blue-400">Internacional</span>}
              </div>
            </label>
          ))}
          <button
            onClick={() => setMostrarFormDireccion(true)}
            className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors dark:text-green-400 dark:hover:text-green-300"
          >
            + Agregar otra dirección
          </button>
        </div>
      )}

      {mostrarFormDireccion && (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">País de envío *</label>
            <select
              value={nuevaDireccion.pais_iso2 || "MX"}
              onChange={(e) =>
                setNuevaDireccion((p: any) => ({
                  ...p,
                  pais_iso2: e.target.value,
                  es_internacional: e.target.value !== "MX",
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="MX">🇲🇽 México</option>
              <option value="US">🇺🇸 Estados Unidos</option>
            </select>
          </div>

          {/* Formulario dinámico por país */}
          {nuevaDireccion.pais_iso2 === "US" ? (
            <>
              {/* USA: Nombre, Teléfono, Línea 1, Línea 2, Ciudad, Estado, ZIP, Predeterminada */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={nuevaDireccion.nombre_destinatario || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(NOMBRE_REGEX_CHECKOUT, "");
                    setNuevaDireccion((p: any) => ({ ...p, nombre_destinatario: val }));
                    setFormErrors((prev) => ({ ...prev, nombre_destinatario: undefined }));
                  }}
                  placeholder="John Doe"
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none transition-all dark:bg-gray-800 dark:text-white ${formErrors.nombre_destinatario ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-gray-300 focus:border-green-500 focus:ring-green-500/20 dark:border-gray-600"}`}
                />
                {formErrors.nombre_destinatario && <p aria-live="polite" className="mt-1 text-xs text-red-500">{formErrors.nombre_destinatario}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Teléfono</label>
                <input
                  type="tel"
                  value={nuevaDireccion.telefono || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setNuevaDireccion((p: any) => ({ ...p, telefono: val }));
                    setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                  }}
                  placeholder="10 dígitos"
                  maxLength={10}
                  className={`w-full rounded-lg border px-3 py-3 text-sm focus:outline-none dark:bg-gray-800 dark:text-white ${formErrors.telefono ? "border-red-400" : "border-gray-300 focus:border-green-500 dark:border-gray-600"}`}
                />
                {formErrors.telefono && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.telefono}</p>}
              </div>

              <Field label="Dirección - Línea 1 *" value={nuevaDireccion.linea_1 || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, linea_1: v }))} placeholder="123 Main Street" />
              <Field label="Dirección - Línea 2" value={nuevaDireccion.linea_2 || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, linea_2: v }))} placeholder="Apt 4B (opcional)" />
              <Field label="Ciudad *" value={nuevaDireccion.ciudad || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, ciudad: v }))} placeholder="New York" />
              <Field label="Estado *" value={nuevaDireccion.estado || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, estado: v }))} placeholder="NY" />

              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ZIP Code *</label>
                <input
                  type="text"
                  required
                  value={nuevaDireccion.codigo_postal || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNuevaDireccion((p: any) => ({ ...p, codigo_postal: val }));
                    setFormErrors((prev) => ({ ...prev, cp: undefined }));
                  }}
                  maxLength={10}
                  placeholder="90210 o 90210-1234"
                  className={`w-full rounded-lg border px-3 py-3 text-sm focus:outline-none dark:bg-gray-800 dark:text-white ${formErrors.cp ? "border-red-400" : "border-gray-300 focus:border-green-500 dark:border-gray-600"}`}
                />
                {formErrors.cp && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.cp}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="predeterminada"
                  type="checkbox"
                  checked={nuevaDireccion.es_predeterminada ?? false}
                  onChange={(e) => setNuevaDireccion((p: any) => ({ ...p, es_predeterminada: e.target.checked }))}
                  className="accent-green-600"
                />
                <label htmlFor="predeterminada" className="text-sm text-gray-700 dark:text-gray-300">
                  Guardar como dirección predeterminada
                </label>
              </div>
            </>
          ) : (
            <>
              {/* México: Nombre, Calle, Número, Colonia, Ciudad, Estado, CP, Teléfono, Referencias, Predeterminada */}
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Nombre completo</label>
                <input
                  type="text"
                  value={nuevaDireccion.nombre_destinatario || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(NOMBRE_REGEX_CHECKOUT, "");
                    setNuevaDireccion((p: any) => ({ ...p, nombre_destinatario: val }));
                    setFormErrors((prev) => ({ ...prev, nombre_destinatario: undefined }));
                  }}
                  placeholder="Juan Pérez"
                  className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none transition-all dark:bg-gray-800 dark:text-white ${formErrors.nombre_destinatario ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-gray-300 focus:border-green-500 focus:ring-green-500/20 dark:border-gray-600"}`}
                />
                {formErrors.nombre_destinatario && <p aria-live="polite" className="mt-1 text-xs text-red-500">{formErrors.nombre_destinatario}</p>}
              </div>

              <Field label="Calle *" value={nuevaDireccion.calle || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, calle: v }))} placeholder="Avenida Reforma" />
              <Field label="Número *" value={nuevaDireccion.numero || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, numero: v }))} placeholder="123 / 123-A" />
              <Field label="Colonia / Barrio *" value={nuevaDireccion.colonia || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, colonia: v }))} placeholder="Centro" />
              <Field label="Ciudad *" value={nuevaDireccion.ciudad || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, ciudad: v }))} placeholder="Oaxaca de Juárez" />
              <Field label="Estado *" value={nuevaDireccion.estado || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, estado: v }))} placeholder="Oaxaca" />

              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Código Postal *</label>
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
                  className={`w-full rounded-lg border px-3 py-3 text-sm focus:outline-none dark:bg-gray-800 dark:text-white ${formErrors.cp ? "border-red-400" : "border-gray-300 focus:border-green-500 dark:border-gray-600"}`}
                />
                {formErrors.cp && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.cp}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Teléfono</label>
                <input
                  type="tel"
                  value={nuevaDireccion.telefono || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setNuevaDireccion((p: any) => ({ ...p, telefono: val }));
                    setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                  }}
                  placeholder="10 dígitos, ej. 9511234567"
                  maxLength={10}
                  className={`w-full rounded-lg border px-3 py-3 text-sm focus:outline-none dark:bg-gray-800 dark:text-white ${formErrors.telefono ? "border-red-400" : "border-gray-300 focus:border-green-500 dark:border-gray-600"}`}
                />
                {formErrors.telefono && <p aria-live="polite" role="alert" className="mt-1 text-xs text-red-500">{formErrors.telefono}</p>}
              </div>

              <Field label="Referencias (opcional)" value={nuevaDireccion.referencia || ""} onChange={(v) => setNuevaDireccion((p: any) => ({ ...p, referencia: v }))} placeholder="Casa color azul, frente al parque" />

              <div className="flex items-center gap-2">
                <input
                  id="predeterminada"
                  type="checkbox"
                  checked={nuevaDireccion.es_predeterminada ?? false}
                  onChange={(e) => setNuevaDireccion((p: any) => ({ ...p, es_predeterminada: e.target.checked }))}
                  className="accent-green-600"
                />
                <label htmlFor="predeterminada" className="text-sm text-gray-700 dark:text-gray-300">
                  Guardar como dirección predeterminada
                </label>
              </div>
            </>
          )}

          {/* GPS button al final */}
          <div>
            <button
              type="button"
              onClick={handleUsarGPS}
              disabled={gpsLoading}
              className="flex items-center gap-2 rounded-lg border border-green-500 px-4 py-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              {gpsLoading ? <Loader2 size={15} className="animate-spin" aria-label="Obteniendo ubicación" /> : <MapPin size={15} />}
              {gpsLoading ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
            </button>
            {gpsError && <p className="mt-1 text-xs text-red-500">{gpsError}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleGuardar}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md"
            >
              Guardar dirección
            </button>
            {direcciones.length > 0 && (
              <button
                onClick={() => setMostrarFormDireccion(false)}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800/50"
              >
                Usar otra dirección
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DobCaptureForm({
  edadRequerida,
  message,
  onSubmit,
}: {
  edadRequerida: number;
  message: string;
  onSubmit: (fechaISO: string) => Promise<boolean>;
}) {
  const [dob, setDob] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) {
      setLocalError("Ingresa tu fecha de nacimiento.");
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    const ok = await onSubmit(dob);
    if (!ok) setSubmitting(false);
  };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-900/20">
      <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">
        Confirmar tu edad ({edadRequerida}+)
      </p>
      <p className="mb-3 text-amber-800 dark:text-amber-300">{message}</p>
      <form onSubmit={handle} className="space-y-3">
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-amber-300 px-3 py-3 text-sm focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-gray-800 dark:text-white"
          required
        />
        {localError && <p aria-live="polite" role="alert" className="text-xs text-red-600 dark:text-red-400">{localError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white
            ${submitting ? "cursor-not-allowed bg-gray-400" : "bg-amber-600 hover:bg-amber-700"}`}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Confirmar y continuar
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
}

function EnvioStep({ cotizaciones, cotizandoLoading, cotizandoError, envioSeleccionado, setEnvioSeleccionado }: any) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Método de envío</h2>
      {cotizandoLoading && (
        <div className="flex items-center justify-center rounded-lg border-2 border-gray-200 p-8">
          <div className="text-center">
            <div className="mb-2 text-gray-500">Obteniendo cotizaciones de envío...</div>
          </div>
        </div>
      )}
      {cotizandoError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {cotizandoError}
        </div>
      )}
      {!cotizandoLoading && cotizaciones.length === 0 && !cotizandoError && (
        <div className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
          No hay opciones de envío a esta dirección. Revisa el código postal o selecciona otra dirección.
        </div>
      )}
      <div className="space-y-3">
        {cotizaciones.map((cot: any) => {
          const isSelected = envioSeleccionado?.carrier === cot.carrier && envioSeleccionado?.productCode === cot.productCode;
          const carrierNames: Record<string, string> = {
            fedex: 'FedEx',
          };
          const carrierLabel = carrierNames[cot.carrier] ?? (cot.carrier ?? '').toUpperCase();
          const carrierColor = 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
          return (
            <label
              key={`${cot.carrier}-${cot.productCode}`}
              className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition-all duration-150
                ${isSelected ? "border-green-600 bg-green-50 shadow-sm dark:bg-green-900/20" : "border-gray-200 hover:shadow-sm dark:border-gray-700"}`}
            >
              <input
                type="radio"
                name="envio"
                className="accent-green-600"
                checked={isSelected}
                onChange={() => setEnvioSeleccionado(cot)}
              />
              <Truck size={20} className="text-yellow-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${carrierColor}`}>{carrierLabel}</span>
                  <p className="font-medium text-gray-900 dark:text-white">{cot.productName}</p>
                </div>
                <p className="text-sm text-gray-500">{cot.diasHabilesEstimados} días hábiles</p>
                {cot.tipo === "internacional" && <p className="text-xs text-blue-600 dark:text-blue-400">Envío internacional</p>}
              </div>
              <p className="font-bold text-green-600">${formatPrice(cot.precioTotal, { showCurrency: false })} {cot.moneda}</p>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PagoYResumen({
  paso,
  items,
  direccionSeleccionada,
  envioSeleccionado,
  pedidoId,
  clientSecret,
  onError,
  convertToDisplay,
  displayCurrency,
  shippingDisplayAmount,
  locale,
}: {
  paso: CheckoutStep;
  items: any[];
  direccionSeleccionada: any;
  envioSeleccionado: any;
  pedidoId: string | null;
  clientSecret: string;
  onError: (msg: string | null) => void;
  convertToDisplay: (amount: number) => number;
  displayCurrency: string;
  shippingDisplayAmount: number | null;
  locale: string;
}) {
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
      onError("Stripe aún se está cargando. Inténtalo de nuevo.");
      return;
    }
    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      onError("No se pudo acceder a los datos de la tarjeta.");
      return;
    }
    setConfirming(true);
    onError(null);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const returnUrl = `${origin}/tienda/checkout/pago-exitoso${pedidoId ? `?pedido=${pedidoId}` : ""}`;

    // confirmCardPayment — usa elementos individuales; CVC queda enmascarado
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
      return_url: returnUrl,
    });

    if (error) {
      onError(error.message ?? "El pago no se pudo procesar.");
      setConfirming(false);
    }
    // En éxito, Stripe redirige a return_url y la página se desmonta.
  };

  return (
    <>
      {/* Formulario de tarjeta — siempre montado para conservar datos al cambiar de paso */}
      <div className={paso === "pago" ? "" : "hidden"}>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Forma de pago</h2>
        {isTestMode() && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Lock size={12} />
            Modo de pruebas — usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVV.
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Número de tarjeta */}
          <div>
            <label className={labelCls}>Número de tarjeta</label>
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
              <label className={labelCls}>Vencimiento</label>
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

            {/* Código de seguridad — CardCvcElement enmascara los dígitos con ••• al escribir */}
            <div>
              <label className={labelCls}>
                Código de seguridad
                <span
                  className="ml-1 inline-flex cursor-default items-center align-middle"
                  title="Los 3 o 4 dígitos al reverso de tu tarjeta. Por seguridad los dígitos no son visibles al escribirlos."
                >
                  <svg
                    width="13" height="13" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    aria-hidden="true" className="text-gray-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </span>
              </label>
              <div className={fieldWrapper}>
                <CardCvcElement
                  options={elementStyle}
                  onChange={(e) =>
                    setFieldErrors((prev) => ({ ...prev, cvc: e.error?.message ?? "" }))
                  }
                />
              </div>
              {fieldErrors.cvc ? (
                <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.cvc}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">3 o 4 dígitos al reverso</p>
              )}
            </div>
          </div>

          {/* Nota de seguridad */}
          <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
            <Lock size={12} className="shrink-0" aria-hidden="true" />
            <span>Pago cifrado — los datos de tu tarjeta nunca se almacenan en nuestros servidores</span>
          </div>
        </div>
      </div>

      {/* Paso resumen — revisión del pedido + botón confirmar */}
      <div className={paso === "resumen" ? "" : "hidden"}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Confirmar pedido</h2>
        <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          {items.map((item) => (
            <div key={item.id_producto} className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {(item.producto_imagenes?.[0]?.url || item.imagen_principal_url) ? (
                  <Image
                    src={item.producto_imagenes?.[0]?.url || item.imagen_principal_url!}
                    alt={item.nombre}
                    fill
                    sizes="48px"
                    className="object-cover"
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
            <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">Enviar a:</p>
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
              <span className="mt-1 inline-block text-xs text-blue-600 dark:text-blue-400">Envío internacional</span>
            )}
          </div>
        )}
        {envioSeleccionado && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
            <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{locale === 'en' ? 'Shipping method:' : 'Método de envío:'}</p>
            <p className="text-gray-600 dark:text-gray-400">{envioSeleccionado.productName} — {envioSeleccionado.diasHabilesEstimados} {locale === 'en' ? 'business days' : 'días hábiles'}</p>
            <p className="text-gray-600 dark:text-gray-400">${formatPrice(shippingDisplayAmount ?? convertToDisplay(envioSeleccionado.precioTotal), { showCurrency: false })} {displayCurrency}</p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={confirming || !stripe || !elements}
          aria-label="Confirmar pago - transacción segura"
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors
            ${confirming || !stripe
              ? "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 dark:hover:bg-green-700"}`}
        >
          <Lock size={16} aria-hidden="true" />
          {confirming ? "Procesando..." : "Confirmar pago"}
        </button>
      </div>
    </>
  );
}

/* PayPal Resumen Component (sin Stripe Elements) */
function PagoYResumenPaypal({
  items,
  direccionSeleccionada,
  envioSeleccionado,
  pedidoId,
  convertToDisplay,
  displayCurrency,
  shippingDisplayAmount,
  locale,
}: {
  items: any[];
  direccionSeleccionada: any;
  envioSeleccionado: any;
  pedidoId: string | null;
  convertToDisplay: (amount: number) => number;
  displayCurrency: string;
  shippingDisplayAmount: number | null;
  locale: string;
}) {
  const router = useRouter();

  const handleSuccess = () => {
    router.push(`/tienda/checkout/pago-exitoso?pedido=${pedidoId}`);
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{locale === 'en' ? 'Order summary' : 'Resumen del pedido'}</h2>
      <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
        {items.map((item: any) => (
          <div key={item.id_producto} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
              {(item.producto_imagenes?.[0]?.url || item.imagen_principal_url) ? (
                <Image
                  src={item.producto_imagenes?.[0]?.url || item.imagen_principal_url!}
                  alt={item.nombre}
                  fill
                  sizes="48px"
                  loading="lazy"
                  className="object-cover"
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
          <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">Enviar a:</p>
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

      {envioSeleccionado && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{locale === 'en' ? 'Shipping method:' : 'Método de envío:'}</p>
          <p className="text-gray-600 dark:text-gray-400">
            {envioSeleccionado.productName} — {envioSeleccionado.diasHabilesEstimados} {locale === 'en' ? 'business days' : 'días hábiles'}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            ${formatPrice(shippingDisplayAmount ?? convertToDisplay(envioSeleccionado.precioTotal), { showCurrency: false })} {displayCurrency}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
        <p className="font-medium">✓ {locale === 'en' ? 'Payment confirmed with PayPal' : 'Pago confirmado con PayPal'}</p>
        <p className="text-xs mt-1">{locale === 'en' ? 'Your order has been processed successfully.' : 'Tu pedido ha sido procesado correctamente.'}</p>
      </div>
    </div>
  );
}
