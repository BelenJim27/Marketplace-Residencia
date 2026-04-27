'use client';

import { useEffect, useRef, MutableRefObject } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  wobble: number;
  wobbleSpeed: number;
  type: 'smoke' | 'ember' | 'spark';
}

interface AgaveShape {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export function useMezcalBackground(canvasRef: MutableRefObject<HTMLCanvasElement>): void {
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    let particles: Particle[] = [];
    let agaveShapes: AgaveShape[] = [];
    let width = 0;
    let height = 0;

    function resize(): void {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initAgaves();
    }

    function createParticle(fromBottom = false): Particle {
      const rand = Math.random();
      return {
        x: Math.random() * width,
        y: fromBottom ? height + Math.random() * 50 : Math.random() * height,
        size: Math.random() * 4 + 0.8,
        speed: Math.random() * 0.5 + 0.15,
        opacity: Math.random() * 0.75 + 0.2,
        drift: (Math.random() - 0.5) * 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: (Math.random() - 0.5) * 0.018,
        type: rand > 0.75 ? 'ember' : rand > 0.55 ? 'spark' : 'smoke',
      };
    }

    function initParticles(count = 160): void {
      particles = Array.from({ length: count }, () => createParticle());
    }

    function initAgaves(): void {
      agaveShapes = [
        { x: width * 0.02,  y: height, scale: 1.6,  opacity: 0.70 },
        { x: width * 0.13,  y: height, scale: 1.0,  opacity: 0.55 },
        { x: width * 0.87,  y: height, scale: 1.3,  opacity: 0.65 },
        { x: width * 0.98,  y: height, scale: 0.95, opacity: 0.50 },
        { x: width * 0.48,  y: height, scale: 0.75, opacity: 0.35 },
        { x: width * 0.25,  y: height, scale: 0.65, opacity: 0.30 },
        { x: width * 0.72,  y: height, scale: 0.70, opacity: 0.32 },
      ];
    }

    function drawAgave(x: number, y: number, scale: number, opacity: number): void {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = opacity;

      const leaves: Array<{
        angleDeg: number;
        length: number;
        baseWidth: number;
        curve: number;
        droop: number;
      }> = [
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

        const tipX  = cos * leaf.length + leaf.curve;
        const tipY  = sin * leaf.length + leaf.droop;
        const cpX   = cos * leaf.length * 0.55 + leaf.curve * 0.7;
        const cpY   = sin * leaf.length * 0.55 + leaf.droop * 0.4;
        const perpX = -sin;
        const perpY =  cos;
        const hw    = leaf.baseWidth / 2;

        // Relleno
        ctx.beginPath();
        ctx.moveTo(perpX * hw, perpY * hw);
        ctx.quadraticCurveTo(cpX + perpX * (hw * 0.3), cpY + perpY * (hw * 0.3), tipX, tipY);
        ctx.quadraticCurveTo(cpX - perpX * (hw * 0.3), cpY - perpY * (hw * 0.3), -perpX * hw, -perpY * hw);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        grad.addColorStop(0,   '#2a5c14');
        grad.addColorStop(0.4, '#4a9628');
        grad.addColorStop(1,   '#3a7520');
        ctx.fillStyle = grad;
        ctx.fill();

        // Outline
        ctx.beginPath();
        ctx.moveTo(perpX * hw, perpY * hw);
        ctx.quadraticCurveTo(cpX + perpX * (hw * 0.3), cpY + perpY * (hw * 0.3), tipX, tipY);
        ctx.quadraticCurveTo(cpX - perpX * (hw * 0.3), cpY - perpY * (hw * 0.3), -perpX * hw, -perpY * hw);
        ctx.closePath();
        ctx.strokeStyle = '#1e4410';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Nervadura
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(cpX * 0.85, cpY * 0.85, tipX * 0.9, tipY * 0.9);
        ctx.strokeStyle = '#7dc840';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Espina
        ctx.beginPath();
        ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#c8a060';
        ctx.fill();
      }

      // Bulbo base
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3d0e';
      ctx.fill();
      ctx.strokeStyle = '#4a7a20';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    function drawParticle(p: Particle): void {
      ctx.save();
      ctx.globalAlpha = p.opacity;

      if (p.type === 'ember') {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
        grad.addColorStop(0,   'rgba(255, 210, 80, 1)');
        grad.addColorStop(0.5, 'rgba(255, 110, 20, 0.95)');
        grad.addColorStop(1,   'rgba(220, 50, 0, 0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 240, 140, 1)';
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(255, 180, 30, 1)';
        ctx.fill();
      } else {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0,   'rgba(200, 120, 50, 0.5)');
        grad.addColorStop(0.5, 'rgba(160, 90, 30, 0.25)');
        grad.addColorStop(1,   'rgba(120, 60, 10, 0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.restore();
    }

    function drawBackground(): void {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0,    '#5c3018');
      grad.addColorStop(0.3,  '#8a5028');
      grad.addColorStop(0.65, '#b87040');
      grad.addColorStop(1,    '#e8a060');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width * 0.5, height, 0, width * 0.5, height, width * 0.6);
      glow.addColorStop(0,   'rgba(210, 100, 20, 0.35)');
      glow.addColorStop(0.5, 'rgba(170, 70, 10, 0.15)');
      glow.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    function drawStars(): void {
      const starPositions: [number, number][] = [
        [0.10, 0.04], [0.25, 0.02], [0.40, 0.06], [0.55, 0.01],
        [0.70, 0.05], [0.85, 0.03], [0.15, 0.10], [0.60, 0.08],
        [0.90, 0.07], [0.35, 0.13], [0.78, 0.11], [0.05, 0.09],
        [0.92, 0.14], [0.48, 0.04], [0.33, 0.07],
      ];
      const now = Date.now() * 0.001;
      starPositions.forEach(([sx, sy], i) => {
        const twinkle = 0.4 + Math.sin(now * 1.5 + i * 1.7) * 0.35;
        ctx.beginPath();
        ctx.arc(sx * width, sy * height, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 235, 180, ${twinkle})`;
        ctx.fill();
      });
    }

    function animate(): void {
      ctx.clearRect(0, 0, width, height);
      drawBackground();
      drawStars();
      agaveShapes.forEach(a => drawAgave(a.x, a.y, a.scale, a.opacity));

      particles.forEach((p, i) => {
        p.wobble += p.wobbleSpeed;
        p.x += p.drift + Math.sin(p.wobble) * 0.18;
        p.y -= p.speed;

        const progress = 1 - p.y / height;
        if (progress > 0.75) p.opacity *= 0.985;

        if (p.y < -20 || p.opacity < 0.01) particles[i] = createParticle(true);
        drawParticle(p);
      });

      animRef.current = requestAnimationFrame(animate);
    }

    resize();
    initParticles();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);
}