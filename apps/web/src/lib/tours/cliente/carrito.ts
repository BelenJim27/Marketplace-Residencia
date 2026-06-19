import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="cart-items"]',
      popover: { title: t.items.title, description: t.items.desc, side: 'right', align: 'start' },
    },
    {
      element: '[data-tour="cart-summary"]',
      popover: { title: t.summary.title, description: t.summary.desc, side: 'left', align: 'start' },
    },
    {
      element: '[data-tour="btn-checkout"]',
      popover: { title: t.checkout.title, description: t.checkout.desc, side: 'top', align: 'center' },
    },
  ];
}

const TEXTS = {
  es: {
    items: {
      title: '🛒 Tus Productos',
      desc: 'Aquí ves cada producto que agregaste. Cambia la cantidad con los botones + / - o elimina un artículo con la X.',
    },
    summary: {
      title: '💵 Resumen del Pedido',
      desc: 'Subtotal, costo de envío e IVA desglosados. El total se recalcula automáticamente al cambiar cantidades.',
    },
    checkout: {
      title: '✅ Proceder al Pago',
      desc: 'Cuando estés listo, haz clic aquí para elegir tu dirección de entrega y método de pago (tarjeta o PayPal).',
    },
  },
  en: {
    items: {
      title: '🛒 Your Products',
      desc: 'Here you see each product you added. Change the quantity with the + / - buttons or remove an item with the X.',
    },
    summary: {
      title: '💵 Order Summary',
      desc: 'Subtotal, shipping cost, and tax broken down. The total recalculates automatically when quantities change.',
    },
    checkout: {
      title: '✅ Proceed to Checkout',
      desc: 'When ready, click here to choose your delivery address and payment method (card or PayPal).',
    },
  },
};
