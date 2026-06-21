"use client";

import dynamic from "next/dynamic";

const ChatWidget = dynamic(() => import("@/components/ChatWidget").then(m => m.ChatWidget), { ssr: false });

export function ClientWidgets() {
  return <ChatWidget />;
}
