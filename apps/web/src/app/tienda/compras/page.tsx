"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import { formatPrice } from "@/lib/format-number";

interface Pedido {
  id?: number;
  id_pedido?: number;
  estado?: string;
  total?: string;
  moneda?: string;
  creado_en?: string;
  detalle_pedido?: Array<{ id_producto: number; cantidad: number; precio_compra: string }>;
}

const COLOR_PALETTE = {
  green: "#3D6B3F",
  copper: "#C97A3E",
  amber: "#A8C26B",
  cream: "#F4F0E3",
  white: "#FFFFFF",
  border: "rgba(61,107,63,0.12)",
};

const ESTADO_COLORES: Record<string, { bg: string; text: string; border: string }> = {
  pendiente: { bg: "rgba(201,122,62,0.08)", text: "#C97A3E", border: "rgba(201,122,62,0.2)" },
  pagado: { bg: "rgba(61,107,63,0.08)", text: "#3D6B3F", border: "rgba(61,107,63,0.2)" },
  enviado: { bg: "rgba(168,194,107,0.08)", text: "#A8C26B", border: "rgba(168,194,107,0.2)" },
  entregado: { bg: "rgba(61,107,63,0.12)", text: "#3D6B3F", border: "rgba(61,107,63,0.3)" },
  cancelado: { bg: "rgba(100,100,100,0.08)", text: "#666666", border: "rgba(100,100,100,0.2)" },
};

export default function MisComprasPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setCargando(false);
      return;
    }

    setCargando(true);
    const token = getCookie("token") || "";
    api.pedidos
      .getMisCompras(token)
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        lista.sort((a: Pedido, b: Pedido) => {
          const dateA = new Date(a.creado_en || 0).getTime();
          const dateB = new Date(b.creado_en || 0).getTime();
          return dateB - dateA;
        });
        setPedidos(lista);
      })
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false));
  }, [isAuthenticated, authLoading]);

  if (cargando) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-family-store)", fontSize: "36px", fontWeight: "700", background: `linear-gradient(90deg, ${COLOR_PALETTE.green} 0%, ${COLOR_PALETTE.copper} 100%)`, backgroundClip: "text", color: "transparent", marginBottom: "8px" }}>
            Mis Compras
          </h1>
          <p style={{ fontSize: "14px", color: COLOR_PALETTE.copper, fontWeight: "500", marginTop: "8px" }}>
            Tu historial de pedidos
          </p>
        </div>
        <div className="flex min-h-[200px] items-center justify-center">
          <p style={{ color: "#999999" }}>Cargando pedidos...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-family-store)", fontSize: "36px", fontWeight: "700", background: `linear-gradient(90deg, ${COLOR_PALETTE.green} 0%, ${COLOR_PALETTE.copper} 100%)`, backgroundClip: "text", color: "transparent", marginBottom: "8px" }}>
            Mis Compras
          </h1>
          <p style={{ fontSize: "14px", color: COLOR_PALETTE.copper, fontWeight: "500", marginTop: "8px" }}>
            Tu historial de pedidos
          </p>
        </div>
        <div style={{ borderRadius: "12px", background: `linear-gradient(135deg, ${COLOR_PALETTE.white} 0%, ${COLOR_PALETTE.cream}08 100%)`, padding: "32px", textAlign: "center", border: `1px solid ${COLOR_PALETTE.border}` }}>
          <p style={{ marginBottom: "16px", color: "#666666", fontSize: "15px" }}>Inicia sesión para ver tu historial de compras.</p>
          <Link href="/auth/sign-in" style={{ display: "inline-block", borderRadius: "8px", background: COLOR_PALETTE.green, color: COLOR_PALETTE.white, padding: "12px 24px", fontSize: "14px", fontWeight: "600", transition: "all 200ms ease", textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#1f3a25"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,74,51,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = COLOR_PALETTE.green; e.currentTarget.style.boxShadow = "none"; }}>
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-family-store)", fontSize: "36px", fontWeight: "700", background: `linear-gradient(90deg, ${COLOR_PALETTE.green} 0%, ${COLOR_PALETTE.copper} 100%)`, backgroundClip: "text", color: "transparent", marginBottom: "8px" }}>
          Mis Compras
        </h1>
        <p style={{ fontSize: "14px", color: COLOR_PALETTE.copper, fontWeight: "500", marginTop: "8px" }}>
          Tu historial de pedidos
        </p>
      </div>

      {pedidos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", borderRadius: "12px", background: `linear-gradient(135deg, ${COLOR_PALETTE.white} 0%, ${COLOR_PALETTE.cream}08 100%)`, padding: "40px", textAlign: "center", border: `1px solid ${COLOR_PALETTE.border}` }}>
          <ShoppingBag size={56} style={{ color: COLOR_PALETTE.border }} aria-hidden="true" />
          <p style={{ color: "#666666", fontSize: "15px" }}>Aún no tienes compras.</p>
          <Link href="/cliente/producto" style={{ display: "inline-block", borderRadius: "8px", background: COLOR_PALETTE.green, color: COLOR_PALETTE.white, padding: "12px 24px", fontSize: "14px", fontWeight: "600", transition: "all 200ms ease", textDecoration: "none", marginTop: "8px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#1f3a25"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,74,51,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = COLOR_PALETTE.green; e.currentTarget.style.boxShadow = "none"; }}>
            Explorar mezcales
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pedidos.map((pedido) => {
            const id = pedido.id || pedido.id_pedido;
            const estado = pedido.estado || "pendiente";
            const estadoConfig = ESTADO_COLORES[estado] || ESTADO_COLORES.pendiente;
            const fecha = pedido.creado_en
              ? new Date(pedido.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
              : "—";
            const total = pedido.total
              ? `$${formatPrice(Number(pedido.total), { showCurrency: false })} ${pedido.moneda || "MXN"}`
              : "—";
            const numItems = pedido.detalle_pedido?.length ?? 0;

            return (
              <Link
                key={id}
                href={`/tienda/compras/${id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${COLOR_PALETTE.white} 0%, ${COLOR_PALETTE.cream}04 100%)`,
                  padding: "16px",
                  border: `1px solid ${COLOR_PALETTE.border}`,
                  transition: "all 200ms ease",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(46,74,51,0.08)";
                  e.currentTarget.style.borderColor = `rgba(201,122,62,0.3)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = COLOR_PALETTE.border;
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "44px", width: "44px", borderRadius: "10px", background: `linear-gradient(135deg, rgba(46,74,51,0.08), rgba(201,122,62,0.04))`, border: `1px solid ${COLOR_PALETTE.border}` }}>
                    <Package size={22} style={{ color: COLOR_PALETTE.green }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", color: COLOR_PALETTE.green, fontSize: "15px", margin: "0 0 4px 0" }}>Pedido #{id}</p>
                    <p style={{ fontSize: "13px", color: "#999999", margin: 0 }}>
                      {fecha} · {numItems > 0 ? `${numItems} ${numItems === 1 ? 'producto' : 'productos'}` : "N/A"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: "700", color: COLOR_PALETTE.copper, fontSize: "15px", margin: "0 0 6px 0" }}>{total}</p>
                    <span style={{ display: "inline-block", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: "600", textTransform: "capitalize", background: estadoConfig.bg, color: estadoConfig.text, border: `1px solid ${estadoConfig.border}` }}>
                      {estado}
                    </span>
                  </div>
                  <ChevronRight size={18} style={{ color: COLOR_PALETTE.border }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}