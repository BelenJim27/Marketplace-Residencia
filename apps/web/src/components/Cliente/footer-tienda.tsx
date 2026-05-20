"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

export function FooterTienda() {
  const { t } = useLocale();

  return (
    <footer style={{ background: "#6B8E4E", color: "#d1c9b8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ─── Franja decorativa dorada ─── */}
      <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #b88a4a 40%, #b88a4a 60%, transparent)" }} />

      {/* ─── Grid principal ─── */}
      <div style={{
        maxWidth: "1200px", margin: "0 auto",
        padding: "64px 32px 40px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "40px",
      }}>
        {/* Columna Marca */}
        <div style={{ gridColumn: "span 1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              border: "2px solid #b88a4a",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#b88a4a", fontSize: "14px", fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif" }}>G</span>
            </div>
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "18px", fontWeight: 700,
              color: "#e8d5b0", letterSpacing: "0.02em",
            }}>
              {t("Guardianas del Mezcal")}
            </span>
          </div>
          <p style={{ fontSize: "13px", lineHeight: 1.75, color: "rgba(209,201,184,0.65)", maxWidth: "240px" }}>
            {t("Honrando la tierra, el fuego y las manos que transforman el agave.")}
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            {["IG", "FB", "TW"].map((sn) => (
              <a key={sn} href="#" style={{
                width: "32px", height: "32px", borderRadius: "50%",
                border: "1px solid rgba(184,138,74,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700, color: "#b88a4a",
                textDecoration: "none", transition: "border-color .2s, color .2s",
              }}>{sn}</a>
            ))}
          </div>
        </div>

        {/* Columna Explorar */}
        <div>
          <p style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#b88a4a", marginBottom: "16px",
          }}>
            {t("Explorar")}
          </p>
          {[
            { label: "Maestras mezcaleras", href: "/productores" },
            { label: "Historia", href: "#historia" },
            { label: "Nuestro proceso", href: "#proceso" },
            { label: "Catálogo", href: "/producto" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              display: "block", fontSize: "13px", color: "rgba(209,201,184,0.7)",
              textDecoration: "none", marginBottom: "10px", lineHeight: 1.5,
              transition: "color .2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8d5b0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(209,201,184,0.7)")}
            >
              {t(label)}
            </Link>
          ))}
        </div>

        {/* Columna Comunidad */}
        <div>
          <p style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#b88a4a", marginBottom: "16px",
          }}>
            {t("Comunidad")}
          </p>
          {[
            { label: "Ser productor", href: "/dashboard/productor/solicitar" },
            { label: "Mi cuenta", href: "/profile" },
            { label: "Mis pedidos", href: "/tienda/compras" },
            { label: "Favoritos", href: "/tienda/deseos" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              display: "block", fontSize: "13px", color: "rgba(209,201,184,0.7)",
              textDecoration: "none", marginBottom: "10px", lineHeight: 1.5,
              transition: "color .2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8d5b0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(209,201,184,0.7)")}
            >
              {t(label)}
            </Link>
          ))}
        </div>

        {/* Columna Contacto */}
        <div>
          <p style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#b88a4a", marginBottom: "16px",
          }}>
            {t("Contacto")}
          </p>
          {[
            { label: "guardianasdemezcal@gmail.com", href: "mailto:guardianasdemezcal@gmail.com" },
            { label: "9512578906", href: "tel:9512578906" },
            { label: "Santa María Zaquilán, Oaxaca", href: "#" },
          ].map(({ label, href }) => (
            <a key={label} href={href} style={{
              display: "block", fontSize: "13px", color: "rgba(209,201,184,0.7)",
              textDecoration: "none", marginBottom: "10px", lineHeight: 1.5,
              transition: "color .2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8d5b0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(209,201,184,0.7)")}
            >
              {t(label)}
            </a>
          ))}
        </div>
      </div>

      {/* ─── Barra copyright ─── */}
      <div style={{
        borderTop: "1px solid rgba(184,138,74,0.12)",
        padding: "20px 32px",
        display: "flex", flexWrap: "wrap", gap: "12px",
        alignItems: "center", justifyContent: "space-between",
        maxWidth: "1200px", margin: "0 auto",
      }}>
        <p style={{ fontSize: "12px", color: "rgba(209,201,184,0.4)", margin: 0 }}>
          © 2026 {t("Guardianas de Mezcal. Todos los derechos reservados.")}
        </p>
        <div style={{ display: "flex", gap: "20px" }}>
          {["Privacidad", "Términos"].map((item) => (
            <a key={item} href="#" style={{
              fontSize: "12px", color: "rgba(209,201,184,0.4)",
              textDecoration: "none", transition: "color .2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#b88a4a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(209,201,184,0.4)")}
            >
              {t(item)}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
