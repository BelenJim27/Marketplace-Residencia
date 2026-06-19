"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const SUGGESTED_ES = [
  "¿Qué tipos de mezcal tienen?",
  "¿Cómo hago un pedido?",
  "¿Envían a EE.UU.?",
];

const SUGGESTED_EN = [
  "What types of mezcal do you have?",
  "How do I place an order?",
  "Do you ship to the US?",
];

function detectLang(): "es" | "en" {
  if (typeof navigator === "undefined") return "es";
  return navigator.language.startsWith("en") ? "en" : "es";
}

const LABELS = {
  es: {
    title: "Asistente Mezcales",
    subtitle: "¿En qué te puedo ayudar?",
    placeholder: "Escribe tu pregunta...",
    send: "Enviar",
    welcome:
      "Hola, soy el asistente de Mezcales. Pregúntame sobre nuestros productos, pedidos o envíos.",
    close: "Cerrar chat",
    open: "Abrir asistente",
  },
  en: {
    title: "Mezcales Assistant",
    subtitle: "How can I help you?",
    placeholder: "Type your question...",
    send: "Send",
    welcome:
      "Hi! I'm the Mezcales assistant. Ask me about our products, orders, or shipping.",
    close: "Close chat",
    open: "Open assistant",
  },
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isAdmin, isProductor } = useAuth();
  const rol = isAdmin ? "admin" : isProductor ? "productor" : "cliente";

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const t = LABELS[lang];
  const suggestions = lang === "en" ? SUGGESTED_EN : SUGGESTED_ES;
  const showWelcome = messages.length === 0;

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    // Se pasa rol en cada envío para capturar el valor actual post-auth
    sendMessage({ text: trimmed }, { body: { rol } });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  function getMessageText(msg: (typeof messages)[0]): string {
    const textPart = msg.parts.find((p) => p.type === "text");
    return textPart ? (textPart as { type: "text"; text: string }).text : "";
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t.close : t.open}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#5750F1] shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#5750F1] focus:ring-offset-2"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-2xl dark:border-dark-3 dark:bg-gray-dark sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center gap-3 bg-[#5750F1] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t.title}</p>
              <p className="text-xs text-white/70">{t.subtitle}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {showWelcome && (
              <div className="flex flex-col gap-3">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-2 px-4 py-2.5 text-sm text-dark dark:bg-dark-2 dark:text-white">
                  {t.welcome}
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="w-fit rounded-full border border-[#5750F1]/40 px-3 py-1.5 text-left text-xs text-[#5750F1] transition-colors hover:bg-[#5750F1]/10 dark:border-[#5750F1]/60 dark:text-[#8B87F5]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = getMessageText(m);
              if (!text) return null;
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-tr-sm bg-[#5750F1] text-white"
                        : "rounded-tl-sm bg-gray-2 text-dark dark:bg-dark-2 dark:text-white"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-gray-2 px-4 py-2.5 dark:bg-dark-2">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-stroke p-3 dark:border-dark-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              disabled={isLoading}
              className="flex-1 rounded-full border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none placeholder:text-gray-400 focus:border-[#5750F1] disabled:opacity-50 dark:border-dark-3 dark:text-white"
            />
            <button
              type="submit"
              disabled={isLoading || !input?.trim()}
              aria-label={t.send}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5750F1] text-white transition-opacity disabled:opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
