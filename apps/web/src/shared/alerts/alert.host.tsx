"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { subscribeConfirm } from "./alert.service";
import type { ConfirmRequest } from "./alert.types";

/**
 * Host del modal de confirmación. Se monta UNA sola vez (en `app/providers.tsx`)
 * y escucha las peticiones de `AlertService.showConfirm`, renderizando el
 * `ConfirmModal` y resolviendo la `Promise<boolean>` correspondiente.
 *
 * Encola peticiones para mostrarlas de una en una.
 */
export function AlertConfirmHost() {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const actual = queue[0];

  useEffect(() => subscribeConfirm((req) => setQueue((q) => [...q, req])), []);

  const resolver = useCallback(
    (confirmed: boolean) => {
      setQueue((q) => {
        const [head, ...rest] = q;
        head?.resolve(confirmed);
        return rest;
      });
    },
    [],
  );

  // Esc cierra (cancela) el modal activo.
  useEffect(() => {
    if (!actual) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolver(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actual, resolver]);

  if (!actual) return null;

  return (
    <ConfirmModal
      open
      title={actual.title}
      text={actual.text}
      warning={actual.warning}
      confirmText={actual.confirmText}
      cancelText={actual.cancelText}
      variant={actual.variant}
      onConfirm={() => resolver(true)}
      onCancel={() => resolver(false)}
    />
  );
}
