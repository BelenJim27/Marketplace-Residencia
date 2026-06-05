"use client";

import { CheckCircle2, X } from "lucide-react";
import type { ToastState } from "@/hooks/useSuccessToast";

interface SuccessToastProps {
  toast: ToastState;
  onClose: () => void;
  /** Posición en pantalla. Por defecto: "top-right" */
  position?: "top-right" | "top-center" | "bottom-right";
}

const POSITIONS: Record<string, React.CSSProperties> = {
  "top-right":   { top: "24px", right: "24px" },
  "top-center":  { top: "24px", left: "50%", transform: "translateX(-50%)" },
  "bottom-right":{ bottom: "24px", right: "24px" },
};

/**
 * Toast de notificación para acciones de registro y actualización.
 * Se usa junto con el hook `useSuccessToast`.
 *
 * @example
 * const toast = useSuccessToast("usuario");
 * <SuccessToast toast={toast.estado} onClose={toast.cerrar} />
 */
export function SuccessToast({
  toast,
  onClose,
  position = "top-right",
}: SuccessToastProps) {
  if (!toast.visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        zIndex: 99999,
        ...POSITIONS[position],
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 18px",
        borderRadius: "14px",
        background: "#fff",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid rgba(61,107,63,0.15)",
        minWidth: "280px",
        maxWidth: "380px",
        animation: "successToastIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Franja verde izquierda */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          borderRadius: "14px 0 0 14px",
          background: "linear-gradient(180deg, #3D6B3F 0%, #A8C26B 100%)",
        }}
      />

      {/* Ícono */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "rgba(61,107,63,0.08)",
          flexShrink: 0,
          marginLeft: "4px",
        }}
      >
        <CheckCircle2 size={20} style={{ color: "#3D6B3F" }} />
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#1F3A2E",
            margin: "0 0 2px 0",
            lineHeight: "1.3",
          }}
        >
          ¡Operación exitosa!
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#6B7280",
            margin: 0,
            lineHeight: "1.5",
          }}
        >
          {toast.message}
        </p>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#9CA3AF",
          flexShrink: 0,
          transition: "background 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        aria-label="Cerrar notificación"
      >
        <X size={15} />
      </button>

      {/* Barra de progreso */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "3px",
          borderRadius: "0 0 14px 14px",
          background: "rgba(61,107,63,0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #3D6B3F, #A8C26B)",
            animation: "successToastProgress 4s linear forwards",
            transformOrigin: "left",
          }}
        />
      </div>

      <style>{`
        @keyframes successToastIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes successToastProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
