import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="product-gallery"]',
      popover: { title: t.gallery.title, description: t.gallery.desc, side: 'right', align: 'start' },
    },
    {
      element: '[data-tour="product-price"]',
      popover: { title: t.price.title, description: t.price.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="quantity-selector"]',
      popover: { title: t.qty.title, description: t.qty.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="add-to-cart-btn"]',
      popover: { title: t.addCart.title, description: t.addCart.desc, side: 'top', align: 'center' },
    },
    {
      element: '[data-tour="buy-now-btn"]',
      popover: { title: t.buyNow.title, description: t.buyNow.desc, side: 'top', align: 'center' },
    },
  ];
}

const TEXTS = {
  es: {
    gallery: {
      title: '📸 Galería de Imágenes',
      desc: 'Haz clic en las miniaturas para ver el mezcal desde distintos ángulos. Usa las flechas para navegar entre fotos.',
    },
    price: {
      title: '💰 Precio',
      desc: 'Precio por botella con IVA incluido. Si tienes sesión activa en otro país, verás la conversión automática.',
    },
    qty: {
      title: '🔢 Cantidad',
      desc: 'Usa los botones − y + para elegir cuántas botellas quieres. El sistema valida que haya stock suficiente.',
    },
    addCart: {
      title: '🛒 Agregar al Carrito',
      desc: 'Añade este mezcal a tu carrito para seguir comprando y pagar todo junto al final.',
    },
    buyNow: {
      title: '⚡ Comprar Ahora',
      desc: 'Agrega al carrito e ir directo al checkout para completar tu compra sin más pasos.',
    },
  },
  en: {
    gallery: {
      title: '📸 Image Gallery',
      desc: 'Click thumbnails to see the mezcal from different angles. Use the arrows to browse photos.',
    },
    price: {
      title: '💰 Price',
      desc: 'Price per bottle including tax. If you are logged in from another country, automatic conversion is shown.',
    },
    qty: {
      title: '🔢 Quantity',
      desc: 'Use the − and + buttons to choose how many bottles you want. The system validates available stock.',
    },
    addCart: {
      title: '🛒 Add to Cart',
      desc: 'Add this mezcal to your cart to keep shopping and pay for everything at the end.',
    },
    buyNow: {
      title: '⚡ Buy Now',
      desc: 'Add to cart and go directly to checkout to complete your purchase without extra steps.',
    },
  },
};
