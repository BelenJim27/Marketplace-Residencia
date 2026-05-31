'use client';

import { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Zap, ChevronLeft, ChevronRight, Leaf, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hexFallbacks } from '@/lib/colors';
import { useCarrito } from '@/context/CarritoContext';
import { api } from '@/lib/api';
import Image from 'next/image';
import { formatPrice } from '@/lib/format-number';

interface ProductoHero {
  id_producto: number | bigint;
  nombre: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  nombre_productor?: string | null;
}

export function HeroMezcal() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const router = useRouter();

  const { agregarProducto } = useCarrito();
  const [productos, setProductos] = useState<ProductoHero[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [agregadoId, setAgregadoId] = useState<number | bigint | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check for dark mode
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // Optimized scroll handler
  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId: number;
    let lastScrollY = 0;

    const handleScroll = () => {
      lastScrollY = window.scrollY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          setScrollY(lastScrollY);
          rafId = 0;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  // Scroll reveal effect
  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = (entry.target as HTMLElement).dataset.reveal;
          if (id) {
            setVisibleElements((prev) => new Set([...prev, id]));
          }
        }
      });
    }, observerOptions);

    const elements = heroRef.current?.querySelectorAll('[data-reveal]');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Fetch productos
  useEffect(() => {
    api.productos.getAll({})
      .then((data: unknown) =>
        setProductos((data as ProductoHero[]).slice(0, 4))
      )
      .catch((err) => console.error('Error al cargar productos hero:', err))
      .finally(() => setLoadingProductos(false));
  }, []);

  // Autoplay carrusel
  useEffect(() => {
    if (loadingProductos || productos.length === 0 || isPaused) return;
    autoplayRef.current = setInterval(
      () => setActiveIndex((p) => (p + 1) % productos.length),
      4000
    );
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [loadingProductos, productos.length, isPaused]);

  const nextSlide = () => setActiveIndex((p) => (p + 1) % productos.length);
  const prevSlide = () => setActiveIndex((p) => (p - 1 + productos.length) % productos.length);

  const handleAgregarAlCarrito = (p: ProductoHero) => {
    agregarProducto(p as any);
    setAgregadoId(p.id_producto);
    setTimeout(() => setAgregadoId(null), 2000);
  };

  const parallelOffset = prefersReducedMotion ? 0 : scrollY;

  // Usa variables CSS del catálogo inyectadas por ConfigContext
  const activeColors = {
    gradientStart: 'var(--catalog-hero-from, #3D6B3F)',
    gradientMid:   'var(--catalog-hero-from, #3D6B3F)',
    gradientEnd:   'var(--catalog-hero-to, #1F3A2E)',
    textPrimary:   isDarkMode ? '#e8f0ed' : '#fef5f0',
    accentGreen:   '#A8C26B',
    accentBrown:   'var(--catalog-accent, #C97A3E)',
  };

  const isElementVisible = (id: string) => visibleElements.has(id);

  return (
    <div
      ref={heroRef}
      className="relative w-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${activeColors.gradientStart} 0%, ${activeColors.gradientMid} 50%, ${activeColors.gradientEnd} 100%)`,
        minHeight: 'auto',
        paddingTop: 'clamp(3rem, 10vh, 5rem)',
        paddingBottom: 'clamp(3rem, 10vh, 5rem)',
        transition: isDarkMode ? 'background 0.6s ease-out' : 'none',
      }}
    >
      {/* Animated biocultura background layers */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Organic wave pattern */}
        {!prefersReducedMotion && (
          <svg
            className="absolute inset-0 w-full h-full opacity-5"
            viewBox="0 0 1200 800"
            style={{
              transform: `translateY(${parallelOffset * 0.25}px)`,
              willChange: 'transform',
            }}
          >
            <defs>
              <pattern id="biowave" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path
                  d="M0,50 Q25,30 50,50 T100,50"
                  fill="none"
                  stroke={activeColors.accentGreen}
                  strokeWidth="2"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width="1200" height="800" fill="url(#biowave)" />
          </svg>
        )}

        {/* Gradient orbs - biocultura aesthetic */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-8 hidden sm:block"
          style={{
            background: `radial-gradient(circle, ${activeColors.accentGreen} 0%, transparent 70%)`,
            transform: !prefersReducedMotion
              ? `translateY(${parallelOffset * 0.2}px) translateX(${parallelOffset * 0.15}px)`
              : 'none',
            willChange: 'transform',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-6 hidden sm:block"
          style={{
            background: `radial-gradient(circle, ${activeColors.accentBrown} 0%, transparent 70%)`,
            transform: !prefersReducedMotion
              ? `translateY(${-parallelOffset * 0.15}px) translateX(${-parallelOffset * 0.1}px)`
              : 'none',
            willChange: 'transform',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
        style={{
          transform: !prefersReducedMotion ? `translateY(${parallelOffset * 0.2}px)` : 'none',
        }}
      >
        {/* Left Column: Copy + CTA */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        {/* Biocultura badge */}
        <div
          data-reveal="badge"
          className="mb-6 flex items-center justify-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-sm"
          style={{
            backgroundColor: `${activeColors.accentGreen}22`,
            border: `1.5px solid ${activeColors.accentGreen}44`,
            animation: !prefersReducedMotion && isElementVisible('badge')
              ? 'fadeInDown 0.6s ease-out'
              : isElementVisible('badge')
              ? 'none'
              : 'none',
            opacity: isElementVisible('badge') ? 1 : 0,
            transform: isElementVisible('badge') ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          }}
        >
          <Leaf size={18} color={activeColors.accentGreen} aria-hidden="true" />
          <p
            className="text-xs sm:text-sm font-semibold uppercase tracking-widest"
            style={{ color: activeColors.accentGreen }}
          >
            Patrimonio Biocultura
          </p>
          <Leaf size={18} color={activeColors.accentGreen} aria-hidden="true" />
        </div>

        {/* Main heading */}
        <h1
          data-reveal="heading"
          className="text-4xl sm:text-5xl lg:text-7xl font-black mb-4 leading-tight max-w-4xl"
          style={{
            fontFamily: 'var(--font-family-store)',
            color: activeColors.textPrimary,
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            animation: !prefersReducedMotion && isElementVisible('heading')
              ? 'slideDown 0.7s ease-out'
              : isElementVisible('heading')
              ? 'none'
              : 'none',
            opacity: isElementVisible('heading') ? 1 : 0,
            transform: isElementVisible('heading') ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
            lineHeight: 1.1,
          }}
        >
          Mezcales Ancestrales de Oaxaca
        </h1>

        {/* Subheading */}
        <p
          data-reveal="subheading"
          className="text-base sm:text-lg text-white/80 mb-8 max-w-2xl font-light leading-relaxed"
          style={{
            color: `${activeColors.textPrimary}cc`,
            animation: !prefersReducedMotion && isElementVisible('subheading')
              ? 'fadeIn 0.6s ease-out 0.1s both'
              : isElementVisible('subheading')
              ? 'none'
              : 'none',
            opacity: isElementVisible('subheading') ? 1 : 0,
            transform: isElementVisible('subheading') ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease-out 0.1s, transform 0.6s ease-out 0.1s',
          }}
        >
          Conexión directa con productores artesanales que preservan tradiciones milenarias.
          Cada sorbo cuenta historias de tierra, agave y maestría.
        </p>

        {/* Divider */}
        <div
          className="w-32 h-1.5 rounded-full mb-10"
          style={{
            background: `linear-gradient(90deg, transparent, ${activeColors.accentGreen}, transparent)`,
            animation: !prefersReducedMotion
              ? 'scaleX 0.7s ease-out 0.2s both'
              : 'none',
          }}
        />

        {/* Trust Signals */}
        <div
          data-reveal="signals"
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 mb-12 lg:hidden"
          style={{
            opacity: isElementVisible('signals') ? 1 : 0,
            transform: isElementVisible('signals') ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.7s ease-out 0.2s, transform 0.7s ease-out 0.2s',
          }}
        >
          {/* Products Count */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Leaf
                size={20}
                color={activeColors.accentGreen}
                aria-hidden="true"
              />
              <p
                className="text-2xl sm:text-3xl font-black"
                style={{ color: activeColors.accentGreen }}
              >
                50+
              </p>
            </div>
            <p
              className="text-xs sm:text-sm"
              style={{ color: `${activeColors.textPrimary}99` }}
            >
              Mezcales artesanales
            </p>
          </div>

          {/* Divider */}
          <div
            className="hidden sm:block w-px h-12"
            style={{ backgroundColor: `${activeColors.textPrimary}33` }}
          />

          {/* Rating */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-2xl sm:text-3xl font-black"
                style={{ color: activeColors.accentBrown }}
              >
                4.8★
              </span>
            </div>
            <p
              className="text-xs sm:text-sm"
              style={{ color: `${activeColors.textPrimary}99` }}
            >
              Calificación promedio
            </p>
          </div>

          {/* Community */}
          <div className="hidden sm:flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Leaf
                size={20}
                color={activeColors.accentGreen}
                aria-hidden="true"
              />
              <p
                className="text-2xl sm:text-3xl font-black"
                style={{ color: activeColors.accentGreen }}
              >
                2K+
              </p>
            </div>
            <p
              className="text-xs sm:text-sm"
              style={{ color: `${activeColors.textPrimary}99` }}
            >
              Clientes satisfechos
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          data-reveal="cta"
          onClick={() => router.push('/cliente/producto')}
          className="px-8 py-3.5 sm:py-4 rounded-xl font-bold uppercase text-sm tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2 group"
          style={{
            backgroundColor: activeColors.accentGreen,
            color: isDarkMode ? '#0f1f1a' : '#fef5f0',
            '--tw-ring-color': activeColors.accentGreen,
            opacity: isElementVisible('cta') ? 1 : 0,
            transform: isElementVisible('cta') ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.7s ease-out 0.3s, transform 0.7s ease-out 0.3s, all 0.3s ease-out',
            boxShadow: `0 8px 16px ${activeColors.accentGreen}33`,
          } as React.CSSProperties}
          aria-label="Explorar catálogo de mezcales"
        >
          Explorar Catálogo
          <ArrowRight
            size={18}
            className="transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
        </div>

        {/* Right Column: Product Carousel */}
        <div
          className="flex flex-col gap-4 w-full max-w-sm mx-auto lg:mr-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Header */}
          <p
            className="text-xs font-bold uppercase tracking-widest text-center"
            style={{ color: activeColors.accentGreen }}
          >
            Lo Más Vendido
          </p>

          {/* Loading skeleton */}
          {loadingProductos ? (
            <div className="flex flex-row lg:flex-col gap-4 items-center lg:items-start py-2">
              <div
                className="w-32 h-40 sm:w-36 sm:h-44 lg:w-full flex-shrink-0 lg:flex-shrink rounded-2xl animate-pulse"
                style={{ backgroundColor: `${activeColors.accentGreen}22` }}
              />
              <div className="flex-1 lg:w-full flex flex-col gap-3">
                <div
                  className="h-4 rounded animate-pulse w-3/4"
                  style={{ backgroundColor: `${activeColors.accentGreen}22` }}
                />
                <div
                  className="h-3 rounded animate-pulse w-1/2"
                  style={{ backgroundColor: `${activeColors.accentGreen}22` }}
                />
                <div
                  className="h-6 rounded animate-pulse w-1/3"
                  style={{ backgroundColor: `${activeColors.accentGreen}22` }}
                />
                <div
                  className="h-7 rounded-xl animate-pulse"
                  style={{ backgroundColor: `${activeColors.accentGreen}22` }}
                />
                <div
                  className="h-7 rounded-xl animate-pulse"
                  style={{ backgroundColor: `${activeColors.accentGreen}22` }}
                />
              </div>
            </div>
          ) : productos.length > 0 ? (
            (() => {
              const p = productos[activeIndex];
              const imgSrc = p.producto_imagenes?.[0]?.url ?? p.imagen_principal_url;
              const yaAgregado = agregadoId === p.id_producto;
              return (
                <div className="flex flex-row lg:flex-col gap-4 items-center lg:items-start py-2">
                  {/* Product Image — Left on mobile, top on desktop */}
                  <div
                    className="relative w-32 h-40 sm:w-36 sm:h-44 lg:w-full lg:h-64 flex-shrink-0 lg:flex-shrink rounded-2xl overflow-hidden bg-white/5"
                    style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
                  >
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={p.nombre}
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/20 text-xs">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info — Right on mobile, bottom on desktop */}
                  <div className="flex flex-col gap-2 flex-1 lg:w-full min-w-0">
                    <h3
                      className="font-bold text-base sm:text-lg leading-tight line-clamp-2"
                      style={{
                        color: activeColors.textPrimary,
                        fontFamily: 'var(--font-family-store)',
                      }}
                    >
                      {p.nombre}
                    </h3>
                    {p.nombre_productor && (
                      <p
                        className="text-xs opacity-60 line-clamp-1"
                        style={{ color: activeColors.textPrimary }}
                      >
                        {p.nombre_productor}
                      </p>
                    )}
                    <p
                      className="text-xl sm:text-2xl font-black"
                      style={{ color: activeColors.accentGreen }}
                    >
                      ${formatPrice(Number(p.precio_base || 0), {
                        showCurrency: false,
                      })}
                    </p>

                    {/* Action Buttons stacked vertically */}
                    <div className="flex flex-col gap-1.5">
                      <button
                        disabled={yaAgregado}
                        onClick={() => handleAgregarAlCarrito(p)}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-70"
                        style={{
                          border: `1.5px solid ${activeColors.accentGreen}`,
                          color: activeColors.accentGreen,
                          backgroundColor: 'transparent',
                        }}
                        aria-label="Agregar al carrito"
                      >
                        <ShoppingCart size={13} />
                        {yaAgregado ? '¡Agregado!' : 'Al carrito'}
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/cliente/producto/${p.id_producto}`)
                        }
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: activeColors.accentGreen,
                          color: isDarkMode ? '#0f1f1a' : '#fef5f0',
                        }}
                        aria-label="Comprar ahora"
                      >
                        <Zap size={13} />
                        Comprar ya
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}

          {/* Carousel Controls */}
          {productos.length > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={prevSlide}
                aria-label="Anterior"
                className="p-1.5 rounded-full transition-all hover:scale-110"
                style={{ color: activeColors.accentGreen }}
              >
                <ChevronLeft size={18} />
              </button>
              {productos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Producto ${i + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === activeIndex ? 24 : 8,
                    height: 8,
                    backgroundColor:
                      i === activeIndex
                        ? activeColors.accentGreen
                        : `${activeColors.accentGreen}44`,
                  }}
                />
              ))}
              <button
                onClick={nextSlide}
                aria-label="Siguiente"
                className="p-1.5 rounded-full transition-all hover:scale-110"
                style={{ color: activeColors.accentGreen }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
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

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
