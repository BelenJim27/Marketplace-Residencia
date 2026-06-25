'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { DriveStep } from 'driver.js';

type TourRole = 'admin' | 'productor' | 'cliente';

const NAV_TOUR_KEY = (role: TourRole) => `tour_seen_${role}`;
const PAGE_TOUR_KEY = (role: TourRole, page: string) => `tour_seen_${role}_page_${page}`;

function detectPage(pathname: string, role: TourRole): string | null {
  if (role === 'productor') {
    if (pathname === '/dashboard/productor') return 'dashboard';
    if (pathname.startsWith('/dashboard/productor/ventas')) return 'ventas';
    if (pathname.startsWith('/dashboard/productor/productos')) return 'productos';
    if (pathname.startsWith('/dashboard/productor/tienda')) return 'tienda';
    if (pathname.startsWith('/dashboard/productor/pedidos')) return 'pedidos';
    if (pathname.startsWith('/dashboard/productor/lotes')) return 'lotes';
  }
  if (role === 'admin') {
    if (pathname === '/Administrador/dashboard' || pathname === '/Administrador') return 'dashboard';
    if (pathname.startsWith('/Administrador/usuarios')) return 'usuarios';
    if (pathname.startsWith('/Administrador/pedidos')) return 'pedidos';
    if (pathname.startsWith('/Administrador/productos')) return 'productos';
  }
  if (role === 'cliente') {
    if (pathname.startsWith('/cliente/producto/')) return 'detalle';
    if (pathname.startsWith('/cliente/producto') || pathname === '/producto') return 'catalogo';
    if (pathname.startsWith('/tienda/checkout')) return 'checkout';
    if (pathname.startsWith('/tienda/carrito')) return 'carrito';
  }
  return null;
}

async function loadPageSteps(role: TourRole, page: string, lang: 'es' | 'en'): Promise<DriveStep[] | null> {
  if (role === 'productor') {
    if (page === 'dashboard') return (await import('@/lib/tours/productor/dashboard')).getSteps(lang);
    if (page === 'ventas')    return (await import('@/lib/tours/productor/ventas')).getSteps(lang);
    if (page === 'productos') return (await import('@/lib/tours/productor/productos')).getSteps(lang);
    if (page === 'tienda')    return (await import('@/lib/tours/productor/tienda')).getSteps(lang);
    if (page === 'pedidos')   return (await import('@/lib/tours/productor/pedidos')).getSteps(lang);
    if (page === 'lotes')     return (await import('@/lib/tours/productor/lotes')).getSteps(lang);
  }
  if (role === 'admin') {
    if (page === 'dashboard') return (await import('@/lib/tours/admin/dashboard')).getSteps(lang);
    if (page === 'usuarios')  return (await import('@/lib/tours/admin/usuarios')).getSteps(lang);
    if (page === 'pedidos')   return (await import('@/lib/tours/admin/pedidos')).getSteps(lang);
    if (page === 'productos') return (await import('@/lib/tours/admin/productos')).getSteps(lang);
  }
  if (role === 'cliente') {
    if (page === 'catalogo') return (await import('@/lib/tours/cliente/catalogo')).getSteps(lang);
    if (page === 'detalle')  return (await import('@/lib/tours/cliente/detalle')).getSteps(lang);
    if (page === 'carrito')  return (await import('@/lib/tours/cliente/carrito')).getSteps(lang);
    if (page === 'checkout') return (await import('@/lib/tours/cliente/checkout')).getSteps(lang);
  }
  return null;
}

export function useTour() {
  const { isAdmin, isProductor } = useAuth();
  const role: TourRole = isAdmin ? 'admin' : isProductor ? 'productor' : 'cliente';
  const pathname = usePathname();
  const activeRef = useRef(false);

  const runTour = useCallback(
    async (page: string | null, onDone: () => void) => {
      if (activeRef.current) return;
      activeRef.current = true;
      try {
        const { driver } = await import('driver.js');
        const lang = (document.documentElement.lang?.startsWith('en') ? 'en' : 'es') as 'es' | 'en';
        let steps: DriveStep[] | null = null;

        if (page) {
          steps = await loadPageSteps(role, page, lang);
        } else {
          if (role === 'admin') {
            const { getAdminSteps } = await import('@/lib/tours/admin');
            steps = getAdminSteps(lang);
          } else if (role === 'productor') {
            const { getProductorSteps } = await import('@/lib/tours/productor');
            steps = getProductorSteps(lang);
          } else {
            const { getClienteSteps } = await import('@/lib/tours/cliente');
            steps = getClienteSteps(lang);
          }
        }

        if (!steps?.length) { activeRef.current = false; return; }

        const validSteps = steps.filter((s) => {
          if (!s.element) return true;
          return document.querySelector(s.element as string) !== null;
        });

        if (!validSteps.length) { activeRef.current = false; return; }

        const driverObj = driver({
          showProgress: true,
          animate: true,
          overlayOpacity: 0.55,
          smoothScroll: true,
          stagePadding: 8,
          progressText: '{{current}} / {{total}}',
          nextBtnText: 'Siguiente →',
          prevBtnText: '← Anterior',
          doneBtnText: '¡Listo! ✓',
          onDestroyed: () => {
            activeRef.current = false;
            onDone();
          },
          steps: validSteps,
        });

        driverObj.drive();
      } catch {
        activeRef.current = false;
      }
    },
    [role],
  );

  // Auto-start nav tour on first login (1.5s delay to let DOM render)
  useEffect(() => {
    const seen = localStorage.getItem(NAV_TOUR_KEY(role));
    if (seen) return;
    const t = setTimeout(() => {
      runTour(null, () => localStorage.setItem(NAV_TOUR_KEY(role), 'true'));
    }, 1500);
    return () => clearTimeout(t);
  }, [role, runTour]);

  const resetTour = useCallback(() => {
    const page = detectPage(pathname, role);
    if (page) {
      localStorage.removeItem(PAGE_TOUR_KEY(role, page));
      runTour(page, () => localStorage.setItem(PAGE_TOUR_KEY(role, page), 'true'));
    } else {
      localStorage.removeItem(NAV_TOUR_KEY(role));
      runTour(null, () => localStorage.setItem(NAV_TOUR_KEY(role), 'true'));
    }
  }, [role, pathname, runTour]);

  const startTour = useCallback(() => {
    resetTour();
  }, [resetTour]);

  return { startTour, resetTour };
}
