"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Package, User, MapPin, Truck, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

// ─── Instrucciones de empaque por paquetería ─────────────────────────────────

const PACKING_RULES: Record<string, { titulo: string; pasos: string[] }> = {
  dhl: {
    titulo: 'DHL Express',
    pasos: [
      'Caja de cartón doble corrugado (clase 4G)',
      'Cada botella envuelta en plástico de burbujas (mín. 5 cm de protección)',
      'Separadores de cartón entre botellas',
      'Máx. 30 kg por paquete',
      'Declara "Bebida alcohólica destilada – Mezcal" en el formulario de contenido',
      'La guía ya incluye "Adult Signature Required" — no agregar etiquetas adicionales',
      'Etiqueta "FRÁGIL" y "NO INVERTIR" en todas las caras de la caja',
    ],
  },
  fedex: {
    titulo: 'FedEx',
    pasos: [
      'Caja de doble corrugado o madera (clase 4G)',
      'Cada botella sellada en bolsa de plástico individual (previene derrames)',
      'Máx. 68 kg por paquete',
      'Sella con cinta de seguridad en todas las costuras',
      'La guía ya incluye "Adult Signature Required"',
      'Declara el valor de la mercancía en la guía antes de imprimir',
      'Etiqueta "FRÁGIL" en todas las caras',
    ],
  },
  estafeta: {
    titulo: 'Estafeta',
    pasos: [
      'Caja corrugada resistente (clase 4G)',
      'Embalaje secundario interior: bolsa de plástico gruesa por si hay derrames',
      'Separadores de cartón entre botellas',
      'Máx. 30 kg por paquete',
      'Declara "Bebida alcohólica" en el manifiesto de envío',
      'Etiqueta "FRÁGIL" en las 6 caras de la caja',
      'No cubrir el código de barras de la guía con cinta adhesiva',
    ],
  },
  paquetexpress: {
    titulo: 'Paquetexpress',
    pasos: [
      'Caja doble corrugado reforzada (clase 4G)',
      'Máx. 20 kg por caja — divide en varias cajas si es necesario',
      'Solo servicio Ground (terrestre) — solo destinos urbanos',
      'Separadores de cartón o espuma entre botellas',
      'Etiqueta "FRÁGIL" visible en las 4 caras laterales',
      'No enviar a zonas rurales o de difícil acceso',
    ],
  },
  redpack: {
    titulo: 'Redpack',
    pasos: [
      'Caja de doble corrugado (clase 4G)',
      'Material absorbente (papel kraft o espuma) entre botellas',
      'Máx. 25 kg por paquete',
      'Sella herméticamente con cinta de embalaje resistente',
      'Etiqueta "FRÁGIL" y "NO INVERTIR" en todas las caras',
    ],
  },
};

const PACKING_GENERAL = [
  'Usa siempre caja 4G (doble corrugado) — no cajas de supermercado ni usadas',
  'Cada botella individualmente envuelta en plástico de burbujas',
  'Separadores de cartón rígido entre botellas',
  'Rellena los espacios vacíos con papel kraft o espuma',
  'El peso máximo recomendado es 20 kg por caja',
  'Etiqueta "FRÁGIL" y "NO INVERTIR" en todas las caras de la caja',
];

const ALCOHOL_EXTRA = [
  'Requiere firma de adulto (+18) al momento de entrega — ya configurado en la guía',
  'Declara el contenido como "Bebida alcohólica destilada – Mezcal"',
  'Código SAT del producto: 50202200 (ya incluido en la carta porte)',
  'Conserva la factura del productor durante el traslado',
];

function PackingInstructions({ carrierName, isAlcohol }: { carrierName: string | null; isAlcohol: boolean }) {
  const key = (carrierName ?? '').toLowerCase().replace(/\s+/g, '');
  const matched = Object.entries(PACKING_RULES).find(([k]) => key.includes(k));
  const rules = matched ? matched[1] : null;

  return (
    <div className="rounded-xl border border-[#C5CFB0] bg-[#F4F0E3]/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
        <Package className="h-4 w-4 text-[#3D6B3F]" />
        Instrucciones de Empaque
        {rules && (
          <span className="ml-auto rounded-full bg-[#3D6B3F]/10 px-2.5 py-0.5 text-xs font-medium text-[#3D6B3F]">
            {rules.titulo}
          </span>
        )}
      </div>

      <ol className="space-y-1.5">
        {(rules?.pasos ?? PACKING_GENERAL).map((paso, i) => (
          <li key={i} className="flex gap-2 text-sm text-[#1F3A2E]/80">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#3D6B3F]/10 text-xs font-bold text-[#3D6B3F]">
              {i + 1}
            </span>
            {paso}
          </li>
        ))}
      </ol>

      {isAlcohol && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
          <p className="mb-1.5 text-xs font-semibold text-amber-800">Requisitos adicionales — Bebidas alcohólicas</p>
          <ul className="space-y-1">
            {ALCOHOL_EXTRA.map((item, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-amber-700">
                <span className="flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface PedidoProductor {
  id_pedido: number;
  estado_productor: string;
  estado_pedido: string;
  cliente: { nombre: string; email: string };
  total_parcial: number;
  moneda: string;
  fecha_creacion: string;
  detalles: any[];
}

interface OrderDetail {
  id_pedido: number;
  estado_productor: string;
  pedido: {
    id_usuario: string;
    usuarios: { nombre: string; email: string };
    total: number;
    moneda: string;
    direccion_envio_snapshot: any;
    pais_destino_iso2?: string | null;
  };
  detalles: any[];
  envio: { id_envio?: number; numero_rastreo?: string; estado?: string; valor_declarado_aduana?: string | null; codigo_hs?: string | null; carrier_name?: string | null; is_alcohol?: boolean } | null;
  desglose?: {
    subtotal_bruto: string | null;
    comision_marketplace: string;
    monto_neto_productor: string | null;
    moneda: string | null;
    id_comision_aplicada: number | null;
    id_payout: string | null;
  };
}

const ESTADOS = ["todos", "pendiente", "confirmado", "preparando", "enviado", "entregado"];
const PAGE_SIZE = 10;

function estadoBadgeCls(estado: string) {
  switch (estado) {
    case "entregado": return "bg-[#A8C26B]/20 text-[#3D6B3F]";
    case "enviado": return "bg-blue-100 text-blue-800";
    case "preparando": return "bg-amber-100 text-amber-800";
    case "confirmado": return "bg-[#C5CFB0]/40 text-[#1F3A2E]";
    default: return "bg-[#C97A3E]/15 text-[#C97A3E]";
  }
}

// Código HS de mezcal por defecto (envases ≤4L). SkydropX exige el código armonizado
// completo; los de <8 dígitos (p.ej. "2208.90" → "220890") los rechaza con
// "No existe el código harmonizado". Se usa como valor pre-rellenado del modal cuando
// el envío no tiene aún un código completo guardado.
const HS_DEFAULT = '2208.907200';
const hsPrefill = (codigo?: string | null): string => {
  const digits = (codigo ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? (codigo as string) : HS_DEFAULT;
};

function DetalleModal({
  pedidoId,
  idProductor,
  onClose,
}: {
  pedidoId: number;
  idProductor: number;
  onClose: () => void;
}) {
  const [orden, setOrden] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoGuia, setGenerandoGuia] = useState(false);
  // Guía aceptada por el carrier pero con etiqueta aún generándose (in_creation).
  const [guiaPendiente, setGuiaPendiente] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [numeroRastreo, setNumeroRastreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Modal de código HS — se abre (a) proactivamente al generar una guía internacional para
  // confirmar el código arancelario antes de llamar a SkydropX, y (b) si SkydropX lo rechaza,
  // para corregirlo y reintentar. El valor declarado de aduana es 100% automático (lo calcula
  // el backend desde los precios reales en MXN), por lo que el productor NO captura valor manual.
  const [showInternacionalModal, setShowInternacionalModal] = useState(false);
  const [internacionalConfig, setInternacionalConfig] = useState({ codigo_hs: HS_DEFAULT });
  // true = modal abierto proactivamente para confirmar el HS antes de generar;
  // false = abierto por rechazo de SkydropX (INVALID_HS_CODE) para corregir y reintentar.
  const [hsModalProactivo, setHsModalProactivo] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const { t } = useLocale();

  // Destino internacional → SkydropX exige products[].hs_code; el modal de confirmación
  // de código arancelario solo aplica a estos envíos (los nacionales no piden HS).
  const paisDestino = (
    orden?.pedido?.pais_destino_iso2 ??
    (orden?.pedido?.direccion_envio_snapshot as any)?.pais ??
    'MX'
  ).toUpperCase();
  const esInternacional = paisDestino !== 'MX';

  useEffect(() => {
    const fetchOrden = async () => {
      try {
        const token = getCookie("token") || "";
        const response = await fetch(`/pedidos/productor/${pedidoId}/${idProductor}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          setError("Error al cargar la orden");
          return;
        }
        const res = await response.json();
        setOrden(res);
        setNuevoEstado(res.estado_productor);
        setNumeroRastreo(res.envio?.numero_rastreo || "");
      } catch {
        setError("Error al cargar la orden");
      } finally {
        setLoading(false);
      }
    };
    fetchOrden();
  }, [pedidoId, idProductor]);

  const handleActualizarEstado = async () => {
    if (!orden) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = getCookie("token") || "";
      await fetch(`/pedidos/productor/${orden.id_pedido}/${idProductor}/estado`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      }).then((r) => r.json());
      setSuccess("Estado actualizado correctamente");
      setOrden({ ...orden, estado_productor: nuevoEstado });
    } catch {
      setError("Error al actualizar el estado");
    } finally {
      setSaving(false);
    }
  };

  const ejecutarGenerarGuia = async (hsOverride?: string) => {
    setGenerandoGuia(true);
    setError(null);
    setSuccess(null);
    try {
      const token = getCookie("token") || "";
      let envioId = orden?.envio?.id_envio;

      // No envio record yet — create one for this producer only (no SkydropX, no other producers)
      if (!envioId) {
        const prepRes = await fetch(`/envios/pedido/${pedidoId}/iniciar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!prepRes.ok) throw new Error("No se pudo preparar el envío");
        const prepData = await prepRes.json();
        envioId = prepData.id_envio;
      }

      if (!envioId) throw new Error("No se pudo obtener el ID de envío");

      // Persist the confirmed/corrected HS code on the envio before quoting, so SkydropX
      // receives a valid harmonized code (createShipment reads envios.codigo_hs).
      const hs = hsOverride?.trim();
      if (hs) {
        await api.envios.update(token, String(envioId), { codigo_hs: hs });
      }

      // Generate guide via SkydropX for this envio only
      const guia = await api.envios.crearGuia(token, String(envioId));
      // El carrier puede crear la guía de forma asíncrona: si quedó "en proceso", mostramos
      // aviso + botón de refrescar en vez de un éxito con etiqueta inexistente.
      if ((guia as any)?.pendiente) {
        setGuiaPendiente(true);
        setSuccess(t('envio_guia_en_proceso'));
      } else {
        setGuiaPendiente(false);
        setSuccess(`Guía generada: ${guia.numero_guia}. Ya puedes descargar la etiqueta.`);
      }

      // Full reload so the download link and all envio fields are fresh
      const orderRes = await fetch(`/pedidos/productor/${pedidoId}/${idProductor}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orderRes.ok) {
        const updatedOrden = await orderRes.json();
        setOrden(updatedOrden);
        setNumeroRastreo(updatedOrden?.envio?.numero_rastreo || "");
      }
    } catch (err: any) {
      // HS inválido → mensaje claro y traducido + modal para corregir y reintentar.
      // El backend NO creó guía huérfana (el rechazo ocurre antes de emitir tracking).
      if (err?.code === 'INVALID_HS_CODE' || err?.details?.code === 'INVALID_HS_CODE') {
        const hsActual = hsPrefill(err?.details?.hs_code || (orden?.envio as any)?.codigo_hs);
        setInternacionalConfig({ codigo_hs: hsActual });
        setHsModalProactivo(false);
        setError(t('envio_hs_invalido'));
        setShowInternacionalModal(true);
      } else {
        setError(err?.details?.message || err?.message || t('envio_guia_error'));
      }
    } finally {
      setGenerandoGuia(false);
    }
  };

  // Internacional: confirmar el código arancelario (HS) pre-rellenado antes de llamar a
  // SkydropX, para evitar el rechazo 422 "No existe el código harmonizado".
  // Nacional (MX): el valor declarado es automático y no se pide HS → genera directo.
  const handleGenerarGuia = async () => {
    if (esInternacional) {
      const hs = hsPrefill((orden?.envio as any)?.codigo_hs);
      setInternacionalConfig({ codigo_hs: hs });
      setHsModalProactivo(true);
      setError(null);
      setShowInternacionalModal(true);
      return;
    }
    await ejecutarGenerarGuia();
  };

  // Re-consulta una guía que quedó "en proceso" (in_creation). Si ya está lista, recarga la
  // orden para mostrar el tracking + descarga; si sigue generándose, lo informa sin error.
  const handleRefrescarGuia = async () => {
    if (!orden?.envio?.id_envio) return;
    setGenerandoGuia(true);
    setError(null);
    setSuccess(null);
    try {
      const token = getCookie('token') || '';
      const res = await api.envios.refrescarGuia(token, String(orden.envio.id_envio));
      if ((res as any)?.pendiente) {
        setGuiaPendiente(true);
        setSuccess(t('envio_guia_sigue_en_proceso'));
        return;
      }
      setGuiaPendiente(false);
      setSuccess(t('envio_guia_lista'));
      const orderRes = await fetch(`/pedidos/productor/${pedidoId}/${idProductor}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orderRes.ok) {
        const updatedOrden = await orderRes.json();
        setOrden(updatedOrden);
        setNumeroRastreo(updatedOrden?.envio?.numero_rastreo || '');
      }
    } catch (err: any) {
      setError(err?.details?.message || err?.message || t('envio_guia_error'));
    } finally {
      setGenerandoGuia(false);
    }
  };

  // Confirma/corrige el código HS y genera la guía. Sirve tanto para el flujo proactivo
  // (envío aún sin registro: ejecutarGenerarGuia lo crea y luego persiste el HS) como para
  // el reintento tras un rechazo de SkydropX.
  const handleGuardarConfigInternacional = async () => {
    const hs = internacionalConfig.codigo_hs?.trim();
    if (!hs) {
      setError(t('envio_hs_requerido'));
      return;
    }
    setGuardandoConfig(true);
    setError(null);
    try {
      setOrden((prev) =>
        prev ? { ...prev, envio: { ...(prev.envio ?? {}), codigo_hs: hs } as any } : prev
      );
      setShowInternacionalModal(false);
      await ejecutarGenerarGuia(hs);
    } catch (err: any) {
      setError(err?.details?.message || err?.message || t('envio_hs_guardar_error'));
    } finally {
      setGuardandoConfig(false);
    }
  };

  const handleActualizarTracking = async () => {
    if (!orden || !numeroRastreo) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = getCookie("token") || "";
      await fetch(`/pedidos/productor/${orden.id_pedido}/${idProductor}/tracking`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ numero_rastreo: numeroRastreo }),
      }).then((r) => r.json());
      setSuccess("Número de rastreo guardado correctamente");
    } catch {
      setError("Error al guardar el número de rastreo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(31,58,46,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {showInternacionalModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(31,58,46,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C5CFB0] bg-[#FDFBF5] p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
              {t(hsModalProactivo ? 'envio_hs_confirmar_titulo' : 'envio_hs_modal_titulo')}
            </h3>
            <p className="mb-4 text-xs text-[#3D6B3F]/70">
              {t(hsModalProactivo ? 'envio_hs_confirmar_desc' : 'envio_hs_modal_desc')}
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#3D6B3F]/70">
                  {t('envio_hs_label')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={internacionalConfig.codigo_hs}
                  onChange={(e) => setInternacionalConfig((p) => ({ ...p, codigo_hs: e.target.value }))}
                  placeholder="2208.907200"
                  className="w-full rounded-lg border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 text-sm text-[#1F3A2E] focus:outline-none focus:ring-2 focus:ring-[#3D6B3F]/30"
                />
                <p className="mt-1 text-xs text-[#3D6B3F]/60">{t('envio_hs_ayuda')}</p>
              </div>
            </div>
            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowInternacionalModal(false); setError(null); }}
                disabled={guardandoConfig}
                className="flex-1 rounded-lg border border-[#C5CFB0] bg-white px-4 py-2 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#F4F0E3] disabled:opacity-50"
              >
                {t('envio_hs_cancelar')}
              </button>
              <button
                onClick={handleGuardarConfigInternacional}
                disabled={guardandoConfig || !internacionalConfig.codigo_hs?.trim()}
                className="flex-1 rounded-lg bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardandoConfig
                  ? t('envio_hs_guardando')
                  : t(hsModalProactivo ? 'envio_hs_confirmar' : 'envio_hs_reintentar')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#C5CFB0] bg-[#FDFBF5] shadow-2xl">
        {/* Header modal */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-[#C5CFB0] bg-[#1F3A2E] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white [font-family:'Playfair_Display',serif]">
              Detalle del Pedido #{pedidoId}
            </h2>
            {orden && (
              <span className={`inline-block mt-1 rounded-full px-3 py-0.5 text-xs font-medium capitalize ${estadoBadgeCls(orden.estado_productor)} border border-white/20`}>
                {orden.estado_productor}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Alertas */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-[#A8C26B]/40 bg-[#A8C26B]/10 px-4 py-3 text-sm text-[#3D6B3F]">{success}</div>
          )}
          {guiaPendiente && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <span>{t('envio_guia_pendiente_ayuda')}</span>
              <button
                onClick={handleRefrescarGuia}
                disabled={generandoGuia}
                className="shrink-0 rounded-lg bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generandoGuia ? t('envio_guia_refrescando') : t('envio_guia_refrescar')}
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
            </div>
          ) : !orden ? (
            <div className="py-10 text-center text-sm text-[#3D6B3F]/60">No se encontró la orden.</div>
          ) : (
            <>
              {/* Grid: cliente + cambiar estado */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Cliente */}
                <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
                    <User className="h-4 w-4 text-[#3D6B3F]" /> Cliente
                  </div>
                  <div className="font-medium text-[#1F3A2E]">{orden.pedido?.usuarios?.nombre ?? "—"}</div>
                  <div className="text-xs text-[#3D6B3F]/60">{orden.pedido?.usuarios?.email ?? ""}</div>
                </div>

                {/* Cambiar estado */}
                <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
                    <Package className="h-4 w-4 text-[#3D6B3F]" /> Cambiar Estado
                  </div>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 text-sm text-[#1F3A2E] focus:outline-none focus:ring-2 focus:ring-[#3D6B3F]/30"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="preparando">Preparando</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                  </select>
                  <button
                    onClick={handleActualizarEstado}
                    disabled={saving || nuevoEstado === orden.estado_productor}
                    className="w-full rounded-lg bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Actualizar Estado"}
                  </button>
                </div>
              </div>

              {/* Productos */}
              <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
                  <Package className="h-4 w-4 text-[#3D6B3F]" /> Productos
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#C5CFB0] text-[11px] font-semibold uppercase tracking-wide text-[#3D6B3F]/70">
                        <th className="pb-2 text-left">Producto</th>
                        <th className="pb-2 text-center">Cant.</th>
                        <th className="pb-2 text-right">P. Unitario</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orden.detalles ?? []).map((detalle) => (
                        <tr key={detalle.id_detalle} className="border-b border-[#C5CFB0]/30 last:border-0">
                          <td className="py-2 text-[#1F3A2E]">{detalle.productos?.nombre}</td>
                          <td className="py-2 text-center text-[#3D6B3F]">{detalle.cantidad}</td>
                          <td className="py-2 text-right text-[#1F3A2E]">${Number(detalle.precio_compra).toFixed(2)}</td>
                          <td className="py-2 text-right font-medium text-[#1F3A2E]">
                            ${(Number(detalle.precio_compra) * detalle.cantidad).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Desglose */}
              {orden.desglose && (
                <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
                    <BarChart3 className="h-4 w-4 text-[#3D6B3F]" /> Desglose para mi tienda
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-[#C5CFB0]/40 pb-2">
                      <span className="text-[#3D6B3F]/70">Subtotal bruto</span>
                      <span className="font-medium text-[#1F3A2E]">
                        {orden.desglose.subtotal_bruto
                          ? `$${Number(orden.desglose.subtotal_bruto).toFixed(2)} ${orden.desglose.moneda ?? ""}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#C5CFB0]/40 pb-2">
                      <span className="text-red-600/80">
                        Comisión marketplace
                        {orden.desglose.subtotal_bruto && Number(orden.desglose.subtotal_bruto) > 0 && (
                          <span className="ml-1 text-xs text-[#3D6B3F]/50">
                            ({((Number(orden.desglose.comision_marketplace) / Number(orden.desglose.subtotal_bruto)) * 100).toFixed(2)}%)
                          </span>
                        )}
                      </span>
                      <span className="text-red-600">
                        − ${Number(orden.desglose.comision_marketplace).toFixed(2)} {orden.desglose.moneda ?? ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-[#3D6B3F]">
                      <span>Neto a recibir</span>
                      <span>
                        {orden.desglose.monto_neto_productor
                          ? `$${Number(orden.desglose.monto_neto_productor).toFixed(2)} ${orden.desglose.moneda ?? ""}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 text-xs text-[#3D6B3F]/60">
                      <span>Estado del pago</span>
                      <span>
                        {orden.desglose.id_payout
                          ? `Incluido en payout #${orden.desglose.id_payout}`
                          : "Pendiente de payout"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rastreo */}
              <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
                  <Truck className="h-4 w-4 text-[#3D6B3F]" /> Información de Envío
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#3D6B3F]/70">Número de Rastreo</label>
                    <input
                      type="text"
                      value={numeroRastreo}
                      onChange={(e) => setNumeroRastreo(e.target.value)}
                      placeholder="Ingresa el número de guía"
                      className="w-full rounded-lg border border-[#C5CFB0] bg-[#F4F0E3] px-3 py-2 text-sm text-[#1F3A2E] focus:outline-none focus:ring-2 focus:ring-[#3D6B3F]/30"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleActualizarTracking}
                      disabled={saving || !numeroRastreo}
                      className="rounded-lg bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F3A2E] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Guardando..." : "Guardar Tracking"}
                    </button>
                    {!orden.envio?.numero_rastreo && orden.estado_productor !== 'cancelado' && (
                      <button
                        onClick={handleGenerarGuia}
                        disabled={generandoGuia || saving}
                        className="rounded-lg border border-[#C5CFB0] bg-white px-4 py-2 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#F4F0E3] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {generandoGuia ? "Generando guía..." : "Generar Guía"}
                      </button>
                    )}
                  </div>
                  {orden.envio?.numero_rastreo && orden.envio?.id_envio && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm space-y-3">
                      <div>
                        <div className="text-xs text-blue-600/70">Rastreo registrado:</div>
                        <div className="font-medium text-blue-800 font-mono">{orden.envio.numero_rastreo}</div>
                      </div>
                      <a
                        href={`/envios/${orden.envio.id_envio}/guia/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#3D6B3F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F3A2E]"
                        onClick={(e) => {
                          const token = getCookie("token");
                          if (token) {
                            e.preventDefault();
                            const url = `/envios/${orden.envio!.id_envio}/guia/download`;
                            fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                              .then((res) => res.blob())
                              .then((blob) => {
                                const blobUrl = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = blobUrl;
                                a.download = `guia-${orden.envio!.numero_rastreo ?? orden.envio!.id_envio}.pdf`;
                                a.click();
                                URL.revokeObjectURL(blobUrl);
                              })
                              .catch(() => setError("Error al descargar la etiqueta PDF"));
                          }
                        }}
                      >
                        Descargar etiqueta PDF
                      </a>
                      <p className="text-xs text-blue-600/70">
                        Imprime esta etiqueta y pégala en el paquete antes de enviarlo.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instrucciones de empaque */}
              {orden.envio?.id_envio && (
                <PackingInstructions
                  carrierName={orden.envio.carrier_name ?? null}
                  isAlcohol={orden.envio.is_alcohol ?? false}
                />
              )}

              {/* Dirección */}
              {orden.pedido?.direccion_envio_snapshot && (
                <div className="rounded-xl border border-[#C5CFB0] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A2E]">
                    <MapPin className="h-4 w-4 text-[#3D6B3F]" /> Dirección de Envío
                  </div>
                  <div className="space-y-0.5 text-sm text-[#1F3A2E]">
                    {orden.pedido.direccion_envio_snapshot.calle && (
                      <div>{orden.pedido.direccion_envio_snapshot.calle} {orden.pedido.direccion_envio_snapshot.numero}</div>
                    )}
                    {orden.pedido.direccion_envio_snapshot.colonia && (
                      <div>{orden.pedido.direccion_envio_snapshot.colonia}</div>
                    )}
                    {orden.pedido.direccion_envio_snapshot.ciudad && (
                      <div>
                        {orden.pedido.direccion_envio_snapshot.ciudad},{" "}
                        {orden.pedido.direccion_envio_snapshot.estado}
                      </div>
                    )}
                    {orden.pedido.direccion_envio_snapshot.codigo_postal && (
                      <div className="text-[#3D6B3F]/60">CP {orden.pedido.direccion_envio_snapshot.codigo_postal}</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PedidosProductor() {
  const { user, isProductor } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoProductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    if (!isProductor || !user?.id_productor) {
      setLoading(false);
      return;
    }

    const fetchPedidos = async () => {
      try {
        const token = getCookie("token") || "";
        const res = await api.pedidos.getMisPedidosByProductor(token, user.id_productor!);
        setPedidos(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [user, isProductor]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroEstado]);

  const pedidosFiltrados = useMemo(
    () => pedidos.filter((p) => filtroEstado === "todos" || p.estado_productor === filtroEstado),
    [pedidos, filtroEstado],
  );

  const totalPages = Math.max(1, Math.ceil(pedidosFiltrados.length / PAGE_SIZE));

  const pedidosPaginados = useMemo(
    () => pedidosFiltrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [pedidosFiltrados, currentPage],
  );

  const from = pedidosFiltrados.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, pedidosFiltrados.length);

  if (!isProductor) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">No tienes acceso a esta página.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Modal de detalle */}
      {pedidoSeleccionado !== null && user?.id_productor && (
        <DetalleModal
          key={pedidoSeleccionado}
          pedidoId={pedidoSeleccionado}
          idProductor={user.id_productor}
          onClose={() => setPedidoSeleccionado(null)}
        />
      )}

      {/* Header */}
      <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-6 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        <h1 className="text-2xl font-bold text-[#1F3A2E] [font-family:'Playfair_Display',serif]">Mis Pedidos</h1>
        <p className="text-sm text-[#3D6B3F]/70">Gestiona y consulta los pedidos de tus tiendas.</p>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] p-4 shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filtroEstado === estado
                ? "bg-[#3D6B3F] text-white"
                : "border border-[#C5CFB0] text-[#1F3A2E] hover:bg-[#C5CFB0]/20"
            }`}
          >
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C5CFB0] border-t-[#3D6B3F]" />
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-[#C5CFB0] bg-[#F4F0E3] px-5 py-10 text-center text-[#3D6B3F]/60">
          {filtroEstado === "todos" ? "No tienes pedidos aún" : `No hay pedidos en estado "${filtroEstado}"`}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[#C5CFB0] shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#1F3A2E]">
                  <tr className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                    <th className="px-5 py-4">Pedido ID</th>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Productos</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosPaginados.map((pedido) => (
                    <tr key={pedido.id_pedido}
                      className="border-t border-[#C5CFB0]/30 bg-white text-sm transition-colors odd:bg-white even:bg-[#F4F0E3]/40 hover:bg-[#C5CFB0]/20">
                      <td className="px-5 py-4 font-medium text-[#1F3A2E]">#{pedido.id_pedido}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-[#1F3A2E]">{pedido.cliente.nombre}</div>
                        <div className="text-xs text-[#3D6B3F]/60">{pedido.cliente.email}</div>
                      </td>
                      <td className="px-5 py-4 text-[#3D6B3F]/70">
                        {pedido.detalles.length} producto{pedido.detalles.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-4 font-medium text-[#1F3A2E]">
                        {pedido.total_parcial.toFixed(2)} {pedido.moneda}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${estadoBadgeCls(pedido.estado_productor)}`}>
                          {pedido.estado_productor}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#3D6B3F]/60">
                        {new Date(pedido.fecha_creacion).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setPedidoSeleccionado(pedido.id_pedido)}
                          className="rounded-xl border border-[#C5CFB0] px-3 py-1.5 text-sm font-medium text-[#1F3A2E] transition hover:bg-[#3D6B3F] hover:text-white hover:border-[#3D6B3F]"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between border border-[#C5CFB0] px-4 py-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(61,107,63,0.08)]">
            <p className="text-sm text-[#1F3A2E]">
              Mostrando <span className="font-semibold">{from}</span>–<span className="font-semibold">{to}</span> de <span className="font-semibold">{pedidosFiltrados.length}</span> pedido{pedidosFiltrados.length !== 1 ? "s" : ""}
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-[#1F3A2E] ring-1 ring-inset ring-[#C5CFB0]">
                Página {currentPage} de {totalPages}
              </span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-[#3D6B3F] ring-1 ring-inset ring-[#C5CFB0] hover:bg-[#F4F0E3] disabled:opacity-50">
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
