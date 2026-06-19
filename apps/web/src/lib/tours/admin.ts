import type { DriveStep } from 'driver.js';

export function getAdminSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
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
      element: '[data-tour="nav-usuarios"]',
      popover: {
        title: t.usuarios.title,
        description: t.usuarios.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-productores"]',
      popover: {
        title: t.productores.title,
        description: t.productores.desc,
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
      element: '[data-tour="nav-solicitudes"]',
      popover: {
        title: t.solicitudes.title,
        description: t.solicitudes.desc,
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-configuracion"]',
      popover: {
        title: t.configuracion.title,
        description: t.configuracion.desc,
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
      title: '📊 Panel de Administración',
      desc: 'Visión global del marketplace: usuarios activos, ventas totales y pedidos pendientes.',
    },
    usuarios: {
      title: '👥 Gestión de Usuarios',
      desc: 'Administra cuentas, asigna roles y bloquea o elimina usuarios desde aquí.',
    },
    productores: {
      title: '🏭 Productores',
      desc: 'Lista de todos los productores registrados. Puedes ver su tienda, productos y estado de verificación.',
    },
    inventario: {
      title: '📦 Inventario Global',
      desc: 'Administra las categorías y todos los productos del marketplace. Puedes publicar, editar o despublicar cualquier producto.',
    },
    pedidos: {
      title: '🛒 Todos los Pedidos',
      desc: 'Consulta el estado de todos los pedidos del marketplace, procesa reembolsos y gestiona disputas.',
    },
    solicitudes: {
      title: '📋 Solicitudes de Productores',
      desc: 'Revisa y aprueba (o rechaza) las solicitudes de nuevos productores que quieren unirse al marketplace.',
    },
    configuracion: {
      title: '⚙️ Configuración',
      desc: 'Ajusta los parámetros globales del sistema: tasas de comisión, monedas, textos de la landing y más.',
    },
    tourBtn: {
      title: '🗺️ ¿Necesitas recordar algo?',
      desc: 'Puedes volver a ver esta guía en cualquier momento haciendo clic aquí.',
    },
  },
  en: {
    dashboard: {
      title: '📊 Admin Dashboard',
      desc: 'Global marketplace overview: active users, total sales, and pending orders.',
    },
    usuarios: {
      title: '👥 User Management',
      desc: 'Manage accounts, assign roles, and block or delete users from here.',
    },
    productores: {
      title: '🏭 Producers',
      desc: 'List of all registered producers. View their store, products, and verification status.',
    },
    inventario: {
      title: '📦 Global Inventory',
      desc: 'Manage categories and all marketplace products. Publish, edit, or unpublish any product.',
    },
    pedidos: {
      title: '🛒 All Orders',
      desc: 'View all marketplace order statuses, process refunds, and manage disputes.',
    },
    solicitudes: {
      title: '📋 Producer Requests',
      desc: 'Review and approve (or reject) applications from new producers who want to join the marketplace.',
    },
    configuracion: {
      title: '⚙️ Configuration',
      desc: 'Adjust global system parameters: commission rates, currencies, landing page text, and more.',
    },
    tourBtn: {
      title: '🗺️ Need a reminder?',
      desc: 'You can view this guide again at any time by clicking here.',
    },
  },
};
