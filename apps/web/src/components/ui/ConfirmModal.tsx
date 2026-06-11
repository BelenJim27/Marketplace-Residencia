"use client";

import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import type { AlertVariant } from "@/shared/alerts/alert.types";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  text?: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Paleta e icono por variante. Mismo look & feel que el antiguo DeleteAlertModal. */
const VARIANTS: Record<
  AlertVariant,
  { stripe: string; iconBg: string; color: string; confirmBg: string; confirmHover: string; Icon: typeof AlertTriangle }
> = {
  danger: {
    stripe: "linear-gradient(90deg, #DC2626 0%, #F97316 100%)",
    iconBg: "rgba(220,38,38,0.08)",
    color: "#DC2626",
    confirmBg: "#DC2626",
    confirmHover: "#B91C1C",
    Icon: Trash2,
  },
  warning: {
    stripe: "linear-gradient(90deg, #D97706 0%, #F59E0B 100%)",
    iconBg: "rgba(217,119,6,0.08)",
    color: "#D97706",
    confirmBg: "#D97706",
    confirmHover: "#B45309",
    Icon: AlertTriangle,
  },
  info: {
    stripe: "linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)",
    iconBg: "rgba(37,99,235,0.08)",
    color: "#2563EB",
    confirmBg: "#2563EB",
    confirmHover: "#1D4ED8",
    Icon: Info,
  },
};

/**
 * Modal de confirmación presentacional reutilizable.
 *
 * Lo consume `<AlertConfirmHost/>` (vía `AlertService.showConfirm`). No depende
 * de ninguna entidad; los textos llegan por props.
 */
export function ConfirmModal({
  open,
  title,
  text,
  warning,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  variant = "warning",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const v = VARIANTS[variant];
  const Icon = v.Icon;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        animation: "confirmModalFadeIn 0.18s ease",
      }}
      onClick={loading ? undefined : onCancel}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
          animation: "confirmModalSlideUp 0.22s ease",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div style={{ height: "4px", background: v.stripe }} />

        <div style={{ padding: "28px 28px 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: v.iconBg,
                flexShrink: 0,
              }}
            >
              <Icon size={22} style={{ color: v.color }} />
            </div>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "transparent",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                color: "#9A9590",
                opacity: loading ? 0.5 : 1,
              }}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <h2
            id="confirm-modal-title"
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#1F1F1F",
              margin: "0 0 8px 0",
              fontFamily: "var(--font-family-store, Georgia, serif)",
            }}
          >
            {title}
          </h2>

          {text && (
            <p
              style={{
                fontSize: "14px",
                color: "#6B7280",
                margin: "0 0 16px 0",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
              }}
            >
              {text}
            </p>
          )}

          {warning && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: v.iconBg,
                border: `1px solid ${v.color}26`,
                marginBottom: "24px",
              }}
            >
              <AlertTriangle
                size={15}
                style={{ color: v.color, flexShrink: 0, marginTop: "1px" }}
              />
              <p style={{ fontSize: "12px", color: v.color, margin: 0, lineHeight: "1.5" }}>
                {warning}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: warning ? 0 : "8px" }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 20px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.12)",
                background: "transparent",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: v.confirmBg,
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = v.confirmHover;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = v.confirmBg;
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confirmModalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes confirmModalSlideUp {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  );
}
