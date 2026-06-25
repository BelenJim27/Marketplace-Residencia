export const PERMISOS = {
  GESTIONAR_USUARIOS: 'gestionar_usuarios',
  VER_REPORTES: 'ver_reportes',
  VER_AUDITORIA: 'ver_auditoria',
  GESTIONAR_ROLES_PERMISOS: 'gestionar_roles_permisos',
  GESTIONAR_PRODUCTORES: 'gestionar_productores',
  GESTIONAR_CATEGORIAS: 'gestionar_categorias',
  GESTIONAR_PRODUCTOS: 'gestionar_productos',
  GESTIONAR_INVENTARIO: 'gestionar_inventario',
  GESTIONAR_PEDIDOS: 'gestionar_pedidos',
  GESTIONAR_COMISIONES: 'gestionar_comisiones',
  GESTIONAR_PAYOUTS: 'gestionar_payouts',
  GESTIONAR_REEMBOLSOS: 'gestionar_reembolsos',
  GESTIONAR_CONFIGURACION: 'gestionar_configuracion',
  GESTIONAR_RESENAS: 'gestionar_resenas',

  VER_REPORTES_PRODUCTOR: 'ver_reportes_productor',
  VER_PRODUCTOS: 'ver_productos',
  CREAR_PRODUCTO: 'crear_producto',
  EDITAR_PRODUCTO: 'editar_producto',
  ELIMINAR_PRODUCTO: 'eliminar_producto',
  VER_INVENTARIO: 'ver_inventario',
  CREAR_INVENTARIO: 'crear_inventario',
  EDITAR_INVENTARIO: 'editar_inventario',
  VER_PEDIDOS: 'ver_pedidos',
  EDITAR_PEDIDO: 'editar_pedido',
  VER_TIENDA: 'ver_tienda',
  CREAR_TIENDA: 'crear_tienda',
  EDITAR_TIENDA: 'editar_tienda',
  EDITAR_PERFIL_PRODUCTOR: 'editar_perfil_productor',
  GESTIONAR_ARCHIVOS: 'gestionar_archivos',
  GESTIONAR_COBROS: 'gestionar_cobros',
  RESPONDER_RESENAS: 'responder_resenas',

  VER_PRODUCTOS_CLIENTE: 'ver_productos_cliente',
  AGREGAR_CARRITO: 'agregar_carrito',
  CREAR_PEDIDO: 'crear_pedido',
  PAGAR: 'pagar',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];
export type PermissionInput = readonly string[] | undefined;

export const ALL_PERMISOS: readonly Permiso[] = Object.values(PERMISOS);

export const ADMIN_PERMISOS: readonly Permiso[] = [
  PERMISOS.GESTIONAR_USUARIOS,
  PERMISOS.VER_REPORTES,
  PERMISOS.VER_AUDITORIA,
  PERMISOS.GESTIONAR_ROLES_PERMISOS,
  PERMISOS.GESTIONAR_PRODUCTORES,
  PERMISOS.GESTIONAR_CATEGORIAS,
  PERMISOS.GESTIONAR_PRODUCTOS,
  PERMISOS.GESTIONAR_INVENTARIO,
  PERMISOS.GESTIONAR_PEDIDOS,
  PERMISOS.GESTIONAR_COMISIONES,
  PERMISOS.GESTIONAR_PAYOUTS,
  PERMISOS.GESTIONAR_REEMBOLSOS,
  PERMISOS.GESTIONAR_CONFIGURACION,
  PERMISOS.GESTIONAR_RESENAS,
];

export const PRODUCTOR_PERMISOS: readonly Permiso[] = [
  PERMISOS.VER_REPORTES_PRODUCTOR,
  PERMISOS.VER_PRODUCTOS,
  PERMISOS.CREAR_PRODUCTO,
  PERMISOS.EDITAR_PRODUCTO,
  PERMISOS.ELIMINAR_PRODUCTO,
  PERMISOS.VER_INVENTARIO,
  PERMISOS.CREAR_INVENTARIO,
  PERMISOS.EDITAR_INVENTARIO,
  PERMISOS.VER_PEDIDOS,
  PERMISOS.EDITAR_PEDIDO,
  PERMISOS.VER_TIENDA,
  PERMISOS.CREAR_TIENDA,
  PERMISOS.EDITAR_TIENDA,
  PERMISOS.EDITAR_PERFIL_PRODUCTOR,
  PERMISOS.GESTIONAR_ARCHIVOS,
  PERMISOS.GESTIONAR_COBROS,
  PERMISOS.RESPONDER_RESENAS,
];

export const CLIENTE_PERMISOS: readonly Permiso[] = [
  PERMISOS.VER_PRODUCTOS_CLIENTE,
  PERMISOS.AGREGAR_CARRITO,
  PERMISOS.CREAR_PEDIDO,
  PERMISOS.VER_PEDIDOS,
  PERMISOS.PAGAR,
];

export const ADMIN_PERMISSION_DESTINATIONS: Partial<Record<Permiso, string>> = {
  [PERMISOS.VER_REPORTES]: '/Administrador/dashboard',
  [PERMISOS.GESTIONAR_USUARIOS]: '/Administrador/usuarios',
  [PERMISOS.VER_AUDITORIA]: '/Administrador/auditoria',
  [PERMISOS.GESTIONAR_ROLES_PERMISOS]: '/Administrador/roles-permisos',
  [PERMISOS.GESTIONAR_PRODUCTORES]: '/Administrador/tienda/productores',
  [PERMISOS.GESTIONAR_CATEGORIAS]: '/Administrador/categorias',
  [PERMISOS.GESTIONAR_PRODUCTOS]: '/Administrador/productos',
  [PERMISOS.GESTIONAR_INVENTARIO]: '/Administrador/inventario',
  [PERMISOS.GESTIONAR_PEDIDOS]: '/Administrador/pedidos',
  [PERMISOS.GESTIONAR_COMISIONES]: '/Administrador/comisiones',
  [PERMISOS.GESTIONAR_PAYOUTS]: '/Administrador/payouts',
  [PERMISOS.GESTIONAR_REEMBOLSOS]: '/Administrador/reembolsos',
  [PERMISOS.GESTIONAR_CONFIGURACION]: '/Administrador/configuracion',
};

export const PRODUCTOR_PERMISSION_DESTINATIONS: Partial<Record<Permiso, string>> = {
  [PERMISOS.VER_REPORTES_PRODUCTOR]: '/dashboard/productor',
  [PERMISOS.VER_PRODUCTOS]: '/dashboard/productor/productos',
  [PERMISOS.CREAR_PRODUCTO]: '/dashboard/productor/productos',
  [PERMISOS.EDITAR_PRODUCTO]: '/dashboard/productor/productos',
  [PERMISOS.ELIMINAR_PRODUCTO]: '/dashboard/productor/productos',
  [PERMISOS.VER_INVENTARIO]: '/dashboard/productor/lotes',
  [PERMISOS.CREAR_INVENTARIO]: '/dashboard/productor/lotes',
  [PERMISOS.EDITAR_INVENTARIO]: '/dashboard/productor/lotes',
  [PERMISOS.VER_PEDIDOS]: '/dashboard/productor/pedidos',
  [PERMISOS.EDITAR_PEDIDO]: '/dashboard/productor/pedidos',
  [PERMISOS.VER_TIENDA]: '/dashboard/productor/tienda',
  [PERMISOS.CREAR_TIENDA]: '/dashboard/productor/tienda',
  [PERMISOS.EDITAR_TIENDA]: '/dashboard/productor/tienda',
  [PERMISOS.EDITAR_PERFIL_PRODUCTOR]: '/dashboard/productor/tienda',
  [PERMISOS.GESTIONAR_ARCHIVOS]: '/dashboard/productor/archivos',
  [PERMISOS.GESTIONAR_COBROS]: '/dashboard/productor/configuracion-cobro',
};

export function hasAnyPermission(userPermissions: PermissionInput, required: readonly string[]): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  return required.some((permission) => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: PermissionInput, required: readonly string[]): boolean {
  if (!userPermissions) return false;
  return required.every((permission) => userPermissions.includes(permission));
}

export function hasAdminAccess(userPermissions: PermissionInput): boolean {
  return hasAnyPermission(userPermissions, ADMIN_PERMISOS);
}

export function hasProductorAccess(userPermissions: PermissionInput): boolean {
  return hasAnyPermission(userPermissions, PRODUCTOR_PERMISOS);
}

export function isPermisoValido(permission: string): permission is Permiso {
  return (ALL_PERMISOS as readonly string[]).includes(permission);
}

export type PermissionNavigationItem<T> = T & {
  requiredPermission?: string;
  requiredPermissions?: string[];
  children?: PermissionNavigationItem<T>[];
};

export type PermissionNavigationSection<T> = {
  items: PermissionNavigationItem<T>[];
};

export function filterNavigationByPermissions<T, S extends PermissionNavigationSection<T>>(
  sections: readonly S[],
  permissions: readonly string[],
): S[] {
  const hasAccess = (item: PermissionNavigationItem<T>) =>
    (!item.requiredPermission && !item.requiredPermissions?.length) ||
    (item.requiredPermission ? permissions.includes(item.requiredPermission) : false) ||
    (item.requiredPermissions?.some((permission) => permissions.includes(permission)) ?? false);

  return sections.flatMap((section) => {
    const items = section.items.flatMap((item) => {
      if (!item.children) return hasAccess(item) ? [item] : [];
      const children = item.children.filter(hasAccess);
      return children.length > 0 ? [{ ...item, children }] : [];
    });
    return items.length > 0 ? [{ ...section, items } as S] : [];
  });
}

export type PanelArea = 'admin' | 'productor' | 'public';

export function getPanelArea(pathname: string): PanelArea {
  const normalizedPath = pathname.toLowerCase();
  if (normalizedPath.startsWith('/administrador')) return 'admin';
  if (normalizedPath.startsWith('/dashboard/productor')) return 'productor';
  return 'public';
}

export function getFirstAllowedDestination(
  userPermissions: PermissionInput,
  options: { hasActiveProductor?: boolean; fallback?: string } = {},
): string {
  const permissions = userPermissions ?? [];
  for (const permission of ADMIN_PERMISOS) {
    if (permissions.includes(permission) && ADMIN_PERMISSION_DESTINATIONS[permission]) {
      return ADMIN_PERMISSION_DESTINATIONS[permission]!;
    }
  }
  if (options.hasActiveProductor) {
    for (const permission of PRODUCTOR_PERMISOS) {
      if (permissions.includes(permission) && PRODUCTOR_PERMISSION_DESTINATIONS[permission]) {
        return PRODUCTOR_PERMISSION_DESTINATIONS[permission]!;
      }
    }
  }
  return options.fallback ?? '/cliente/producto';
}
