"use client";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "Aviso de Privacidad", href: "/privacy" },
  { label: "Términos y Condiciones", href: "/terms" },
  { label: "Política de Envío", href: "/shipping-policy" },
  { label: "Política de Devoluciones", href: "/returns-policy" },
  { label: "Aviso sobre Alcohol", href: "/alcohol-disclaimer" },
];

export default function Footer() {
  const { t } = useLocale();

  return (
    <footer
      className="w-full py-16 px-8"
      style={{
        background: "rgba(20, 8, 2, 0.75)",
        borderTop: "1px solid rgba(200, 169, 122, 0.2)",
      }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            {t("Guardianas del Mezcal")}
          </h3>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#c8a97a", fontSize: "14px", lineHeight: "1.7" }}>
            {t("Honrando la tierra, el fuego y las manos que transforman el agave en espíritu puro. Distribuimos el mejor mezcal artesanal de México")}
          </p>
        </div>

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            {t("Explorar")}
          </h3>
          <ul className="space-y-2">
            {[
              "Maestras mezcaleras",
              "Historia",
              "Nuestro proceso"
            ].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  style={{ fontFamily: "Georgia, serif", color: "#c8a97a", fontSize: "14px", textDecoration: "none" }}
                  className="hover:opacity-75 transition-opacity"
                >
                  {t(item)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            {t("Legal")}
          </h3>
          <ul className="space-y-2">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{ fontFamily: "Georgia, serif", color: "#c8a97a", fontSize: "14px", textDecoration: "none" }}
                  className="hover:opacity-75 transition-opacity"
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#e8c060", fontSize: "18px" }}>
            {t("Contacto")}
          </h3>
          <ul className="space-y-2">
            {[
              "guardianasmezcal@gmail.com",
              "9512578906",
              "Santa Maria Zaquiltán, Oaxaca, México",
            ].map((item) => (
              <li key={item} style={{ fontFamily: "Georgia, serif", color: "#c8a97a", fontSize: "14px" }}>
                {t(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="max-w-5xl mx-auto mt-12 pt-6 text-center space-y-1"
        style={{ borderTop: "1px solid rgba(200,169,122,0.15)" }}
      >
        <p style={{ color: "#8a6a3a", fontSize: "12px", fontFamily: "Georgia, serif" }}>
          2026 {t("Guardianas de mezcal. Todos los derechos reservados.")}
        </p>
      </div>
    </footer>
  );
}
