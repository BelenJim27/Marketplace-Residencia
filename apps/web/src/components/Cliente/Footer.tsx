"use client";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "next-themes";

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "Aviso de Privacidad", href: "/privacy" },
  { label: "Términos y Condiciones", href: "/terms" },
  { label: "Política de Envío", href: "/shipping-policy" },
  { label: "Política de Devoluciones", href: "/returns-policy" },
  { label: "Aviso sobre Alcohol", href: "/alcohol-disclaimer" },
];

export default function Footer() {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <footer
      className="w-full py-8 px-6"
      style={{
        background: isDark ? "#0D1A10" : "#1F3A2E",
        borderTop: "1px solid rgba(200, 169, 122, 0.2)",
      }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

        <div className="space-y-2">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "15px" }}>
            {t("Guardianas del Mezcal")}
          </h3>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#C5CFB0", fontSize: "12px", lineHeight: "1.6" }}>
            {t("Honrando la tierra, el fuego y las manos que transforman el agave en espíritu puro.")}
          </p>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "15px" }}>
            {t("Asociaciones")}
          </h3>
          <ul className="space-y-3">
            {[
              {
                nombre: "Guardianas del Mezcal",
                desc: "Organización liderada por mujeres indígenas de Oaxaca que preservan la producción ancestral del mezcal.",
              },
              {
                nombre: "Maestros y Maestras Mezcaleras",
                desc: "Red de maestros mezcaleros que mantienen vivas las técnicas artesanales transmitidas de generación en generación.",
              },
              {
                nombre: "Tierra de Combates",
                desc: "Colectivo comprometido con la producción sostenible del agave y la protección de las comunidades mezcaleras.",
              },
            ].map((asoc) => (
              <li key={asoc.nombre}>
                <p style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "12px", fontWeight: 600, margin: "0 0 2px" }}>
                  {t(asoc.nombre)}
                </p>
                <p style={{ fontFamily: "Georgia, serif", color: "#C5CFB0", fontSize: "11.5px", lineHeight: "1.55", margin: 0 }}>
                  {t(asoc.desc)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "15px" }}>
            {t("Explorar")}
          </h3>
          <ul className="space-y-1.5">
            {["Maestras mezcaleras", "Historia", "Nuestro proceso"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  style={{ fontFamily: "Georgia, serif", color: "#C5CFB0", fontSize: "12px", textDecoration: "none" }}
                  className="hover:opacity-75 transition-opacity"
                >
                  {t(item)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "15px" }}>
            {t("Legal")}
          </h3>
          <ul className="space-y-1.5">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{ fontFamily: "Georgia, serif", color: "#C5CFB0", fontSize: "12px", textDecoration: "none" }}
                  className="hover:opacity-75 transition-opacity"
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="pt-1 space-y-1">
            <h3 style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "15px" }}>
              {t("Contacto")}
            </h3>
            {[
              "guardianasmezcal@gmail.com",
              "9512578906",
              "Santa Maria Zaquiltán, Oaxaca",
            ].map((item) => (
              <p key={item} style={{ fontFamily: "Georgia, serif", color: "#C5CFB0", fontSize: "12px", margin: 0 }}>
                {t(item)}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto mt-6 pt-4 text-center"
        style={{ borderTop: "1px solid rgba(200,169,122,0.15)" }}
      >
        <p style={{
          color: "rgba(197, 207, 176, 0.38)",
          fontSize: "9.5px",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          lineHeight: "1.55",
          maxWidth: "620px",
          margin: "0 auto 8px",
          letterSpacing: "0.01em",
        }}>
          {t("Las imágenes, información y contenidos relacionados con las asociaciones presentadas en esta página son propiedad de Tierra de Agaves y han sido extraídos de su página oficial y redes sociales con fines informativos. Todos los derechos de autor y derechos de imagen pertenecen a sus respectivos titulares.")}
        </p>
        <p style={{ color: "#8a6a3a", fontSize: "11px", fontFamily: "Georgia, serif" }}>
          2026 {t("Guardianas de mezcal. Todos los derechos reservados.")}
        </p>
      </div>
    </footer>
  );
}