'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Heart, ShoppingCart, ChevronDown, Search, Filter } from 'lucide-react';

interface MezcalProduct {
  id: string;
  nombre: string;
  productor: string;
  tipo: 'Joven' | 'Reposado' | 'Añejo' | 'Extra Añejo';
  region: string;
  agave: string;
  graduacion: number;
  lote: string;
  precio: number;
  imagen: string;
  rating: number;
  reviews: number;
  badges: string[];
  descripcion: string;
}

const mockProducts: MezcalProduct[] = [
  {
    id: '1',
    nombre: 'Amaraya Locura',
    productor: 'Casa Amaraya',
    tipo: 'Joven',
    region: 'Tlacolula',
    agave: 'Espadín',
    graduacion: 46,
    lote: 'TLA-2024-001',
    precio: 450,
    imagen: '/images/mezcal-27.png',
    rating: 4.8,
    reviews: 24,
    badges: ['Artesanal', 'D.O.', 'Producción Limitada'],
    descripcion: 'Mezcal joven de agave espadín, destilado en alambique de cobre tradicional.',
  },
  {
    id: '2',
    nombre: 'Sierra Blanca Reposado',
    productor: 'Destilería Sierra',
    tipo: 'Reposado',
    region: 'Oaxaca',
    agave: 'Espadín',
    graduacion: 42,
    lote: 'SB-2023-045',
    precio: 520,
    imagen: '/images/mezcal-25.png',
    rating: 4.9,
    reviews: 31,
    badges: ['D.O.', 'Envejecido 6 meses'],
    descripcion: 'Reposado de característica suave con toques de vainilla y roble.',
  },
  {
    id: '3',
    nombre: 'Espíritu de Oaxaca',
    productor: 'Palenque Tradicional',
    tipo: 'Añejo',
    region: 'Central',
    agave: 'Tobalá',
    graduacion: 48,
    lote: 'EO-2022-012',
    precio: 750,
    imagen: '/images/mezcal-26.png',
    rating: 5.0,
    reviews: 18,
    badges: ['Artesanal', 'D.O.', 'Varietal Raro'],
    descripcion: 'Mezcal añejo elaborado con agave tobalá silvestre, 2 años en roble.',
  },
  {
    id: '4',
    nombre: 'Corazón de Agave',
    productor: 'Destilería Corazón',
    tipo: 'Joven',
    region: 'Miahuatlán',
    agave: 'Coyote',
    graduacion: 50,
    lote: 'CA-2024-008',
    precio: 380,
    imagen: '/images/mezcal-24.png',
    rating: 4.7,
    reviews: 12,
    badges: ['Artesanal', 'Producción Limitada'],
    descripcion: 'Mezcal de agave coyote, destilado con técnicas ancestrales.',
  },
  {
    id: '5',
    nombre: 'Raíces de la Tierra',
    productor: 'Casa Raíces',
    tipo: 'Extra Añejo',
    region: 'Tlacolula',
    agave: 'Espadín',
    graduacion: 44,
    lote: 'RT-2021-003',
    precio: 1200,
    imagen: '/images/mezcal-27.png',
    rating: 5.0,
    reviews: 8,
    badges: ['Artesanal', 'D.O.', '4 años envejecido'],
    descripcion: 'Mezcal extra añejo con complejidad y elegancia incomparables.',
  },
  {
    id: '6',
    nombre: 'Destello del Cielo',
    productor: 'Palenque Destello',
    tipo: 'Reposado',
    region: 'Ocotlán',
    agave: 'Espadín',
    graduacion: 45,
    lote: 'DC-2023-021',
    precio: 485,
    imagen: '/images/mezcal-25.png',
    rating: 4.6,
    reviews: 15,
    badges: ['D.O.', 'Envejecido 8 meses'],
    descripcion: 'Reposado con un equilibrio perfecto entre frescura y madurez.',
  },
];

export default function MezcalCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [priceRange, setPriceRange] = useState([0, 1500]);
  const [selectedRegion, setSelectedRegion] = useState<string>('Todas');
  const [sortBy, setSortBy] = useState('relevancia');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<MezcalProduct | null>(null);
  const [cartItems, setCartItems] = useState<Map<string, number>>(new Map());

  const types = ['Todos', 'Joven', 'Reposado', 'Añejo', 'Extra Añejo'];
  const regions = ['Todas', 'Tlacolula', 'Central', 'Miahuatlán', 'Ocotlán', 'Oaxaca'];

  const filteredAndSorted = useMemo(() => {
    let filtered = mockProducts.filter(product => {
      const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.productor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'Todos' || product.tipo === selectedType;
      const matchesPrice = product.precio >= priceRange[0] && product.precio <= priceRange[1];
      const matchesRegion = selectedRegion === 'Todas' || product.region === selectedRegion;

      return matchesSearch && matchesType && matchesPrice && matchesRegion;
    });

    // Sort
    switch (sortBy) {
      case 'precio-asc':
        filtered.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio-desc':
        filtered.sort((a, b) => b.precio - a.precio);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return filtered;
  }, [searchTerm, selectedType, priceRange, selectedRegion, sortBy]);

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const addToCart = (product: MezcalProduct, quantity: number = 1) => {
    const newCart = new Map(cartItems);
    const current = newCart.get(product.id) || 0;
    newCart.set(product.id, current + quantity);
    setCartItems(newCart);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1ED] to-white">
      {/* Header con ilustración */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2D1B1B] to-[#4A2C2C] text-white">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
            <path d="M0,150 Q300,80 600,150 T1200,150 L1200,300 L0,300 Z" fill="currentColor" />
          </svg>
        </div>

        <div className="relative px-6 py-16 md:py-20">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-3 text-[#F5F1ED]">
              Esencias de Oaxaca
            </h1>
            <p className="text-lg text-[#E8DDD6] max-w-2xl">
              Descubre la artesanía y tradición del mezcal, destilado con las manos que heredaron siglos de sabiduría.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E8DDD6] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#B8860B] w-5 h-5" />
              <input
                type="text"
                placeholder="Busca mezcal, productor, región..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-[#E8DDD6] rounded-lg focus:border-[#B8860B] focus:outline-none text-sm md:text-base transition-colors"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-[#E8DDD6] rounded-lg focus:border-[#B8860B] focus:outline-none bg-white text-[#2D1B1B]"
            >
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border border-[#E8DDD6] rounded-lg focus:border-[#B8860B] focus:outline-none bg-white text-[#2D1B1B]"
            >
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            {/* Price Range */}
            <div className="flex items-center gap-2">
              <span className="text-[#2D1B1B] font-medium">${priceRange[0]}</span>
              <span className="text-[#999]">-</span>
              <span className="text-[#2D1B1B] font-medium">${priceRange[1]}</span>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-[#E8DDD6] rounded-lg focus:border-[#B8860B] focus:outline-none bg-white text-[#2D1B1B]"
            >
              <option value="relevancia">Relevancia</option>
              <option value="precio-asc">Precio: Menor a Mayor</option>
              <option value="precio-desc">Precio: Mayor a Menor</option>
              <option value="rating">Rating Más Alto</option>
            </select>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-[#666]">
            Mostrando <span className="font-semibold text-[#2D1B1B]">{filteredAndSorted.length}</span> de {mockProducts.length} mezcales
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAndSorted.map(product => (
            <div
              key={product.id}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#E8DDD6] hover:border-[#B8860B]"
            >
              {/* Image Container */}
              <div className="relative h-72 bg-gradient-to-b from-[#F5F1ED] to-[#E8DDD6] overflow-hidden flex items-center justify-center">
                <div className="relative w-32 h-64 transform group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src={product.imagen}
                    alt={product.nombre}
                    fill
                    className="object-contain drop-shadow-lg"
                  />
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {product.badges.slice(0, 2).map(badge => (
                    <span
                      key={badge}
                      className="inline-block text-xs font-semibold px-2.5 py-1 bg-[#B8860B] text-white rounded-full"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-white shadow-md hover:bg-[#F5F1ED] transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      favorites.has(product.id)
                        ? 'fill-[#D32F2F] text-[#D32F2F]'
                        : 'text-[#999]'
                    }`}
                  />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-5">
                {/* Producer */}
                <p className="text-xs text-[#6B8E23] font-semibold uppercase tracking-wide mb-2">
                  {product.productor}
                </p>

                {/* Name */}
                <h3 className="text-xl font-serif font-bold text-[#2D1B1B] mb-2 group-hover:text-[#B8860B] transition-colors">
                  {product.nombre}
                </h3>

                {/* Description */}
                <p className="text-sm text-[#666] mb-4 leading-relaxed">
                  {product.descripcion}
                </p>

                {/* Technical Specs */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-[#E8DDD6]">
                  <div>
                    <span className="text-xs text-[#999] uppercase">Tipo</span>
                    <p className="text-sm font-semibold text-[#2D1B1B]">{product.tipo}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#999] uppercase">Región</span>
                    <p className="text-sm font-semibold text-[#2D1B1B]">{product.region}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#999] uppercase">Agave</span>
                    <p className="text-sm font-semibold text-[#2D1B1B]">{product.agave}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#999] uppercase">Grados</span>
                    <p className="text-sm font-semibold text-[#2D1B1B]">{product.graduacion}°</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-lg ${
                          i < Math.floor(product.rating)
                            ? 'text-[#B8860B]'
                            : 'text-[#DDD]'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#2D1B1B]">{product.rating}</span>
                  <span className="text-xs text-[#999]">({product.reviews})</span>
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <span className="text-3xl font-serif font-bold text-[#2D1B1B]">
                      ${product.precio}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      addToCart(product);
                    }}
                    className="p-3 rounded-lg bg-[#6B8E23] hover:bg-[#556B1F] text-white transition-colors shadow-md hover:shadow-lg"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>

                {/* View Detail Link */}
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="w-full mt-3 text-center text-sm font-semibold text-[#B8860B] hover:text-[#2D1B1B] transition-colors border-b-2 border-transparent hover:border-[#B8860B] pb-1"
                >
                  Ver detalle completo →
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredAndSorted.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-[#666] mb-4">No encontramos mezcales con esos criterios.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('Todos');
                setSelectedRegion('Todas');
              }}
              className="text-[#B8860B] font-semibold hover:text-[#2D1B1B] transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#2D1B1B] to-[#4A2C2C] text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold">{selectedProduct.nombre}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-2xl hover:text-[#B8860B] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {/* Image & Quick Info */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Image */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-64 mb-4">
                    <Image
                      src={selectedProduct.imagen}
                      alt={selectedProduct.nombre}
                      fill
                      className="object-contain drop-shadow-lg"
                    />
                  </div>
                  <button
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="px-6 py-2 rounded-lg border-2 border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B] hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        favorites.has(selectedProduct.id) ? 'fill-current' : ''
                      }`}
                    />
                    {favorites.has(selectedProduct.id) ? 'Guardado' : 'Guardar'}
                  </button>
                </div>

                {/* Quick Info */}
                <div>
                  <p className="text-sm text-[#6B8E23] font-semibold uppercase tracking-wide mb-4">
                    {selectedProduct.productor}
                  </p>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-[#F5F1ED] rounded-lg">
                      <span className="text-xs text-[#999] uppercase">Tipo</span>
                      <p className="text-lg font-bold text-[#2D1B1B] mt-1">{selectedProduct.tipo}</p>
                    </div>
                    <div className="p-4 bg-[#F5F1ED] rounded-lg">
                      <span className="text-xs text-[#999] uppercase">Región</span>
                      <p className="text-lg font-bold text-[#2D1B1B] mt-1">{selectedProduct.region}</p>
                    </div>
                    <div className="p-4 bg-[#F5F1ED] rounded-lg">
                      <span className="text-xs text-[#999] uppercase">Agave</span>
                      <p className="text-lg font-bold text-[#2D1B1B] mt-1">{selectedProduct.agave}</p>
                    </div>
                    <div className="p-4 bg-[#F5F1ED] rounded-lg">
                      <span className="text-xs text-[#999] uppercase">Grados</span>
                      <p className="text-lg font-bold text-[#2D1B1B] mt-1">{selectedProduct.graduacion}°</p>
                    </div>
                  </div>

                  {/* Price & Quantity */}
                  <div className="mb-6">
                    <div className="text-4xl font-serif font-bold text-[#2D1B1B] mb-4">
                      ${selectedProduct.precio}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm font-semibold text-[#2D1B1B]">Cantidad:</label>
                      <select
                        defaultValue="1"
                        onChange={(e) => {
                          const qty = parseInt(e.target.value);
                          const currentCart = cartItems.get(selectedProduct.id) || 0;
                          const newCart = new Map(cartItems);
                          newCart.set(selectedProduct.id, currentCart + qty);
                          setCartItems(newCart);
                        }}
                        className="px-3 py-2 border-2 border-[#E8DDD6] rounded-lg focus:border-[#B8860B] outline-none"
                      >
                        <option value="1">1 Botella</option>
                        <option value="2">2 Botellas</option>
                        <option value="3">3 Botellas</option>
                        <option value="6">6 Botellas</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(selectedProduct, 1);
                        setSelectedProduct(null);
                      }}
                      className="w-full py-3 bg-[#6B8E23] hover:bg-[#556B1F] text-white font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                    >
                      <ShoppingCart className="w-6 h-6" />
                      Agregar al Carrito
                    </button>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-xl text-[#B8860B]">★</span>
                      ))}
                    </div>
                    <div>
                      <p className="font-bold text-[#2D1B1B]">{selectedProduct.rating}/5</p>
                      <p className="text-sm text-[#666]">{selectedProduct.reviews} reseñas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description & Details */}
              <div className="border-t border-[#E8DDD6] pt-8">
                <h3 className="text-xl font-serif font-bold text-[#2D1B1B] mb-4">Descripción Técnica</h3>
                <p className="text-[#666] leading-relaxed mb-6">{selectedProduct.descripcion}</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-[#2D1B1B] mb-3">Características</h4>
                    <ul className="space-y-2 text-sm text-[#666]">
                      <li>• <span className="font-semibold">Destilería:</span> Palenque Tradicional</li>
                      <li>• <span className="font-semibold">Método:</span> Alambique de cobre</li>
                      <li>• <span className="font-semibold">Lote:</span> {selectedProduct.lote}</li>
                      <li>• <span className="font-semibold">Producción:</span> Limitada</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2D1B1B] mb-3">Notas de Cata</h4>
                    <p className="text-sm text-[#666]">
                      Nariz compleja con notas de anís, copal y hierbabuena. Paladar suave con toques minerales y finales prolongados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="mt-8 pt-8 border-t border-[#E8DDD6]">
                <h3 className="text-sm font-semibold text-[#999] uppercase mb-3">Certificaciones</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedProduct.badges.map(badge => (
                    <span
                      key={badge}
                      className="px-4 py-2 bg-[#6B8E23]/10 text-[#6B8E23] text-sm font-semibold rounded-full border border-[#6B8E23]/30"
                    >
                      ✓ {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
