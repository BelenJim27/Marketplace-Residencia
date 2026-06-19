"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media";
import { useRouter } from "next/navigation";
import { ChevronRight, ShoppingBag, Search, Package } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { getCookie } from "@/lib/cookies";
import { formatPrice } from "@/lib/format-number";

interface DetallePedido {
  id_producto: number;
  cantidad: number;
  precio_compra: string;
  productos?: {
    nombre: string;
    imagen_principal_url?: string;
    producto_imagenes?: Array<{ url: string }>;
  };
}

interface Pedido {
  id?: number;
  id_pedido?: number;
  estado?: string;
  total?: string;
  moneda?: string;
  fecha_creacion?: string;
  creado_en?: string;
  detalle_pedido?: DetallePedido[];
}

/* ── Paleta ────────────────────────────────────────────────────────────────── */
const C = {
  green:     "#3D6B3F",
  greenDark: "#2A4A2C",
  copper:    "#C97A3E",
  cream:     "#F4F0E3",
  page:      "#F1EEE7",
  white:     "#FFFFFF",
  text:      "#2A2622",
  muted:     "#9A9590",
  border:    "rgba(61,107,63,0.12)",
};

/* ── Estados agrupados (para los pills de filtro) ─────────────────────────── */
const FILTROS = [
  { key: "todos",      label: "Todos",      matches: null },
  { key: "en_proceso", label: "En proceso", matches: ["pendiente", "pagado", "preparando", "enviado"] },
  { key: "entregado",  label: "Entregados", matches: ["entregado"] },
  { key: "cancelado",  label: "Cancelados", matches: ["cancelado"] },
];

/* ── Badge por estado ─────────────────────────────────────────────────────── */
const ESTADO_CFG: Record<string, { label: string; bg: string; text: string; dot: string; pulse: boolean }> = {
  pendiente:   { label: "Pendiente",   bg: "rgba(201,122,62,0.10)", text: "#C97A3E", dot: "#C97A3E",  pulse: true  },
  pagado:      { label: "Confirmado",  bg: "rgba(61,107,63,0.10)",  text: "#3D6B3F", dot: "#3D6B3F",  pulse: false },
  preparando:  { label: "Preparando",  bg: "rgba(168,194,107,0.10)",text: "#5E8A2E", dot: "#A8C26B",  pulse: true  },
  enviado:     { label: "En camino",   bg: "rgba(99,102,241,0.10)", text: "#6366F1", dot: "#818CF8",  pulse: true  },
  entregado:   { label: "Entregado",   bg: "rgba(61,107,63,0.12)",  text: "#3D6B3F", dot: "#3D6B3F",  pulse: false },
  cancelado:   { label: "Cancelado",   bg: "rgba(100,100,100,0.08)",text: "#777",    dot: "#999",     pulse: false },
};

/* ── Collage de imágenes del pedido ──────────────────────────────────────── */
function ProductCollage({ items }: { items: DetallePedido[] }) {
  const imgs = items
    .map((i) => i.productos?.imagen_principal_url ?? i.productos?.producto_imagenes?.[0]?.url ?? null)
    .filter(Boolean)
    .slice(0, 3) as string[];

  if (imgs.length === 0) {
    return (
      <div style={{
        width: "68px", height: "56px", flexShrink: 0,
        borderRadius: "10px", background: C.cream, border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Package size={22} style={{ color: C.border }} />
      </div>
    );
  }

  if (imgs.length === 1) {
    return (
      <div style={{
        position: "relative", width: "68px", height: "56px", flexShrink: 0,
        borderRadius: "10px", overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`,
      }}>
        <Image src={getMediaUrl(imgs[0])} alt="" fill sizes="68px" className="object-contain" />
      </div>
    );
  }

  /* 2 or 3 images overlapping */
  const imgW  = imgs.length === 2 ? 52 : 44;
  const shift = imgs.length === 2 ? 22 : 16;
  const totalW = imgW + (imgs.length - 1) * shift;

  return (
    <div style={{ position: "relative", width: `${totalW}px`, height: "56px", flexShrink: 0 }}>
      {imgs.map((url, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${i * shift}px`,
            top: 0,
            width: `${imgW}px`,
            height: "56px",
            borderRadius: "8px",
            overflow: "hidden",
            border: `2px solid ${C.white}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.13)",
            background: C.cream,
            zIndex: i,
          }}
        >
          <Image src={getMediaUrl(url)} alt="" fill sizes={`${imgW}px`} className="object-contain" />
        </div>
      ))}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: "14px", background: C.white, border: `1px solid ${C.border}`,
      padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div className="sk" style={{ width: "68px", height: "56px", borderRadius: "10px", background: C.cream, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="sk" style={{ height: "14px", width: "140px", borderRadius: "6px", background: C.cream }} />
        <div className="sk" style={{ height: "12px", width: "110px", borderRadius: "6px", background: C.cream }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
        <div className="sk" style={{ height: "14px", width: "80px", borderRadius: "6px", background: C.cream }} />
        <div className="sk" style={{ height: "22px", width: "80px", borderRadius: "20px", background: C.cream }} />
      </div>
    </div>
  );
}

/* ── Página ─────────────────────────────────────────────────────────────── */
export default function MisComprasPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [pedidos, setPedidos]         = useState<Pedido[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [filtroEstado, setFiltro]     = useState("todos");
  const [busqueda, setBusqueda]       = useState("");
  const [pagina, setPagina]           = useState(1);
  const POR_PAGINA = 5;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/sign-in?redirect=/tienda/compras");
      return;
    }
    setCargando(true);
    const token = getCookie("token") || "";
    api.pedidos
      .getMisCompras(token)
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        // Ordenar de más antiguo a más reciente → primer pedido = #1
        lista.sort((a: Pedido, b: Pedido) =>
          new Date(a.fecha_creacion || a.creado_en || 0).getTime() - new Date(b.fecha_creacion || b.creado_en || 0).getTime()
        );
        setPedidos(lista);
      })
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  /* Stats */
  const totalComprado = useMemo(
    () => pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0),
    [pedidos],
  );

  /* Filtro */
  const pedidosFiltrados = useMemo(() => {
    const grupo = FILTROS.find((f) => f.key === filtroEstado);
    return pedidos.filter((p) => {
      const estado = p.estado || "pendiente";
      const matchEstado = !grupo?.matches || grupo.matches.includes(estado);
      const id = String(p.id || p.id_pedido || "");
      const matchBusqueda = busqueda === "" || id.includes(busqueda.trim());
      return matchEstado && matchBusqueda;
    });
  }, [pedidos, filtroEstado, busqueda]);

  const totalPaginas = Math.ceil(pedidosFiltrados.length / POR_PAGINA);
  const pedidosPagina = pedidosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const isLoading = authLoading || cargando;

  const cambiarFiltro = (key: string) => { setFiltro(key); setPagina(1); };
  const cambiarBusqueda = (val: string) => { setBusqueda(val); setPagina(1); };

  // Patrón alternado: agavenuevo / murciélago / agavenuevo / murciélago...
  const sideRows = [
    { top: "5%",  img: "agavenuevo", w: 110 },
    { top: "6%", img: "murcielago", w: 120 },
    { top: "30%", img: "agavenuevo", w: 110 },
    { top: "32%", img: "murcielago", w: 120 },
    { top: "57%", img: "agavenuevo", w: 110 },
    { top: "59%", img: "murcielago", w: 120 },
    { top: "83%", img: "agavenuevo", w: 110 },
  ];

  return (
    <div style={{ position: "relative" }}>

      {/* ── Columna izquierda ────────────────────────────────────── */}
      {sideRows.map((r, i) => (
        <div key={`l-${i}`} aria-hidden className="hidden md:block" style={{ position: "absolute", top: r.top, left: 0, width: r.w, height: r.w, zIndex: 2, pointerEvents: "none" }}>
          <Image src={`/fotos/${r.img}.png`} alt="" width={r.w} height={r.w}
            style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

      {/* ── Columna derecha ──────────────────────────────────────── */}
      {sideRows.map((r, i) => (
        <div key={`r-${i}`} aria-hidden className="hidden md:block" style={{ position: "absolute", top: r.top, right: 0, width: r.w, height: r.w, zIndex: 2, pointerEvents: "none", transform: r.img === "murcielago" ? "scaleX(-1)" : "none" }}>
          <Image src={`/fotos/${r.img}.png`} alt="" width={r.w} height={r.w}
            style={{ opacity: 0.45, mixBlendMode: "multiply", objectFit: "contain" }} />
        </div>
      ))}

    <main style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", padding: "36px 20px 80px" }}>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotPulse{ 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(.65);opacity:.5} }
        .sk  { animation: skPulse 1.6s ease infinite; }
        .order-card { transition: box-shadow 200ms ease, border-color 200ms ease !important; }
        .order-card:hover { box-shadow: 0 8px 24px rgba(42,74,44,0.09) !important; border-color: rgba(201,122,62,0.3) !important; }
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
      `}</style>

      {/* ── Header: título + stats ─────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-start",
        justifyContent: "space-between", gap: "16px",
        marginBottom: "28px", animation: "fadeUp .4s ease both",
      }}>
        {/* Título */}
        <div>
          <h1 style={{
            fontFamily: "var(--font-family-store)",
            fontSize: "clamp(30px, 5vw, 44px)", fontWeight: "700",
            color: C.greenDark, margin: "0 0 4px 0", lineHeight: 1.1,
          }}>
            {t("compras_title")}
          </h1>
          <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
            {t("compras_subtitle")}
          </p>
        </div>

        {/* Stats (solo cuando hay datos) */}
        {!isLoading && pedidos.length > 0 && (
          <div style={{
            display: "flex", gap: "0", borderRadius: "12px",
            border: `1px solid ${C.border}`, background: C.white,
            overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ padding: "12px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.muted, margin: "0 0 2px 0" }}>
                Pedidos
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: "700", color: C.greenDark, margin: 0 }}>
                {pedidos.length}
              </p>
            </div>
            <div style={{ width: "1px", background: C.border }} />
            <div style={{ padding: "12px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase", color: C.muted, margin: "0 0 2px 0" }}>
                Total comprado
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: "700", color: C.copper, margin: 0 }}>
                ${formatPrice(totalComprado, { showCurrency: false })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Filters + Search ──────────────────────────────────────────────── */}
      {!isLoading && isAuthenticated && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "10px",
          marginBottom: "20px", animation: "fadeUp .4s ease .06s both",
        }}>
          {/* Pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {FILTROS.map((f) => {
              const active = filtroEstado === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => cambiarFiltro(f.key)}
                  style={{
                    padding: "7px 16px", borderRadius: "999px",
                    fontSize: "13px", fontWeight: "600",
                    border: `1.5px solid ${active ? C.greenDark : C.border}`,
                    background: active ? C.greenDark : C.white,
                    color: active ? C.white : C.muted,
                    cursor: "pointer", outline: "none",
                    transition: "all 160ms ease",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{
              position: "absolute", left: "12px", top: "50%",
              transform: "translateY(-50%)", color: C.muted, pointerEvents: "none",
            }} />
            <input
              type="text"
              placeholder="Buscar #pedido"
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              style={{
                paddingLeft: "34px", paddingRight: "14px",
                paddingTop: "8px", paddingBottom: "8px",
                borderRadius: "999px", border: `1.5px solid ${C.border}`,
                background: C.white, fontSize: "13px", color: C.text,
                outline: "none", fontFamily: "inherit", width: "180px",
                transition: "border-color 180ms ease, width 200ms ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,122,62,0.45)"; e.currentTarget.style.width = "210px"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.width = "180px"; }}
            />
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
              <SkeletonCard />
            </div>
          ))}
        </div>

      ) : !isAuthenticated ? (
        <div style={{
          borderRadius: "14px", background: C.white, padding: "48px 32px",
          textAlign: "center", border: `1px solid ${C.border}`,
        }}>
          <p style={{ marginBottom: "20px", color: "#666", fontSize: "15px" }}>
            {t("compras_sign_in_prompt")}
          </p>
          <Link href="/auth/sign-in" style={{
            display: "inline-block", borderRadius: "10px", background: C.greenDark,
            color: C.white, padding: "12px 28px", fontSize: "14px", fontWeight: "700", textDecoration: "none",
          }}>
            {t("compras_sign_in_button")}
          </Link>
        </div>

      ) : pedidosFiltrados.length === 0 ? (
        <div style={{
          borderRadius: "14px", background: C.white, padding: "56px 32px",
          textAlign: "center", border: `1px solid ${C.border}`,
          animation: "fadeUp .4s ease both",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            height: "72px", width: "72px", borderRadius: "50%",
            background: `linear-gradient(135deg, rgba(61,107,63,0.07), rgba(201,122,62,0.05))`,
            border: `1px solid ${C.border}`, marginBottom: "20px",
          }}>
            <ShoppingBag size={30} style={{ color: C.border }} />
          </div>
          <p style={{ color: "#666", fontSize: "16px", fontWeight: "500", margin: "0 0 6px 0" }}>
            {filtroEstado !== "todos" || busqueda
              ? "No hay pedidos que coincidan"
              : t("compras_empty_state")}
          </p>
          {filtroEstado !== "todos" || busqueda ? (
            <button
              onClick={() => { cambiarFiltro("todos"); cambiarBusqueda(""); }}
              style={{
                marginTop: "16px", display: "inline-block", borderRadius: "8px",
                background: "transparent", color: C.copper,
                padding: "10px 24px", fontSize: "14px", fontWeight: "600",
                border: "1px solid rgba(201,122,62,0.3)", cursor: "pointer",
              }}
            >
              Limpiar filtros
            </button>
          ) : (
            <Link href="/cliente/producto" style={{
              display: "inline-block", marginTop: "16px", borderRadius: "10px",
              background: C.greenDark, color: C.white,
              padding: "12px 28px", fontSize: "14px", fontWeight: "700", textDecoration: "none",
            }}>
              {t("compras_explore_button")}
            </Link>
          )}
        </div>

      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pedidosPagina.map((pedido, idx) => {
            const id       = pedido.id || pedido.id_pedido;
            // Número secuencial del cliente: posición en lista completa (no filtrada)
            const posicion = pedidos.findIndex((p) => (p.id || p.id_pedido) === id) + 1;
            const estado   = pedido.estado || "pendiente";
            const cfg      = ESTADO_CFG[estado] || ESTADO_CFG.pendiente;
            const items    = pedido.detalle_pedido ?? [];
            const fecha    = (pedido.fecha_creacion || pedido.creado_en)
              ? new Date(pedido.fecha_creacion || pedido.creado_en!).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
              : "—";
            const total    = pedido.total
              ? `$${formatPrice(Number(pedido.total), { showCurrency: false })}`
              : "—";
            /* Total de botellas (sum of cantidades) */
            const totalBotellas = items.reduce((acc, i) => acc + (i.cantidad || 0), 0);
            const botellaLabel  = totalBotellas === 1 ? "botella" : "botellas";

            return (
              <Link
                key={id}
                href={`/tienda/compras/${id}?n=${posicion}`}
                className="order-card"
                style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "16px",
                  borderRadius: "14px", background: C.white,
                  padding: "16px 20px", border: `1px solid ${C.border}`,
                  textDecoration: "none", cursor: "pointer",
                  animation: `fadeUp .35s ease ${idx * 45}ms both`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                {/* Collage + info */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                  <ProductCollage items={items} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: C.greenDark, margin: "0 0 3px 0" }}>
                      Pedido{" "}
                      <span style={{ color: C.copper, fontFamily: "monospace" }}>#{posicion}</span>
                    </p>
                    <p style={{
                      fontSize: "12px", color: C.muted, margin: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {fecha}
                      {totalBotellas > 0 && ` · ${totalBotellas} ${botellaLabel}`}
                    </p>
                  </div>
                </div>

                {/* Total + badge + arrow */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{
                      fontFamily: "monospace", fontWeight: "700",
                      color: C.copper, fontSize: "16px", margin: "0 0 5px 0",
                    }}>
                      {total}
                    </p>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      borderRadius: "999px", padding: "3px 10px",
                      fontSize: "11px", fontWeight: "700",
                      background: cfg.bg, color: cfg.text,
                      border: `1px solid ${cfg.bg}`,
                    }}>
                      <span style={{
                        height: "5px", width: "5px", borderRadius: "50%",
                        background: cfg.dot, flexShrink: 0,
                        animation: cfg.pulse ? "dotPulse 2s ease infinite" : "none",
                      }} />
                      {cfg.label}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: C.border, flexShrink: 0 }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Paginación ─────────────────────────────────────────── */}
      {!isLoading && totalPaginas > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "8px", marginTop: "28px", animation: "fadeUp .4s ease both",
        }}>
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            style={{
              width: "36px", height: "36px", borderRadius: "8px",
              border: `1px solid ${C.border}`, background: C.white,
              color: pagina === 1 ? C.muted : C.greenDark,
              cursor: pagina === 1 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: "700",
            }}
          >‹</button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPagina(n)}
              style={{
                width: "36px", height: "36px", borderRadius: "8px",
                border: `1px solid ${n === pagina ? C.copper : C.border}`,
                background: n === pagina ? C.copper : C.white,
                color: n === pagina ? C.white : C.text,
                cursor: "pointer", fontWeight: "700", fontSize: "13px",
              }}
            >{n}</button>
          ))}

          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            style={{
              width: "36px", height: "36px", borderRadius: "8px",
              border: `1px solid ${C.border}`, background: C.white,
              color: pagina === totalPaginas ? C.muted : C.greenDark,
              cursor: pagina === totalPaginas ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: "700",
            }}
          >›</button>
        </div>
      )}
    </main>
    </div>
  );
}
