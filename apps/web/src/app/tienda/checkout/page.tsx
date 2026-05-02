"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, ChevronRight, Truck, CreditCard, ShoppingBag, ArrowLeft, Lock, MapPin, Loader2 } from "lucide-react";
import { useCheckout, CheckoutStep } from "@/hooks/useCheckout";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format-number";
import { usePaises } from "@/hooks/usePaises";

const PASOS: { key: CheckoutStep; label: string; icon: React.ReactNode }[] = [
  { key: "direccion", label: "Dirección", icon: <Truck size={16} /> },
  { key: "envio", label: "Envío", icon: <Truck size={16} /> },
  { key: "pago", label: "Pago", icon: <CreditCard size={16} /> },
  { key: "resumen", label: "Confirmar", icon: <CheckCircle size={16} /> },
];

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
    direccionIncompleta,
    tarjeta,
    setTarjeta,
    avanzarPaso,
    retrocederPaso,
    confirmarPago,
    cargando,
    errorMensaje,
    totalConEnvio,
    obtenerUbicacionGPS,
  } = useCheckout();

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/sign-in?redirect=/tienda/checkout");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && items.length === 0) {
      router.push("/tienda/carrito");
    }
  }, [items.length, isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-green-600">Cargando...</div>
      </div>
    );
  }

  const pasoActualIndex = PASO_INDEX[paso];

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8 md:px-8">
      <Link href="/tienda/carrito" className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
        <ArrowLeft size={16} />
        Volver al carrito
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-dark dark:text-white">Checkout</h1>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-0">
        {PASOS.map((p, idx) => (
          <div key={p.key} className="flex flex-1 items-center">
            <div className={`flex flex-col items-center gap-1 ${idx <= pasoActualIndex ? "text-green-600" : "text-gray-400"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold
                ${idx < pasoActualIndex ? "border-green-600 bg-green-600 text-white" :
                  idx === pasoActualIndex ? "border-green-600 text-green-600" :
                  "border-gray-300 text-gray-400"}`}>
                {idx < pasoActualIndex ? <CheckCircle size={14} /> : idx + 1}
              </div>
              <span className="hidden text-xs sm:block">{p.label}</span>
            </div>
            {idx < PASOS.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${idx < pasoActualIndex ? "bg-green-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel principal */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-dark">

            {/* PASO 1: Dirección */}
            {paso === "direccion" && (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Dirección de envío</h2>

                {direcciones.length > 0 && !mostrarFormDireccion && (
                  <div className="mb-4 space-y-3">
                    {direcciones.map((dir, idx) => (
                      <label
                        key={idx}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors
                          ${direccionSeleccionada === dir ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`}
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
                      className="text-sm text-green-600 hover:underline"
                    >
                      + Agregar nueva dirección
                    </button>
                  </div>
                )}

                {mostrarFormDireccion && (
                  <div className="space-y-4">
                    {/* País */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">País *</label>
                      <select
                        value={nuevaDireccion.pais_iso2 || "MX"}
                        onChange={(e) => setNuevaDireccion((p) => ({
                          ...p,
                          pais_iso2: e.target.value,
                          es_internacional: e.target.value !== "MX",
                        }))}
                        disabled={paisesLoading}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
                      >
                        {paisesLoading && <option value="MX">Cargando...</option>}
                        {!paisesLoading && paises.length === 0 && <option value="MX">México</option>}
                        {paises.map((p) => (
                          <option key={p.iso2} value={p.iso2}>
                            {p.nombre_local || p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nombre destinatario */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">¿A quién va dirigido? *</label>
                      <input
                        type="text"
                        value={nuevaDireccion.nombre_destinatario || ""}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, nombre_destinatario: e.target.value }))}
                        placeholder="Nombre completo"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Teléfono de contacto</label>
                      <input
                        type="tel"
                        value={nuevaDireccion.telefono || ""}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, telefono: e.target.value }))}
                        placeholder="Ej. +52 951 000 0000"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Botón GPS */}
                    <div>
                      <button
                        type="button"
                        onClick={handleUsarGPS}
                        disabled={gpsLoading}
                        className="flex items-center gap-2 rounded-lg border border-green-500 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-60 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        {gpsLoading ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                        {gpsLoading ? "Obteniendo ubicación..." : "Usar mi ubicación actual"}
                      </button>
                      {gpsError && <p className="mt-1 text-xs text-red-500">{gpsError}</p>}
                    </div>

                    {/* Calle y número */}
                    {nuevaDireccion.es_internacional ? (
                      <>
                        <div>
                          <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Línea 1 (Dirección) *</label>
                          <input
                            type="text"
                            value={nuevaDireccion.linea_1 || ""}
                            onChange={(e) => setNuevaDireccion((p) => ({ ...p, linea_1: e.target.value }))}
                            placeholder="Ej. 123 Main Street"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Línea 2 (Opcional)</label>
                          <input
                            type="text"
                            value={nuevaDireccion.linea_2 || ""}
                            onChange={(e) => setNuevaDireccion((p) => ({ ...p, linea_2: e.target.value }))}
                            placeholder="Ej. Apt 4B"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Calle *</label>
                          <input
                            type="text"
                            value={nuevaDireccion.calle || ""}
                            onChange={(e) => setNuevaDireccion((p) => ({ ...p, calle: e.target.value }))}
                            placeholder="Ej. Avenida Reforma"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Número *</label>
                          <input
                            type="text"
                            value={nuevaDireccion.numero || ""}
                            onChange={(e) => setNuevaDireccion((p) => ({ ...p, numero: e.target.value }))}
                            placeholder="Ej. 123 / 123-A"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Colonia / Barrio *</label>
                          <input
                            type="text"
                            value={nuevaDireccion.colonia || ""}
                            onChange={(e) => setNuevaDireccion((p) => ({ ...p, colonia: e.target.value }))}
                            placeholder="Ej. Centro"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                      </>
                    )}

                    {/* Ciudad */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Ciudad *</label>
                      <input
                        type="text"
                        value={nuevaDireccion.ciudad || ""}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, ciudad: e.target.value }))}
                        placeholder="Ej. Oaxaca de Juárez"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Estado */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Estado / Provincia *</label>
                      <input
                        type="text"
                        value={nuevaDireccion.estado || ""}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, estado: e.target.value }))}
                        placeholder="Ej. Oaxaca"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Código Postal */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Código Postal *</label>
                      <input
                        type="text"
                        value={nuevaDireccion.codigo_postal || ""}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, codigo_postal: e.target.value }))}
                        placeholder="Ej. 68000"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Referencia */}
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Referencia</label>
                      <input
                        type="text"
                        value={nuevaDireccion.referencia || ""}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, referencia: e.target.value }))}
                        placeholder="Ej. Casa color azul, frente al parque"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    {/* Etiqueta / Tipo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Etiqueta (opcional)</label>
                        <input
                          type="text"
                          value={nuevaDireccion.nombre_etiqueta || ""}
                          onChange={(e) => setNuevaDireccion((p) => ({ ...p, nombre_etiqueta: e.target.value }))}
                          placeholder="Ej. Casa, Oficina, Casa de mamá"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Tipo</label>
                        <select
                          value={nuevaDireccion.tipo || "hogar"}
                          onChange={(e) => setNuevaDireccion((p) => ({ ...p, tipo: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="hogar">Hogar</option>
                          <option value="trabajo">Trabajo</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="predeterminada"
                        type="checkbox"
                        checked={nuevaDireccion.es_predeterminada ?? false}
                        onChange={(e) => setNuevaDireccion((p) => ({ ...p, es_predeterminada: e.target.checked }))}
                        className="accent-green-600"
                      />
                      <label htmlFor="predeterminada" className="text-sm text-gray-700 dark:text-gray-300">
                        Guardar como dirección predeterminada
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={guardarNuevaDireccion}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Guardar dirección
                      </button>
                      {direcciones.length > 0 && (
                        <button
                          onClick={() => setMostrarFormDireccion(false)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: Envío */}
            {paso === "envio" && (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Método de envío</h2>
                {cotizandoLoading && (
                  <div className="flex items-center justify-center rounded-lg border-2 border-gray-200 p-8">
                    <div className="text-center">
                      <div className="mb-2 text-gray-500">Obteniendo cotizaciones de DHL...</div>
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
                    No hay opciones de envío disponibles. Verifica la dirección.
                  </div>
                )}
                <div className="space-y-3">
                  {cotizaciones.map((cot) => (
                    <label
                      key={cot.productCode}
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition-colors
                        ${envioSeleccionado?.productCode === cot.productCode ? "border-green-600 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`}
                    >
                      <input
                        type="radio"
                        name="envio"
                        className="accent-green-600"
                        checked={envioSeleccionado?.productCode === cot.productCode}
                        onChange={() => setEnvioSeleccionado(cot)}
                      />
                      <Truck size={20} className="text-yellow-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{cot.productName}</p>
                        <p className="text-sm text-gray-500">{cot.diasHabilesEstimados} días hábiles</p>
                        {cot.tipo === "internacional" && <p className="text-xs text-blue-600 dark:text-blue-400">Envío internacional</p>}
                      </div>
                      <p className="font-bold text-green-600">${formatPrice(cot.precioTotal, { showCurrency: false })} {cot.moneda}</p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 3: Pago */}
            {paso === "pago" && (
              <div>
                <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Forma de pago</h2>
                <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <Lock size={12} />
                  Entorno de pruebas — sin cobro real
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Nombre en la tarjeta</label>
                    <input
                      type="text"
                      value={tarjeta.nombre}
                      onChange={(e) => setTarjeta((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Nombre Apellido"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Número de tarjeta</label>
                    <input
                      type="text"
                      value={tarjeta.numero}
                      onChange={(e) => setTarjeta((p) => ({ ...p, numero: formatCardNumber(e.target.value) }))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm tracking-widest focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Expiración</label>
                      <input
                        type="text"
                        value={tarjeta.expiracion}
                        onChange={(e) => setTarjeta((p) => ({ ...p, expiracion: formatExpiry(e.target.value) }))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">CVV</label>
                      <input
                        type="text"
                        value={tarjeta.cvv}
                        onChange={(e) => setTarjeta((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: Resumen */}
            {paso === "resumen" && (
              <div>
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
                        ${formatPrice(Number(item.precio_base) * item.cantidad, { showCurrency: false })}
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
                    <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">Método de envío:</p>
                    <p className="text-gray-600 dark:text-gray-400">{envioSeleccionado.productName} — {envioSeleccionado.diasHabilesEstimados} días hábiles</p>
                    <p className="text-gray-600 dark:text-gray-400">${formatPrice(envioSeleccionado.precioTotal, { showCurrency: false })} {envioSeleccionado.moneda}</p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {errorMensaje && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errorMensaje}
              </p>
            )}

            {/* Botones de navegación */}
            <div className="mt-6 flex justify-between">
              {paso !== "direccion" ? (
                <button
                  onClick={retrocederPaso}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  <ArrowLeft size={16} />
                  Atrás
                </button>
              ) : <div />}

              {paso !== "resumen" ? (
                <button
                  onClick={avanzarPaso}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Continuar
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={confirmarPago}
                  disabled={cargando}
                  className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors
                    ${cargando ? "cursor-not-allowed bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                >
                  <Lock size={16} />
                  {cargando ? "Procesando..." : "Confirmar pago"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resumen lateral */}
        <div>
          <div className="rounded-lg bg-white p-5 shadow-md dark:bg-gray-dark">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Resumen</h3>
            <div className="space-y-2 border-b border-gray-200 pb-4 text-sm dark:border-gray-700">
              {items.slice(0, 3).map((item) => (
                <div key={item.id_producto} className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span className="truncate max-w-[140px]">{item.nombre} x{item.cantidad}</span>
                  <span>${formatPrice(Number(item.precio_base) * item.cantidad, { showCurrency: false })}</span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-gray-400">+{items.length - 3} producto(s) más</p>
              )}
            </div>
            <div className="space-y-2 py-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Subtotal</span>
                <span>${formatPrice(Math.round(Number(items.reduce((a, i) => a + Number(i.precio_base) * i.cantidad, 0))), { showCurrency: false })}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Envío</span>
                <span>{envioSeleccionado ? `$${formatPrice(envioSeleccionado.precioTotal, { showCurrency: false })}` : "—"}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total</span>
              <span className="text-lg font-bold text-green-600">
                ${formatPrice(Math.round(totalConEnvio), { showCurrency: false })} MXN
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
