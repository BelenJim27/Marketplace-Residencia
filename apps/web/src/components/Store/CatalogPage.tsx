'use client';

import { useState } from 'react';
import { CatalogHero } from './CatalogHero';
import { CatalogFilters } from './CatalogFilters';
import { CatalogGrid } from './CatalogGrid';

interface Product {
  id: string;
  name: string;
  magueyType: string;
  category: 'Artesanal' | 'Ancestral';
  price: number;
  producer: string;
  image: string;
  rating?: number;
  reviewCount?: number;
  isLimited?: boolean;
  stock?: number;
}

interface CatalogPageProps {
  products: Product[];
  onAddToCart?: (productId: string) => void;
  isLoading?: boolean;
}

export function CatalogPage({ products, onAddToCart, isLoading = false }: CatalogPageProps) {
  // Translations - Replace with useTranslations() hook when i18n is configured
  const t = (key: string, fallback: string) => fallback;
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <CatalogHero />

      {/* Main Content */}
      <div className="flex h-full">
        {/* Filters Sidebar */}
        <CatalogFilters
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
        />

        {/* Products Grid */}
        <main className="flex-1 w-full">
          <CatalogGrid
            products={products}
            onAddToCart={onAddToCart}
            isLoading={isLoading}
          />
        </main>
      </div>

      {/* Footer CTA */}
      <section className="bg-gradient-to-r from-earth-900 via-terracotta-900 to-earth-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-serif mb-4">{t('footer.title', '¿Buscas algo especial?')}</h2>
          <p className="text-lg text-earth-100 mb-8">
            {t('footer.description', 'Contáctanos para recomendaciones personalizadas o productos exclusivos.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-earth-900 hover:bg-earth-50 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-earth-900 focus:ring-white">
              {t('footer.contact', 'Contáctanos')}
            </button>
            <button className="px-8 py-3 border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-earth-900 focus:ring-white">
              {t('footer.newsletter', 'Suscribirse')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
