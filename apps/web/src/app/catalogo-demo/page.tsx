'use client';

import { useState } from 'react';
import { CatalogPage } from '@/components/Store';

// Mock data - Simulated products for design testing
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Amareja Locura',
    magueyType: 'Espadín',
    category: 'Artesanal' as const,
    price: 450,
    producer: 'Productora María López',
    image: '/placeholder-bottle.jpg',
    rating: 4.8,
    reviewCount: 24,
    isLimited: false,
    stock: 12,
  },
  {
    id: '2',
    name: 'Expresión Ancestral',
    magueyType: 'Tobalá',
    category: 'Ancestral' as const,
    price: 680,
    producer: 'Destilería Oaxaqueña',
    image: '/placeholder-bottle.jpg',
    rating: 4.9,
    reviewCount: 18,
    isLimited: true,
    stock: 3,
  },
  {
    id: '3',
    name: 'Esencia de Terroir',
    magueyType: 'Papalote',
    category: 'Artesanal' as const,
    price: 520,
    producer: 'Cooperativa San Dionisio',
    image: '/placeholder-bottle.jpg',
    rating: 4.6,
    reviewCount: 15,
    isLimited: false,
    stock: 8,
  },
  {
    id: '4',
    name: 'Reserva 2019',
    magueyType: 'Cuishe',
    category: 'Ancestral' as const,
    price: 950,
    producer: 'Productor Vicente García',
    image: '/placeholder-bottle.jpg',
    rating: 5.0,
    reviewCount: 9,
    isLimited: true,
    stock: 2,
  },
  {
    id: '5',
    name: 'Mezcal Joven Premium',
    magueyType: 'Espadín',
    category: 'Artesanal' as const,
    price: 380,
    producer: 'Destilería Oaxaqueña',
    image: '/placeholder-bottle.jpg',
    rating: 4.4,
    reviewCount: 12,
    isLimited: false,
    stock: 20,
  },
  {
    id: '6',
    name: 'Edición Especial Barril',
    magueyType: 'Barril',
    category: 'Ancestral' as const,
    price: 1200,
    producer: 'Productora María López',
    image: '/placeholder-bottle.jpg',
    rating: 4.7,
    reviewCount: 7,
    isLimited: true,
    stock: 1,
  },
  {
    id: '7',
    name: 'Expresión Silvestre',
    magueyType: 'Tepeztate',
    category: 'Ancestral' as const,
    price: 890,
    producer: 'Cooperativa San Dionisio',
    image: '/placeholder-bottle.jpg',
    rating: 4.5,
    reviewCount: 11,
    isLimited: false,
    stock: 5,
  },
  {
    id: '8',
    name: 'Blend Premium',
    magueyType: 'Mezcla',
    category: 'Artesanal' as const,
    price: 620,
    producer: 'Productor Vicente García',
    image: '/placeholder-bottle.jpg',
    rating: 4.8,
    reviewCount: 19,
    isLimited: false,
    stock: 14,
  },
  {
    id: '9',
    name: 'Colección Limitada 2026',
    magueyType: 'Espadín Selecto',
    category: 'Artesanal' as const,
    price: 750,
    producer: 'Destilería Oaxaqueña',
    image: '/placeholder-bottle.jpg',
    rating: 4.9,
    reviewCount: 22,
    isLimited: true,
    stock: 4,
  },
  {
    id: '10',
    name: 'Mezcal Puro Espíritu',
    magueyType: 'Tobalá',
    category: 'Ancestral' as const,
    price: 1050,
    producer: 'Productor Vicente García',
    image: '/placeholder-bottle.jpg',
    rating: 4.6,
    reviewCount: 13,
    isLimited: false,
    stock: 6,
  },
  {
    id: '11',
    name: 'Destilación Manual',
    magueyType: 'Papalote',
    category: 'Artesanal' as const,
    price: 480,
    producer: 'Cooperativa San Dionisio',
    image: '/placeholder-bottle.jpg',
    rating: 4.7,
    reviewCount: 16,
    isLimited: false,
    stock: 11,
  },
  {
    id: '12',
    name: 'Rareza Oaxaqueña',
    magueyType: 'Tepeztate',
    category: 'Ancestral' as const,
    price: 1400,
    producer: 'Productora María López',
    image: '/placeholder-bottle.jpg',
    rating: 5.0,
    reviewCount: 8,
    isLimited: true,
    stock: 1,
  },
];

export default function CatalogoDemoPage() {
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = (productId: string) => {
    // Simulate adding to cart
    setIsLoading(true);
    setTimeout(() => {
      setCartItems(prev => [...prev, productId]);
      setIsLoading(false);

      // Find product name for feedback
      const product = MOCK_PRODUCTS.find(p => p.id === productId);
      alert(`✅ ${product?.name} agregado al carrito!`);
    }, 300);
  };

  return (
    <div>
      {/* Dev Info Bar */}
      <div className="bg-nature-600 text-white px-4 py-3 text-sm font-medium sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            📦 <strong>DEMO MODE</strong> - Diseño con datos simulados
          </div>
          <div className="text-xs opacity-90">
            Carrito: {cartItems.length} items | Scroll para explorar
          </div>
        </div>
      </div>

      {/* Catalog Component */}
      <CatalogPage
        products={MOCK_PRODUCTS}
        onAddToCart={handleAddToCart}
        isLoading={isLoading}
      />

      {/* Debug Info (remove in production) */}
      <div className="bg-earth-50 border-t border-earth-200 px-4 py-8 mt-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-serif text-earth-900 mb-4">🔧 Información de Debug</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="bg-white p-4 rounded-lg border border-earth-100">
              <h3 className="font-semibold text-earth-900 mb-2">📊 Datos</h3>
              <ul className="text-earth-600 space-y-1">
                <li>• Total productos: <strong>{MOCK_PRODUCTS.length}</strong></li>
                <li>• Productos en carrito: <strong>{cartItems.length}</strong></li>
                <li>• Rango de precio: <strong>$380 - $1400</strong></li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg border border-earth-100">
              <h3 className="font-semibold text-earth-900 mb-2">🎨 Colores</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-terracotta-600 rounded" /> Terracotta (primario)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-nature-600 rounded" /> Nature (secundario)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-earth-700 rounded" /> Earth (neutral)
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-earth-100">
              <h3 className="font-semibold text-earth-900 mb-2">✅ Checklist</h3>
              <ul className="text-earth-600 space-y-1 text-xs">
                <li>✓ Responsive (mobile/tablet/desktop)</li>
                <li>✓ Filtros funcionales</li>
                <li>✓ Búsqueda en vivo</li>
                <li>✓ Hover effects</li>
              </ul>
            </div>
          </div>

          {/* Component Structure */}
          <div className="mt-8 p-4 bg-white rounded-lg border border-earth-100">
            <h3 className="font-semibold text-earth-900 mb-3">📁 Estructura de Componentes</h3>
            <pre className="text-xs bg-earth-50 p-3 rounded overflow-x-auto text-earth-700">
{`CatalogPage
  ├── CatalogHero (Hero section)
  ├── CatalogFilters (Sidebar/Drawer)
  │   ├── Search input
  │   ├── Maguey type checkboxes
  │   ├── Category checkboxes
  │   ├── Price range sliders
  │   └── Producer select
  └── CatalogGrid
      ├── Toolbar (sticky)
      │   ├── Results counter
      │   └── Sort dropdown
      └── ProductCard (x${MOCK_PRODUCTS.length})
          ├── Image + badges
          ├── Product info
          └── Add to cart button`}
            </pre>
          </div>

          {/* Quick Links */}
          <div className="mt-8 p-4 bg-terracotta-50 rounded-lg border border-terracotta-200">
            <h3 className="font-semibold text-terracotta-900 mb-3">🔗 Próximos Pasos</h3>
            <ol className="text-terracotta-800 space-y-2 text-sm">
              <li>
                <strong>1. Ver archivos creados:</strong>
                <code className="block bg-white px-2 py-1 rounded mt-1 text-xs">
                  apps/web/src/components/Store/
                </code>
              </li>
              <li>
                <strong>2. Leer documentación:</strong>
                <code className="block bg-white px-2 py-1 rounded mt-1 text-xs">
                  apps/web/src/components/Store/CATALOG_GUIDE.md
                </code>
              </li>
              <li>
                <strong>3. Implementar datos reales:</strong>
                <code className="block bg-white px-2 py-1 rounded mt-1 text-xs">
                  Reemplazar MOCK_PRODUCTS con fetch API real
                </code>
              </li>
              <li>
                <strong>4. Conectar carrito:</strong>
                <code className="block bg-white px-2 py-1 rounded mt-1 text-xs">
                  Integrar con tu context/redux de carrito
                </code>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
