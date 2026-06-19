import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="lotes-section"]',
      popover: { title: t.section.title, description: t.section.desc, side: 'bottom', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    section: {
      title: '🌿 Lotes de Producción',
      desc: 'Registra cada tanda de mezcal con fecha de destilación, tipo de agave, litros producidos y más. Cada lote se vincula a tus productos.',
    },
  },
  en: {
    section: {
      title: '🌿 Production Batches',
      desc: 'Register each mezcal batch with distillation date, agave type, liters produced, and more. Each batch links to your products.',
    },
  },
};
