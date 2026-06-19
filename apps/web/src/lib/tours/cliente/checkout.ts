import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="checkout-stepper"]',
      popover: { title: t.stepper.title, description: t.stepper.desc, side: 'bottom', align: 'center' },
    },
    {
      element: '[data-tour="checkout-address"]',
      popover: { title: t.address.title, description: t.address.desc, side: 'top', align: 'start' },
    },
    {
      element: '[data-tour="checkout-shipping"]',
      popover: { title: t.shipping.title, description: t.shipping.desc, side: 'top', align: 'start' },
    },
    {
      element: '[data-tour="checkout-payment"]',
      popover: { title: t.payment.title, description: t.payment.desc, side: 'top', align: 'start' },
    },
    {
      element: '[data-tour="checkout-confirm"]',
      popover: { title: t.confirm.title, description: t.confirm.desc, side: 'top', align: 'center' },
    },
  ];
}

const TEXTS = {
  es: {
    stepper: {
      title: '📋 Pasos del Checkout',
      desc: 'El proceso tiene 4 pasos: Destino (dirección de entrega), Envío (paquetería), Pago (método de pago) y Resumen (confirmación final).',
    },
    address: {
      title: '📍 Dirección de Entrega',
      desc: 'Selecciona una dirección guardada o captura una nueva. También puedes usar GPS para autocompletar tu ubicación.',
    },
    shipping: {
      title: '📦 Opciones de Envío',
      desc: 'Elige la paquetería y el nivel de servicio (express / estándar). El costo se calcula según tu destino y peso del pedido.',
    },
    payment: {
      title: '💳 Método de Pago',
      desc: 'Paga con tarjeta de crédito o débito (Stripe) o con tu cuenta de PayPal. Ambas opciones son 100% seguras.',
    },
    confirm: {
      title: '✅ Confirmar Pago',
      desc: 'Cuando estés listo, haz clic aquí. Tu pago se procesa de forma cifrada y recibirás un correo de confirmación.',
    },
  },
  en: {
    stepper: {
      title: '📋 Checkout Steps',
      desc: 'The process has 4 steps: Destination (delivery address), Shipping (carrier), Payment (payment method), and Summary (final confirmation).',
    },
    address: {
      title: '📍 Delivery Address',
      desc: 'Select a saved address or enter a new one. You can also use GPS to auto-fill your location.',
    },
    shipping: {
      title: '📦 Shipping Options',
      desc: 'Choose the carrier and service level (express / standard). Cost is calculated based on your destination and order weight.',
    },
    payment: {
      title: '💳 Payment Method',
      desc: 'Pay with credit or debit card (Stripe) or your PayPal account. Both options are 100% secure.',
    },
    confirm: {
      title: '✅ Confirm Payment',
      desc: 'When ready, click here. Your payment is processed with encryption and you will receive a confirmation email.',
    },
  },
};
