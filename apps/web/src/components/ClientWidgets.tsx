"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatWidget = dynamic(() => import("@/components/ChatWidget").then(m => m.ChatWidget), { ssr: false });
const CHAT_IDLE_TIMEOUT_MS = 3_000;
const CHAT_FALLBACK_DELAY_MS = 1_500;

export function ClientWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setReady(true), {
        timeout: CHAT_IDLE_TIMEOUT_MS,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(() => setReady(true), CHAT_FALLBACK_DELAY_MS);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return ready ? <ChatWidget /> : null;
}
