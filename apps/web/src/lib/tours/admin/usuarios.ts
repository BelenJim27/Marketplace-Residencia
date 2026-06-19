import type { DriveStep } from 'driver.js';

export function getSteps(lang: 'es' | 'en' = 'es'): DriveStep[] {
  const t = TEXTS[lang];
  return [
    {
      element: '[data-tour="btn-nuevo-usuario"]',
      popover: { title: t.nuevo.title, description: t.nuevo.desc, side: 'bottom', align: 'end' },
    },
    {
      element: '[data-tour="usuarios-stats"]',
      popover: { title: t.stats.title, description: t.stats.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="usuarios-filtros"]',
      popover: { title: t.filtros.title, description: t.filtros.desc, side: 'bottom', align: 'start' },
    },
    {
      element: '[data-tour="usuarios-tabla"]',
      popover: { title: t.tabla.title, description: t.tabla.desc, side: 'top', align: 'start' },
    },
  ];
}

const TEXTS = {
  es: {
    nuevo: {
      title: '➕ Crear Usuario',
      desc: 'Crea nuevas cuentas de usuario manualmente: asigna rol (Admin, Productor, Cliente) y credenciales.',
    },
    stats: {
      title: '👥 Resumen de Usuarios',
      desc: 'Total de usuarios registrados, cuántos son productores, administradores y clientes.',
    },
    filtros: {
      title: '🔍 Filtros de Búsqueda',
      desc: 'Busca por nombre o email, filtra por rol o estado (activo/inactivo). Los resultados se actualizan al escribir.',
    },
    tabla: {
      title: '📋 Lista de Usuarios',
      desc: 'Todos los usuarios de la plataforma. Haz clic en los íconos para ver perfil, editar o desactivar una cuenta.',
    },
  },
  en: {
    nuevo: {
      title: '➕ Create User',
      desc: 'Manually create new user accounts: assign role (Admin, Producer, Client) and credentials.',
    },
    stats: {
      title: '👥 User Summary',
      desc: 'Total registered users, how many are producers, administrators, and clients.',
    },
    filtros: {
      title: '🔍 Search Filters',
      desc: 'Search by name or email, filter by role or status (active/inactive). Results update as you type.',
    },
    tabla: {
      title: '📋 User List',
      desc: 'All platform users. Click the icons to view profile, edit, or deactivate an account.',
    },
  },
};
