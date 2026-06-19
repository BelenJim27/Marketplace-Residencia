import type { DriveStep } from 'driver.js';

export function getProductorSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="nav-dashboard"]',
      popover: {
        title: t.dashboard.title,
        description: t.dashboard.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-lotes"]',
      popover: {
        title: t.lotes.title,
        description: t.lotes.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-inventario"]',
      popover: {
        title: t.inventario.title,
        description: t.inventario.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-pedidos"]',
      popover: {
        title: t.pedidos.title,
        description: t.pedidos.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-ventas"]',
      popover: {
        title: t.ventas.title,
        description: t.ventas.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-ingresos"]',
      popover: {
        title: t.ingresos.title,
        description: t.ingresos.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-tienda"]',
      popover: {
        title: t.tienda.title,
        description: t.tienda.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="tour-btn"]',
      popover: {
        title: t.tourBtn.title,
        description: t.tourBtn.desc,
        side: 'bottom',
        align: 'end',
      },
    },
  ];
}

const TEXTS = {
  es: {
    dashboard: {
      title: '📊 Tu Panel Principal',
      desc: 'Aquí verás un resumen de tus ventas, pedidos recientes y métricas clave de tu negocio.',
    },
    lotes: {
      title: '🌿 Lotes de Producción',
      desc: 'Registra y gestiona los lotes de mezcal que produces. Cada lote se vincula a tus productos.',
    },
    inventario: {
      title: '📦 Inventario',
      desc: 'Organiza tus categorías y productos. Desde aquí puedes crear nuevos productos con fotos, descripciones y precios.',
    },
    pedidos: {
      title: '🛒 Pedidos',
      desc: 'Consulta todos los pedidos de tus clientes, su estado de envío y detalles de pago.',
    },
    ventas: {
      title: '💰 Ventas',
      desc: 'Revisa el historial de tus ventas, comisiones y el monto que recibirás en cada pago.',
    },
    ingresos: {
      title: '📈 Mis Ingresos',
      desc: 'Estadísticas detalladas de tus ingresos: gráficas de tendencia y reportes por período.',
    },
    tienda: {
      title: '🏪 Tu Tienda',
      desc: 'Personaliza el nombre, descripción, logo y banner de tu tienda para que los clientes te encuentren.',
    },
    tourBtn: {
      title: '🗺️ ¿Necesitas recordar algo?',
      desc: 'Puedes volver a ver esta guía en cualquier momento haciendo clic aquí.',
    },
  },
  en: {
    dashboard: {
      title: '📊 Your Main Dashboard',
      desc: "Here you'll see a summary of your sales, recent orders, and key business metrics.",
    },
    lotes: {
      title: '🌿 Production Batches',
      desc: 'Register and manage your mezcal batches. Each batch links to your products.',
    },
    inventario: {
      title: '📦 Inventory',
      desc: 'Organize your categories and products. Create new products with photos, descriptions, and prices.',
    },
    pedidos: {
      title: '🛒 Orders',
      desc: 'View all customer orders, their shipping status, and payment details.',
    },
    ventas: {
      title: '💰 Sales',
      desc: 'Review your sales history, commissions, and the amount you will receive each payout.',
    },
    ingresos: {
      title: '📈 My Earnings',
      desc: 'Detailed earnings statistics: trend charts and reports by period.',
    },
    tienda: {
      title: '🏪 Your Store',
      desc: "Customize your store name, description, logo, and banner so customers can find you.",
    },
    tourBtn: {
      title: '🗺️ Need a reminder?',
      desc: "You can view this guide again at any time by clicking here.",
    },
  },
};
