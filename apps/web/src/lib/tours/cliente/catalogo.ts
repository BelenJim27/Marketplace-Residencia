import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="catalog-sidebar"]',
      popover: { title: t.sidebar.title, description: t.sidebar.desc, side: 'right', align: 'start' },
    },
    {
      element: '[data-tour="catalog-grid"]',
      popover: { title: t.grid.title, description: t.grid.desc, side: 'top', align: 'start' },
    },
    {
      element: '[data-tour="product-card-details"]',
      popover: { title: t.details.title, description: t.details.desc, side: 'top', align: 'center' },
    },
    {
      element: '[data-tour="product-card-add"]',
      popover: { title: t.add.title, description: t.add.desc, side: 'top', align: 'center' },
    },
  ];
}

const TEXTS = {
  es: {
    sidebar: {
      title: '🔍 Filtros del Catálogo',
      desc: 'Filtra por categoría, rango de precio, productor o estado del producto. Puedes combinar varios filtros a la vez.',
    },
    grid: {
      title: '🥃 Productos Disponibles',
      desc: 'Cada tarjeta muestra el mezcal disponible. Puedes ver los detalles, agregar al carrito o guardar en favoritos.',
    },
    details: {
      title: '🔍 Ver Detalles',
      desc: 'Haz clic aquí para abrir la página completa del producto: galería de imágenes, descripción, tipo de agave y datos del productor.',
    },
    add: {
      title: '🛒 Agregar al Carrito',
      desc: 'Añade este mezcal a tu carrito con un solo clic. Puedes seguir comprando y pagar todo junto al final.',
    },
  },
  en: {
    sidebar: {
      title: '🔍 Catalog Filters',
      desc: 'Filter by category, price range, producer, or product status. You can combine multiple filters at once.',
    },
    grid: {
      title: '🥃 Available Products',
      desc: 'Each card shows an available mezcal. You can view details, add to cart, or save to favorites.',
    },
    details: {
      title: '🔍 View Details',
      desc: 'Click here to open the full product page: image gallery, description, agave type, and producer info.',
    },
    add: {
      title: '🛒 Add to Cart',
      desc: 'Add this mezcal to your cart with one click. Keep browsing and pay for everything at the end.',
    },
  },
};
