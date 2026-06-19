import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="pedidos-stats"]',
      popover: { title: t.stats.title, description: t.stats.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="pedidos-tabla"]',
      popover: { title: t.tabla.title, description: t.tabla.desc, side: 'top', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    stats: {
      title: '🛒 Estado de Pedidos',
      desc: 'Resumen de todos tus pedidos: pendientes, en preparación, enviados y entregados.',
    },
    tabla: {
      title: '📋 Lista de Pedidos',
      desc: 'Cada fila es un pedido de un cliente. Haz clic en el ojo para ver el detalle y gestionar el envío.',
    },
  },
  en: {
    stats: {
      title: '🛒 Order Status',
      desc: 'Summary of all your orders: pending, preparing, shipped, and delivered.',
    },
    tabla: {
      title: '📋 Order List',
      desc: 'Each row is a customer order. Click the eye icon to view details and manage shipping.',
    },
  },
};
