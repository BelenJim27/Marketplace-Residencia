import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="tienda-card"]',
      popover: { title: t.card.title, description: t.card.desc, side: 'top', align: 'start' },
    },
    {
      element: '[data-tour="btn-editar-tienda"]',
      popover: { title: t.editar.title, description: t.editar.desc, side: 'bottom', align: 'end' },
    },
  ];
}

const TEXTS = {
  es: {
    card: {
      title: '🏪 Tu Tienda',
      desc: 'Aquí ves el nombre, descripción, país de operación, stock total y estado de tu tienda.',
    },
    editar: {
      title: '✏️ Editar Tienda',
      desc: 'Actualiza el nombre, descripción e información de tu tienda para que los clientes te encuentren fácilmente.',
    },
  },
  en: {
    card: {
      title: '🏪 Your Store',
      desc: 'Here you see your store name, description, country of operation, total stock, and status.',
    },
    editar: {
      title: '✏️ Edit Store',
      desc: 'Update your store name, description, and information so customers can find you easily.',
    },
  },
};
