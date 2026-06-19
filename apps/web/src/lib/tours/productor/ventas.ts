import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="ventas-resumen"]',
      popover: { title: t.resumen.title, description: t.resumen.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="ventas-filtros"]',
      popover: { title: t.filtros.title, description: t.filtros.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="ventas-tabla"]',
      popover: { title: t.tabla.title, description: t.tabla.desc, side: 'top', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    resumen: {
      title: '💰 Resumen de Ventas',
      desc: 'Total de ventas e ingresos acumulados. Se actualiza con cada pedido completado.',
    },
    filtros: {
      title: '🔍 Filtros',
      desc: 'Filtra por tienda, cantidad, estado y rango de fechas para encontrar ventas específicas.',
    },
    tabla: {
      title: '📋 Historial de Ventas',
      desc: 'Cada fila es un producto vendido. Haz clic en el ícono de ojo para ver el detalle completo del pedido.',
    },
  },
  en: {
    resumen: {
      title: '💰 Sales Summary',
      desc: 'Total sales and accumulated revenue. Updated with each completed order.',
    },
    filtros: {
      title: '🔍 Filters',
      desc: 'Filter by store, quantity, status, and date range to find specific sales.',
    },
    tabla: {
      title: '📋 Sales History',
      desc: 'Each row is a sold product. Click the eye icon to see the full order details.',
    },
  },
};
