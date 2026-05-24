'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProductCardProps {
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
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({
  id,
  name,
  magueyType,
  category,
  price,
  producer,
  image,
  rating = 4.5,
  reviewCount = 12,
  isLimited = false,
  stock = 10,
  onAddToCart,
}: ProductCardProps) {
  // Translations - Replace with useTranslations() hook when i18n is configured
  const t = (key: string, fallback: string) => fallback;
  const [isAdding, setIsAdding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      onAddToCart?.(id);
      // Show success feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsAdding(false);
    }
  };

  const categoryColor = category === 'Artesanal' ? 'from-terracotta-100 to-terracotta-50' : 'from-nature-100 to-nature-50';
  const categoryBadgeColor = category === 'Artesanal' ? 'bg-terracotta-100 text-terracotta-700' : 'bg-nature-100 text-nature-700';

  return (
    <div
      className="h-full bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className={`relative w-full aspect-square bg-gradient-to-br ${categoryColor} overflow-hidden`}>
        {/* Limited badge */}
        {isLimited && (
          <div className="absolute top-4 right-4 z-20">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-terracotta-700 shadow-md">
              <span className="w-2 h-2 bg-terracotta-600 rounded-full animate-pulse" />
              {t('limited', 'Edición Limitada')}
            </div>
          </div>
        )}

        {/* Stock indicator */}
        {stock !== undefined && stock < 5 && (
          <div className="absolute top-4 left-4 z-20">
            <div className="inline-flex px-3 py-1 bg-amber-100 rounded-full text-xs font-medium text-amber-900">
              {t('lowStock', `Solo ${stock} disponibles`)}
            </div>
          </div>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center relative">
          {image && image !== '/placeholder-bottle.jpg' ? (
            <Image
              src={image}
              alt={name}
              fill
              className={`object-contain p-6 transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
              priority={false}
              loading="lazy"
            />
          ) : (
            // Placeholder bottle SVG
            <div className={`w-32 h-40 opacity-30 transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}>
              <svg viewBox="0 0 64 128" className="w-full h-full">
                {/* Bottle outline */}
                <path
                  d="M 20 20 L 20 40 Q 20 50 24 60 L 24 110 Q 24 120 32 120 Q 40 120 40 110 L 40 60 Q 44 50 44 40 L 44 20 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-earth-700"
                />
                {/* Cap */}
                <rect x="28" y="8" width="8" height="12" className="fill-earth-700" />
                {/* Neck */}
                <path
                  d="M 26 20 L 38 20"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-earth-700"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col">
        {/* Producer */}
        <p className="text-xs uppercase tracking-widest text-nature-600 font-medium mb-1">{producer}</p>

        {/* Name */}
        <h3 className="text-base sm:text-lg font-serif text-earth-900 mb-1 line-clamp-2 leading-snug group-hover:text-terracotta-700 transition-colors">
          {name}
        </h3>

        {/* Maguey Type */}
        <p className="text-xs sm:text-sm text-earth-600 mb-2">
          <span className="font-medium">{t('maguey', 'Maguey')}:</span> {magueyType}
        </p>

        {/* Category Badge */}
        <div className="mb-2 inline-flex">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryBadgeColor} uppercase tracking-wide`}>
            {category}
          </span>
        </div>

        {/* Rating (optional) */}
        {rating && reviewCount && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-3 h-3 ${i < Math.round(rating) ? 'text-amber-400 fill-current' : 'text-earth-200'}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-earth-600">({reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="mb-3 mt-auto">
          <p className="text-xl sm:text-2xl font-bold text-earth-900 tracking-tight">${price.toLocaleString('es-MX')}</p>
          <p className="text-xs text-earth-500 mt-0.5">{t('perBottle', 'por botella')}</p>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding || (stock !== undefined && stock === 0)}
          className={`w-full py-2 sm:py-2.5 px-3 rounded-lg font-semibold text-sm sm:text-base text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            isAdding
              ? 'bg-terracotta-600'
              : stock === 0
                ? 'bg-earth-300 cursor-not-allowed'
                : 'bg-terracotta-600 hover:bg-terracotta-700'
          }`}
          aria-label={t('addToCart', `Agregar ${name} al carrito`)}
        >
          {isAdding ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('adding', 'Agregando...')}
            </span>
          ) : stock === 0 ? (
            t('outOfStock', 'Agotado')
          ) : (
            t('addToCart', 'Agregar al Carrito')
          )}
        </button>

        {/* Additional info on hover */}
        {isHovered && (
          <div className="mt-2 pt-2 border-t border-earth-100 text-xs text-earth-600 space-y-0.5 animate-in fade-in slide-in-from-bottom-2">
            <p>{t('freeShipping', '✓ Envío gratis')} (pedidos mayores a $500)</p>
            <p>{t('authentic', '✓ Producto Auténtico Certificado')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
