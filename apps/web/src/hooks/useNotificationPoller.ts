"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";

const POLL_INTERVAL_MS = 30_000;

type DbNotif = {
  id_notificacion: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  url_accion: string | null;
  leido: boolean;
};

const TYPE_EMOJIS: Record<string, string> = {
  pago_confirmado:           "✅",
  pedido_pagado:             "✅",
  pago_fallido:              "❌",
  pago_reembolsado:          "🔄",
  pago_pendiente_onboarding: "💳",
  solicitud_productor:       "🛍️",
  solicitud_aprobado:        "✅",
  solicitud_rechazado:       "❌",
  nueva_solicitud_productor: "👤",
  nuevo_usuario:             "🧑",
  stock_bajo_admin:          "📦",
};

function getEmoji(tipo: string) {
  return TYPE_EMOJIS[tipo] ?? "🔔";
}

export function useNotificationPoller() {
  const { user, isAuthenticated } = useAuth();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id_usuario) return;

    const token = getCookie("token") ?? "";

    async function poll() {
      try {
        // Fetch directo y silencioso — el poller es best-effort y no debe generar ruido en consola
        const response = await fetch(`/notificaciones/${user!.id_usuario}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const res = await response.json().catch(() => []);
        const notifs: DbNotif[] = (Array.isArray(res) ? res : []).filter((n) => !n.leido);

        if (!initialized.current) {
          // Primera carga: marcar todo como visto sin mostrar toast
          notifs.forEach((n) => seenIds.current.add(n.id_notificacion));
          initialized.current = true;
          return;
        }

        const newNotifs = notifs.filter((n) => !seenIds.current.has(n.id_notificacion));
        newNotifs.forEach((n) => {
          seenIds.current.add(n.id_notificacion);
          const emoji = getEmoji(n.tipo);
          toast(`${emoji} ${n.titulo}`, {
            description: n.cuerpo,
            duration: 6000,
            action: n.url_accion
              ? { label: "Ver", onClick: () => { window.location.href = n.url_accion!; } }
              : undefined,
          });
        });
      } catch {
        // best-effort
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, user?.id_usuario]);
}
