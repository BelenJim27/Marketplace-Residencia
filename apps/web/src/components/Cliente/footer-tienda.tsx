"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";

function useWindowWidth(): number {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

export function FooterTienda() {
  const { t } = useLocale();
  const winWidth = useWindowWidth();
  const isMobile = winWidth < 640;

  return (
    <div style={{ padding: isMobile ? "32px 24px 24px" : "36px 28px 26px", background: "#1A241E", marginTop: "10px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
        gap: isMobile ? "24px" : "28px",
        maxWidth: "960px", margin: "0 auto",
      }}>
        <div>
          <p style={{
            fontSize: "17px", fontWeight: 700, fontStyle: "italic",
            fontFamily: "Georgia, serif", color: "#e8c060", marginBottom: "10px",
          }}>
            {t("Guardianas del Mezcal")}
          </p>
          <p style={{ fontSize: "13px", lineHeight: 1.65, opacity: 0.6, color: "#D1D5D2", margin: 0 }}>
            {t("Honrando la tierra, el fuego y las manos que transforman el agave.")}
          </p>
        </div>

        <div>
          <p style={{
            fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#C8A97A", marginBottom: "10px",
          }}>
            {t("Explorar")}
          </p>
          {["Maestras mezcaleras", "Historia", "Nuestro proceso"].map((item) => (
            <a key={item} href="#" style={{
              display: "block", fontSize: "13px", opacity: 0.65,
              color: "#D1D5D2", textDecoration: "none", marginBottom: "6px",
            }}>
              {t(item)}
            </a>
          ))}
        </div>

        <div>
          <p style={{
            fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#C8A97A", marginBottom: "10px",
          }}>
            {t("Contacto")}
          </p>
          {["guardianasdemezcal@gmail.com", "9512578906", "Santa Maria Zaquilán, Oaxaca"].map((item) => (
            <p key={item} style={{ fontSize: "13px", opacity: 0.65, color: "#D1D5D2", margin: 0, marginBottom: "6px" }}>
              {t(item)}
            </p>
          ))}
        </div>
      </div>

      <p style={{
        fontSize: "12px", textAlign: "center", opacity: 0.4, marginTop: "20px",
        paddingTop: "16px", borderTop: "1px solid rgba(200,169,122,0.1)",
        color: "#D1D5D2", margin: "20px 0 0",
      }}>
        2026 © {t("Guardianas de mezcal. Todos los derechos reservados.")}
      </p>
    </div>
  );
}