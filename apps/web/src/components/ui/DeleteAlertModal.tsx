"use client";

import { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import type { DeleteAlertState } from "@/hooks/useDeleteAlert";

interface DeleteAlertModalProps {
  estado: DeleteAlertState;
  onClose: () => void;
}

/**
 * Modal reutilizable de confirmación de eliminación.
 * Los textos y mensajes provienen de `config/delete-alerts.ts` a través del hook `useDeleteAlert`.
 *
 * @example
 * const { abrir, cerrar, estado } = useDeleteAlert("producto");
 * <DeleteAlertModal estado={estado} onClose={cerrar} />
 */
export function DeleteAlertModal({ estado, onClose }: DeleteAlertModalProps) {
  const [loading, setLoading] = useState(false);

  if (!estado.open) return null;

  const { config, nombre } = estado;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await estado.onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

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
        animation: "deleteAlertFadeIn 0.18s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
          animation: "deleteAlertSlideUp 0.22s ease",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-alert-title"
      >
        {/* Franja roja superior */}
        <div
          style={{
            height: "4px",
            background: "linear-gradient(90deg, #DC2626 0%, #F97316 100%)",
          }}
        />

        <div style={{ padding: "28px 28px 32px" }}>
          {/* Header */}
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
                background: "rgba(220,38,38,0.08)",
                flexShrink: 0,
              }}
            >
              <Trash2 size={22} style={{ color: "#DC2626" }} />
            </div>
            <button
              onClick={onClose}
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

          {/* Título */}
          <h2
            id="delete-alert-title"
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#1F1F1F",
              margin: "0 0 8px 0",
              fontFamily: "var(--font-family-store, Georgia, serif)",
            }}
          >
            {config.titulo}
          </h2>

          {/* Mensaje principal */}
          <p
            style={{
              fontSize: "14px",
              color: "#6B7280",
              margin: "0 0 16px 0",
              lineHeight: "1.6",
            }}
          >
            {config.mensaje(nombre)}
          </p>

          {/* Advertencia */}
          {config.advertencia && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.15)",
                marginBottom: "24px",
              }}
            >
              <AlertTriangle
                size={15}
                style={{ color: "#DC2626", flexShrink: 0, marginTop: "1px" }}
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "#B91C1C",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                {config.advertencia}
              </p>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
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
              {config.cancelText}
            </button>

            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: loading ? "#F87171" : "#DC2626",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#B91C1C";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#DC2626";
              }}
            >
              {loading ? (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ animation: "deleteAlertSpin 0.8s linear infinite" }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Eliminando...
                </>
              ) : (
                config.confirmText
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes deleteAlertFadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes deleteAlertSlideUp {
          from { opacity: 0; transform: translateY(14px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes deleteAlertSpin {
          from { transform: rotate(0deg) }
          to   { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  );
}
