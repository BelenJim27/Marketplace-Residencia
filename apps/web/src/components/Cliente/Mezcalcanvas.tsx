'use client';

import { useRef } from 'react';
import { useMezcalBackground } from '@/hooks/useMezcalBackground';

export default function MezcalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  useMezcalBackground(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
}