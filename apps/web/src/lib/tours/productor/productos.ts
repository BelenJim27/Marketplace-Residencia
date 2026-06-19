import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="producto-header"]',
      popover: { title: t.header.title, description: t.header.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="producto-stats"]',
      popover: { title: t.stats.title, description: t.stats.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="producto-filtros"]',
      popover: { title: t.filtros.title, description: t.filtros.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="producto-tabla"]',
      popover: { title: t.tabla.title, description: t.tabla.desc, side: 'top', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    header: {
      title: '➕ Crear Producto',
      desc: 'Haz clic en "Nuevo Producto" para agregar un mezcal a tu catálogo con fotos, descripción y precio.',
    },
    stats: {
      title: '📦 Estado del Inventario',
      desc: 'Resumen rápido de cuántos productos tienes en total, activos e inactivos.',
    },
    filtros: {
      title: '🔍 Filtrar Productos',
      desc: 'Busca por nombre, filtra por estado (activo/inactivo), tienda o rango de precio.',
    },
    tabla: {
      title: '📋 Tu Catálogo',
      desc: 'Aquí aparecen todos tus productos. Usa los botones de cada fila para ver, editar o eliminar.',
    },
  },
  en: {
    header: {
      title: '➕ Create Product',
      desc: 'Click "New Product" to add a mezcal to your catalog with photos, description, and price.',
    },
    stats: {
      title: '📦 Inventory Status',
      desc: 'Quick summary of how many products you have in total, active, and inactive.',
    },
    filtros: {
      title: '🔍 Filter Products',
      desc: 'Search by name, filter by status (active/inactive), store, or price range.',
    },
    tabla: {
      title: '📋 Your Catalog',
      desc: 'All your products appear here. Use the buttons in each row to view, edit, or delete.',
    },
  },
};
