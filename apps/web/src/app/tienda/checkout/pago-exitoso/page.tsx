"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, ShoppingBag, Package, FileText, Loader2, Truck } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { api } from "@/lib/api";
import { getCookie } from "@/lib/cookies";

const C = {
  green: "#3D6B3F",
  greenDark: "#2A4A2C",
  copper: "#C97A3E",
  cream: "#F4F0E3",
  white: "#FFFFFF",
  text: "#2A2622",
  muted: "#9A9590",
  border: "rgba(61,107,63,0.12)",
};

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido");
  const numeroOrden = searchParams.get("num");
  const { limpiarCarrito } = useCarrito();

  const [numeroRastreo, setNumeroRastreo] = useState<string | null>(null);
  const [estadoEnvio, setEstadoEnvio] = useState<string | null>(null);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [facturaEstado, setFacturaEstado] = useState<"idle" | "ok" | "error">("idle");
  const [facturaError, setFacturaError] = useState("");
  const [email, setEmail] = useState("");
  const [rfc, setRfc] = useState("");
  const [nombre, setNombre] = useState("");
  const [usoCfdi, setUsoCfdi] = useState("G03");
  const [enviando, setEnviando] = useState(false);

  const cols = ["0%", "18%", "36%", "54%", "72%", "90%"];

  useEffect(() => {
    limpiarCarrito();
    localStorage.removeItem("checkout_factura");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pedidoId) return;
    const authToken = getCookie("token");
    if (!authToken) return;

    let intentos = 0;
    const MAX = 3;
    const DELAY = 4000;

    const poll = async () => {
      try {
        const compras = (await api.pedidos.getMisCompras(authToken)) as any[];
        const pedido = compras?.find((p: any) => String(p.id_pedido) === String(pedidoId));
        const envio = pedido?.envios?.[0];
        if (envio?.numero_rastreo) {
          setNumeroRastreo(envio.numero_rastreo);
          setEstadoEnvio(envio.estado ?? null);
          return;
        }
      } catch {
        // silencioso — tracking no es crítico
      }
      intentos++;
      if (intentos < MAX) setTimeout(poll, DELAY);
    };

    const timer = setTimeout(poll, DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  const handleSolicitarFactura = async () => {
    const authToken = getCookie("token");

    if (!pedidoId || !authToken) {
      setFacturaError(`No se pudo identificar el pedido (pedido: ${pedidoId ?? "?"}, sesión: ${authToken ? "ok" : "no"}). Recarga la página.`);
      setFacturaEstado("error");
      return;
    }
    if (!email) {
      setFacturaError("El correo es requerido.");
      return;
    }

    setEnviando(true);
    setFacturaError("");

    try {
      const payload: Record<string, string> = { estado: "pendiente" };
      if (rfc)     payload.rfc_receptor        = rfc;
      if (nombre)  payload.nombre_razon_social = nombre;
      if (usoCfdi) payload.uso_cfdi            = usoCfdi;
      if (email)   payload.email_factura       = email;

      await api.pedidos.addFactura(authToken, pedidoId, payload);
      setFacturaEstado("ok");
    } catch (e: any) {
      setFacturaEstado("error");
      setFacturaError(e?.message ?? "No se pudo registrar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>

      {/* ── Fila 1: Agavenuevo ───────────────────────────────────── */}
      {cols.map((left, i) => (
        <div key={`a1-${i}`} aria-hidden style={{ position: "absolute", top: "2%", left, width: 115, height: 115, zIndex: 0, pointerEvents: "none" }}>
          <Image src="/fotos/agavenuevo.png" alt="" width={115} height={115} style={{ opacity: 0.40, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

      {/* ── Fila 2: Murciélagos ──────────────────────────────────── */}
      {cols.map((left, i) => (
        <div key={`b1-${i}`} aria-hidden style={{ position: "absolute", top: "13%", left, width: 125, height: 125, zIndex: 0, pointerEvents: "none", transform: i % 2 === 1 ? "scaleX(-1)" : "none" }}>
          <Image src="/fotos/murcielago.png" alt="" width={125} height={125} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

      {/* ── Fila 3: Agavenuevo ───────────────────────────────────── */}
      {cols.map((left, i) => (
        <div key={`a2-${i}`} aria-hidden style={{ position: "absolute", top: "55%", left, width: 115, height: 115, zIndex: 0, pointerEvents: "none" }}>
          <Image src="/fotos/agavenuevo.png" alt="" width={115} height={115} style={{ opacity: 0.40, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

      {/* ── Fila 4: Murciélagos ──────────────────────────────────── */}
      {cols.map((left, i) => (
        <div key={`b2-${i}`} aria-hidden style={{ position: "absolute", top: "68%", left, width: 125, height: 125, zIndex: 0, pointerEvents: "none", transform: i % 2 === 0 ? "scaleX(-1)" : "none" }}>
          <Image src="/fotos/murcielago.png" alt="" width={125} height={125} style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

    <main style={{ position: "relative", zIndex: 1, maxWidth: "500px", margin: "0 auto", padding: "64px 20px 80px", textAlign: "center" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        .primary-btn{transition:background 180ms ease}
        .primary-btn:hover{background:${C.greenDark}!important}
        .secondary-btn{transition:background 180ms ease}
        .secondary-btn:hover{background:rgba(61,107,63,0.06)!important}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      <div style={{
        borderRadius: "20px", background: C.white, padding: "40px 32px",
        border: `1px solid ${C.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.07)",
        animation: "fadeUp .5s ease both",
      }}>
        {/* Icono éxito */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "80px", width: "80px", borderRadius: "50%",
            background: "linear-gradient(135deg,rgba(61,107,63,0.12),rgba(61,107,63,0.06))",
            border: "2px solid rgba(61,107,63,0.18)",
            animation: "scaleIn .6s cubic-bezier(.2,.8,.2,1) .15s both",
          }}>
            <CheckCircle size={44} style={{ color: C.green }} strokeWidth={1.8} />
          </div>
        </div>

        <h1 style={{ fontFamily: "var(--font-family-store)", fontSize: "30px", fontWeight: "700", color: C.text, margin: "0 0 8px 0" }}>
          ¡Pago exitoso!
        </h1>

        {pedidoId && (
          <p style={{ fontSize: "14px", fontWeight: "700", color: C.copper, fontFamily: "monospace", margin: "0 0 12px 0" }}>
            Pedido #{numeroOrden ?? pedidoId}
          </p>
        )}

        <p style={{ color: C.muted, fontSize: "14px", lineHeight: "1.65", margin: "0 0 24px 0" }}>
          Tu pedido está siendo procesado. Recibirás una confirmación en tu correo electrónico.
        </p>

        <div style={{ height: "1px", background: C.border, margin: "0 0 20px 0" }} />

        {/* Número de rastreo (disponible una vez que se genera la guía) */}
        {numeroRastreo && (
          <div style={{
            borderRadius: "10px", border: "1px solid rgba(61,107,63,0.2)",
            background: "rgba(61,107,63,0.05)", padding: "14px 16px",
            marginBottom: "20px", textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Truck size={15} style={{ color: C.green, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", fontWeight: "700", color: C.green, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Tu envío
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: C.text }}>
                {numeroRastreo}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(numeroRastreo)}
                style={{ fontSize: "11px", color: C.green, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                Copiar
              </button>
            </div>
            {estadoEnvio && (
              <div style={{ fontSize: "12px", color: C.muted, marginTop: "4px" }}>
                Estado: {estadoEnvio}
              </div>
            )}
          </div>
        )}

        {/* Sección de factura */}
        {facturaEstado === "ok" ? (
          <div style={{
            borderRadius: "10px", border: "1px solid rgba(61,107,63,0.2)",
            background: "rgba(61,107,63,0.06)", padding: "14px 16px",
            fontSize: "13px", color: C.green, fontWeight: "500", marginBottom: "20px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
            <CheckCircle size={15} />
            Solicitud de factura enviada. Revisa tu correo {email && <strong>{email}</strong>} (también en spam).
          </div>
        ) : (
          <div style={{ marginBottom: "20px", textAlign: "left" }}>
            {!mostrarFactura ? (
              <button
                onClick={() => setMostrarFactura(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "8px", borderRadius: "10px", background: "transparent",
                  border: `1px solid ${C.border}`, color: C.green,
                  padding: "11px 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                }}
              >
                <FileText size={15} />
                Solicitar factura (CFDI)
              </button>
            ) : (
              <div style={{ border: `1px solid ${C.copper}33`, borderRadius: "12px", padding: "16px", background: `${C.copper}05` }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: C.copper, margin: "0 0 12px 0" }}>
                  Datos para factura
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, display: "block", marginBottom: "4px" }}>
                      CORREO PARA RECIBIR LA FACTURA *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      style={{ width: "100%", borderRadius: "8px", border: `1px solid ${C.border}`, padding: "9px 12px", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, display: "block", marginBottom: "4px" }}>
                      RFC
                    </label>
                    <input
                      type="text"
                      value={rfc}
                      onChange={e => setRfc(e.target.value.toUpperCase().slice(0, 13))}
                      placeholder="XAXX010101000"
                      style={{ width: "100%", borderRadius: "8px", border: `1px solid ${C.border}`, padding: "9px 12px", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, display: "block", marginBottom: "4px" }}>
                      NOMBRE / RAZÓN SOCIAL
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Nombre completo o razón social"
                      style={{ width: "100%", borderRadius: "8px", border: `1px solid ${C.border}`, padding: "9px 12px", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: C.muted, display: "block", marginBottom: "4px" }}>
                      USO CFDI
                    </label>
                    <select
                      value={usoCfdi}
                      onChange={e => setUsoCfdi(e.target.value)}
                      style={{ width: "100%", borderRadius: "8px", border: `1px solid ${C.border}`, padding: "9px 12px", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="G01">G01 - Adquisición de mercancias</option>
                      <option value="G03">G03 - Gastos en general</option>
                      <option value="D01">D01 - Honorarios médicos</option>
                      <option value="I01">I01 - Construcciones</option>
                      <option value="P01">P01 - Por definir</option>
                    </select>
                  </div>

                  {facturaEstado === "error" && (
                    <p style={{ fontSize: "12px", color: "#DC2626", margin: 0 }}>
                      {facturaError || "Error al enviar. Inténtalo de nuevo."}
                    </p>
                  )}

                  <button
                    onClick={handleSolicitarFactura}
                    disabled={enviando || !email}
                    style={{
                      borderRadius: "8px", background: C.copper, color: "#fff",
                      padding: "11px", fontSize: "13px", fontWeight: "700",
                      border: "none", cursor: enviando || !email ? "not-allowed" : "pointer",
                      opacity: enviando || !email ? 0.7 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    }}
                  >
                    {enviando ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : "Enviar solicitud de factura"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link
            href={pedidoId ? `/tienda/compras/${pedidoId}${numeroOrden ? `?n=${numeroOrden}` : ""}` : "/tienda/compras"}
            className="primary-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              borderRadius: "10px", background: C.green, color: C.white,
              padding: "14px 24px", fontSize: "15px", fontWeight: "700", textDecoration: "none",
            }}
          >
            <Package size={18} />
            Ver detalle del pedido
          </Link>
          <Link
            href="/tienda/compras"
            className="secondary-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              borderRadius: "10px", background: "transparent", color: C.green,
              padding: "13px 24px", fontSize: "14px", fontWeight: "600",
              textDecoration: "none", border: `1px solid ${C.border}`,
            }}
          >
            <Package size={17} />
            Ver mis compras
          </Link>
          <Link
            href="/cliente/producto"
            className="secondary-btn"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              borderRadius: "10px", background: "transparent", color: C.green,
              padding: "13px 24px", fontSize: "14px", fontWeight: "600",
              textDecoration: "none", border: `1px solid ${C.border}`,
            }}
          >
            <ShoppingBag size={17} />
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
    </div>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense>
      <PagoExitosoContent />
    </Suspense>
  );
}
