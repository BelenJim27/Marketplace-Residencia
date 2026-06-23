"use client";

import { useEffect, useState } from "react";

const VIDEO_IDLE_TIMEOUT_MS = 2_000;

export default function DeferredHeroVideo() {
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const requestIdle = window.requestIdleCallback?.bind(window);
    if (requestIdle) {
      const idleId = requestIdle(() => setCanPlay(true), {
        timeout: VIDEO_IDLE_TIMEOUT_MS,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(() => setCanPlay(true), VIDEO_IDLE_TIMEOUT_MS);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <video
      aria-hidden="true"
      src={canPlay ? "/fotos/videohero.mp4" : undefined}
      poster="/fotos/16.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
