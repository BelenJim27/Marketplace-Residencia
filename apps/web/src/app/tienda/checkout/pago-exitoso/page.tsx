"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, ShoppingBag, Package } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";

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

  useEffect(() => {
    limpiarCarrito();
    localStorage.removeItem("checkout_factura");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cols = ["0%", "18%", "36%", "54%", "72%", "90%"];

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
