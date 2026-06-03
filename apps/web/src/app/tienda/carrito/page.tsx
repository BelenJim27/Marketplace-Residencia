"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Info, ArrowLeft } from "lucide-react";
import { useCarrito } from "@/context/CarritoContext";
import { useLocale } from "@/context/LocaleContext";

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

export default function CarritoPage() {
  const router = useRouter();
  const { items, precioTotal, actualizarCantidad, eliminarProducto } = useCarrito();
  const { t, convertPrice } = useLocale();

  if (items.length === 0) {
    return (
      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "48px 20px 80px" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <h1 style={{
          fontFamily: "var(--font-family-store)",
          fontSize: "clamp(28px, 5vw, 40px)", fontWeight: "700",
          background: `linear-gradient(90deg, ${C.greenDark} 0%, ${C.copper} 100%)`,
          backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
          margin: "0 0 32px 0", lineHeight: 1.1,
        }}>
          {t("cart_title")}
        </h1>
        <div style={{
          borderRadius: "16px", background: C.white, padding: "64px 40px",
          textAlign: "center", border: `1px solid ${C.border}`,
          boxShadow: "0 2px 16px rgba(0,0,0,0.04)", animation: "fadeUp .4s ease both",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            height: "80px", width: "80px", borderRadius: "50%",
            background: `linear-gradient(135deg, rgba(61,107,63,0.07), rgba(201,122,62,0.05))`,
            border: `1px solid ${C.border}`, marginBottom: "24px",
          }}>
            <ShoppingBag size={34} style={{ color: C.border }} />
          </div>
          <p style={{ color: "#666", fontSize: "16px", fontWeight: "500", marginBottom: "24px" }}>
            {t("cart_empty_state")}
          </p>
          <Link
            href="/cliente/producto"
            style={{
              display: "inline-block", borderRadius: "10px",
              background: C.green, color: C.white,
              padding: "13px 32px", fontSize: "14px", fontWeight: "700",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.greenDark; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}
          >
            {t("cart_continue_shopping")}
          </Link>
        </div>
      </main>
    );
  }

  const subtotal = precioTotal;

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "36px 20px 80px" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cart-item{transition:background 160ms ease}
        .cart-item:hover{background:rgba(244,240,227,0.5)!important}
        .qty-btn{transition:all 140ms ease}
        .qty-btn:hover{background:${C.copper}!important;color:${C.white}!important;border-color:${C.copper}!important}
        .del-btn{transition:all 140ms ease}
        .del-btn:hover{background:rgba(220,38,38,0.08)!important;color:#DC2626!important}
        .checkout-btn{transition:background 180ms ease}
        .checkout-btn:hover{background:${C.greenDark}!important}
        .back-btn{transition:all 160ms ease}
        .back-btn:hover{background:rgba(61,107,63,0.06)!important}
        @media(max-width:760px){.carrito-grid{grid-template-columns:1fr!important}}
        @media(max-width:560px){
          .col-headers{display:none!important}
          .cart-item{grid-template-columns:1fr!important;gap:10px!important}
          .item-qty,.item-total,.item-del{justify-content:flex-start!important;text-align:left!important}
        }
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "32px", animation: "fadeUp .4s ease both" }}>
        <h1 style={{
          fontFamily: "var(--font-family-store)",
          fontSize: "clamp(28px, 5vw, 40px)", fontWeight: "700",
          background: `linear-gradient(90deg, ${C.greenDark} 0%, ${C.copper} 100%)`,
          backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
          margin: "0 0 4px 0", lineHeight: 1.1,
        }}>
          {t("cart_title")}
        </h1>
        <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
          {items.length} {items.length === 1 ? "producto" : "productos"} en tu carrito
        </p>
      </div>

      <div
        className="carrito-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}
      >
        {/* ── Products ── */}
        <div style={{
          borderRadius: "16px", background: C.white, border: `1px solid ${C.border}`,
          overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          animation: "fadeUp .4s ease .06s both",
        }}>
          {/* Column headers */}
          <div
            className="col-headers"
            style={{
              padding: "13px 20px", borderBottom: `1px solid ${C.border}`,
              display: "grid", gridTemplateColumns: "1fr 110px 90px 36px", gap: "12px", alignItems: "center",
            }}
          >
            {[t("cart_table_product"), t("cart_table_quantity"), t("cart_table_total"), ""].map((h, i) => (
              <span key={i} style={{
                fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px",
                textTransform: "uppercase", color: C.muted,
                textAlign: i >= 2 ? "right" : "left",
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Items */}
          {items.map((item, idx) => (
            <div
              key={item.id_producto}
              className="cart-item"
              style={{
                padding: "16px 20px",
                borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none",
                display: "grid", gridTemplateColumns: "1fr 110px 90px 36px",
                gap: "12px", alignItems: "center",
              }}
            >
              {/* Product info */}
              <Link
                href={`/cliente/producto/${item.id_producto}`}
                style={{ display: "flex", gap: "14px", alignItems: "center", textDecoration: "none", minWidth: 0 }}
              >
                <div style={{
                  position: "relative", height: "64px", width: "64px",
                  flexShrink: 0, borderRadius: "10px", overflow: "hidden",
                  background: C.cream, border: `1px solid ${C.border}`,
                }}>
                  {item.producto_imagenes?.[0] ? (
                    <Image src={item.producto_imagenes[0].url} alt={item.nombre} fill sizes="64px" className="object-cover" />
                  ) : item.imagen_principal_url ? (
                    <Image src={item.imagen_principal_url} alt={item.nombre} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div style={{
                      display: "flex", height: "100%",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "10px", color: C.muted,
                    }}>
                      {t("cart_no_image")}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{
                    fontSize: "14px", fontWeight: "600", color: C.text,
                    margin: "0 0 4px 0",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.nombre}
                  </h3>
                  <p style={{ fontSize: "12px", color: C.copper, fontFamily: "monospace", margin: 0 }}>
                    {convertPrice(Number(item.precio_base))} / {t("cart_price_unit")}
                  </p>
                </div>
              </Link>

              {/* Quantity */}
              <div className="item-qty" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                <button
                  className="qty-btn"
                  onClick={() => actualizarCantidad(item.id_producto, Math.max(item.cantidad - 1, 1))}
                  style={{
                    height: "30px", width: "30px", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    borderRadius: "8px", border: `1px solid ${C.border}`,
                    background: C.white, color: C.muted, cursor: "pointer",
                  }}
                >
                  <Minus size={12} />
                </button>
                <span style={{
                  width: "22px", textAlign: "center",
                  fontSize: "14px", fontWeight: "700",
                  color: C.text, fontFamily: "monospace",
                }}>
                  {item.cantidad}
                </span>
                <button
                  className="qty-btn"
                  onClick={() => actualizarCantidad(item.id_producto, item.cantidad + 1)}
                  style={{
                    height: "30px", width: "30px", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    borderRadius: "8px", border: `1px solid ${C.border}`,
                    background: C.white, color: C.muted, cursor: "pointer",
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Total */}
              <div className="item-total" style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "700", color: C.copper, margin: 0 }}>
                  {convertPrice(Number(item.precio_base) * item.cantidad)}
                </p>
              </div>

              {/* Delete */}
              <div className="item-del" style={{ display: "flex", justifyContent: "center" }}>
                <button
                  className="del-btn"
                  onClick={() => eliminarProducto(item.id_producto)}
                  style={{
                    height: "32px", width: "32px", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    borderRadius: "8px", background: "transparent",
                    color: C.muted, border: "none", cursor: "pointer",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}` }}>
            <button
              className="back-btn"
              onClick={() => router.push("/cliente/producto")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "9px 16px", borderRadius: "8px",
                background: "transparent", color: C.green,
                border: `1px solid ${C.border}`,
                fontSize: "13px", fontWeight: "600", cursor: "pointer",
              }}
            >
              <ArrowLeft size={13} />
              {t("cart_continue_button")}
            </button>
          </div>
        </div>

        {/* ── Summary ── */}
        <div style={{
          borderRadius: "16px", background: C.white, border: `1px solid ${C.border}`,
          overflow: "hidden", position: "sticky", top: "20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          animation: "fadeUp .4s ease .12s both",
        }}>
          <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.green} 0%, ${C.copper} 100%)` }} />
          <div style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: C.text, margin: "0 0 20px 0" }}>
              {t("cart_summary_title")}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", paddingBottom: "16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "14px", color: C.muted }}>
                  {t("cart_summary_subtotal")}{" "}
                  <span style={{ fontSize: "12px" }}>
                    ({items.length} {items.length === 1 ? "producto" : "productos"})
                  </span>
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: C.text, fontFamily: "monospace" }}>
                  {convertPrice(subtotal)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: C.muted }}>
                  {t("cart_summary_shipping")}
                  <Info size={13} style={{ color: C.border }} />
                </span>
                <span style={{ fontSize: "13px", color: C.muted, fontStyle: "italic" }}>
                  {t("cart_summary_calculated_later")}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: C.muted }}>
                  {t("cart_summary_tax")}
                  <Info size={13} style={{ color: C.border }} />
                </span>
                <span style={{ fontSize: "13px", color: C.muted, fontStyle: "italic" }}>
                  {t("cart_summary_calculated_later")}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Total</span>
              <span style={{ fontFamily: "monospace", fontSize: "24px", fontWeight: "700", color: C.copper }}>
                {convertPrice(subtotal)}
              </span>
            </div>

            <p style={{ fontSize: "12px", color: C.muted, marginBottom: "20px", lineHeight: "1.5" }}>
              {t("cart_price_note")}
            </p>

            <button
              className="checkout-btn"
              onClick={() => router.push("/tienda/checkout")}
              style={{
                width: "100%", padding: "14px", borderRadius: "10px",
                background: C.green, color: C.white,
                fontSize: "15px", fontWeight: "700",
                border: "none", cursor: "pointer",
              }}
            >
              {t("cart_checkout_button")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
