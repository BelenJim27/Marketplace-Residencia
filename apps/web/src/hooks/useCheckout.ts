"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { useLocale } from "@/context/LocaleContext";

// Importación limpia del hook genérico
import { useShipping, ShippingQuote, DireccionDestino } from "./useShipping"; 

import { getExchangeRates } from "@/lib/i18n";
import type { CheckoutStep, Direccion, TarjetaMock } from "@/types/checkout";

export type { CheckoutStep, Direccion, TarjetaMock } from "@/types/checkout";

export interface DobRequiredState {
  edadRequerida: number;
  message: string;
}

export function useCheckout() {
  const router = useRouter();
  const { items, precioTotal, limpiarCarrito } = useCarrito();
  const { user } = useAuth();
  const { currency } = useLocale();
  const { opciones, loading: cotizandoLoading, error: cotizandoError, seleccionado, cotizarTodos, setSeleccionado } = useShipping();

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

  // CAMBIO 3: Actualizado a ShippingQuote | null
  const [envioSeleccionado, setEnvioSeleccionado] = useState<ShippingQuote | null>(null);
  
  const [tarjeta, setTarjeta] = useState<TarjetaMock>({ numero: "", expiracion: "", cvv: "", nombre: "" });
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [direccionIncompleta, setDireccionIncompleta] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [pedidoIdCreado, setPedidoIdCreado] = useState<string | null>(null);

  const [dobRequired, setDobRequired] = useState<DobRequiredState | null>(null);

  const pesoTotal = items.reduce(
    (sum, item) => sum + ((item as any).peso_kg ?? 0.75) * item.cantidad,
    0,
  );

  // Calcula el bounding box de todas las dimensiones del carrito
  const dimsEnvio = useMemo(() => {
    const max = items.reduce(
      (acc, item) => ({
        alto_cm: Math.max(acc.alto_cm, (item as any).alto_cm ?? 0),
        ancho_cm: Math.max(acc.ancho_cm, (item as any).ancho_cm ?? 0),
        largo_cm: Math.max(acc.largo_cm, (item as any).largo_cm ?? 0),
      }),
      { alto_cm: 0, ancho_cm: 0, largo_cm: 0 },
    );
    return {
      alto_cm: max.alto_cm || 15,
      ancho_cm: max.ancho_cm || 15,
      largo_cm: max.largo_cm || 20,
    };
  }, [items]);

  const hasLoadedRef = useRef(false);
  const [ratesMXN, setRatesMXN] = useState<Record<string, number>>({ USD: 20 });

  useEffect(() => {
    if (seleccionado) {
      setEnvioSeleccionado(seleccionado);
    }
  }, [seleccionado]);

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
    if (!direccionSeleccionada) {
      setDireccionIncompleta(false);
      setEnvioSeleccionado(null);
      return;
    }
    const destino = extraerDireccionDestino(direccionSeleccionada);
    if (!destino) {
      setDireccionIncompleta(true);
      setEnvioSeleccionado(null);
      cotizarTodos(pesoTotal, null, dimsEnvio);
    } else {
      setDireccionIncompleta(false);
      cotizarTodos(pesoTotal, destino, dimsEnvio);
    }
  }, [direccionSeleccionada, pesoTotal, dimsEnvio, cotizarTodos, extraerDireccionDestino]);

  useEffect(() => {
    setEnvioSeleccionado(seleccionado || null);
  }, [seleccionado]);

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
    if (!hasLoadedRef.current && user?.id_usuario) {
      hasLoadedRef.current = true;
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
            const nombres = resultado.items_bloqueados.map((b) => b.nombre).join(", ");
            setErrorMensaje(
              `No es posible enviar los siguientes productos a este estado de EE. UU.: ${nombres}. Retíralos del carrito o elige otra dirección.`,
            );
            return;
          }
        } catch {
          // Ignorar error técnico
        }
      }

      setPaso("envio");
    } else if (paso === "envio") {
      if (!envioSeleccionado) {
        setErrorMensaje("Selecciona un método de envío.");
        return;
      }
      setPaso("pago");
    } else if (paso === "pago") {
      setPaso("resumen");
    }
  }, [paso, direccionSeleccionada, direccionIncompleta, envioSeleccionado, items]);

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
    if (!user?.id_usuario || !direccionSeleccionada || !envioSeleccionado) return null;
    if (clientSecret && pedidoIdCreado) {
      return { pedidoId: pedidoIdCreado, clientSecret };
    }
    const token = getCookie("token") || "";
    setCargando(true);
    setErrorMensaje(null);

    try {
      const costoEnvio = envioSeleccionado.precioTotal;
      const subtotal = parseFloat(precioTotal.toFixed(2));
      const totalConEnvio = parseFloat((precioTotal + costoEnvio).toFixed(2));

      let pedidoId: string;
      let pedidoRecienCreado = false;
      if (pedidoIdCreado) {
        pedidoId = pedidoIdCreado;
      } else {
        const pedido = await api.pedidos.create(token, {
          id_usuario: user.id_usuario,
          estado: "pendiente",
          total: totalConEnvio.toString(),
          moneda: currency,
          tipo_cambio: currency === "USD" ? String(ratesMXN?.USD ?? 1) : undefined,
          moneda_referencia: "MXN",
          pais_destino_iso2: direccionSeleccionada.pais_iso2 ?? (direccionSeleccionada.ubicacion as any)?.pais ?? "MX",
          direccion_envio_snapshot: direccionSeleccionada,
        }) as { id?: number; id_pedido?: number };

        if (!pedido.id_pedido && !pedido.id) {
          throw new Error("No se obtuvo el ID del pedido del servidor.");
        }
        pedidoId = String(pedido.id_pedido ?? pedido.id);
        pedidoRecienCreado = true;
        setPedidoIdCreado(pedidoId);

        for (const item of items) {
          await api.pedidos.addDetalle(token, pedidoId, {
            id_producto: Number(item.id_producto),
            cantidad: item.cantidad,
            precio_compra: item.precio_base,
            moneda_compra: "MXN",
          });
        }

        // CAMBIO 2: Inclusión de transportista_codigo y codigo_servicio
        await api.envios.create(token, {
          id_pedido: Number(pedidoId),
          costo_envio: String(costoEnvio),
          moneda_costo: envioSeleccionado.moneda,
          peso_kg: String(pesoTotal),
          estado: "preparando",
          transportista_codigo: (envioSeleccionado as any).carrier, // nuevo
          codigo_servicio: envioSeleccionado.productCode,           // nuevo
        });

        await api.envios.guardarCotizacion(token, {
          id_pedido: Number(pedidoId),
          precioTotal: envioSeleccionado.precioTotal,
          fechaEntregaEstimada: envioSeleccionado.fechaEntregaEstimada,
          request: {
            destino: extraerDireccionDestino(direccionSeleccionada),
            peso_kg: pesoTotal,
          },
          response: {
            productCode: envioSeleccionado.productCode,
            productName: envioSeleccionado.productName,
            tipo: envioSeleccionado.tipo,
            moneda: envioSeleccionado.moneda,
          },
        });
      }

      const recipientName =
        direccionSeleccionada.nombre_destinatario ||
        [user.nombre, user.apellido_paterno, user.apellido_materno].filter(Boolean).join(" ") ||
        "Cliente";

      let pagoResponse;
      try {
        pagoResponse = await api.pagos.stripe.createIntent(token, {
          id_pedido: pedidoId,
          subtotal,
          shipping_amount: costoEnvio,
          moneda: "MXN",
          shipping_address: buildShippingAddressForStripe(direccionSeleccionada),
          recipient_name: recipientName,
          automatic_tax: true,
        });
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

      setClientSecret(pagoResponse.clientSecret);
      setPaymentIntentId(pagoResponse.paymentIntentId);

      return { pedidoId, clientSecret: pagoResponse.clientSecret };
    } catch (err) {
      setErrorMensaje(err instanceof Error ? err.message : "Error desconocido");
      return null;
    } finally {
      setCargando(false);
    }
  }, [
    user,
    direccionSeleccionada,
    envioSeleccionado,
    precioTotal,
    items,
    pesoTotal,
    currency,
    ratesMXN,
    extraerDireccionDestino,
    buildShippingAddressForStripe,
    clientSecret,
    pedidoIdCreado,
  ]);

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

  const totalConEnvio = precioTotal + (envioSeleccionado?.precioTotal ?? 0);

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
    cotizaciones: opciones,
    cotizandoLoading,
    cotizandoError,
    envioSeleccionado,
    setEnvioSeleccionado,
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
    dobRequired,
    submitDob,
  };
}