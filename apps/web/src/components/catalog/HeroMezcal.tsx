'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { hexFallbacks } from '@/lib/colors';
import { catalogColors } from '@/lib/colors-catalog';

export function HeroMezcal() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative w-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${catalogColors.hero.gradientStart} 0%, ${catalogColors.hero.gradientMid} 50%, ${catalogColors.hero.gradientEnd} 100%)`,
        minHeight: '480px',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Parallax pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(242, 247, 244, 0.1) 35px, rgba(242, 247, 244, 0.1) 70px)`,
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />

        {/* Gradient orbs - simplified opacity instead of blur-3xl for performance */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{
            background: `radial-gradient(circle, ${catalogColors.hero.decorativeAccent} 0%, transparent 70%)`,
            transform: `translateY(${scrollY * 0.3}px) translateX(${scrollY * 0.2}px)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-8"
          style={{
            background: `radial-gradient(circle, rgba(207, 116, 79, 0.5) 0%, transparent 70%)`,
            transform: `translateY(${-scrollY * 0.2}px) translateX(${-scrollY * 0.1}px)`,
          }}
        />
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 flex flex-col items-center text-center"
        style={{
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      >
        {/* Decorative elements */}
        <div className="mb-8 flex items-center justify-center gap-3 animate-fade-in">
          <Sparkles size={24} color={catalogColors.hero.textPrimary} />
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/90">
            Artesanía Milenaria
          </p>
          <Sparkles size={24} color={catalogColors.hero.textPrimary} />
        </div>

        {/* Main heading */}
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight max-w-3xl"
          style={{
            fontFamily: 'Georgia, serif',
            color: catalogColors.hero.textPrimary,
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideDown 0.8s ease-out',
          }}
        >
          Mezcales de Oaxaca
        </h1>

        {/* Subheading */}
        <p
          className="text-lg sm:text-xl text-white/85 mb-6 max-w-2xl font-light"
          style={{
            animation: 'fadeIn 0.8s ease-out 0.2s both',
          }}
        >
          Espíritus artesanales de generaciones que honran la tradición oaxaqueña
        </p>

        {/* Divider */}
        <div
          className="w-24 h-1 rounded-full mb-8"
          style={{
            background: 'linear-gradient(90deg, transparent, #53926d, transparent)',
            animation: 'scaleX 0.8s ease-out 0.4s both',
          }}
        />

        {/* Description */}
        <p className="text-sm sm:text-base text-white/75 max-w-2xl leading-relaxed font-light">
          Cada botella cuenta la historia de agave ancestral y la maestría de sus productores.
          Destilados únicos con técnicas que han perdurado por siglos en el corazón de México.
        </p>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleX {
          from {
            transform: scaleX(0);
            opacity: 0;
          }
          to {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out 0.1s both;
        }
      `}</style>
    </div>
  );
}
