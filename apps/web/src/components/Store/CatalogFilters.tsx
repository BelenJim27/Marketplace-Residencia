'use client';

import { useState } from 'react';

interface CatalogFiltersProps {
  onFilterChange?: (filters: FilterState) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface FilterState {
  search: string;
  magueyType: string[];
  category: string[];
  priceRange: [number, number];
  producer: string;
}

export function CatalogFilters({ onFilterChange, isOpen = false, onToggle }: CatalogFiltersProps) {
  // Translations - Replace with useTranslations() hook when i18n is configured
  const t = (key: string, fallback: string) => fallback;
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    magueyType: [],
    category: [],
    priceRange: [0, 5000],
    producer: '',
  });

  const [isExpanded, setIsExpanded] = useState(isOpen);

  const handleSearchChange = (value: string) => {
    const updated = { ...filters, search: value };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleMagueyToggle = (type: string) => {
    const updated = {
      ...filters,
      magueyType: filters.magueyType.includes(type)
        ? filters.magueyType.filter(t => t !== type)
        : [...filters.magueyType, type],
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleCategoryToggle = (cat: string) => {
    const updated = {
      ...filters,
      category: filters.category.includes(cat)
        ? filters.category.filter(c => c !== cat)
        : [...filters.category, cat],
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    const updated = {
      ...filters,
      priceRange: type === 'min' ? [value, filters.priceRange[1]] : [filters.priceRange[0], value],
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onToggle?.();
        }}
        className="md:hidden fixed bottom-6 right-6 z-40 p-3 bg-terracotta-600 text-white rounded-full shadow-lg hover:bg-terracotta-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta-500"
        aria-label={t('toggle', 'Filtros')}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      {/* Filter panel */}
      <aside
        className={`fixed inset-0 z-30 md:relative md:block bg-white md:bg-transparent transition-all duration-300 ease-out transform ${
          isExpanded ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:w-72 md:border-r md:border-earth-100`}
      >
        <div className="h-full p-6 md:p-8 overflow-y-auto">
          {/* Close button (mobile) */}
          <button
            onClick={() => setIsExpanded(false)}
            className="md:hidden absolute top-4 right-4 p-2 hover:bg-earth-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            aria-label={t('close', 'Cerrar')}
          >
            <svg className="w-6 h-6 text-earth-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl font-serif text-earth-900 mb-8">{t('title', 'Filtros')}</h2>

          {/* Search */}
          <div className="mb-8">
            <label htmlFor="search" className="block text-sm font-medium text-earth-700 mb-3">
              {t('search', 'Buscar')}
            </label>
            <input
              id="search"
              type="text"
              value={filters.search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder', 'Nombre del mezcal...')}
              className="w-full px-4 py-2 border border-earth-200 rounded-lg text-earth-900 placeholder-earth-500 focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-transparent"
            />
          </div>

          {/* Maguey Type */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-earth-900 mb-4 uppercase tracking-wide">{t('magueyType', 'Tipo de Maguey')}</h3>
            <div className="space-y-3">
              {['Espadín', 'Papalote', 'Cuishe', 'Tobalá', 'Barril', 'Tepeztate'].map(type => (
                <label key={type} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.magueyType.includes(type)}
                    onChange={() => handleMagueyToggle(type)}
                    className="w-4 h-4 border-earth-300 rounded text-terracotta-600 focus:ring-terracotta-500"
                  />
                  <span className="text-sm text-earth-700 group-hover:text-earth-900">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-earth-900 mb-4 uppercase tracking-wide">{t('category', 'Categoría')}</h3>
            <div className="space-y-3">
              {['Artesanal', 'Ancestral'].map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.category.includes(cat)}
                    onChange={() => handleCategoryToggle(cat)}
                    className="w-4 h-4 border-earth-300 rounded text-nature-600 focus:ring-nature-500"
                  />
                  <span className="text-sm text-earth-700 group-hover:text-earth-900">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-earth-900 mb-4 uppercase tracking-wide">{t('price', 'Rango de Precio')}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="priceMin" className="text-xs text-earth-600 mb-2 block">
                  {t('minPrice', 'Mínimo')}: ${filters.priceRange[0]}
                </label>
                <input
                  id="priceMin"
                  type="range"
                  min="0"
                  max="5000"
                  value={filters.priceRange[0]}
                  onChange={e => handlePriceChange('min', Number(e.target.value))}
                  className="w-full h-2 bg-earth-200 rounded-lg appearance-none cursor-pointer accent-terracotta-600"
                />
              </div>
              <div>
                <label htmlFor="priceMax" className="text-xs text-earth-600 mb-2 block">
                  {t('maxPrice', 'Máximo')}: ${filters.priceRange[1]}
                </label>
                <input
                  id="priceMax"
                  type="range"
                  min="0"
                  max="5000"
                  value={filters.priceRange[1]}
                  onChange={e => handlePriceChange('max', Number(e.target.value))}
                  className="w-full h-2 bg-earth-200 rounded-lg appearance-none cursor-pointer accent-terracotta-600"
                />
              </div>
            </div>
          </div>

          {/* Producer */}
          <div className="mb-8">
            <label htmlFor="producer" className="block text-sm font-semibold text-earth-900 mb-3 uppercase tracking-wide">
              {t('producer', 'Productor')}
            </label>
            <select
              id="producer"
              value={filters.producer}
              onChange={e => setFilters({ ...filters, producer: e.target.value })}
              className="w-full px-4 py-2 border border-earth-200 rounded-lg text-earth-900 focus:outline-none focus:ring-2 focus:ring-nature-500 focus:border-transparent"
            >
              <option value="">{t('allProducers', 'Todos los Productores')}</option>
              <option value="producer1">{t('producer1', 'Productor 1')}</option>
              <option value="producer2">{t('producer2', 'Productor 2')}</option>
              <option value="producer3">{t('producer3', 'Productor 3')}</option>
            </select>
          </div>

          {/* Reset button */}
          <button
            onClick={() => {
              setFilters({ search: '', magueyType: [], category: [], priceRange: [0, 5000], producer: '' });
              onFilterChange?.({ search: '', magueyType: [], category: [], priceRange: [0, 5000], producer: '' });
            }}
            className="w-full px-4 py-2 border border-earth-300 text-earth-700 hover:bg-earth-50 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-300"
          >
            {t('reset', 'Limpiar Filtros')}
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-20 md:hidden bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
