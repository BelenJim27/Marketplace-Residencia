/**
 * EXAMPLE: How to use the Mezcal Catalog Components
 * This file demonstrates the integration of CatalogPage with mock data
 *
 * ✅ Copy this example into your actual page component
 * ✅ Replace mock data with real API data
 * ✅ Connect onAddToCart to your cart context/reducer
 */

import { CatalogPage } from './CatalogPage';

// Mock product data - replace with real API data
const mockProducts = [
  {
    id: '1',
    name: 'Amareja Locura',
    magueyType: 'Espadín',
    category: 'Artesanal' as const,
    price: 450,
    producer: 'Productora María López',
    image: '/Store/material/27.png', // Your bottle image
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
    image: '/Store/material/27.png',
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
    image: '/Store/material/27.png',
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
    image: '/Store/material/27.png',
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
    image: '/Store/material/27.png',
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
    image: '/Store/material/27.png',
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
    image: '/Store/material/27.png',
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
    image: '/Store/material/27.png',
    rating: 4.8,
    reviewCount: 19,
    isLimited: false,
    stock: 14,
  },
];

export function CatalogExample() {
  const handleAddToCart = (productId: string) => {
    // Replace with your actual cart logic
    console.log(`Added product ${productId} to cart`);

    // Example: dispatch to your cart context/reducer
    // dispatch({ type: 'ADD_TO_CART', payload: { productId } });

    // Example: call your API
    // await api.post('/carrito', { productId, quantity: 1 });
  };

  return (
    <CatalogPage
      products={mockProducts}
      onAddToCart={handleAddToCart}
      isLoading={false}
    />
  );
}

/**
 * INTEGRATION CHECKLIST
 *
 * [ ] Replace mockProducts with real data from your API
 * [ ] Implement handleAddToCart to:
 *     - Add item to cart context/state
 *     - Call API endpoint (POST /carrito or equivalent)
 *     - Show success toast notification
 * [ ] Add error handling for failed cart operations
 * [ ] Connect product images to real image URLs
 * [ ] Add i18n translations for all text strings
 * [ ] Test responsive layout on mobile/tablet/desktop
 * [ ] Test loading state with isLoading={true}
 * [ ] Test empty state by passing empty products array
 * [ ] Test with products at boundary conditions (0 stock, limited edition, etc)
 * [ ] Verify accessibility with screen reader
 * [ ] Add analytics tracking for:
 *     - Filter usage
 *     - Search queries
 *     - Add to cart events
 *     - Product views
 *
 * CUSTOMIZATION OPTIONS
 *
 * 1. Style customization:
 *    - Edit color values in tailwind.config.ts
 *    - Change typography in individual components
 *    - Adjust spacing and sizing
 *
 * 2. Behavior customization:
 *    - Add infinite scroll instead of "Load More" button
 *    - Add product comparison feature
 *    - Add wishlist integration
 *    - Add product variants (size, volume, etc)
 *
 * 3. Data customization:
 *    - Add more product fields (description, origin, notes, etc)
 *    - Add dynamic filter options from API
 *    - Add sorting options
 *
 * 4. Component composition:
 *    - Extract components into separate files
 *    - Create sub-components for product details
 *    - Add product quick-view modal
 */
