"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCarrito } from "@/context/CarritoContext";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { useDHLShipping, DHLServiceType, DHLQuote } from "@/hooks/useDHLShipping";

export type CheckoutStep = "direccion" | "envio" | "pago" | "resumen";

export interface Direccion {
  id?: number | string;
  linea_1?: string;
  linea_2?: string;
  tipo?: string;
  referencia?: string;
  es_internacional?: boolean;
}

export interface TarjetaMock {
  numero: string;
  expiracion: string;
  cvv: string;
  nombre: string;
}

export function useCheckout() {
  const router = useRouter();
  const { items, precioTotal, limpiarCarrito } = useCarrito();
  const { user } = useAuth();
  const { cotizarTodos } = useDHLShipping();

  const [paso, setPaso] = useState<CheckoutStep>("direccion");
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<Direccion | null>(null);
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState<Direccion>({ tipo: "hogar" });
  const [cotizaciones, setCotizaciones] = useState<DHLQuote[]>([]);
  const [envioSeleccionado, setEnvioSeleccionado] = useState<DHLQuote | null>(null);
  const [tarjeta, setTarjeta] = useState<TarjetaMock>({ numero: "", expiracion: "", cvv: "", nombre: "" });
  const [cargando, setCargando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const pesoTotal = items.length * 0.75;

  useEffect(() => {
    const quotes = cotizarTodos(pesoTotal, "MX");
    setCotizaciones(quotes);
    setEnvioSeleccionado(quotes[1]); // Estándar por defecto
    // cotizarTodos es estable (no usa estado externo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesoTotal]);

  const cargarDirecciones = useCallback(async () => {
    if (!user?.id_usuario) return;
    try {
      const data = await api.direcciones.getByUsuario(user.id_usuario);
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
    cargarDirecciones();
  }, [cargarDirecciones]);

  const guardarNuevaDireccion = useCallback(async () => {
    if (!user?.id_usuario || !nuevaDireccion.linea_1) return;
    const token = getCookie("token") || "";
    try {
      const creada = await api.direcciones.create(token, {
        id_usuario: user.id_usuario,
        ...nuevaDireccion,
      });
      setDirecciones((prev) => [...prev, creada as Direccion]);
      setDireccionSeleccionada(creada as Direccion);
      setMostrarFormDireccion(false);
      setNuevaDireccion({ tipo: "hogar" });
    } catch {
      setErrorMensaje("No se pudo guardar la dirección. Intenta de nuevo.");
    }
  }, [user?.id_usuario, nuevaDireccion]);

  const avanzarPaso = useCallback(() => {
    setErrorMensaje(null);
    if (paso === "direccion") {
      if (!direccionSeleccionada?.linea_1) {
        setErrorMensaje("Selecciona o agrega una dirección de envío.");
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
      const costoEnvio = envioSeleccionado.precio;
      const totalConEnvio = (precioTotal + costoEnvio).toFixed(2);

      const pedido = await api.pedidos.create(token, {
        id_usuario: user.id_usuario,
        estado: "pendiente",
        total: totalConEnvio,
        moneda: "MXN",
        pais_destino_iso2: "MX",
        direccion_envio_snapshot: direccionSeleccionada,
      }) as { id?: number; id_pedido?: number };

      const pedidoId = String(pedido.id || pedido.id_pedido);

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
        moneda_costo: "MXN",
        peso_kg: String(envioSeleccionado.pesoKg),
        estado: "preparando",
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

  const totalConEnvio = precioTotal + (envioSeleccionado?.precio ?? 0);

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
    cotizaciones,
    envioSeleccionado,
    setEnvioSeleccionado,
    tarjeta,
    setTarjeta,
    avanzarPaso,
    retrocederPaso,
    confirmarPago,
    cargando,
    errorMensaje,
    totalConEnvio,
    pesoTotal,
  };
}
