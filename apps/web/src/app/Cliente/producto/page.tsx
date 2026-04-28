import { Metadata } from "next";
import ProductCatalogClient from "@/components/catalog/Client";

export const metadata: Metadata = {
  title: { absolute: "Productos" },
};

export default function ProductoPage() {
  return (
    <div className="space-y-8">
      {/* ── HERO SPLIT-SCREEN ── */}
      <section className="overflow-hidden flex flex-col md:flex-row rounded-2xl" style={{ minHeight: "520px" }}>

        {/* COLUMNA IZQUIERDA (Texto e Iconos) */}
        <div className="flex flex-1 flex-col justify-center px-10 py-14 md:px-14 order-2 md:order-1"
             style={{ backgroundColor: "var(--bio-color-fondo, #faf8f4)" }}>

          {/* Línea decorativa + etiqueta */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
            <svg width="32" height="2" viewBox="0 0 32 2">
              <line x1="0" y1="1" x2="32" y2="1" stroke="#c8a97a" strokeWidth="1.5" strokeDasharray="4,3" />
            </svg>
            <span style={{
              fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
              fontSize: "10px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "var(--bio-color-precio, #8b6914)",
              fontWeight: "600",
            }}>
              Oaxaca · Mezcal Artesanal
            </span>
            <svg width="32" height="2" viewBox="0 0 32 2">
              <line x1="0" y1="1" x2="32" y2="1" stroke="#c8a97a" strokeWidth="1.5" strokeDasharray="4,3" />
            </svg>
          </div>

          {/* Título grande */}
          <h1 style={{
            fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            color: "var(--bio-color-titulo, #5c3d1e)",
            fontWeight: "800",
            lineHeight: "1.1",
            marginBottom: "1rem",
          }}>
            Nuestros<br />Mezcales
          </h1>

          {/* Slogan en cursiva */}
          <p style={{
            fontStyle: "italic",
            color: "#b07850",
            fontSize: "1rem",
            marginBottom: "2rem",
            lineHeight: "1.6",
          }}>
            Destilados con sabiduría ancestral<br />del pueblo oaxaqueño
          </p>

          {/* Icono 1: Agave */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div style={{ flexShrink: 0, width: "40px", height: "40px", minWidth: "40px" }}>
              <svg viewBox="0 0 40 40" width="40" height="40" style={{ overflow: "visible" }}>
                <path d="M20 8 Q18 14, 16 18 Q15 20, 14 22 L20 8 Z M20 8 Q22 14, 24 18 Q25 20, 26 22 L20 8 Z M20 8 Q20 16, 20 26"
                      stroke="var(--bio-color-titulo, #5c3d1e)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M16 22 L24 22 M14 24 L26 24" stroke="var(--bio-color-titulo, #5c3d1e)" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{
                fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                color: "var(--bio-color-titulo, #5c3d1e)",
                fontWeight: "600",
                fontSize: "0.875rem",
                marginBottom: "2px",
              }}>
                Maguey Seleccionado
              </p>
              <p style={{ color: "#b07850", fontSize: "0.8rem", lineHeight: "1.5" }}>
                Cultivado en los valles centrales de Oaxaca, cosechado en su punto óptimo de maduración.
              </p>
            </div>
          </div>

          {/* Icono 2: Tahona */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "2.5rem" }}>
            <div style={{ flexShrink: 0, width: "40px", height: "40px", minWidth: "40px" }}>
              <svg viewBox="0 0 40 40" width="40" height="40" style={{ overflow: "visible" }}>
                <circle cx="20" cy="18" r="8" stroke="var(--bio-color-titulo, #5c3d1e)" strokeWidth="1.5" fill="none" />
                <path d="M12 18 Q10 18, 8 18 M28 18 Q30 18, 32 18" stroke="var(--bio-color-titulo, #5c3d1e)" strokeWidth="1" strokeLinecap="round" />
                <line x1="20" y1="8" x2="20" y2="28" stroke="var(--bio-color-titulo, #5c3d1e)" strokeWidth="1" />
                <path d="M14 24 L26 24 L25 28 L15 28 Z" stroke="var(--bio-color-titulo, #5c3d1e)" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <div>
              <p style={{
                fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                color: "var(--bio-color-titulo, #5c3d1e)",
                fontWeight: "600",
                fontSize: "0.875rem",
                marginBottom: "2px",
              }}>
                Molienda con Tahona
              </p>
              <p style={{ color: "#b07850", fontSize: "0.8rem", lineHeight: "1.5" }}>
                Piedra de molino arrastrada por bestia, el método ancestral que da carácter al mezcal.
              </p>
            </div>
          </div>

          {/* CTA Pill Button */}
          <div>
            <a href="#catalogo"
               className="inline-block transition-opacity hover:opacity-85"
               style={{
                 display: "inline-block",
                 padding: "0.75rem 2rem",
                 borderRadius: "9999px",
                 backgroundColor: "var(--bio-color-boton, #5c3d1e)",
                 color: "white",
                 fontFamily: "var(--bio-fuente-titulo, Georgia, serif)",
                 fontSize: "0.9rem",
                 fontWeight: "600",
                 textDecoration: "none",
               }}>
              Conocer más
            </a>
          </div>
        </div>

        {/* COLUMNA DERECHA (Imagen/Botella) */}
        <div className="relative flex items-center justify-center order-1 md:order-2"
             style={{
               backgroundColor: "#4a7c2f",
               minHeight: "300px",
               flexBasis: "45%",
               flexShrink: 0,
               overflow: "hidden",
             }}>

          {/* Silueta agave fondo (decorativa, baja opacidad) */}
          <div style={{
            position: "absolute",
            right: "-40px",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.12,
            pointerEvents: "none",
          }}>
            <svg viewBox="0 0 300 400" width="300" height="400" style={{ overflow: "visible" }}>
              <path d="M150 20 L120 80 L140 120 L110 140 L135 180 L105 200 L130 250 L100 270 L125 320 L95 350 L150 380 L205 350 L175 320 L200 270 L170 250 L195 200 L165 180 L190 140 L160 120 L180 80 Z"
                    fill="white" />
            </svg>
          </div>

          {/* Botella mezcal SVG (centrada, con sombra) */}
          <div style={{
            position: "relative",
            zIndex: 10,
            width: "clamp(140px, 20vw, 220px)",
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.35))",
          }}>
            <svg viewBox="0 0 80 160" width="100%" height="auto" style={{ maxWidth: "220px" }}>
              {/* Etiqueta artesanal */}
              <rect x="25" y="50" width="30" height="35" fill="#e8dcc8" opacity="0.8" />
              <text x="40" y="62" fontSize="8" textAnchor="middle" fill="#5c3d1e" fontFamily="Georgia, serif" fontWeight="bold">
                MEZCAL
              </text>
              <text x="40" y="72" fontSize="5" textAnchor="middle" fill="#8b6914" fontFamily="Georgia, serif">
                Oaxaca
              </text>
              <line x1="28" y1="78" x2="52" y2="78" stroke="#8b6914" strokeWidth="0.5" opacity="0.6" />

              {/* Cuello de botella */}
              <path d="M35 45 L38 30 L42 30 L45 45 Z" fill="#b0d4e0" opacity="0.7" />
              {/* Highlight cuello */}
              <path d="M39 32 L40 44" stroke="white" strokeWidth="1" opacity="0.5" />

              {/* Cuerpo de botella */}
              <path d="M30 45 L28 70 L25 100 L27 140 L53 140 L55 100 L52 70 L50 45 Z"
                    fill="#9ac3d4" opacity="0.6" />
              {/* Highlight principal */}
              <path d="M33 50 Q32 80, 33 130" stroke="white" strokeWidth="2" opacity="0.4" />

              {/* Base de botella */}
              <ellipse cx="40" cy="140" rx="13" ry="3" fill="#7a9fb0" opacity="0.7" />
              {/* Sombra interior */}
              <ellipse cx="40" cy="139" rx="10" ry="2" fill="#5c7a8a" opacity="0.5" />

              {/* Tapa/Corcho */}
              <rect x="37" y="26" width="6" height="5" fill="#8b6914" rx="1" />
              <circle cx="40" cy="26" r="2" fill="white" opacity="0.3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── CATÁLOGO DE PRODUCTOS ── */}
      <div id="catalogo">
        <ProductCatalogClient />
      </div>
    </div>
  );
}