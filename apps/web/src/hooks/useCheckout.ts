// @ts-nocheck — tipos pendientes de revisar (pedido response shape)
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { useLocale } from "@/context/LocaleContext";

// Importación limpia del hook genérico
import { useShipping, ShippingQuote, GrupoEnvio, OpcionAgregada, DireccionDestino } from "./useShipping";

import type { CheckoutStep, Direccion, TarjetaMock } from "@/types/checkout";

export type { CheckoutStep, Direccion, TarjetaMock } from "@/types/checkout";
export type { GrupoEnvio, ShippingQuote, OpcionAgregada } from "./useShipping";

export interface DobRequiredState {
  edadRequerida: number;
  message: string;
}

export function useCheckout() {
  const router = useRouter();
  const { items, precioTotal, limpiarCarrito } = useCarrito();
  const { user } = useAuth();
  const { currency, locale } = useLocale();
  const { grupos, opcionesAgregadas, nivelKey, setNivel, seleccionados, loading: cotizandoLoading, error: cotizandoError, cotizarPorCarrito, todosSeleccionados, tieneAlcohol } = useShipping();

  const [paso, setPaso] = useState<CheckoutStep>("direccion");
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<Direccion | null>(null);
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState<Direccion>({
    tipo: "hogar",
    pais_iso2: "MX",
    es_internacional: false,
    calle: "",
    numero: "",
    colonia: "",
  });
  
  const [tarjeta, setTarjeta] = useState<TarjetaMock>({ numero: "", expiracion: "", cvv: "", nombre: "" });
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [direccionIncompleta, setDireccionIncompleta] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [pedidoIdCreado, setPedidoIdCreado] = useState<string | null>(null);
  const [numeroOrdenCreado, setNumeroOrdenCreado] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'stripe' | 'paypal'>('stripe');
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  const [dobRequired, setDobRequired] = useState<DobRequiredState | null>(null);
  const [solicitarProteccion, setSolicitarProteccion] = useState(false);

  // Mutex para prevenir doble creación de pedido por doble click o llamadas concurrentes.
  const isCreatingPedidoRef = useRef(false);

  const pesoTotal = items.reduce(
    (sum, item) => sum + ((item as any).peso_kg ?? 0.75) * item.cantidad,
    0,
  );

  // Items as plain {id_producto, cantidad} for cotizarCarrito
  const carritoItems = useMemo(
    () => items.map(i => ({ id_producto: Number(i.id_producto), cantidad: i.cantidad })),
    [items],
  );

  const hasLoadedRatesRef = useRef(false);
  const hasLoadedDireccionesRef = useRef(false);
  const [ratesMXN, setRatesMXN] = useState<Record<string, number | null>>({ USD: null });
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [taxBreakdown, setTaxBreakdown] = useState<{ tipo: string; nombre: string; tasa: number; monto: number }[]>([]);


  // Cargar tasas del backend
  useEffect(() => {
    if (!hasLoadedRatesRef.current) {
      hasLoadedRatesRef.current = true;
      api.tasasCambio.actuales()
        .then(data => setRatesMXN(data.MXN))
        .catch((err) => console.error('Error loading exchange rates:', err));
    }
  }, []);

  const extraerDireccionDestino = useCallback((dir: Direccion | null): DireccionDestino | null => {
    if (!dir) return null;
    const ub = dir.ubicacion as Record<string, any> | undefined;
    const pais = dir.pais_iso2 ?? ub?.pais;
    const ciudad = dir.ciudad ?? ub?.ciudad;
    const estado = dir.estado ?? ub?.estado;
    const codigo_postal = dir.codigo_postal ?? ub?.codigo_postal;
    if (!pais || !ciudad || !estado || !codigo_postal) return null;
    return { pais, ciudad, estado, codigo_postal };
  }, []);

  const obtenerUbicacionGPS = useCallback((): Promise<Partial<Direccion>> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no disponible en este navegador."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { "Accept-Language": "es", "User-Agent": "Marketplace-Mezcal/1.0" } }
            );
            const data = await res.json();
            const a = data.address ?? {};
            resolve({
              ciudad: a.city ?? a.town ?? a.village ?? a.municipality ?? "",
              estado: a.state ?? "",
              codigo_postal: a.postcode ?? "",
              pais_iso2: (a.country_code ?? "MX").toUpperCase(),
              es_internacional: (a.country_code ?? "mx").toUpperCase() !== "MX",
              ubicacion: { lat, lng, source: "gps" },
            });
          } catch {
            reject(new Error("No se pudo obtener la dirección desde las coordenadas."));
          }
        },
        (err) => reject(new Error(err.message)),
        { timeout: 10000 }
      );
    });
  }, []);

  useEffect(() => {
    // Al cambiar dirección, limpiar datos fiscales del intent anterior para evitar mostrar
    // IVA mexicano en el sidebar cuando el destino cambia a internacional (o viceversa).
    setTaxAmount(0);
    setTaxBreakdown([]);
    if (!direccionSeleccionada) {
      setDireccionIncompleta(false);
      return;
    }
    const destino = extraerDireccionDestino(direccionSeleccionada);
    if (!destino) {
      setDireccionIncompleta(true);
      cotizarPorCarrito(carritoItems, null);
    } else {
      setDireccionIncompleta(false);
      cotizarPorCarrito(carritoItems, destino);
    }
  }, [direccionSeleccionada, carritoItems, cotizarPorCarrito, extraerDireccionDestino]);

  const cargarDirecciones = useCallback(async () => {
    if (!user?.id_usuario) return;
    try {
      const token = getCookie("token") || "";
      const data = await api.direcciones.getByUsuario(user.id_usuario, token);
      const lista = Array.isArray(data) ? data : [];
      setDirecciones(lista);
      if (lista.length === 0) {
        setMostrarFormDireccion(true);
      } else {
        setDireccionSeleccionada(lista[0]);
      }
    } catch {
      setMostrarFormDireccion(true);
    }
  }, [user?.id_usuario]);

  useEffect(() => {
    if (!hasLoadedDireccionesRef.current && user?.id_usuario) {
      hasLoadedDireccionesRef.current = true;
      cargarDirecciones();
    }
  }, [user?.id_usuario, cargarDirecciones]);

  useEffect(() => {
    if (!mostrarFormDireccion || !user) return;
    const nombreCompleto = [user.nombre, user.apellido_paterno, user.apellido_materno]
      .filter(Boolean).join(" ");
    setNuevaDireccion((prev) => ({
      ...prev,
      nombre_destinatario: prev.nombre_destinatario || nombreCompleto || "",
      telefono: prev.telefono || (user.telefono ?? "") || "",
    }));
  }, [mostrarFormDireccion, user]);

  // En inglés, el comprador suele enviar a EE.UU.: predeterminar el país a US
  // mientras el formulario aún no se abre (no pisa una elección del usuario).
  useEffect(() => {
    if (mostrarFormDireccion) return;
    setNuevaDireccion((prev) =>
      locale === "en"
        ? { ...prev, pais_iso2: "US", es_internacional: true }
        : prev,
    );
  }, [locale, mostrarFormDireccion]);

  const guardarNuevaDireccion = useCallback(async () => {
    if (!user?.id_usuario) return;
    
    const esInternacional = nuevaDireccion.es_internacional ?? false;
    const camposFaltantes: string[] = [];
    
    if (esInternacional) {
      if (!nuevaDireccion.linea_1) camposFaltantes.push("línea 1 (dirección)");
    } else {
      if (!nuevaDireccion.calle) camposFaltantes.push("calle");
      if (!nuevaDireccion.numero) camposFaltantes.push("número");
      if (!nuevaDireccion.colonia) camposFaltantes.push("colonia");
    }
    
    if (!nuevaDireccion.ciudad) camposFaltantes.push("ciudad");
    if (!nuevaDireccion.estado) camposFaltantes.push("estado");
    if (!nuevaDireccion.codigo_postal) camposFaltantes.push("código postal");
    if (!nuevaDireccion.pais_iso2) camposFaltantes.push("país");
    
    if (camposFaltantes.length > 0) {
      setErrorMensaje(`Completa los siguientes campos requeridos: ${camposFaltantes.join(", ")}.`);
      return;
    }
    
    const token = getCookie("token") || "";
    try {
      const datosLimpios = Object.fromEntries(
        Object.entries({ id_usuario: user.id_usuario, ...nuevaDireccion }).filter(
          ([_, valor]) => valor !== undefined && valor !== "" && valor !== null
        )
      );
      const creada = await api.direcciones.create(token, datosLimpios);
      setDirecciones((prev) => [...prev, creada as Direccion]);
      setDireccionSeleccionada(creada as Direccion);
      setMostrarFormDireccion(false);
      setNuevaDireccion({ 
        tipo: "hogar", 
        pais_iso2: "MX", 
        es_internacional: false,
        calle: "",
        numero: "",
        colonia: "",
      });
      setErrorMensaje(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "No se pudo guardar la dirección. Intenta de nuevo.";
      setErrorMensaje(errorMsg);
    }
  }, [user?.id_usuario, nuevaDireccion]);

  const avanzarPaso = useCallback(async () => {
    setErrorMensaje(null);
    if (paso === "direccion") {
      if (mostrarFormDireccion) {
        setErrorMensaje("Guarda la dirección antes de continuar.");
        return;
      }

      const tieneCalleNacional = direccionSeleccionada?.calle || direccionSeleccionada?.numero || direccionSeleccionada?.colonia;
      const tieneLineaInternacional = direccionSeleccionada?.linea_1;

      if (!tieneCalleNacional && !tieneLineaInternacional) {
        setErrorMensaje("Selecciona o agrega una dirección de envío.");
        return;
      }
      if (direccionIncompleta) {
        setErrorMensaje("La dirección seleccionada no tiene todos los datos requeridos (ciudad, estado, código postal, país). Por favor actualízala.");
        return;
      }

      const pais_iso2 = direccionSeleccionada?.pais_iso2 ?? (direccionSeleccionada?.ubicacion as any)?.pais ?? "MX";
      if (pais_iso2 === "US" && items.length > 0) {
        const estado_codigo = direccionSeleccionada?.estado ?? (direccionSeleccionada?.ubicacion as any)?.estado;
        try {
          const resultado = await api.pedidos.validarEnvio({
            pais_iso2,
            estado_codigo: estado_codigo ?? undefined,
            items: items.map((i) => ({ id_producto: Number(i.id_producto), cantidad: i.cantidad })),
          });
          if (!resultado.valido) {
            const estadoNombre = estado_codigo ?? "este estado";
            const lista = resultado.items_bloqueados
              .map((b: { nombre: string; razon?: string }) =>
                b.razon ? `• ${b.nombre} (${b.razon})` : `• ${b.nombre}`,
              )
              .join("\n");
            setErrorMensaje(
              `Los siguientes productos no pueden enviarse a ${estadoNombre}, EE. UU.:\n${lista}\n\nRetíralos del carrito o elige otra dirección de envío.`,
            );
            return;
          }
        } catch {
          // Ignorar error técnico
        }
      }

      setPaso("envio");
    } else if (paso === "envio") {
      if (!todosSeleccionados) {
        setErrorMensaje("Selecciona una opción de envío para continuar.");
        return;
      }
      setPaso("pago");
    } else if (paso === "pago") {
      setPaso("resumen");
    }
  }, [paso, mostrarFormDireccion, direccionSeleccionada, direccionIncompleta, todosSeleccionados, items]);

  const retrocederPaso = useCallback(() => {
    setErrorMensaje(null);
    if (paso === "envio") setPaso("direccion");
    else if (paso === "pago") setPaso("envio");
    else if (paso === "resumen") setPaso("pago");
  }, [paso]);

  const buildShippingAddressForStripe = useCallback((dir: Direccion) => {
    const ub = dir.ubicacion as Record<string, any> | undefined;
    const country = (dir.pais_iso2 ?? ub?.pais ?? "MX").toUpperCase();
    const line1 = dir.es_internacional
      ? (dir.linea_1 ?? "")
      : [dir.calle, dir.numero].filter(Boolean).join(" ");
    const line2 = dir.es_internacional
      ? (dir.linea_2 ?? undefined)
      : (dir.colonia ?? undefined);
    return {
      line1: line1 || "",
      line2: line2 || undefined,
      city: dir.ciudad ?? ub?.ciudad ?? "",
      state: dir.estado ?? ub?.estado ?? "",
      postal_code: dir.codigo_postal ?? ub?.codigo_postal ?? "",
      country,
    };
  }, []);

  const prepararPago = useCallback(async () => {
    if (!user?.id_usuario || !direccionSeleccionada || !todosSeleccionados) return null;
    if (metodoPago === 'stripe' && clientSecret && pedidoIdCreado) {
      return { pedidoId: pedidoIdCreado, clientSecret };
    }
    if (metodoPago === 'paypal' && paypalOrderId && pedidoIdCreado) {
      return { pedidoId: pedidoIdCreado, paypalOrderId };
    }
    const token = getCookie("token") || "";
    setCargando(true);
    setErrorMensaje(null);

    // Declarados fuera del try para que el catch exterior pueda cancelar el pedido si el setup falla
    let pedidoId!: string;
    let pedidoRecienCreado = false;

    try {
      // Sum all per-producer shipping quotes, converting each to MXN
      const costoEnvioMXN = parseFloat(
        Object.values(seleccionados).reduce((sum, q) => {
          const moneda = (q.moneda ?? 'MXN').toUpperCase();
          const enMXN = moneda !== 'MXN' && ratesMXN[moneda as keyof typeof ratesMXN]
            ? q.precioTotal / ratesMXN[moneda as keyof typeof ratesMXN]!
            : q.precioTotal;
          return sum + enMXN;
        }, 0).toFixed(2),
      );
      const subtotal = parseFloat(precioTotal.toFixed(2));
      const proteccionMXN = solicitarProteccion ? costoProteccionEstimadoMXN : 0;
      const totalConEnvio = parseFloat((precioTotal + costoEnvioMXN + proteccionMXN).toFixed(2));
      if (pedidoIdCreado) {
        pedidoId = pedidoIdCreado;
      } else if (isCreatingPedidoRef.current) {
        // Otra llamada concurrente ya está creando el pedido; abortar silenciosamente.
        return null;
      } else {
        isCreatingPedidoRef.current = true;
        const pedido = await api.pedidos.create(token, {
          id_usuario: user.id_usuario,
          estado: "pendiente",
          total: totalConEnvio.toString(),  // siempre en MXN
          moneda: 'MXN',
          tipo_cambio: currency !== 'MXN' && ratesMXN[currency as keyof typeof ratesMXN]
            ? String(ratesMXN[currency as keyof typeof ratesMXN])
            : undefined,
          moneda_referencia: currency !== 'MXN' ? currency : undefined,
          pais_destino_iso2: direccionSeleccionada.pais_iso2 ?? (direccionSeleccionada.ubicacion as any)?.pais ?? "MX",
          direccion_envio_snapshot: direccionSeleccionada,
        }) as { id?: number; id_pedido?: number };

        if (!pedido.id_pedido && !pedido.id) {
          throw new Error("No se obtuvo el ID del pedido del servidor.");
        }
        pedidoId = String(pedido.id_pedido ?? pedido.id);
        pedidoRecienCreado = true;
        // No setar pedidoIdCreado aquí: si addDetalle/envio falla, el estado
        // quedaría con un pedido sin ítems y el siguiente intento saltaría la creación.

        for (const item of items) {
          await api.pedidos.addDetalle(token, pedidoId, {
            id_producto: Number(item.id_producto),
            cantidad: item.cantidad,
            precio_compra: item.precio_base,
            moneda_compra: "MXN",
          });
        }

        // Save a preliminary envio record with the total shipping cost.
        // Per-producer envios + guides are created automatically after payment confirmation.
        const primeraSeleccion = Object.values(seleccionados)[0];
        await api.envios.create(token, {
          id_pedido: Number(pedidoId),
          costo_envio: String(costoEnvioMXN),
          moneda_costo: 'MXN',
          peso_kg: String(pesoTotal),
          estado: "preparando",
          transportista_codigo: (primeraSeleccion as any)?.carrier,
          codigo_servicio: primeraSeleccion?.productCode,
          solicitar_proteccion: solicitarProteccion,
        });

        // Save one cotización per producer group so the backend can validate shipping amount
        const destino = extraerDireccionDestino(direccionSeleccionada);
        console.log('[useCheckout] Guardando cotizaciones al backend:', Object.entries(seleccionados).map(([idProd, q]) => ({
          id_productor: idProd,
          productCode: q.productCode,
          productName: q.productName,
          carrier: q.carrier,
          providerName: q.providerName,
          precio: q.precioTotal,
          moneda: q.moneda,
        })));
        for (const [idProductor, quote] of Object.entries(seleccionados)) {
          await api.envios.guardarCotizacion(token, {
            id_pedido: Number(pedidoId),
            precioTotal: quote.precioTotal,
            fechaEntregaEstimada: quote.fechaEntregaEstimada,
            request: { destino, id_productor: Number(idProductor) },
            response: {
              productCode: quote.productCode,
              productName: quote.productName,
              providerName: quote.providerName,
              carrier: quote.carrier,
              tipo: quote.tipo,
              moneda: quote.moneda,
              skydropxQuotationId: quote.skydropxQuotationId,
              skydropxRateId: quote.skydropxRateId,
            },
          });
        }

        // Solo persistir el ID después de que TODO el setup fue exitoso
        setPedidoIdCreado(pedidoId);
        if (pedido.numero_orden) setNumeroOrdenCreado(Number(pedido.numero_orden));
      }

      const recipientName =
        direccionSeleccionada.nombre_destinatario ||
        [user.nombre, user.apellido_paterno, user.apellido_materno].filter(Boolean).join(" ") ||
        "Cliente";

      let pagoResponse;
      try {
        if (metodoPago === 'paypal') {
          pagoResponse = await api.pagos.paypal.createOrder(token, {
            id_pedido: pedidoId,
            subtotal,
            shipping_amount: costoEnvioMXN + proteccionMXN,
            moneda: "MXN",
            shipping_address: buildShippingAddressForStripe(direccionSeleccionada),
          });
          setPaypalOrderId(pagoResponse.orderId);
          setTaxAmount(pagoResponse.taxAmount ?? 0);
          setTaxBreakdown(pagoResponse.taxBreakdown ?? []);
          return { pedidoId, paypalOrderId: pagoResponse.orderId };
        } else {
          pagoResponse = await api.pagos.stripe.createIntent(token, {
            id_pedido: pedidoId,
            subtotal,
            shipping_amount: costoEnvioMXN + proteccionMXN,
            moneda: "MXN",
            shipping_address: buildShippingAddressForStripe(direccionSeleccionada),
            recipient_name: recipientName,
          });
          setClientSecret(pagoResponse.clientSecret);
          setPaymentIntentId(pagoResponse.paymentIntentId);
          setTaxAmount(pagoResponse.taxAmount ?? 0);
          setTaxBreakdown(pagoResponse.taxBreakdown ?? []);
          return { pedidoId, clientSecret: pagoResponse.clientSecret };
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === "AGE_DOB_REQUIRED") {
          setDobRequired({
            edadRequerida: Number(err.details?.edadRequerida ?? 21),
            message: err.message,
          });
          return null;
        }
        if (err instanceof ApiError && err.code === "AGE_INSUFFICIENT") {
          setErrorMensaje(err.message);
          return null;
        }
        // Cancelar el pedido si fue creado en esta misma llamada
        if (pedidoRecienCreado) {
          try { await api.pedidos.update(token, pedidoId, { estado: "cancelado" }); } catch {}
          setPedidoIdCreado(null);
        }
        throw err;
      }
    } catch (err) {
      // Si el pedido fue creado en esta llamada pero el setup falló (addDetalle/envio),
      // hay que cancelarlo para que el siguiente intento pueda crear uno nuevo limpio.
      if (pedidoRecienCreado) {
        try { await api.pedidos.update(token, pedidoId, { estado: "cancelado" }); } catch {}
        setPedidoIdCreado(null);
      }
      const msg = err instanceof Error ? err.message : "Error desconocido";
      // Si las cotizaciones expiraron, redirigir al paso de envío para recotizar
      if (msg.includes("COTIZACIONES_EXPIRADAS")) {
        setErrorMensaje("Las cotizaciones de envío han expirado. Selecciona una tarifa actualizada.");
        setPaso("envio");
        return null;
      }
      setErrorMensaje(msg);
      return null;
    } finally {
      setCargando(false);
      isCreatingPedidoRef.current = false;
    }
  }, [
    user,
    direccionSeleccionada,
    seleccionados,
    todosSeleccionados,
    precioTotal,
    items,
    pesoTotal,
    currency,
    ratesMXN,
    extraerDireccionDestino,
    buildShippingAddressForStripe,
    clientSecret,
    paypalOrderId,
    pedidoIdCreado,
    metodoPago,
    solicitarProteccion,
  ]);

  const capturePaypalOrder = useCallback(async (orderId: string) => {
    if (!pedidoIdCreado) {
      setErrorMensaje("Pedido no creado");
      return;
    }
    const token = getCookie("token") || "";
    setCargando(true);
    setErrorMensaje(null);
    try {
      await api.pagos.paypal.captureOrder(token, { paypal_order_id: orderId });
      limpiarCarrito();
      router.push(`/tienda/checkout/pago-exitoso?pedido=${pedidoIdCreado}`);
    } catch (err) {
      setErrorMensaje(err instanceof Error ? err.message : "Error al capturar el pago con PayPal.");
    } finally {
      setCargando(false);
    }
  }, [pedidoIdCreado, router, limpiarCarrito]);

  const submitDob = useCallback(async (fechaNacimientoISO: string) => {
    if (!user?.id_usuario) return false;
    const token = getCookie("token") || "";
    setErrorMensaje(null);
    try {
      await api.usuarios.update(token, user.id_usuario, { fecha_nacimiento: fechaNacimientoISO });
      setDobRequired(null);
      const result = await prepararPago();
      return !!result;
    } catch (err) {
      if (err instanceof ApiError && err.code === "AGE_INSUFFICIENT") {
        setErrorMensaje(err.message);
      } else {
        setErrorMensaje(err instanceof Error ? err.message : "No se pudo guardar la fecha de nacimiento.");
      }
      return false;
    }
  }, [user?.id_usuario, prepararPago]);

  const totalEnvioMXN = Object.values(seleccionados).reduce((sum, q) => {
    const moneda = (q.moneda ?? 'MXN').toUpperCase();
    const enMXN = moneda !== 'MXN' && ratesMXN[moneda as keyof typeof ratesMXN]
      ? q.precioTotal / ratesMXN[moneda as keyof typeof ratesMXN]!
      : q.precioTotal;
    return sum + enMXN;
  }, 0);

  const costoProteccionEstimadoMXN = nivelKey
    ? (opcionesAgregadas.find(o => o.key === nivelKey)?.totalProteccionEstimadaMXN ?? 0)
    : 0;

  const totalConEnvio = precioTotal + totalEnvioMXN + (solicitarProteccion ? costoProteccionEstimadoMXN : 0);

  return {
    paso,
    setPaso,
    direcciones,
    direccionSeleccionada,
    setDireccionSeleccionada,
    mostrarFormDireccion,
    setMostrarFormDireccion,
    nuevaDireccion,
    setNuevaDireccion,
    guardarNuevaDireccion,
    // Multi-producer shipping — unified selection
    gruposEnvio: grupos,
    opcionesAgregadas,
    nivelKey,
    setNivel,
    seleccionados,
    cotizandoLoading,
    cotizandoError,
    todosSeleccionados,
    tieneAlcohol,
    totalEnvioMXN,
    // Keep backward-compat alias
    cotizaciones: grupos.flatMap(g => g.quotes),
    direccionIncompleta,
    tarjeta,
    setTarjeta,
    avanzarPaso,
    retrocederPaso,
    prepararPago,
    cargando,
    setCargando,
    errorMensaje,
    setErrorMensaje,
    totalConEnvio,
    pesoTotal,
    obtenerUbicacionGPS,
    clientSecret,
    paymentIntentId,
    pedidoIdCreado,
    numeroOrdenCreado,
    taxAmount,
    taxBreakdown,
    metodoPago,
    setMetodoPago,
    paypalOrderId,
    capturePaypalOrder,
    dobRequired,
    submitDob,
    solicitarProteccion,
    setSolicitarProteccion,
    costoProteccionEstimadoMXN,
  };
}