import type { DriveStep } from 'driver.js';

export function getClienteSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="nav-catalogo"]',
      popover: {
        title: t.catalogo.title,
        description: t.catalogo.desc,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-carrito"]',
      popover: {
        title: t.carrito.title,
        description: t.carrito.desc,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-favoritos"]',
      popover: {
        title: t.favoritos.title,
        description: t.favoritos.desc,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-compras"]',
      popover: {
        title: t.compras.title,
        description: t.compras.desc,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-perfil"]',
      popover: {
        title: t.perfil.title,
        description: t.perfil.desc,
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="tour-btn-tienda"]',
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
    catalogo: {
      title: '🛍️ Catálogo de Mezcales',
      desc: 'Explora nuestra selección de mezcales artesanales de Oaxaca. Filtra por categoría, productor, precio y más.',
    },
    carrito: {
      title: '🛒 Tu Carrito',
      desc: 'Agrega los mezcales que te gusten y revisa tu selección antes de proceder al pago.',
    },
    favoritos: {
      title: '❤️ Favoritos',
      desc: 'Guarda los mezcales que te interesen para comprarlos después. ¡No pierdas tu selección!',
    },
    compras: {
      title: '📦 Mis Compras',
      desc: 'Consulta el historial de tus pedidos, el estado de envío y descarga tus facturas.',
    },
    perfil: {
      title: '👤 Tu Cuenta',
      desc: 'Inicia sesión o crea una cuenta para guardar favoritos, ver tus pedidos y hacer compras.',
    },
    tourBtn: {
      title: '🗺️ ¿Necesitas ayuda?',
      desc: 'Puedes volver a ver esta guía en cualquier momento haciendo clic aquí.',
    },
  },
  en: {
    catalogo: {
      title: '🛍️ Mezcal Catalog',
      desc: 'Explore our selection of artisanal mezcals from Oaxaca. Filter by category, producer, price, and more.',
    },
    carrito: {
      title: '🛒 Your Cart',
      desc: 'Add the mezcals you like and review your selection before proceeding to checkout.',
    },
    favoritos: {
      title: '❤️ Favorites',
      desc: 'Save mezcals you are interested in to buy them later. Do not lose your selection!',
    },
    compras: {
      title: '📦 My Orders',
      desc: 'Check your order history, shipping status, and download your invoices.',
    },
    perfil: {
      title: '👤 Your Account',
      desc: 'Sign in or create an account to save favorites, view your orders, and make purchases.',
    },
    tourBtn: {
      title: '🗺️ Need help?',
      desc: 'You can view this guide again at any time by clicking here.',
    },
  },
};
