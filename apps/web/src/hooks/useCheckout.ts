"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { useDHLShipping, DHLQuote, DireccionDestino } from "@/hooks/useDHLShipping";
import type { CheckoutStep, Direccion, TarjetaMock } from "@/types/checkout";

export type { CheckoutStep, Direccion, TarjetaMock } from "@/types/checkout";

export function useCheckout() {
  const router = useRouter();
  const { items, precioTotal, limpiarCarrito } = useCarrito();
  const { user } = useAuth();
  const { opciones, loading: cotizandoLoading, error: cotizandoError, seleccionado, cotizarTodos, setSeleccionado } = useDHLShipping();

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
  const [envioSeleccionado, setEnvioSeleccionado] = useState<DHLQuote | null>(null);
  const [tarjeta, setTarjeta] = useState<TarjetaMock>({ numero: "", expiracion: "", cvv: "", nombre: "" });
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [direccionIncompleta, setDireccionIncompleta] = useState(false);

  const pesoTotal = items.length * 0.75;
  const hasLoadedRef = useRef(false);

  const extraerDireccionDestino = useCallback((dir: Direccion | null): DireccionDestino | null => {
    if (!dir) return null;
    // Usa campos directos primero; cae al blob ubicacion para compatibilidad con registros anteriores
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
    const destino = extraerDireccionDestino(direccionSeleccionada);
    if (!destino) {
      setDireccionIncompleta(true);
      setEnvioSeleccionado(null);
    } else {
      setDireccionIncompleta(false);
      cotizarTodos(pesoTotal, destino);
    }
  }, [direccionSeleccionada, pesoTotal]);

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
    
    // Validar campos requeridos según tipo de dirección
    const esInternacional = nuevaDireccion.es_internacional ?? false;
    const camposFaltantes: string[] = [];
    
    if (esInternacional) {
      // Para direcciones internacionales: linea_1, linea_2
      if (!nuevaDireccion.linea_1) camposFaltantes.push("línea 1 (dirección)");
    } else {
      // Para direcciones nacionales (México): calle, número, colonia
      if (!nuevaDireccion.calle) camposFaltantes.push("calle");
      if (!nuevaDireccion.numero) camposFaltantes.push("número");
      if (!nuevaDireccion.colonia) camposFaltantes.push("colonia");
    }
    
    // Campos comunes requeridos
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
      // Filtrar campos undefined y strings vacíos
      const datosLimpios = Object.fromEntries(
        Object.entries({ id_usuario: user.id_usuario, ...nuevaDireccion }).filter(
          ([_, valor]) => valor !== undefined && valor !== "" && valor !== null
        )
      );
      console.log("Datos a guardar:", datosLimpios);
      const creada = await api.direcciones.create(token, datosLimpios);
      console.log("Dirección guardada:", creada);
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
      console.error("Error guardando dirección:", err);
      const errorMsg = err instanceof Error ? err.message : "No se pudo guardar la dirección. Intenta de nuevo.";
      setErrorMensaje(errorMsg);
    }
  }, [user?.id_usuario, nuevaDireccion]);

  const avanzarPaso = useCallback(() => {
    setErrorMensaje(null);
    if (paso === "direccion") {
      // Validar que exista dirección seleccionada con datos completos
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
      setPaso("envio");
    } else if (paso === "envio") {
      if (!envioSeleccionado) {
        setErrorMensaje("Selecciona un método de envío.");
        return;
      }
      setPaso("pago");
    } else if (paso === "pago") {
      const numLimpio = tarjeta.numero.replace(/\s/g, "");
      if (numLimpio.length < 16) {
        setErrorMensaje("Ingresa un número de tarjeta válido (16 dígitos).");
        return;
      }
      if (tarjeta.expiracion.length < 5) {
        setErrorMensaje("Ingresa la fecha de expiración (MM/YY).");
        return;
      }
      if (tarjeta.cvv.length < 3) {
        setErrorMensaje("Ingresa el CVV (3 dígitos).");
        return;
      }
      setPaso("resumen");
    }
  }, [paso, direccionSeleccionada, envioSeleccionado, tarjeta]);

  const retrocederPaso = useCallback(() => {
    setErrorMensaje(null);
    if (paso === "envio") setPaso("direccion");
    else if (paso === "pago") setPaso("envio");
    else if (paso === "resumen") setPaso("pago");
  }, [paso]);

  const confirmarPago = useCallback(async () => {
    if (!user?.id_usuario || !direccionSeleccionada || !envioSeleccionado) return;
    const token = getCookie("token") || "";
    setCargando(true);
    setErrorMensaje(null);

    try {
      const costoEnvio = envioSeleccionado.precioTotal;
      const totalConEnvio = (precioTotal + costoEnvio).toFixed(2);

      const pedido = await api.pedidos.create(token, {
        id_usuario: user.id_usuario,
        estado: "pendiente",
        total: totalConEnvio,
        moneda: "MXN",
        pais_destino_iso2: direccionSeleccionada.pais_iso2 ?? (direccionSeleccionada.ubicacion as any)?.pais ?? "MX",
        direccion_envio_snapshot: direccionSeleccionada,
      }) as { id?: number; id_pedido?: number };

      if (!pedido.id_pedido && !pedido.id) {
        throw new Error("No se obtuvo el ID del pedido del servidor.");
      }
      const pedidoId = String(pedido.id_pedido ?? pedido.id);

      for (const item of items) {
        await api.pedidos.addDetalle(token, pedidoId, {
          id_producto: Number(item.id_producto),
          cantidad: item.cantidad,
          precio_compra: item.precio_base,
          moneda_compra: "MXN",
        });
      }

      await api.pagos.create(token, {
        id_pedido: Number(pedidoId),
        proveedor: "stripe_mock",
        payment_intent_id: `mock_pi_${Date.now()}`,
        estado: "completado",
        monto: totalConEnvio,
        moneda: "MXN",
      });

      await api.envios.create(token, {
        id_pedido: Number(pedidoId),
        costo_envio: String(costoEnvio),
        moneda_costo: envioSeleccionado.moneda,
        peso_kg: String(pesoTotal),
        estado: "preparando",
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

      limpiarCarrito();
      router.push(`/tienda/checkout/pago-exitoso?pedido=${pedidoId}`);
    } catch (err) {
      console.error("Error en checkout:", err);
      router.push("/tienda/checkout/pago-fallido");
    } finally {
      setCargando(false);
    }
  }, [user, direccionSeleccionada, envioSeleccionado, precioTotal, items, limpiarCarrito, router]);

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
    confirmarPago,
    cargando,
    errorMensaje,
    totalConEnvio,
    pesoTotal,
    obtenerUbicacionGPS,
  };
}
