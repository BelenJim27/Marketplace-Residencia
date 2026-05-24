'use client';

import React from 'react';
import { hexFallbacks } from '@/lib/colors';

interface CatalogLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  showMobileFilterButton?: React.ReactNode;
}

export function CatalogLayout({
  sidebar,
  main,
  showMobileFilterButton,
}: CatalogLayoutProps) {
  return (
    <div style={{ backgroundColor: hexFallbacks.bgPrimary, minHeight: '100vh' }} className="font-sans">
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ─── SIDEBAR IZQUIERDA (DESKTOP) ─── */}
          <aside className="hidden lg:block lg:w-72 shrink-0">
            <div
              className="sticky top-10 rounded-2xl p-5 shadow-sm transition-all"
              style={{
                backgroundColor: hexFallbacks.bgSecondary,
                border: `1px solid ${hexFallbacks.borderLight}`,
              }}
            >
              {sidebar}
            </div>
          </aside>

          {/* ─── CONTENIDO PRINCIPAL ─── */}
          <div className="flex-1 w-full space-y-6">
            {/* Botón filtros móvil */}
            {showMobileFilterButton && <div className="lg:hidden">{showMobileFilterButton}</div>}

            {/* Grid de productos */}
            {main}
          </div>
        </div>
      </main>
    </div>
  );
}
