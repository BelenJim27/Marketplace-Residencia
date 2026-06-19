import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="stats-cards"]',
      popover: { title: t.stats.title, description: t.stats.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="analytics-section"]',
      popover: { title: t.analytics.title, description: t.analytics.desc, side: 'top', align: 'start' },
    },
    {
      element: '[data-tour="export-buttons"]',
      popover: { title: t.export.title, description: t.export.desc, side: 'bottom', align: 'end' },
    },
  ];
}

const TEXTS = {
  es: {
    stats: {
      title: '📊 Tus Estadísticas',
      desc: 'Aquí ves de un vistazo cuántos productos tienes, cuántos están activos e inactivos, y tu ID de productor.',
    },
    analytics: {
      title: '📈 Analíticas',
      desc: 'Gráficas de ventas y productos más vendidos por período. Cambia el rango de tiempo con los selectores.',
    },
    export: {
      title: '📄 Exportar Reportes',
      desc: 'Descarga tu historial de ventas y productos en formato CSV o PDF para llevar un registro externo.',
    },
  },
  en: {
    stats: {
      title: '📊 Your Stats',
      desc: 'See at a glance how many products you have, how many are active or inactive, and your producer ID.',
    },
    analytics: {
      title: '📈 Analytics',
      desc: 'Sales and top-selling product charts by period. Change the time range with the selectors.',
    },
    export: {
      title: '📄 Export Reports',
      desc: 'Download your sales and product history in CSV or PDF format to keep an external record.',
    },
  },
};
