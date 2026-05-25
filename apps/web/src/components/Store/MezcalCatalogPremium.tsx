'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, Search, Filter, ShoppingCart, Star } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  magueyType: string;
  category: 'Artesanal' | 'Ancestral';
  price: number;
  rating: number;
  reviews: number;
  image: string;
  origin: string;
  alcPercentage: number;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Amaraya Locura',
    magueyType: 'Agave Espadin',
    category: 'Artesanal',
    price: 450,
    rating: 4.8,
    reviews: 24,
    image: '/placeholder-bottle.jpg',
    origin: 'Oaxaca Centro',
    alcPercentage: 47,
  },
  {
    id: '2',
    name: 'Destilado Ancestral',
    magueyType: 'Agave Mexicano',
    category: 'Ancestral',
    price: 680,
    rating: 4.9,
    reviews: 18,
    image: '/placeholder-bottle.jpg',
    origin: 'Sierra Ixtlán',
    alcPercentage: 51,
  },
  {
    id: '3',
    name: 'Tierra Viva',
    magueyType: 'Agave Karwinskii',
    category: 'Artesanal',
    price: 520,
    rating: 4.7,
    reviews: 31,
    image: '/placeholder-bottle.jpg',
    origin: 'Tlacolula',
    alcPercentage: 46,
  },
  {
    id: '4',
    name: 'Fuego Sagrado',
    magueyType: 'Agave Espadin',
    category: 'Ancestral',
    price: 750,
    rating: 4.9,
    reviews: 15,
    image: '/placeholder-bottle.jpg',
    origin: 'Matatlán',
    alcPercentage: 52,
  },
  {
    id: '5',
    name: 'Esencia Oaxaca',
    magueyType: 'Agave Potatorum',
    category: 'Artesanal',
    price: 580,
    rating: 4.6,
    reviews: 22,
    image: '/placeholder-bottle.jpg',
    origin: 'Yatenco',
    alcPercentage: 48,
  },
  {
    id: '6',
    name: 'Legado Mezcalero',
    magueyType: 'Agave Mexicano',
    category: 'Ancestral',
    price: 820,
    rating: 5.0,
    reviews: 12,
    image: '/placeholder-bottle.jpg',
    origin: 'Santa María Atzompa',
    alcPercentage: 54,
  },
];

const MezcalCatalogPremium = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Artesanal' | 'Ancestral'>('all');
  const [selectedMaguey, setSelectedMaguey] = useState<string>('all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const magueyTypes = Array.from(new Set(MOCK_PRODUCTS.map(p => p.magueyType)));

  const filteredProducts = MOCK_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.magueyType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesMaguey = selectedMaguey === 'all' || product.magueyType === selectedMaguey;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];

    return matchesSearch && matchesCategory && matchesMaguey && matchesPrice;
  });

  const toggleWishlist = (id: string) => {
    const newWishlist = new Set(wishlist);
    if (newWishlist.has(id)) {
      newWishlist.delete(id);
    } else {
      newWishlist.add(id);
    }
    setWishlist(newWishlist);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F2' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#6F5B38] via-[#8B7445] to-[#A69169] text-white py-24 md:py-32">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: '#F7F5F2' }}></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: '#C2B393' }}></div>
        </div>

        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm font-light tracking-widest uppercase mb-4 opacity-90">Mezcal Premium de Oaxaca</p>
          <h1 className="text-5xl md:text-6xl font-light mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Espíritus Ancestrales
          </h1>
          <p className="text-lg md:text-xl font-light max-w-2xl mx-auto opacity-90 mb-8">
            Cada botella cuenta la historia de generaciones de maestros mezcaleros. Tradición, pasión y autenticidad en cada sorbo.
          </p>

          {/* Search + Filter */}
          <div className="flex flex-col md:flex-row gap-3 mt-12 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" />
              <input
                type="text"
                placeholder="Buscar por nombre o tipo de maguey..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-white bg-opacity-95 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C2B393]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white bg-opacity-95 text-[#6F5B38] rounded-lg font-medium hover:bg-opacity-100 transition"
            >
              <Filter w={20} h={20} />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid md:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Categoría</h3>
                <div className="space-y-2">
                  {['all', 'Artesanal', 'Ancestral'].map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat as any)}
                        className="w-4 h-4 text-[#8B7445] rounded"
                      />
                      <span className="text-gray-700 text-sm">
                        {cat === 'all' ? 'Todos' : cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Maguey Type Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Tipo de Maguey</h3>
                <select
                  value={selectedMaguey}
                  onChange={(e) => setSelectedMaguey(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B7445]"
                >
                  <option value="all">Todos</option>
                  {magueyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Precio (MXN)</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-[#8B7445]"
                  />
                  <p className="text-xs text-gray-600">Hasta ${priceRange[1]} MXN</p>
                </div>
              </div>

              {/* Results Count */}
              <div className="flex items-end">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-[#6F5B38]">{filteredProducts.length}</span> mezcales encontrados
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className="group cursor-pointer"
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
              }}
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
                {/* Product Card Background */}
                <div
                  className="relative h-72 flex items-center justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${
                      product.category === 'Ancestral' ? '#417356' : '#8B7445'
                    } 0%, ${
                      product.category === 'Ancestral' ? '#74AA8A' : '#C2B393'
                    } 100%)`,
                  }}
                >
                  {/* Decorative elements */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 right-4 w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                    <div className="absolute bottom-6 left-6 w-16 h-16 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}></div>
                  </div>

                  {/* Bottle Image */}
                  <div className="relative z-10 h-full w-full flex items-center justify-center">
                    <Image
                      src="/placeholder-bottle.jpg"
                      alt={product.name}
                      width={160}
                      height={320}
                      className="object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                      priority={false}
                    />
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <span
                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white uppercase tracking-wider"
                      style={{
                        backgroundColor: product.category === 'Ancestral' ? '#365B47' : '#6F5B38',
                      }}
                    >
                      {product.category}
                    </span>
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-4 right-4 z-20 bg-white rounded-full p-2 hover:bg-opacity-90 transition-all shadow-lg"
                  >
                    <Heart
                      size={20}
                      className={wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                    />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-xl font-light mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                    {product.name}
                  </h3>

                  <p className="text-sm text-gray-600 mb-3 font-light">
                    {product.magueyType} • {product.origin}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < Math.floor(product.rating) ? 'fill-[#A69169] text-[#A69169]' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {product.rating} ({product.reviews})
                    </span>
                  </div>

                  {/* Alcohol Content */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Contenido alcohólico</p>
                    <p className="text-lg font-light text-[#6F5B38]">{product.alcPercentage}% Alc.</p>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Precio</p>
                      <p className="text-2xl font-light text-[#6F5B38]">${product.price}</p>
                    </div>
                    <button className="bg-[#8B7445] hover:bg-[#6F5B38] text-white rounded-full p-3 transition-colors shadow-lg hover:shadow-xl">
                      <ShoppingCart size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No encontramos mezcales que coincidan con tu búsqueda.</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-b from-transparent to-white">
        <div className="max-w-6xl mx-auto px-4 py-16 border-t border-gray-200">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h4 className="font-light text-[#6F5B38] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Auténtico
              </h4>
              <p className="text-sm text-gray-600 font-light">
                Producido por maestros mezcaleros certificados
              </p>
            </div>
            <div>
              <h4 className="font-light text-[#6F5B38] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Artesanal
              </h4>
              <p className="text-sm text-gray-600 font-light">
                Métodos tradicionales de Oaxaca
              </p>
            </div>
            <div>
              <h4 className="font-light text-[#6F5B38] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Sostenible
              </h4>
              <p className="text-sm text-gray-600 font-light">
                Cultivo responsable del agave
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @import url('https://fonts.googleapis.com/css2?family=Georgia:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

export default MezcalCatalogPremium;
