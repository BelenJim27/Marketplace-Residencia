import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="admin-productos-tabla"]',
      popover: { title: t.tabla.title, description: t.tabla.desc, side: 'top', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    tabla: {
      title: '🛍️ Catálogo Global',
      desc: 'Todos los productos de todos los productores. Puedes activar, desactivar o eliminar productos que incumplan las políticas.',
    },
  },
  en: {
    tabla: {
      title: '🛍️ Global Catalog',
      desc: 'All products from all producers. You can activate, deactivate, or delete products that violate policies.',
    },
  },
};
