// @ts-nocheck — tipos pendientes de revisar (AI SDK v6 options mismatch)
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquare, Mail, Bot } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { api } from "@/lib/api";

// ─── Constantes ───────────────────────────────────────────────────────────────

const FAQ_KEYS = [1, 2, 3, 4, 5, 6] as const;

const CATEGORIAS = [
  { value: "pedido", key: "soporte_cat_pedido" },
  { value: "producto", key: "soporte_cat_producto" },
  { value: "pago", key: "soporte_cat_pago" },
  { value: "envio", key: "soporte_cat_envio" },
  { value: "otro", key: "soporte_cat_otro" },
] as const;

// Sugerencias específicas de soporte (referencia por clave i18n)
const SUGG_KEYS = [
  "soporte_ai_sugg1",
  "soporte_ai_sugg2",
  "soporte_ai_sugg3",
  "soporte_ai_sugg4",
] as const;

// ─── Sub-componente FAQ ───────────────────────────────────────────────────────

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[rgba(244,240,227,0.08)] last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-[#F4F0E3] hover:opacity-80 transition-opacity"
        aria-expanded={open}
      >
        <span className="pr-3 leading-snug">{q}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "#C97A3E" }}
        />
      </button>
      {open && (
        <p className="pb-3 text-xs leading-relaxed text-[rgba(244,240,227,0.75)]">{a}</p>
      )}
    </div>
  );
}

// ─── ChatWidget ───────────────────────────────────────────────────────────────

export function ChatWidget() {
  const { t, locale } = useLocale();
  const { user, isAdmin, isProductor } = useAuth();
  const rol = isAdmin ? "admin" : isProductor ? "productor" : "cliente";

  // Panel open/close
  const [open, setOpen] = useState(false);

  // Tabs
  const [tab, setTab] = useState<"chat" | "faq" | "contacto">("chat");

  // ── Chat state ──
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } = useChat({ body: { rol } });
  const isLoading = status === "submitted" || status === "streaming";

  // ── FAQ state ──
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ── Contact form state ──
  const [contactForm, setContactForm] = useState({
    nombre: "",
    email: "",
    asunto: "",
    categoria: "pedido",
    mensaje: "",
  });
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  // Pre-rellenar datos del usuario autenticado
  useEffect(() => {
    if (user) {
      setContactForm((prev) => ({
        ...prev,
        nombre: prev.nombre || user.nombre || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user?.nombre, user?.email, user]);

  // Auto-scroll en chat
  useEffect(() => {
    if (tab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, tab]);

  // Evento global para abrir el widget en una tab específica
  useEffect(() => {
    const handler = (e: Event) => {
      const targetTab = (e as CustomEvent<{ tab?: string }>).detail?.tab;
      setOpen(true);
      if (targetTab === "chat" || targetTab === "faq" || targetTab === "contacto") {
        setTab(targetTab);
      }
    };
    window.addEventListener("open-chat-widget", handler);
    return () => window.removeEventListener("open-chat-widget", handler);
  }, []);

  // ── Helpers chat ──
  function getMessageText(msg: (typeof messages)[0]): string {
    const part = msg.parts.find((p) => p.type === "text");
    return part ? (part as { type: "text"; text: string }).text : "";
  }

  function handleChatSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setChatInput("");
    sendMessage({ text: trimmed }, { body: { rol } });
  }

  // ── Helpers contacto ──
  const handleContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setContactForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus("loading");
    try {
      await api.soporte.enviarContacto(contactForm);
      setContactStatus("ok");
      setContactForm({ nombre: user?.nombre ?? "", email: user?.email ?? "", asunto: "", categoria: "pedido", mensaje: "" });
    } catch {
      setContactStatus("error");
    }
  };

  // ── Labels del panel (tab bar y header) ──
  const isEN = locale === "en";
  const tabLabels = {
    chat: "Chat",
    faq: "FAQ",
    contacto: isEN ? "Contact" : "Contacto",
  };

  const fieldClass =
    "w-full rounded-lg border border-[rgba(244,240,227,0.15)] bg-[rgba(255,255,255,0.07)] px-3 py-2 text-xs text-[#F4F0E3] placeholder:text-[rgba(244,240,227,0.4)] focus:outline-none focus:border-[#C97A3E] transition";

  const showWelcome = messages.length === 0;

  return (
    <>
      {/* ── Botón flotante ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? (isEN ? "Close assistant" : "Cerrar asistente") : (isEN ? "Open assistant" : "Abrir asistente")}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ backgroundColor: "#2E4A33", focusRingColor: "#2E4A33" } as React.CSSProperties}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[340px] flex-col overflow-hidden rounded-2xl border border-[rgba(244,240,227,0.15)] shadow-2xl sm:w-[380px]"
          style={{ backgroundColor: "#1F3A2E" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "#2E4A33" }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <Bot size={16} color="white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#F4F0E3] truncate">
                {isEN ? "Mezcanea Assistant" : "Asistente Mezcanea"}
              </p>
              <p className="text-xs text-[rgba(244,240,227,0.65)]">
                {tab === "chat"
                  ? (isEN ? "How can I help you?" : "¿En qué te puedo ayudar?")
                  : tab === "faq"
                  ? (isEN ? "Frequent questions" : "Preguntas frecuentes")
                  : (isEN ? "Send us a message" : "Envíanos un mensaje")}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 text-[rgba(244,240,227,0.6)] hover:text-[#F4F0E3] transition"
              aria-label={isEN ? "Close" : "Cerrar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-[rgba(244,240,227,0.08)]" style={{ backgroundColor: "#243d2a" }}>
            {(["chat", "faq", "contacto"] as const).map((t_) => (
              <button
                key={t_}
                onClick={() => setTab(t_)}
                className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative"
                style={{
                  color: tab === t_ ? "#F4F0E3" : "rgba(244,240,227,0.5)",
                }}
              >
                {t_ === "chat" && <MessageSquare size={13} />}
                {t_ === "faq" && <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                {t_ === "contacto" && <Mail size={13} />}
                {tabLabels[t_]}
                {tab === t_ && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full" style={{ backgroundColor: "#C97A3E" }} />
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Chat ── */}
          {tab === "chat" && (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {showWelcome && (
                  <div className="flex flex-col gap-3">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#F4F0E3" }}>
                      {t("soporte_ai_welcome")}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {SUGG_KEYS.map((key) => (
                        <button
                          key={key}
                          onClick={() => handleChatSend(t(key))}
                          className="w-fit rounded-full border px-3 py-1.5 text-left text-xs transition-colors hover:bg-[rgba(201,122,62,0.15)]"
                          style={{ borderColor: "rgba(201,122,62,0.4)", color: "#C97A3E" }}
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => {
                  const text = getMessageText(m);
                  if (!text) return null;
                  return (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                        }`}
                        style={
                          m.role === "user"
                            ? { backgroundColor: "#2E4A33", color: "#F4F0E3" }
                            : { backgroundColor: "rgba(255,255,255,0.08)", color: "#F4F0E3" }
                        }
                      >
                        {text}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#C97A3E] [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#C97A3E] [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#C97A3E]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleChatSend(chatInput); }}
                className="flex gap-2 border-t border-[rgba(244,240,227,0.08)] p-3"
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t("soporte_ai_placeholder")}
                  disabled={isLoading}
                  className="flex-1 rounded-full border border-[rgba(244,240,227,0.15)] bg-[rgba(255,255,255,0.07)] px-4 py-2 text-sm text-[#F4F0E3] outline-none placeholder:text-[rgba(244,240,227,0.4)] focus:border-[#C97A3E] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !chatInput.trim()}
                  aria-label={t("soporte_ai_send")}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "#C97A3E" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </>
          )}

          {/* ── Tab: FAQ ── */}
          {tab === "faq" && (
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {FAQ_KEYS.map((n) => (
                <FaqItem
                  key={n}
                  q={t(`soporte_faq_q${n}`)}
                  a={t(`soporte_faq_a${n}`)}
                  open={openFaq === n}
                  onToggle={() => setOpenFaq(openFaq === n ? null : n)}
                />
              ))}
              <div className="pt-4 text-center">
                <button
                  onClick={() => setTab("contacto")}
                  className="text-xs underline decoration-dotted transition-opacity hover:opacity-70"
                  style={{ color: "#C97A3E" }}
                >
                  {isEN ? "Didn't find your answer? → Contact us" : "¿No encontraste respuesta? → Contáctanos"}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Contacto ── */}
          {tab === "contacto" && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {contactStatus === "ok" ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(168,194,107,0.2)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8C26B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#F4F0E3]">{t("soporte_exito")}</p>
                  <button
                    onClick={() => setContactStatus("idle")}
                    className="text-xs underline decoration-dotted text-[rgba(244,240,227,0.6)] hover:opacity-70 transition"
                  >
                    {isEN ? "Send another message" : "Enviar otro mensaje"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(244,240,227,0.75)]">{t("soporte_nombre")} *</label>
                    <input name="nombre" required maxLength={100} value={contactForm.nombre} onChange={handleContactChange} className={fieldClass} placeholder="Ana García" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(244,240,227,0.75)]">{t("soporte_email")} *</label>
                    <input name="email" type="email" required value={contactForm.email} onChange={handleContactChange} className={fieldClass} placeholder="ana@ejemplo.com" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(244,240,227,0.75)]">{t("soporte_categoria")} *</label>
                    <select name="categoria" value={contactForm.categoria} onChange={handleContactChange} className={fieldClass}>
                      {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>{t(c.key)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(244,240,227,0.75)]">{t("soporte_asunto")} *</label>
                    <input name="asunto" required maxLength={150} value={contactForm.asunto} onChange={handleContactChange} className={fieldClass} placeholder={t("soporte_asunto")} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[rgba(244,240,227,0.75)]">{t("soporte_mensaje")} *</label>
                    <textarea name="mensaje" required minLength={20} maxLength={1000} rows={3} value={contactForm.mensaje} onChange={handleContactChange} className={`${fieldClass} resize-none`} placeholder={t("soporte_mensaje_placeholder")} />
                  </div>

                  {contactStatus === "error" && (
                    <p className="rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-300">{t("soporte_error")}</p>
                  )}

                  <button
                    type="submit"
                    disabled={contactStatus === "loading"}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: "#2E4A33" }}
                  >
                    {contactStatus === "loading" ? t("soporte_enviando") : t("soporte_enviar")}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
