"use client";

import { useState } from "react";
import { useLocale } from "@/context/LocaleContext";

const FAQ_ITEMS = [1, 2, 3, 4, 5, 6] as const;

export default function LandingFaq() {
  const { t } = useLocale();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section style={{ background: "#1F3A2E", padding: "64px 24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <p style={{ fontFamily: "Georgia, serif", color: "#A8C26B", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "10px", textAlign: "center" }}>
          {t("Ayuda")}
        </p>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(24px,4vw,34px)", fontWeight: 700, color: "#F4F0E3", textAlign: "center", marginBottom: "40px" }}>
          {t("soporte_faq_title")}
        </h2>

        <div style={{ marginBottom: "32px" }}>
          {FAQ_ITEMS.map((item) => (
            <div key={item} style={{ borderBottom: "1px solid rgba(244,240,227,0.1)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === item ? null : item)}
                aria-expanded={openFaq === item}
                style={{
                  display: "flex", width: "100%", alignItems: "center",
                  justifyContent: "space-between", padding: "16px 0",
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", fontFamily: "Georgia, serif",
                  fontSize: "15px", fontWeight: 600, color: "#F4F0E3",
                }}
              >
                <span style={{ paddingRight: "16px", lineHeight: "1.4" }}>{t(`soporte_faq_q${item}`)}</span>
                <svg
                  aria-hidden="true"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="#C97A3E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: "transform 0.2s", transform: openFaq === item ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openFaq === item ? (
                <p style={{ paddingBottom: "16px", fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: "1.7", color: "rgba(244,240,227,0.72)", margin: 0 }}>
                  {t(`soporte_faq_a${item}`)}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "rgba(244,240,227,0.6)", fontSize: "14px", marginBottom: "16px" }}>
            {t("soporte_contact_subtitle")}
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat-widget", { detail: { tab: "contacto" } }))}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 28px", borderRadius: "8px",
              background: "#C97A3E", color: "#F4F0E3",
              fontFamily: "Georgia, serif", fontSize: "14px", fontWeight: 600,
              border: "none", cursor: "pointer", letterSpacing: "0.03em",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(event) => (event.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(event) => (event.currentTarget.style.opacity = "1")}
          >
            {t("soporte_contact_title")}
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
