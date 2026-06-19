import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="pedidos-stats"]',
      popover: { title: t.stats.title, description: t.stats.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="pedidos-filtros"]',
      popover: { title: t.filtros.title, description: t.filtros.desc, side: 'bottom', align: 'start' },
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
      title: '🛒 Estado Global de Pedidos',
      desc: 'Pedidos totales, pendientes, en camino y entregados de toda la plataforma. Se actualizan al cambiar filtros.',
    },
    filtros: {
      title: '🔍 Filtrar Pedidos',
      desc: 'Filtra por estado, productor, cliente o rango de fechas. Puedes combinar filtros para búsquedas precisas.',
    },
    tabla: {
      title: '📋 Todos los Pedidos',
      desc: 'Vista completa de pedidos de todos los productores. Haz clic en el ojo para ver detalle o gestionar reembolsos.',
    },
  },
  en: {
    stats: {
      title: '🛒 Global Order Status',
      desc: 'Total, pending, in-transit, and delivered orders across the whole platform. Updated when filters change.',
    },
    filtros: {
      title: '🔍 Filter Orders',
      desc: 'Filter by status, producer, customer, or date range. Combine filters for precise searches.',
    },
    tabla: {
      title: '📋 All Orders',
      desc: 'Complete view of orders from all producers. Click the eye icon to view details or manage refunds.',
    },
  },
};
