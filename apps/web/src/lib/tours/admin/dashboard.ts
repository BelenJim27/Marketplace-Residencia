import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="admin-metrics"]',
      popover: { title: t.metrics.title, description: t.metrics.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="admin-charts"]',
      popover: { title: t.charts.title, description: t.charts.desc, side: 'top', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    metrics: {
      title: '📊 Métricas de la Plataforma',
      desc: 'Usuarios, pedidos, ingresos y productores activos de un solo vistazo. Los indicadores se actualizan en tiempo real.',
    },
    charts: {
      title: '📈 Gráficas de Operación',
      desc: 'Ventas por período, categorías más vendidas y actividad de usuarios. Usa los filtros para cambiar el rango de fechas.',
    },
  },
  en: {
    metrics: {
      title: '📊 Platform Metrics',
      desc: 'Users, orders, revenue, and active producers at a glance. Indicators update in real time.',
    },
    charts: {
      title: '📈 Operation Charts',
      desc: 'Sales by period, top categories, and user activity. Use the filters to change the date range.',
    },
  },
};
