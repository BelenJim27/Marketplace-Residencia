'use client';

import { useState, useMemo } from 'react';
import { ProductCard } from './ProductCard';

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

interface CatalogGridProps {
  products: Product[];
  onAddToCart?: (productId: string) => void;
  isLoading?: boolean;
}

interface FilterState {
  search: string;
  magueyType: string[];
  category: string[];
  priceRange: [number, number];
  producer: string;
}

export function CatalogGrid({ products, onAddToCart, isLoading = false }: CatalogGridProps) {
  // Translations - Replace with useTranslations() hook when i18n is configured
  const t = (key: string, fallback: string) => fallback;
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    magueyType: [],
    category: [],
    priceRange: [0, 5000],
    producer: '',
  });
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'newest'>('relevance');

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.producer.toLowerCase().includes(query) ||
          p.magueyType.toLowerCase().includes(query),
      );
    }

    // Maguey type filter
    if (filters.magueyType.length > 0) {
      result = result.filter(p => filters.magueyType.includes(p.magueyType));
    }

    // Category filter
    if (filters.category.length > 0) {
      result = result.filter(p => filters.category.includes(p.category));
    }

    // Price range filter
    result = result.filter(p => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]);

    // Producer filter
    if (filters.producer) {
      result = result.filter(p => p.producer === filters.producer);
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // Assuming id or index represents recency
        result.reverse();
        break;
      case 'relevance':
      default:
        // Keep original order
        break;
    }

    return result;
  }, [products, filters, sortBy]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-earth-100 sticky top-0 z-10 px-4 sm:px-5 lg:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Results count */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-earth-900">
              {filteredProducts.length} {t('results', 'resultados')}
            </h2>
            {filters.search && (
              <span className="text-xs text-earth-600">
                {t('for', 'para')} "{filters.search}"
              </span>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-xs sm:text-sm font-medium text-earth-700 whitespace-nowrap">
              {t('sortBy', 'Ordenar por')}
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 sm:py-2 border border-earth-200 rounded-lg text-xs sm:text-sm text-earth-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-transparent"
            >
              <option value="relevance">{t('relevance', 'Relevancia')}</option>
              <option value="price-asc">{t('priceLow', 'Precio: Menor a Mayor')}</option>
              <option value="price-desc">{t('priceHigh', 'Precio: Mayor a Menor')}</option>
              <option value="newest">{t('newest', 'Más Recientes')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && !isLoading && (
        <div className="py-12 sm:py-16 px-4 text-center">
          <svg className="w-12 sm:w-16 h-12 sm:h-16 text-earth-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg sm:text-xl font-serif text-earth-900 mb-2">{t('noResults', 'Sin resultados')}</h3>
          <p className="text-sm sm:text-base text-earth-600 mb-5 sm:mb-6">{t('noResultsDesc', 'No encontramos productos que coincidan con tus filtros.')}</p>
          <button
            onClick={() =>
              setFilters({
                search: '',
                magueyType: [],
                category: [],
                priceRange: [0, 5000],
                producer: '',
              })
            }
            className="px-5 sm:px-6 py-2 border border-terracotta-600 text-sm sm:text-base text-terracotta-600 hover:bg-terracotta-50 font-medium rounded-lg transition-colors"
          >
            {t('clearFilters', 'Limpiar filtros')}
          </button>
        </div>
      )}

      {/* Grid */}
      {filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 p-4 sm:p-5 lg:p-6">
          {isLoading
            ? // Skeleton loaders
              [...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-earth-100 animate-pulse h-96" />
              ))
            : // Actual products
              filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onAddToCart={onAddToCart}
                />
              ))}
        </div>
      )}

      {/* Load more button (optional) */}
      {filteredProducts.length > 0 && filteredProducts.length % 12 === 0 && (
        <div className="flex justify-center py-4 sm:py-6 px-4">
          <button className="px-6 sm:px-8 py-2.5 sm:py-3 border-2 border-terracotta-600 text-terracotta-600 hover:bg-terracotta-50 font-semibold text-sm sm:text-base rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta-500">
            {t('loadMore', 'Cargar más')}
          </button>
        </div>
      )}
    </div>
  );
}
