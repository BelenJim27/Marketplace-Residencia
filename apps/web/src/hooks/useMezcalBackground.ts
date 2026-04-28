'use client';

import { useEffect, useRef, MutableRefObject } from 'react';
import { useTheme } from 'next-themes'; // ✅ Importante para detectar el cambio

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  wobble: number;
  wobbleSpeed: number;
  type: 'dust' | 'sparkle';
}

interface AgaveShape {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export function useMezcalBackground(canvasRef: MutableRefObject<HTMLCanvasElement | null>): void {
  const animRef = useRef<number | null>(null);
  const { resolvedTheme } = useTheme(); // ✅ Detecta si es 'dark' o 'light'

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let agaveShapes: AgaveShape[] = [];
    let width = 0;
    let height = 0;

    // ─── CONFIGURACIÓN DE COLORES DINÁMICOS ──────────────────────────────────
    const isDark = resolvedTheme === 'dark';
    
    // Fondo: Beige arena (#F2E8DF) para claro, Gris casi negro (#0B0B0B) para oscuro
    const backgroundColor = isDark ? '#0B0B0B' : '#F2E8DF'; 
    const dustColor = isDark ? '#4A4A4A' : '#8B7D77';
    const agaveBaseColor = isDark ? '#142d0a' : '#2a5c14';
    const agaveStrokeColor = isDark ? '#0d1f07' : '#1e4410';

    function resize(): void {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initAgaves();
      if (particles.length === 0) initParticles();
    }

    function createParticle(fromBottom = false): Particle {
      const isSparkle = Math.random() > 0.4;
      return {
        x: Math.random() * width,
        y: fromBottom ? height + 20 : Math.random() * height,
        size: isSparkle ? Math.random() * 2.5 + 1.5 : Math.random() * 1.2 + 0.5,
        speed: isSparkle ? Math.random() * 0.6 + 0.3 : Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.7 + 0.3,
        drift: (Math.random() - 0.5) * 0.4,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: (Math.random() - 0.5) * 0.02,
        type: isSparkle ? 'sparkle' : 'dust',
      };
    }

    function initParticles(): void {
      particles = Array.from({ length: 90 }, () => createParticle());
    }

    function initAgaves(): void {
      agaveShapes = [
        { x: width * 0.02,  y: height, scale: 1.6,  opacity: isDark ? 0.40 : 0.70 },
        { x: width * 0.13,  y: height, scale: 1.0,  opacity: isDark ? 0.35 : 0.55 },
        { x: width * 0.87,  y: height, scale: 1.3,  opacity: isDark ? 0.38 : 0.65 },
        { x: width * 0.98,  y: height, scale: 0.95, opacity: isDark ? 0.30 : 0.50 },
        { x: width * 0.48,  y: height, scale: 0.75, opacity: isDark ? 0.20 : 0.35 },
        { x: width * 0.25,  y: height, scale: 0.65, opacity: isDark ? 0.15 : 0.30 },
        { x: width * 0.72,  y: height, scale: 0.70, opacity: isDark ? 0.18 : 0.32 },
      ];
    }

    function drawAgave(x: number, y: number, scale: number, opacity: number): void {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.scale(scale, scale);
      ctx!.globalAlpha = opacity;

      const leaves = [
        { angleDeg: -90,  length: 130, baseWidth: 14, curve:   0, droop:  10 },
        { angleDeg: -82,  length: 120, baseWidth: 12, curve:   8, droop:  15 },
        { angleDeg: -98,  length: 120, baseWidth: 12, curve:  -8, droop:  15 },
        { angleDeg: -70,  length: 115, baseWidth: 13, curve:  18, droop:  30 },
        { angleDeg: -110, length: 115, baseWidth: 13, curve: -18, droop:  30 },
        { angleDeg: -60,  length: 108, baseWidth: 12, curve:  25, droop:  45 },
        { angleDeg: -120, length: 108, baseWidth: 12, curve: -25, droop:  45 },
        { angleDeg: -45,  length: 100, baseWidth: 11, curve:  30, droop:  55 },
        { angleDeg: -135, length: 100, baseWidth: 11, curve: -30, droop:  55 },
        { angleDeg: -30,  length:  90, baseWidth: 10, curve:  28, droop:  60 },
        { angleDeg: -150, length:  90, baseWidth: 10, curve: -28, droop:  60 },
        { angleDeg: -20,  length:  80, baseWidth:  9, curve:  20, droop:  65 },
        { angleDeg: -160, length:  80, baseWidth:  9, curve: -20, droop:  65 },
      ];

      for (const leaf of leaves) {
        const rad = (leaf.angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const tipX = cos * leaf.length + leaf.curve;
        const tipY = sin * leaf.length + leaf.droop;
        const cpX = cos * leaf.length * 0.55 + leaf.curve * 0.7;
        const cpY = sin * leaf.length * 0.55 + leaf.droop * 0.4;
        const perpX = -sin;
        const perpY =  cos;
        const hw = leaf.baseWidth / 2;

        ctx!.beginPath();
        ctx!.moveTo(perpX * hw, perpY * hw);
        ctx!.quadraticCurveTo(cpX + perpX * (hw * 0.3), cpY + perpY * (hw * 0.3), tipX, tipY);
        ctx!.quadraticCurveTo(cpX - perpX * (hw * 0.3), cpY - perpY * (hw * 0.3), -perpX * hw, -perpY * hw);
        ctx!.closePath();

        const grad = ctx!.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0, agaveBaseColor);
        grad.addColorStop(0.4, isDark ? '#3a7a20' : '#4a9628');
        grad.addColorStop(1, isDark ? '#2a5c14' : '#3a7520');
        ctx!.fillStyle = grad;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.moveTo(perpX * hw, perpY * hw);
        ctx!.quadraticCurveTo(cpX + perpX * (hw * 0.3), cpY + perpY * (hw * 0.3), tipX, tipY);
        ctx!.quadraticCurveTo(cpX - perpX * (hw * 0.3), cpY - perpY * (hw * 0.3), -perpX * hw, -perpY * hw);
        ctx!.closePath();
        ctx!.strokeStyle = agaveStrokeColor;
        ctx!.lineWidth = 0.8;
        ctx!.stroke();

        // Línea central de la penca
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.quadraticCurveTo(cpX * 0.85, cpY * 0.85, tipX * 0.9, tipY * 0.9);
        ctx!.strokeStyle = isDark ? '#4a7a20' : '#7dc840';
        ctx!.lineWidth = 1.2;
        ctx!.stroke();

        // Espina del ápice
        ctx!.beginPath();
        ctx!.arc(tipX, tipY, 2, 0, Math.PI * 2);
        ctx!.fillStyle = isDark ? '#8b5a2b' : '#c8a060';
        ctx!.fill();
      }

      // Centro del Agave
      ctx!.beginPath();
      ctx!.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
      ctx!.fillStyle = isDark ? '#0d1a06' : '#1e3d0e';
      ctx!.fill();
      ctx!.restore();
    }

    function drawParticle(p: Particle): void {
      ctx!.save();
      if (p.type === 'sparkle') {
        ctx!.shadowBlur = isDark ? 20 : 15;
        ctx!.shadowColor = '#e63946';
        ctx!.globalAlpha = isDark ? p.opacity : p.opacity * 0.8;
        const pGrad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        pGrad.addColorStop(0, '#fff');
        pGrad.addColorStop(0.3, isDark ? '#ffca3a' : '#ffb703');
        pGrad.addColorStop(1, '#e63946');
        ctx!.fillStyle = pGrad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        ctx!.globalAlpha = isDark ? p.opacity * 0.4 : p.opacity * 0.2;
        ctx!.fillStyle = dustColor;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function animate(): void {
      ctx!.clearRect(0, 0, width, height);
      
      // ✅ FONDO DINÁMICO
      ctx!.fillStyle = backgroundColor; 
      ctx!.fillRect(0, 0, width, height);

      agaveShapes.forEach(a => drawAgave(a.x, a.y, a.scale, a.opacity));

      particles.forEach((p, i) => {
        p.wobble += p.wobbleSpeed;
        p.x += p.drift + Math.sin(p.wobble) * 0.3;
        p.y -= p.speed;

        if (p.y < -20) {
          particles[i] = createParticle(true);
        }
        
        drawParticle(p);
      });

      animRef.current = requestAnimationFrame(animate);
    }

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, resolvedTheme]); // ✅ Se vuelve a ejecutar cuando el tema cambia
}